import {
  BadRequestException,
  ConflictException,
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
    await this.expireIfNeeded(proposal);
    if (proposal.status !== 'PENDING')
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    const quantity = this.decimal(input.quantity, 'INVALID_QUANTITY');
    const unitPrice = this.decimal(input.unitPrice, 'INVALID_PRICE');
    const result = await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.proposal.updateMany({
        where: {
          id,
          status: 'PENDING',
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
        data: { status: 'COUNTERED', quantity, unitPrice, notes: input.notes },
      });
      if (changed.count !== 1)
        throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
      await transaction.proposalRevision.create({
        data: {
          proposalId: id,
          actorUserId: userId,
          quantity,
          unitPrice,
          notes: input.notes,
        },
      });
      return transaction.proposal.findUnique({
        where: { id },
        select: proposalSelect,
      });
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
    await this.assertParticipant(
      userId,
      proposal.proposerCompanyId,
      proposal.listing.companyId,
    );
    const existingDeal = await this.prisma.deal.findUnique({
      where: { proposalId: id },
      select: {
        id: true,
        status: true,
        listingId: true,
        proposalId: true,
        createdAt: true,
      },
    });
    if (existingDeal) return existingDeal;
    if (proposal.status === 'PENDING')
      await this.assertListingManager(userId, proposal.listing.companyId);
    else if (proposal.status === 'COUNTERED')
      await this.assertProposalManager(
        userId,
        proposal.proposerCompanyId,
        proposal.createdByUserId,
      );
    else throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    await this.expireIfNeeded(proposal);
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
        where: {
          id,
          status: proposal.status,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
        data: { status: 'ACCEPTED' },
      });
      if (changed.count === 0) return null;
      const reserved = await transaction.listing.updateMany({
        where: {
          id: proposal.listingId,
          status: 'PUBLISHED',
          availableQuantity: { gte: proposal.quantity },
        },
        data: {
          status: 'NEGOTIATING',
          availableQuantity: { decrement: proposal.quantity },
        },
      });
      if (reserved.count !== 1)
        throw new ConflictException('LISTING_NO_LONGER_AVAILABLE');
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
        select: {
          id: true,
          status: true,
          listingId: true,
          proposalId: true,
          createdAt: true,
        },
      });
      if (concurrentDeal) return concurrentDeal;
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    }
    await this.notifications.create(
      proposal.status === 'COUNTERED'
        ? proposal.listing.createdByUserId
        : proposal.createdByUserId,
      {
        type: 'PROPOSAL_ACCEPTED',
        title: 'Proposta aceita',
        body: 'A proposta foi aceita e uma negociação foi criada.',
        payload: { proposalId: id, dealId: deal.id },
      },
    );
    return deal;
  }

  async reject(userId: string, id: string): Promise<unknown> {
    const proposal = await this.getProposal(id);
    if (proposal.status === 'PENDING')
      await this.assertListingManager(userId, proposal.listing.companyId);
    else if (proposal.status === 'COUNTERED')
      await this.assertProposalManager(
        userId,
        proposal.proposerCompanyId,
        proposal.createdByUserId,
      );
    else throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    await this.expireIfNeeded(proposal);
    return this.changeStatus(id, 'REJECTED', proposal.status);
  }
  async cancel(userId: string, id: string): Promise<unknown> {
    const proposal = await this.getProposal(id);
    await this.assertProposalManager(
      userId,
      proposal.proposerCompanyId,
      proposal.createdByUserId,
    );
    if (proposal.status !== 'PENDING')
      throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
    await this.expireIfNeeded(proposal);
    return this.changeStatus(id, 'CANCELLED', 'PENDING');
  }

  private async changeStatus(
    id: string,
    status: 'REJECTED' | 'CANCELLED',
    currentStatus: 'PENDING' | 'COUNTERED',
  ) {
    const proposal = await this.getProposal(id);
    const result = await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.proposal.updateMany({
        where: {
          id,
          status: currentStatus,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
        data: { status },
      });
      if (changed.count !== 1)
        throw new BadRequestException('INVALID_PROPOSAL_TRANSITION');
      return transaction.proposal.findUnique({
        where: { id },
        select: proposalSelect,
      });
    });
    await this.notifications.create(
      status === 'CANCELLED' || currentStatus === 'COUNTERED'
        ? proposal.listing.createdByUserId
        : proposal.createdByUserId,
      {
        type:
          status === 'REJECTED' ? 'PROPOSAL_REJECTED' : 'PROPOSAL_CANCELLED',
        title:
          status === 'REJECTED' ? 'Proposta rejeitada' : 'Proposta cancelada',
        body:
          status === 'REJECTED'
            ? 'Uma proposta foi rejeitada.'
            : 'Uma proposta foi cancelada.',
        payload: { proposalId: id },
      },
    );
    return result;
  }

  private async getProposal(id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id },
      include: {
        listing: {
          select: { companyId: true, type: true, createdByUserId: true },
        },
      },
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
  private async assertProposalManager(
    userId: string,
    companyId: string,
    creatorId: string,
  ) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership || (membership.role === 'MEMBER' && creatorId !== userId))
      throw new ForbiddenException('PROPOSAL_MANAGEMENT_REQUIRED');
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
  private async expireIfNeeded(proposal: {
    id: string;
    status: string;
    validUntil: Date | null;
  }) {
    if (
      proposal.validUntil &&
      proposal.validUntil.getTime() <= Date.now() &&
      (proposal.status === 'PENDING' || proposal.status === 'COUNTERED')
    ) {
      await this.prisma.proposal.updateMany({
        where: {
          id: proposal.id,
          status: proposal.status as 'PENDING' | 'COUNTERED',
        },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('PROPOSAL_EXPIRED');
    }
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
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now())
      throw new BadRequestException('INVALID_VALID_UNTIL');
    return date;
  }
}
