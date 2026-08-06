import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type ProposalInput = {
  listingId: string;
  proposerCompanyId: string;
  quantity: string;
  unitPrice: string;
  notes?: string;
  validUntil?: string;
};
type CounterInput = { quantity: string; unitPrice: string; notes?: string };

const proposalSelect = {
  id: true,
  listingId: true,
  proposerCompanyId: true,
  createdByUserId: true,
  quantity: true,
  unitPrice: true,
  currency: true,
  notes: true,
  validUntil: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  listing: {
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      companyId: true,
      company: { select: { legalName: true, tradeName: true } },
    },
  },
  proposerCompany: { select: { id: true, legalName: true, tradeName: true } },
  revisions: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      notes: true,
      actorUserId: true,
      createdAt: true,
    },
  },
  deal: { select: { id: true, status: true, createdAt: true } },
} as const;

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, input: ProposalInput): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: input.listingId, status: 'PUBLISHED', deletedAt: null },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    await this.assertMembership(userId, input.proposerCompanyId);
    if (listing.companyId === input.proposerCompanyId)
      throw new BadRequestException('SAME_COMPANY_PROPOSAL');
    const quantity = this.decimal(input.quantity, 'INVALID_QUANTITY');
    const unitPrice = this.decimal(input.unitPrice, 'INVALID_PRICE');
    const validUntil = this.parseDate(input.validUntil);
    const proposal = await this.prisma.proposal.create({
      data: {
        listingId: input.listingId,
        proposerCompanyId: input.proposerCompanyId,
        createdByUserId: userId,
        quantity,
        unitPrice,
        notes: input.notes,
        validUntil,
      },
      select: proposalSelect,
    });
    await this.notifications.create(listing.createdByUserId, {
      type: 'PROPOSAL_CREATED',
      title: 'Nova proposta recebida',
      body: `Uma empresa enviou uma proposta para ${listing.title}.`,
      payload: { proposalId: proposal.id, listingId: listing.id },
    });
    return proposal;
  }

  async listForUser(userId: string): Promise<unknown> {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const companyIds = memberships.map((membership) => membership.companyId);
    return this.prisma.proposal.findMany({
      where: {
        OR: [
          { proposerCompanyId: { in: companyIds } },
          { listing: { companyId: { in: companyIds } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: proposalSelect,
    });
  }

  async find(userId: string, id: string): Promise<unknown> {
    const proposal = await this.getProposal(id);
    await this.assertParticipant(
      userId,
      proposal.proposerCompanyId,
      proposal.listing.companyId,
    );
    return this.prisma.proposal.findUnique({
      where: { id },
      select: proposalSelect,
    });
  }

  async counter(
    userId: string,
    id: string,
    input: CounterInput,
  ): Promise<unknown> {
    const proposal = await this.getProposal(id);
    await this.assertListingManager(userId, proposal.listing.companyId);
    if (proposal.status !== 'PENDING' && proposal.status !== 'COUNTERED')
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    const quantity = this.decimal(input.quantity, 'INVALID_QUANTITY');
    const unitPrice = this.decimal(input.unitPrice, 'INVALID_PRICE');
    const result = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.proposal.update({
        where: { id },
        data: { status: 'COUNTERED', quantity, unitPrice, notes: input.notes },
        select: proposalSelect,
      });
      await transaction.proposalRevision.create({
        data: {
          proposalId: id,
          actorUserId: userId,
          quantity,
          unitPrice,
          notes: input.notes,
        },
      });
      return updated;
    });
    await this.notifications.create(proposal.createdByUserId, {
      type: 'PROPOSAL_COUNTERED',
      title: 'Contraproposta recebida',
      body: 'Uma proposta sua recebeu uma contraproposta.',
      payload: { proposalId: id },
    });
    return result;
  }

  async accept(userId: string, id: string): Promise<unknown> {
    const proposal = await this.getProposal(id);
    await this.assertListingManager(userId, proposal.listing.companyId);
    const existingDeal = await this.prisma.deal.findUnique({
      where: { proposalId: id },
      select: { id: true, status: true },
    });
    if (existingDeal) return existingDeal;
    if (proposal.status !== 'PENDING' && proposal.status !== 'COUNTERED')
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    const buyerCompanyId =
      proposal.listing.type === 'SELL'
        ? proposal.proposerCompanyId
        : proposal.listing.companyId;
    const sellerCompanyId =
      proposal.listing.type === 'SELL'
        ? proposal.listing.companyId
        : proposal.proposerCompanyId;
    const deal = await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.proposal.updateMany({
        where: { id, status: { in: ['PENDING', 'COUNTERED'] } },
        data: { status: 'ACCEPTED' },
      });
      if (changed.count === 0) return null;
      await transaction.listing.update({
        where: { id: proposal.listingId },
        data: { status: 'NEGOTIATING' },
      });
      return transaction.deal.create({
        data: {
          listingId: proposal.listingId,
          proposalId: id,
          buyerCompanyId,
          sellerCompanyId,
        },
        select: {
          id: true,
          status: true,
          listingId: true,
          proposalId: true,
          createdAt: true,
        },
      });
    });
    if (!deal) {
      const concurrentDeal = await this.prisma.deal.findUnique({
        where: { proposalId: id },
        select: { id: true, status: true },
      });
      if (concurrentDeal) return concurrentDeal;
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    }
    await this.notifications.create(proposal.createdByUserId, {
      type: 'PROPOSAL_ACCEPTED',
      title: 'Proposta aceita',
      body: 'Sua proposta foi aceita e uma negociação foi criada.',
      payload: { proposalId: id, dealId: deal.id },
    });
    return deal;
  }

  async reject(userId: string, id: string): Promise<unknown> {
    return this.changeStatus(userId, id, 'REJECTED');
  }
  async cancel(userId: string, id: string): Promise<unknown> {
    return this.changeStatus(userId, id, 'CANCELLED');
  }

  private async changeStatus(
    userId: string,
    id: string,
    status: 'REJECTED' | 'CANCELLED',
  ) {
    const proposal = await this.getProposal(id);
    await this.assertParticipant(
      userId,
      proposal.proposerCompanyId,
      proposal.listing.companyId,
    );
    if (
      proposal.status === 'ACCEPTED' ||
      proposal.status === 'REJECTED' ||
      proposal.status === 'CANCELLED'
    )
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    const result = await this.prisma.proposal.update({
      where: { id },
      data: { status },
      select: proposalSelect,
    });
    await this.notifications.create(proposal.createdByUserId, {
      type: status === 'REJECTED' ? 'PROPOSAL_REJECTED' : 'PROPOSAL_CANCELLED',
      title:
        status === 'REJECTED' ? 'Proposta rejeitada' : 'Proposta cancelada',
      body:
        status === 'REJECTED'
          ? 'Uma proposta foi rejeitada.'
          : 'Uma proposta foi cancelada.',
      payload: { proposalId: id },
    });
    return result;
  }

  private async getProposal(id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id },
      include: { listing: { select: { companyId: true, type: true } } },
    });
    if (!proposal) throw new NotFoundException('PROPOSAL_NOT_FOUND');
    return proposal;
  }
  private async assertMembership(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
  private async assertListingManager(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (
      !membership ||
      (membership.role !== 'OWNER' && membership.role !== 'ADMIN')
    )
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
  }
  private async assertParticipant(
    userId: string,
    proposerCompanyId: string,
    listingCompanyId: string,
  ) {
    const memberships = await this.prisma.companyMember.findMany({
      where: {
        userId,
        companyId: { in: [proposerCompanyId, listingCompanyId] },
      },
      select: { companyId: true },
    });
    if (memberships.length === 0)
      throw new ForbiddenException('PROPOSAL_ACCESS_DENIED');
  }
  private decimal(value: string, code: string) {
    const scale = code === 'INVALID_PRICE' ? 2 : 3;
    const maxIntegerDigits = code === 'INVALID_PRICE' ? 12 : 13;
    const pattern = new RegExp(
      `^\\d{1,${maxIntegerDigits}}(\\.\\d{1,${scale}})?$`,
    );
    if (
      !pattern.test(value) ||
      !Number.isFinite(Number(value)) ||
      Number(value) <= 0
    )
      throw new BadRequestException(code);
    return value;
  }

  private parseDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('INVALID_VALID_UNTIL');
    return date;
  }
}
