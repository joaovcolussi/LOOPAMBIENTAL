// Central label maps for backend enums. Every screen should render user-facing
// text through these maps so raw enum values never leak into the interface.

export function label(
  map: Record<string, string>,
  value: string | null | undefined,
) {
  if (!value) return '';
  return map[value] ?? value;
}

export const listingTypeLabels: Record<string, string> = {
  BUY: 'Compra',
  SELL: 'Venda',
};

export const listingStatusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em análise',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  NEGOTIATING: 'Em negociação',
  CLOSED: 'Encerrado',
  EXPIRED: 'Expirado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
};

export const listingFrequencyLabels: Record<string, string> = {
  ONE_TIME: 'Oferta única',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  CONTINUOUS: 'Contínua',
};

export const riskClassificationLabels: Record<string, string> = {
  NON_HAZARDOUS: 'Não perigoso',
  HAZARDOUS: 'Perigoso',
  UNKNOWN: 'Não informado',
};

export const contactVisibilityLabels: Record<string, string> = {
  PRIVATE: 'Privado',
  MEMBERS: 'Somente membros',
  PUBLIC: 'Público',
};

export const listingReasonLabels: Record<string, string> = {
  LISTING_CREATED: 'Anúncio criado',
  LISTING_SUBMITTED: 'Enviado para análise',
  LISTING_EDITED: 'Editado — voltou para análise',
  LISTING_MEDIA_ADDED: 'Fotos alteradas — voltou para análise',
  MODERATION_APPROVED: 'Aprovado pela moderação',
  MODERATION_REJECTED: 'Rejeitado pela moderação',
  LISTING_PAUSED: 'Anúncio pausado',
  LISTING_CLOSED: 'Anúncio encerrado',
  PROPOSAL_ACCEPTED: 'Proposta aceita — reservado',
};

export const proposalStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  COUNTERED: 'Contraproposta',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export const dealStatusLabels: Record<string, string> = {
  OPEN: 'Aberta',
  AWAITING_DOCUMENTS: 'Aguardando documentos',
  AWAITING_PAYMENT: 'Aguardando pagamento',
  AWAITING_PICKUP: 'Aguardando coleta',
  IN_TRANSIT: 'Em trânsito',
  DELIVERED: 'Entregue',
  COMPLETED: 'Concluída',
  DISPUTED: 'Em disputa',
  CANCELLED: 'Cancelada',
};

export const dealNoteLabels: Record<string, string> = {
  DEAL_CREATED: 'Negociação criada',
  CHECKOUT_CREATED: 'Pagamento iniciado',
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
};

export const paymentStatusLabels: Record<string, string> = {
  INITIATED: 'Iniciado',
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Estornado',
};

export const subscriptionStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Em atraso',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

export const companyStatusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  PENDING: 'Pendente',
  BLOCKED: 'Bloqueada',
};

export const verificationStatusLabels: Record<string, string> = {
  UNVERIFIED: 'Não verificada',
  PENDING: 'Em análise',
  VERIFIED: 'Verificada',
  REJECTED: 'Rejeitada',
};

export const companyDocumentStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

export const companyVerificationStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
};

export const documentTypeLabels: Record<string, string> = {
  CNPJ_CARD: 'Cartão CNPJ',
  SOCIAL_CONTRACT: 'Contrato social',
  ADDRESS_PROOF: 'Comprovante de endereço',
  OPERATING_LICENSE: 'Licença de operação',
  ENVIRONMENTAL_LICENSE: 'Licença ambiental',
  OTHER: 'Outro',
};

export const platformRoleLabels: Record<string, string> = {
  USER: 'Usuário',
  MODERATOR: 'Moderador',
  ADMIN: 'Administrador',
};

export const memberRoleLabels: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export const reportTargetTypeLabels: Record<string, string> = {
  LISTING: 'Anúncio',
  COMPANY: 'Empresa',
  USER: 'Usuário',
  MESSAGE: 'Mensagem',
};

export const reportReasonLabels: Record<string, string> = {
  COUNTERFEIT: 'Produto falsificado',
  PRODUCT_QUALITY: 'Qualidade do produto',
  MISLEADING: 'Informação enganosa',
  CONTACT_ABUSE: 'Uso indevido de contato',
  SPAM: 'Spam',
  ILLEGAL: 'Atividade ilegal',
  HAZARDOUS: 'Resíduo perigoso',
  UNDOCUMENTED: 'Sem documentação',
  OTHER: 'Outro',
};

export const reportStatusLabels: Record<string, string> = {
  OPEN: 'Aberta',
  IN_REVIEW: 'Em análise',
  RESOLVED: 'Resolvida',
  DISMISSED: 'Arquivada',
};

export const savedSearchFrequencyLabels: Record<string, string> = {
  NONE: 'Sem alertas',
  DAILY: 'Diário',
  WEEKLY: 'Semanal',
};

export const logisticsRequestStatusLabels: Record<string, string> = {
  REQUESTED: 'Solicitada',
  QUOTED: 'Com cotações',
  ACCEPTED: 'Aceita',
  IN_TRANSIT: 'Em trânsito',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

export const logisticsQuoteStatusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
  EXPIRED: 'Expirada',
};

export const moderationCaseStatusLabels: Record<string, string> = {
  OPEN: 'Aberto',
  IN_REVIEW: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};
