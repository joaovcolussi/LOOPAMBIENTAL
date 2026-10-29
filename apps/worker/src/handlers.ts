import type { PrismaClient } from '@loopambiental/database';
import { EmailSender } from './email';

export type OutboxPayload = Record<string, unknown>;

export type HandlerContext = {
  prisma: PrismaClient;
  email: EmailSender;
  log: (message: string) => void;
  warn: (message: string) => void;
};

export type OutboxHandler = (
  payload: OutboxPayload,
  context: HandlerContext,
) => Promise<void>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function companyRecipients(
  prisma: PrismaClient,
  companyId: string,
): Promise<{ name: string; emails: string[] }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { legalName: true, tradeName: true, contactEmail: true },
  });
  const members = await prisma.companyMember.findMany({
    where: { companyId, role: { in: ['OWNER', 'ADMIN'] } },
    select: { user: { select: { email: true } } },
  });
  const emails = new Set<string>();
  if (company?.contactEmail) emails.add(company.contactEmail);
  for (const member of members) emails.add(member.user.email);
  return {
    name: company?.tradeName || company?.legalName || 'sua empresa',
    emails: [...emails],
  };
}

export const handlers: Record<string, OutboxHandler> = {
  'company.verification.approved': async (payload, context) => {
    const companyId = asString(payload.companyId);
    if (!companyId) return;
    const { name, emails } = await companyRecipients(context.prisma, companyId);
    await Promise.all(
      emails.map((email) =>
        context.email.send(
          email,
          'Empresa verificada na LOOP AMBIENTAL',
          `A verificação de ${name} foi aprovada. O selo de empresa verificada já está visível na plataforma.`,
        ),
      ),
    );
  },

  'company.verification.rejected': async (payload, context) => {
    const companyId = asString(payload.companyId);
    if (!companyId) return;
    const reason = asString(payload.reason);
    const { name, emails } = await companyRecipients(context.prisma, companyId);
    await Promise.all(
      emails.map((email) =>
        context.email.send(
          email,
          'Verificação de empresa recusada',
          `A verificação de ${name} foi recusada.${reason ? ` Motivo: ${reason}` : ''}`,
        ),
      ),
    );
  },

  'deal.created': async (payload, context) => {
    const dealId = asString(payload.dealId);
    if (!dealId) return;
    const deal = await context.prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        listing: { select: { title: true } },
        buyerCompany: {
          select: { id: true, legalName: true, tradeName: true },
        },
        sellerCompany: {
          select: { id: true, legalName: true, tradeName: true },
        },
      },
    });
    if (!deal) return;
    const title = deal.listing.title;
    const pairs: Array<[string, string]> = [
      [
        deal.buyerCompany.id,
        deal.buyerCompany.tradeName || deal.buyerCompany.legalName,
      ],
      [
        deal.sellerCompany.id,
        deal.sellerCompany.tradeName || deal.sellerCompany.legalName,
      ],
    ];
    await Promise.all(
      pairs.map(async ([companyId, name]) => {
        const { emails } = await companyRecipients(context.prisma, companyId);
        await Promise.all(
          emails.map((email) =>
            context.email.send(
              email,
              'Nova negociação iniciada',
              `Uma nova negociação foi criada para "${title}". Acompanhe os detalhes em sua área autenticada. (${name})`,
            ),
          ),
        );
      }),
    );
  },

  'payment.confirmed': async (payload, context) => {
    const companyId = asString(payload.companyId);
    if (!companyId) return;
    const purpose = asString(payload.purpose) || 'DEAL';
    let subject = 'Pagamento confirmado';
    let body = 'Um pagamento da sua empresa foi confirmado.';
    if (purpose === 'DEAL') {
      const dealId = asString(payload.dealId);
      const deal = dealId
        ? await context.prisma.deal.findUnique({
            where: { id: dealId },
            select: { listing: { select: { title: true } } },
          })
        : null;
      const title = deal?.listing.title ?? 'sua negociação';
      body = `O pagamento da negociação "${title}" foi confirmado. A coleta já pode ser agendada.`;
    } else if (purpose === 'SUBSCRIPTION') {
      subject = 'Assinatura ativada';
      body =
        'O pagamento da assinatura foi confirmado e o plano já está ativo.';
    } else if (purpose === 'CONTACT_UNLOCK') {
      subject = 'Contato liberado';
      body =
        'O pagamento do desbloqueio foi confirmado. O contato do anunciante já está disponível.';
    }
    const { emails } = await companyRecipients(context.prisma, companyId);
    await Promise.all(
      emails.map((email) => context.email.send(email, subject, body)),
    );
  },

  'deal.status.changed': async (payload, context) => {
    const dealId = asString(payload.dealId);
    const to = asString(payload.to);
    if (!dealId || !to) return;
    context.log(`Deal ${dealId} moved to ${to}`);
  },
};

export async function handleOutboxEvent(
  event: { type: string; payload: unknown },
  context: HandlerContext,
): Promise<void> {
  const handler = handlers[event.type];
  if (!handler) {
    context.warn(`No handler registered for outbox event "${event.type}"`);
    return;
  }
  const payload =
    event.payload && typeof event.payload === 'object'
      ? (event.payload as OutboxPayload)
      : {};
  await handler(payload, context);
}
