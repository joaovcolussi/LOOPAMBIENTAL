import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingsService } from '../listings/listings.service';
import { csvCell, parseCsv } from './csv';

const MAX_IMPORT_ROWS = 100;
const MAX_CSV_LENGTH = 512 * 1024;

const EXPORT_HEADER = [
  'id',
  'tipo',
  'status',
  'titulo',
  'categoria',
  'quantidade',
  'disponivel',
  'unidade',
  'preco_unitario',
  'cidade',
  'estado',
  'publicado_em',
];

export const IMPORT_HEADER = [
  'tipo',
  'titulo',
  'categoria',
  'quantidade',
  'unidade',
  'preco_unitario',
  'cidade',
  'estado',
  'descricao',
];

type ImportResult = {
  created: { line: number; id: string; title: string }[];
  errors: { line: number; error: string }[];
};

/**
 * ERP-facing operations shared by the CSV tools in the dashboard and the
 * API-key endpoints. Everything goes through ListingsService, so the same
 * validation, ownership and moderation rules apply.
 */
@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
  ) {}

  async exportListingsCsv(userId: string, companyId: string) {
    await this.assertMember(userId, companyId);
    const rows = await this.listingRows(companyId);
    return [
      EXPORT_HEADER,
      ...rows.map((listing) => [
        listing.id,
        listing.type === 'BUY' ? 'COMPRA' : 'VENDA',
        listing.status,
        listing.title,
        listing.category.slug,
        listing.quantity,
        listing.availableQuantity,
        listing.unit,
        listing.unitPrice ?? '',
        listing.city ?? '',
        listing.state ?? '',
        listing.publishedAt?.toISOString() ?? '',
      ]),
    ]
      .map((row) => row.map(csvCell).join(';'))
      .join('\n');
  }

  async importListingsCsv(
    userId: string,
    companyId: string,
    csv: unknown,
    submitForReview: boolean,
  ): Promise<ImportResult> {
    await this.assertMember(userId, companyId);
    if (typeof csv !== 'string' || !csv.trim() || csv.length > MAX_CSV_LENGTH)
      throw new BadRequestException('INVALID_CSV');
    const rows = parseCsv(csv, MAX_IMPORT_ROWS);
    const [header, ...data] = rows;
    const columns = (header ?? []).map((value) => value.toLowerCase());
    const missing = [
      'tipo',
      'titulo',
      'categoria',
      'quantidade',
      'unidade',
    ].filter((column) => !columns.includes(column));
    if (missing.length)
      throw new BadRequestException(`CSV_MISSING_COLUMNS:${missing.join(',')}`);
    if (data.length > MAX_IMPORT_ROWS)
      throw new BadRequestException('CSV_TOO_MANY_ROWS');
    const categories = await this.prisma.wasteCategory.findMany({
      select: { id: true, slug: true, name: true },
    });
    const result: ImportResult = { created: [], errors: [] };
    for (const [index, values] of data.entries()) {
      const line = index + 2;
      const get = (column: string) =>
        values[columns.indexOf(column)]?.trim() ?? '';
      try {
        const typeRaw = get('tipo').toUpperCase();
        const type =
          typeRaw === 'VENDA' || typeRaw === 'SELL'
            ? 'SELL'
            : typeRaw === 'COMPRA' || typeRaw === 'BUY'
              ? 'BUY'
              : null;
        if (!type) throw new Error('tipo deve ser COMPRA ou VENDA');
        const categoryValue = get('categoria').toLowerCase();
        const category = categories.find(
          (item) =>
            item.slug === categoryValue ||
            item.name.toLowerCase() === categoryValue,
        );
        if (!category) throw new Error('categoria não encontrada');
        const title = get('titulo');
        if (title.length < 5 || title.length > 180)
          throw new Error('título deve ter entre 5 e 180 caracteres');
        const price = get('preco_unitario').replace(',', '.');
        const listing = (await this.listings.create(userId, {
          companyId,
          type,
          title,
          categoryId: category.id,
          quantity: get('quantidade').replace(',', '.'),
          unit: get('unidade').slice(0, 20),
          unitPrice: price || undefined,
          city: get('cidade').slice(0, 120) || undefined,
          state: get('estado').slice(0, 2).toUpperCase() || undefined,
          description: get('descricao').slice(0, 5000) || undefined,
        })) as { id: string; title: string };
        if (submitForReview) await this.listings.submit(userId, listing.id);
        result.created.push({ line, id: listing.id, title: listing.title });
      } catch (error) {
        result.errors.push({
          line,
          error: error instanceof Error ? error.message : 'erro desconhecido',
        });
      }
    }
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'LISTINGS_IMPORTED',
        resourceType: 'COMPANY',
        resourceId: companyId,
        metadata: {
          created: result.created.length,
          errors: result.errors.length,
        },
      },
    });
    return result;
  }

  async companyProfile(companyId: string): Promise<unknown> {
    return this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        slug: true,
        legalName: true,
        tradeName: true,
        verification: true,
        city: true,
        state: true,
      },
    });
  }

  companyListings(companyId: string): Promise<unknown> {
    return this.listingRows(companyId);
  }

  private listingRows(companyId: string) {
    return this.prisma.listing.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        slug: true,
        quantity: true,
        availableQuantity: true,
        unit: true,
        unitPrice: true,
        currency: true,
        city: true,
        state: true,
        publishedAt: true,
        createdAt: true,
        category: { select: { slug: true, name: true } },
      },
    });
  }

  companyDeals(companyId: string): Promise<unknown> {
    return this.prisma.deal.findMany({
      where: {
        OR: [{ buyerCompanyId: companyId }, { sellerCompanyId: companyId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        listing: { select: { id: true, title: true, unit: true } },
        proposal: {
          select: { quantity: true, unitPrice: true, currency: true },
        },
      },
    });
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
}
