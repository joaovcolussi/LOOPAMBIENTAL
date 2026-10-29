import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { emissionFactor, toKilograms } from './emission-factors';
import { csvCell } from '../integrations/csv';

const MAX_RANGE_DAYS = 731;
const MAX_DEALS = 5000;

type CategoryTotals = {
  categoryId: string;
  name: string;
  slug: string;
  deals: number;
  value: number;
  kilograms: number;
  co2eKg: number;
};

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class CompanyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(
    userId: string,
    companyId: string,
    range: { from?: string; to?: string },
  ): Promise<unknown> {
    await this.assertMember(userId, companyId);
    const { from, to } = this.parseRange(range);
    const [deals, proposalsSent, proposalsReceived, listings] =
      await Promise.all([
        this.dealsInRange(companyId, from, to),
        this.prisma.proposal.groupBy({
          by: ['status'],
          where: {
            proposerCompanyId: companyId,
            createdAt: { gte: from, lte: to },
          },
          _count: { _all: true },
        }),
        this.prisma.proposal.groupBy({
          by: ['status'],
          where: {
            listing: { companyId },
            createdAt: { gte: from, lte: to },
          },
          _count: { _all: true },
        }),
        this.prisma.listing.groupBy({
          by: ['status'],
          where: { companyId, deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    const completed = deals.filter((deal) => deal.status === 'COMPLETED');
    let revenue = 0;
    let spend = 0;
    let kilograms = 0;
    let co2eKg = 0;
    let nonMassDeals = 0;
    const categories = new Map<string, CategoryTotals>();
    const months = new Map<
      string,
      { sold: number; bought: number; kg: number }
    >();
    for (const deal of completed) {
      const quantity = Number(deal.proposal.quantity);
      const value = quantity * Number(deal.proposal.unitPrice);
      const seller = deal.sellerCompanyId === companyId;
      if (seller) revenue += value;
      else spend += value;
      const kg = toKilograms(quantity, deal.listing.unit);
      const factor = emissionFactor(deal.listing.category.slug);
      if (kg === null) nonMassDeals += 1;
      else {
        kilograms += kg;
        co2eKg += kg * factor;
      }
      const category = categories.get(deal.listing.category.id) ?? {
        categoryId: deal.listing.category.id,
        name: deal.listing.category.name,
        slug: deal.listing.category.slug,
        deals: 0,
        value: 0,
        kilograms: 0,
        co2eKg: 0,
      };
      category.deals += 1;
      category.value += value;
      category.kilograms += kg ?? 0;
      category.co2eKg += (kg ?? 0) * factor;
      categories.set(category.categoryId, category);
      const key = monthKey(deal.updatedAt);
      const month = months.get(key) ?? { sold: 0, bought: 0, kg: 0 };
      if (seller) month.sold += value;
      else month.bought += value;
      month.kg += kg ?? 0;
      months.set(key, month);
    }
    const count = (rows: { status: string; _count: { _all: number } }[]) =>
      Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
    const sent = count(proposalsSent);
    const received = count(proposalsReceived);
    const total = (map: Record<string, number>) =>
      Object.values(map).reduce((sum, value) => sum + value, 0);
    const conversion = (map: Record<string, number>) =>
      total(map) ? (map.ACCEPTED ?? 0) / total(map) : 0;
    const round = (value: number, digits = 2) =>
      Math.round(value * 10 ** digits) / 10 ** digits;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      commercial: {
        dealsByStatus: deals.reduce<Record<string, number>>((acc, deal) => {
          acc[deal.status] = (acc[deal.status] ?? 0) + 1;
          return acc;
        }, {}),
        completedDeals: completed.length,
        revenue: round(revenue),
        spend: round(spend),
        averageTicket: completed.length
          ? round((revenue + spend) / completed.length)
          : 0,
        proposalsSent: { total: total(sent), byStatus: sent },
        proposalsReceived: { total: total(received), byStatus: received },
        conversionRate: {
          sent: round(conversion(sent), 4),
          received: round(conversion(received), 4),
        },
        listingsByStatus: count(listings),
      },
      environmental: {
        divertedKg: round(kilograms, 1),
        co2eAvoidedKg: round(co2eKg, 1),
        // Rough illustrative equivalence for communication purposes only.
        treesEquivalent: Math.round(co2eKg / 22),
        dealsWithoutMassUnit: nonMassDeals,
        methodology:
          'Estimativa ilustrativa: volume em massa das negociações concluídas multiplicado por fatores médios de emissão evitada por categoria. Não substitui inventário de GEE certificado.',
      },
      byCategory: [...categories.values()]
        .map((item) => ({
          ...item,
          value: round(item.value),
          kilograms: round(item.kilograms, 1),
          co2eKg: round(item.co2eKg, 1),
        }))
        .sort((a, b) => b.value - a.value),
      monthly: [...months.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({
          month,
          sold: round(values.sold),
          bought: round(values.bought),
          kilograms: round(values.kg, 1),
        })),
    };
  }

  async dealsCsv(
    userId: string,
    companyId: string,
    range: { from?: string; to?: string },
  ) {
    await this.assertMember(userId, companyId);
    const { from, to } = this.parseRange(range);
    const deals = await this.dealsInRange(companyId, from, to);
    const header = [
      'negociacao_id',
      'status',
      'papel',
      'anuncio',
      'categoria',
      'quantidade',
      'unidade',
      'preco_unitario',
      'valor_total',
      'massa_kg',
      'co2e_evitado_kg',
      'contraparte',
      'criada_em',
      'atualizada_em',
    ];
    const rows = deals.map((deal) => {
      const seller = deal.sellerCompanyId === companyId;
      const quantity = Number(deal.proposal.quantity);
      const kg = toKilograms(quantity, deal.listing.unit);
      const counterpart = seller ? deal.buyerCompany : deal.sellerCompany;
      return [
        deal.id,
        deal.status,
        seller ? 'VENDEDOR' : 'COMPRADOR',
        deal.listing.title,
        deal.listing.category.name,
        deal.proposal.quantity,
        deal.listing.unit,
        deal.proposal.unitPrice,
        (quantity * Number(deal.proposal.unitPrice)).toFixed(2),
        kg === null ? '' : kg.toFixed(1),
        kg === null || deal.status !== 'COMPLETED'
          ? ''
          : (kg * emissionFactor(deal.listing.category.slug)).toFixed(1),
        counterpart.tradeName || counterpart.legalName,
        deal.createdAt.toISOString(),
        deal.updatedAt.toISOString(),
      ];
    });
    return [header, ...rows]
      .map((row) => row.map(csvCell).join(';'))
      .join('\n');
  }

  private dealsInRange(companyId: string, from: Date, to: Date) {
    return this.prisma.deal.findMany({
      where: {
        OR: [{ buyerCompanyId: companyId }, { sellerCompanyId: companyId }],
        updatedAt: { gte: from, lte: to },
      },
      orderBy: { updatedAt: 'desc' },
      take: MAX_DEALS,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        proposal: { select: { quantity: true, unitPrice: true } },
        listing: {
          select: {
            title: true,
            unit: true,
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        buyerCompany: { select: { legalName: true, tradeName: true } },
        sellerCompany: { select: { legalName: true, tradeName: true } },
      },
    });
  }

  private parseRange(range: { from?: string; to?: string }) {
    const to = range.to ? new Date(`${range.to}T23:59:59.999Z`) : new Date();
    const from = range.from
      ? new Date(`${range.from}T00:00:00.000Z`)
      : new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to ||
      to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
    )
      throw new BadRequestException('INVALID_REPORT_RANGE');
    return { from, to };
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
}
