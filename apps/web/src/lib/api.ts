const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type ApiError = {
  error?: { code?: string; message?: string };
  message?: string | string[];
};

export function isAuthenticationError(error: unknown) {
  return (
    error instanceof Error &&
    ['AUTHENTICATION_REQUIRED', 'INVALID_CREDENTIALS'].includes(error.message)
  );
}

export const apiBaseUrl = API_URL;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const method = init?.method?.toUpperCase() ?? 'GET';
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(method === 'GET' || method === 'HEAD'
          ? {}
          : { 'X-App-Action': '1' }),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('API_UNAVAILABLE');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    const message = typeof body.message === 'string' ? body.message : '';
    throw new Error(body.error?.code || message || 'REQUEST_FAILED');
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function adminQuery(
  input?: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();
  if (input) {
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== '' && value !== false)
        params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  platformRole: string;
  createdAt: string;
};

export type Company = {
  id: string;
  slug?: string | null;
  legalName: string;
  tradeName: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  taxIdMasked?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactWhatsapp?: string | null;
  addressLine?: string | null;
  addressNumber?: string | null;
  addressDistrict?: string | null;
  addressPostalCode?: string | null;
  contactVisibility?: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
  status: string;
  verification: string;
  createdAt: string;
};

export type Category = { id: string; name: string; slug: string };
export type PublicCompany = {
  id: string;
  slug: string | null;
  legalName: string;
  tradeName: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  verification: string;
  ratingAverage: string | number;
  ratingCount: number;
  createdAt: string;
};
export type Material = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  defaultUnit: string;
};
export type MaterialAttribute = {
  id: string;
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
  unit: string | null;
  options: string[] | null;
  isFilterable: boolean;
  sortOrder: number;
};
export type ListingAttributeValue = {
  valueText: string | null;
  valueNumber: string | null;
  attribute: Pick<
    MaterialAttribute,
    'id' | 'key' | 'label' | 'type' | 'unit' | 'sortOrder'
  >;
};
export type ListingFormValues = {
  companyId: string;
  categoryId: string;
  materialId?: string;
  type: 'BUY' | 'SELL';
  title: string;
  description?: string;
  quantity: string;
  unit: string;
  unitPrice?: string;
  frequency?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS';
  riskClassification?: 'NON_HAZARDOUS' | 'HAZARDOUS' | 'UNKNOWN';
  originDetails?: string;
  ownTransport?: boolean;
  requiresDocuments?: boolean;
  city?: string;
  state?: string;
  attributes?: { attributeId: string; value: string }[];
};
export type ListingDetail = {
  id: string;
  companyId?: string;
  categoryId?: string;
  materialId?: string | null;
  attributes?: ListingAttributeValue[];
  type: 'BUY' | 'SELL';
  title: string;
  slug: string;
  description: string | null;
  quantity: string;
  availableQuantity: string;
  unit: string;
  unitPrice: string | null;
  currency: string;
  frequency: string;
  riskClassification: string;
  originDetails: string | null;
  ownTransport: boolean;
  requiresDocuments: boolean;
  city: string | null;
  state: string | null;
  publishedAt: string | null;
  createdAt: string;
  lastAccessAt: string;
  contactUnlocked: boolean;
  unlockRequired: boolean;
  category: { id: string; name: string; slug: string };
  material: { id: string; name: string; slug: string } | null;
  company: {
    id: string;
    slug: string | null;
    legalName: string;
    tradeName: string | null;
    verification: string;
    description?: string | null;
    city?: string | null;
    state?: string | null;
    contactVisibility: string;
    contact: {
      name: string | null;
      email: string | null;
      whatsapp: string | null;
      addressLine: string | null;
      addressNumber: string | null;
      addressDistrict: string | null;
      addressPostalCode: string | null;
    } | null;
  };
  createdBy: { id: string; name: string };
  media: ListingMedia[];
  documents: ListingDocument[];
  statusHistory: ListingStatusHistoryEntry[];
};
export type ListingDocumentType =
  'TECHNICAL_REPORT' | 'LAB_ANALYSIS' | 'SAFETY_DATA_SHEET' | 'OTHER';
export type ListingDocument = {
  id: string;
  type: ListingDocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  validUntil: string | null;
  createdAt: string;
};
export type ListingMedia = {
  id: string;
  altText: string | null;
  sortOrder: number;
};
export type ListingStatusHistoryEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
};
export type DealStatusHistoryEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
};
export type ListingCard = {
  id: string;
  type: 'BUY' | 'SELL';
  title: string;
  slug: string;
  status: string;
  quantity: string;
  availableQuantity: string;
  unit: string;
  unitPrice: string | null;
  currency: string;
  frequency: string;
  riskClassification: string;
  originDetails: string | null;
  ownTransport: boolean;
  requiresDocuments: boolean;
  city: string | null;
  state: string | null;
  publishedAt: string | null;
  createdAt: string;
  company: {
    id: string;
    slug: string | null;
    tradeName: string | null;
    legalName: string;
    verification: string;
  };
  createdBy: { id: string; name: string };
  category: { id: string; name: string; slug: string };
  material: { id: string; name: string; slug: string } | null;
  media: ListingMedia[];
};
export type ModerationCase = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    type: string;
    status: string;
    description: string | null;
    quantity: string;
    unit: string;
    unitPrice: string | null;
    currency: string;
    city: string | null;
    state: string | null;
    riskClassification: string;
    requiresDocuments: boolean;
    ownTransport: boolean;
    company: { legalName: string; tradeName: string | null };
    category: { name: string };
    media: ListingMedia[];
    documents: ListingDocument[];
  };
};
export type Favorite = {
  createdAt: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    type: string;
    status: string;
    city: string | null;
    state: string | null;
    quantity: string;
    unit: string;
    company: { legalName: string; tradeName: string | null };
    category: { name: string; slug: string };
  };
};
export type Proposal = {
  id: string;
  listingId: string;
  proposerCompanyId: string;
  createdByUserId: string;
  quantity: string;
  unitPrice: string;
  currency: string;
  notes: string | null;
  status: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    type: string;
    status: string;
    companyId: string;
    company: { legalName: string; tradeName: string | null };
  };
  proposerCompany: { id: string; legalName: string; tradeName: string | null };
  deal: {
    id: string;
    status: string;
    createdAt: string;
    statusHistory: DealStatusHistoryEntry[];
  } | null;
  validUntil: string | null;
  updatedAt: string;
  revisions: {
    id: string;
    quantity: string;
    unitPrice: string;
    notes: string | null;
    actorUserId: string;
    createdAt: string;
  }[];
};

export function listingMediaUrl(id: string, owner = false) {
  return `${API_URL}/listings/media/${id}${owner ? '/owner' : ''}`;
}

export function listingDocumentUrl(id: string, owner = false) {
  return `${API_URL}/listings/documents/${id}${owner ? '/owner' : ''}`;
}

export function moderationDocumentUrl(id: string) {
  return `${API_URL}/admin/moderation/cases/documents/${id}`;
}

export function moderationMediaUrl(id: string) {
  return `${API_URL}/admin/moderation/cases/media/${id}`;
}

export function companyDocumentUrl(companyId: string, documentId: string) {
  return `${API_URL}/companies/${companyId}/documents/${documentId}/file`;
}

export type Conversation = {
  id: string;
  proposalId: string | null;
  dealId: string | null;
  updatedAt: string;
  unreadCount: number;
  listing: { id: string; title: string } | null;
  participants: {
    userId: string;
    user: { id: string; name: string };
    lastReadAt: string | null;
  }[];
  messages: { body: string; createdAt: string; senderUserId: string }[];
};
export type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  sender: { id: string; name: string };
};
export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
};
export type AdminStats = {
  generatedAt: string;
  kpis: {
    users: number;
    companies: number;
    verifiedCompanies: number;
    totalProposals: number;
    activeDeals: number;
    publishedListings: number;
    acceptedDeals: number;
    openModeration: number;
    grossTransactionValue: number;
    estimatedCommissionMin: number;
    estimatedCommissionMax: number;
    pipelineValue: number;
    conversionRate: number;
  };
  usersByStatus: { status: string; total: number }[];
  listingsByStatus: { status: string; total: number }[];
  listingsByType: { type: string; total: number }[];
  proposalsByStatus: { status: string; total: number }[];
  dealsByStatus: { status: string; total: number }[];
  demandByCategory: {
    category: string;
    id: string;
    listings: number;
    proposals: number;
  }[];
};
export type HomeCarouselSlide = {
  id: string;
  position: number;
  altText: string;
  sha256: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: { id: string; name: string };
};

export function carouselImageUrl(slide: HomeCarouselSlide) {
  return `${API_URL}/home-carousel/slides/${slide.position}/image/${slide.sha256}`;
}
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  platformRole: 'USER' | 'MODERATOR' | 'ADMIN';
  emailVerifiedAt: string | null;
  createdAt: string;
};
export type AdminCursorPagination = {
  pageSize: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
};
export type AdminCompanyRow = {
  id: string;
  slug: string | null;
  legalName: string;
  tradeName: string | null;
  status: string;
  verification: string;
  city: string | null;
  state: string | null;
  createdAt: string;
  _count: { members: number; listings: number };
};
export type AdminListingRow = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  city: string | null;
  state: string | null;
  quantity: string;
  unit: string;
  publishedAt: string | null;
  createdAt: string;
  company: { id: string; legalName: string; tradeName: string | null };
  category: { id: string; name: string; slug: string };
};
export type AdminPaymentRow = {
  id: string;
  dealId: string;
  provider: string;
  externalId: string | null;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  company: { id: string; legalName: string; tradeName: string | null };
  deal: {
    id: string;
    status: string;
    proposal: { listing: { id: string; title: string } };
  };
};
export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  currency: string;
  features: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
};
export type AdminSubscriptionRow = {
  id: string;
  provider: string;
  externalId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  company: { id: string; legalName: string; tradeName: string | null };
  plan: { id: string; code: string; name: string; priceMonthly: string };
};
export type AdminAuditLog = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
};
export type PlatformSettingItem = {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'string';
  value: number | string;
  updatedAt: string | null;
  updatedBy: { id: string; name: string } | null;
};
export type ListingFacets = {
  categories: { id: string; name: string; slug: string; total: number }[];
  types: { value: string; total: number }[];
  states: { value: string; total: number }[];
};
export type PlanPublic = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: string;
  currency: string;
  features: Record<string, unknown> | null;
};
export type CompanySubscription = {
  id: string;
  provider: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  plan: PlanPublic;
};
export type SubscriptionUsage = {
  contactUnlocks: {
    used: number;
    limit: number | null;
    remaining: number | null;
  };
};
export type ContactUnlock = {
  id: string;
  companyId: string;
  source: string;
  createdAt: string;
};
export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt?: string;
  authorCompany: { id: string; legalName: string; tradeName: string | null };
  reviewedCompany?: { id: string; legalName: string; tradeName: string | null };
  authorUser: { id: string; name: string };
};
export type PendingReview = {
  dealId: string;
  listing: { id: string; title: string; slug: string };
  authorCompany: { id: string; legalName: string; tradeName: string | null };
  reviewedCompany: { id: string; legalName: string; tradeName: string | null };
  completedAt: string;
};
export type CompanyReviews = {
  summary: { average: number; count: number };
  reviews: Review[];
};
export type AccountProfile = AuthUser & {
  emailVerifiedAt: string | null;
  mfaEnabledAt: string | null;
  mfaRecoveryCodesRemaining: number;
  consents: {
    id: string;
    type: 'TERMS' | 'PRIVACY';
    version: string;
    acceptedAt: string;
  }[];
  currentLegalVersions: { terms: string; privacy: string };
};
export type AccountSession = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};
export type PaymentPurpose = 'DEAL' | 'SUBSCRIPTION' | 'CONTACT_UNLOCK';
export type Payment = {
  id: string;
  purpose: PaymentPurpose;
  dealId: string | null;
  subscriptionId: string | null;
  listingId: string | null;
  companyId: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  checkoutUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  deal?: { proposal: { listing: { title: string } } } | null;
  listing?: { title: string; slug: string } | null;
  subscription?: { plan: { name: string } } | null;
  company?: { legalName: string; tradeName: string | null };
};
export type PaymentRequired = { paymentRequired: true; payment: Payment };
export type DealStatus =
  | 'OPEN'
  | 'AWAITING_DOCUMENTS'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_PICKUP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'CANCELLED';
export type DealAction =
  | 'request-documents'
  | 'confirm-documents'
  | 'confirm-shipment'
  | 'confirm-delivery'
  | 'complete'
  | 'dispute'
  | 'cancel';
type CompanyRef = {
  id: string;
  legalName: string;
  tradeName: string | null;
  slug: string | null;
};
export type DealSummary = {
  id: string;
  status: DealStatus;
  side: 'BUYER' | 'SELLER';
  createdAt: string;
  updatedAt: string;
  buyerCompanyId: string;
  sellerCompanyId: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    unit: string;
    type: string;
  };
  proposal: {
    id: string;
    quantity: string;
    unitPrice: string;
    currency: string;
  };
  buyerCompany: CompanyRef;
  sellerCompany: CompanyRef;
};
export type DealDetail = DealSummary & {
  availableActions: DealAction[];
  statusHistory: DealStatusHistoryEntry[];
  paymentTransactions: Pick<
    Payment,
    | 'id'
    | 'amount'
    | 'currency'
    | 'status'
    | 'provider'
    | 'checkoutUrl'
    | 'paidAt'
    | 'createdAt'
  >[];
  logisticsRequests: {
    id: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    shipment: { id: string; trackingCode: string; status: string } | null;
  }[];
  conversation: { id: string } | null;
  reviews: { id: string; authorCompanyId: string; rating: number }[];
};
export type CursorPagination = {
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
};
export type ShipmentEvent = {
  id: string;
  status: string;
  description: string;
  location: string | null;
  createdAt: string;
};
export type Shipment = {
  id: string;
  trackingCode: string;
  carrierName: string;
  status: string;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  events: ShipmentEvent[];
};
export type LogisticsRequest = {
  id: string;
  dealId: string;
  origin: string;
  destination: string;
  quantity: string;
  unit: string;
  pickupWindow: string | null;
  requirements: string | null;
  status: string;
  createdAt: string;
  deal?: { id: string; status: string; listing: { title: string } };
  requestedBy?: { id: string; name: string };
  shipment: Shipment | null;
  quotes: {
    id: string;
    carrierName: string;
    amount: string;
    currency: string;
    estimatedDays: number | null;
    notes: string | null;
    status: string;
  }[];
};

export type CompanyDocumentType =
  | 'CNPJ_CARD'
  | 'SOCIAL_CONTRACT'
  | 'ADDRESS_PROOF'
  | 'OPERATING_LICENSE'
  | 'ENVIRONMENTAL_LICENSE'
  | 'OTHER';

export type CompanyDocument = {
  id: string;
  type: CompanyDocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: { id: string; name: string };
};

export type CompanyVerification = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
};

export type AdminCompanyVerification = CompanyVerification & {
  company: {
    id: string;
    legalName: string;
    tradeName: string | null;
    city: string | null;
    state: string | null;
    verification: string;
    contactName: string | null;
    contactEmail: string | null;
    documents: CompanyDocument[];
  };
};

export type CompanyMember = {
  companyId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: { id: string; name: string; email: string; status: string };
};

export type CompanyInvitation = {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string };
};

export type InvitationInfo = {
  id: string;
  status: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  expiresAt: string;
  expired: boolean;
  emailMasked: string;
  emailMatches: boolean;
  company: { id: string; name: string };
};

export type Report = {
  id: string;
  targetType: 'LISTING' | 'COMPANY' | 'USER' | 'MESSAGE';
  reason: string;
  details: string | null;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string } | null;
  listing: { id: string; title: string; slug: string; status: string } | null;
  company: { id: string; legalName: string; tradeName: string | null } | null;
  reportedUser: { id: string; name: string; email: string } | null;
  message: {
    id: string;
    body: string;
    conversationId: string;
    senderUserId: string;
  } | null;
};

export type SavedSearchFilters = {
  q?: string;
  type?: 'BUY' | 'SELL';
  categoryId?: string;
  state?: string;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  frequency: 'NONE' | 'DAILY' | 'WEEKLY';
  isActive: boolean;
  lastProcessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const api = {
  register: (input: {
    name: string;
    email: string;
    password: string;
    acceptTerms: boolean;
  }) =>
    request<{ user: AuthUser; verificationRequired: boolean }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
  login: (input: { email: string; password: string }) =>
    request<
      | { user: AuthUser; mfaRequired?: undefined }
      | { mfaRequired: true; challengeToken: string; user?: undefined }
    >('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  verifyMfa: (challengeToken: string, code: string) =>
    request<{ user: AuthUser }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    }),
  resendVerification: (email: string) =>
    request<{ requested: boolean }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  me: () => request<{ user: AuthUser }>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  companies: () => request<{ companies: Company[] }>('/companies'),
  createCompany: (input: {
    legalName: string;
    tradeName?: string;
    description?: string;
    city?: string;
    state?: string;
    taxId?: string;
    contactName?: string;
    contactEmail?: string;
    contactWhatsapp?: string;
    addressLine?: string;
    addressNumber?: string;
    addressDistrict?: string;
    addressPostalCode?: string;
    contactVisibility?: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
  }) =>
    request<{ company: Company }>('/companies', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateCompany: (
    id: string,
    input: Partial<{
      legalName: string;
      tradeName: string;
      description: string;
      city: string;
      state: string;
      taxId: string;
      contactName: string;
      contactEmail: string;
      contactWhatsapp: string;
      addressLine: string;
      addressNumber: string;
      addressDistrict: string;
      addressPostalCode: string;
      contactVisibility: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
    }>,
  ) =>
    request<{ company: Company }>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  companyDocuments: (companyId: string) =>
    request<{ documents: CompanyDocument[] }>(
      `/companies/${companyId}/documents`,
    ),
  uploadCompanyDocument: (
    companyId: string,
    input: { type: CompanyDocumentType; file: File },
  ) => {
    const body = new FormData();
    body.append('type', input.type);
    body.append('document', input.file);
    return request<{ document: CompanyDocument }>(
      `/companies/${companyId}/documents`,
      { method: 'POST', body },
    );
  },
  deleteCompanyDocument: (companyId: string, documentId: string) =>
    request<{ id: string; removed: boolean }>(
      `/companies/${companyId}/documents/${documentId}`,
      { method: 'DELETE' },
    ),
  companyVerifications: (companyId: string) =>
    request<{ verifications: CompanyVerification[] }>(
      `/companies/${companyId}/verification`,
    ),
  requestCompanyVerification: (companyId: string, notes?: string) =>
    request<{ verification: CompanyVerification }>(
      `/companies/${companyId}/verification`,
      { method: 'POST', body: JSON.stringify({ notes }) },
    ),
  adminCompanyVerifications: () =>
    request<{ verifications: AdminCompanyVerification[] }>(
      '/admin/company-verifications',
    ),
  approveCompanyVerification: (id: string) =>
    request<{ verification: CompanyVerification }>(
      `/admin/company-verifications/${id}/approve`,
      { method: 'POST', headers: { 'X-Admin-Action': '1' } },
    ),
  rejectCompanyVerification: (id: string, reason: string) =>
    request<{ verification: CompanyVerification }>(
      `/admin/company-verifications/${id}/reject`,
      {
        method: 'POST',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify({ reason }),
      },
    ),
  companyMembers: (companyId: string) =>
    request<{ members: CompanyMember[] }>(`/companies/${companyId}/members`),
  inviteCompanyMember: (
    companyId: string,
    input: { email: string; role: 'ADMIN' | 'MEMBER' },
  ) =>
    request<{ invitation: CompanyInvitation }>(
      `/companies/${companyId}/members`,
      { method: 'POST', body: JSON.stringify(input) },
    ),
  companyInvitations: (companyId: string) =>
    request<{ invitations: CompanyInvitation[] }>(
      `/companies/${companyId}/invitations`,
    ),
  revokeCompanyInvitation: (companyId: string, invitationId: string) =>
    request<{ id: string; revoked: boolean }>(
      `/companies/${companyId}/invitations/${invitationId}`,
      { method: 'DELETE' },
    ),
  changeCompanyMemberRole: (
    companyId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER',
  ) =>
    request<{ member: CompanyMember }>(
      `/companies/${companyId}/members/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
    ),
  removeCompanyMember: (companyId: string, userId: string) =>
    request<{ userId: string; removed: boolean }>(
      `/companies/${companyId}/members/${userId}`,
      { method: 'DELETE' },
    ),
  invitation: (token: string) =>
    request<{ invitation: InvitationInfo }>(`/invitations/${token}`),
  acceptInvitation: (token: string) =>
    request<{ membership: { companyId: string; role: string } }>(
      `/invitations/${token}/accept`,
      { method: 'POST' },
    ),
  createReport: (input: {
    targetType: 'LISTING' | 'COMPANY' | 'USER' | 'MESSAGE';
    listingId?: string;
    companyId?: string;
    reportedUserId?: string;
    messageId?: string;
    reason: string;
    details?: string;
  }) =>
    request<{ report: Report }>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  adminReports: () => request<{ reports: Report[] }>('/admin/reports'),
  resolveReport: (
    id: string,
    input: { status: 'RESOLVED' | 'DISMISSED'; notes?: string },
  ) =>
    request<{ report: Report }>(`/admin/reports/${id}/resolve`, {
      method: 'POST',
      headers: { 'X-Admin-Action': '1' },
      body: JSON.stringify(input),
    }),
  savedSearches: () =>
    request<{ savedSearches: SavedSearch[] }>('/saved-searches'),
  createSavedSearch: (input: {
    name: string;
    filters: SavedSearchFilters;
    frequency: 'NONE' | 'DAILY' | 'WEEKLY';
  }) =>
    request<{ savedSearch: SavedSearch }>('/saved-searches', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateSavedSearch: (
    id: string,
    input: {
      name?: string;
      filters?: SavedSearchFilters;
      frequency?: 'NONE' | 'DAILY' | 'WEEKLY';
      isActive?: boolean;
    },
  ) =>
    request<{ savedSearch: SavedSearch }>(`/saved-searches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteSavedSearch: (id: string) =>
    request<{ id: string; removed: boolean }>(`/saved-searches/${id}`, {
      method: 'DELETE',
    }),
  savedSearchResults: (id: string, page = 1) =>
    request<{
      data: { id: string; title: string; slug: string }[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/saved-searches/${id}/results?page=${page}`),
  runSavedSearchAlerts: () =>
    request<{ processed: number; notified: number }>(
      '/admin/saved-search-alerts/run',
      { method: 'POST', headers: { 'X-Admin-Action': '1' } },
    ),
  categories: () => request<{ categories: Category[] }>('/categories'),
  category: (slug: string) =>
    request<{ category: Category; listings: ListingCard[] }>(
      `/categories/${slug}`,
    ),
  publicCompany: (slug: string) =>
    request<{ company: PublicCompany; listings: ListingCard[] }>(
      `/companies/public/${slug}`,
    ),
  plans: () => request<{ plans: PlanPublic[] }>('/plans'),
  companySubscription: (companyId: string) =>
    request<{
      subscription: CompanySubscription | null;
      pending:
        | (CompanySubscription & {
            payments: Pick<
              Payment,
              'id' | 'amount' | 'checkoutUrl' | 'status'
            >[];
          })
        | null;
      usage: SubscriptionUsage;
    }>(`/companies/${companyId}/subscription`),
  activateCompanySubscription: (companyId: string, planId: string) =>
    request<
      CompanySubscription & { paymentRequired?: boolean; payment?: Payment }
    >(`/companies/${companyId}/subscription`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  cancelCompanySubscription: (companyId: string) =>
    request<CompanySubscription>(`/companies/${companyId}/subscription`, {
      method: 'DELETE',
    }),
  unlockListingContact: (listingId: string, companyId: string) =>
    request<ContactUnlock | PaymentRequired>(
      `/listings/${listingId}/contact-unlock`,
      {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      },
    ),
  listingContactUnlockStatus: (listingId: string) =>
    request<{ unlocked: boolean; unlock: ContactUnlock | null }>(
      `/listings/${listingId}/contact-unlock`,
    ),
  pendingReviews: () =>
    request<{ pending: PendingReview[] }>('/reviews/pending'),
  dealReviews: (dealId: string) =>
    request<{ reviews: Review[] }>(`/deals/${dealId}/reviews`),
  createReview: (
    dealId: string,
    input: { rating: number; comment?: string; authorCompanyId: string },
  ) =>
    request<Review>(`/deals/${dealId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  companyReviews: (slugOrId: string) =>
    request<CompanyReviews>(`/companies/${slugOrId}/reviews`),
  materials: (categoryId?: string) =>
    request<{ materials: Material[] }>(
      `/materials${categoryId ? `?categoryId=${categoryId}` : ''}`,
    ),
  listings: (input?: {
    page?: number;
    pageSize?: number;
    q?: string;
    type?: 'BUY' | 'SELL';
    categoryId?: string;
    state?: string;
    city?: string;
    verified?: boolean;
    minPrice?: string;
    maxPrice?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    sort?: 'recent' | 'relevance' | 'distance';
    cursor?: string;
    attr?: string[];
  }) => {
    const params = new URLSearchParams();
    for (const value of input?.attr ?? []) params.append('attr', value);
    if (input?.page) params.set('page', String(input.page));
    if (input?.pageSize) params.set('pageSize', String(input.pageSize));
    if (input?.q) params.set('q', input.q);
    if (input?.type) params.set('type', input.type);
    if (input?.categoryId) params.set('categoryId', input.categoryId);
    if (input?.state) params.set('state', input.state);
    if (input?.city) params.set('city', input.city);
    if (input?.verified) params.set('verified', 'true');
    if (input?.minPrice) params.set('minPrice', input.minPrice);
    if (input?.maxPrice) params.set('maxPrice', input.maxPrice);
    if (input?.latitude !== undefined)
      params.set('latitude', String(input.latitude));
    if (input?.longitude !== undefined)
      params.set('longitude', String(input.longitude));
    if (input?.radiusKm) params.set('radiusKm', String(input.radiusKm));
    if (input?.sort) params.set('sort', input.sort);
    if (input?.cursor) params.set('cursor', input.cursor);
    const query = params.toString();
    return request<{
      data: (ListingCard & { score?: number; distanceKm?: number | null })[];
      sort: 'recent' | 'relevance' | 'distance';
      facets: ListingFacets;
      pagination: {
        pageSize: number;
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
        page?: number;
        totalPages?: number;
      };
    }>(`/listings${query ? `?${query}` : ''}`);
  },
  listingBySlug: (slug: string) =>
    request<{ listing: ListingDetail }>(`/listings/${slug}`),
  myListing: (id: string) =>
    request<{ listing: ListingDetail & { status: string } }>(
      `/listings/mine/${id}`,
    ),
  createListing: (input: ListingFormValues) =>
    request<{ listing: { id: string } }>('/listings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateListing: (id: string, input: Partial<ListingFormValues>) =>
    request<{ listing: { id: string; status: string } }>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  categoryAttributes: (categoryId: string) =>
    request<{ attributes: MaterialAttribute[] }>(
      `/categories/${categoryId}/attributes`,
    ),
  myListings: () => request<{ listings: ListingCard[] }>('/listings/mine'),
  uploadListingPhotos: (id: string, photos: File[]) => {
    const body = new FormData();
    photos.forEach((photo) => body.append('photos', photo));
    return request<{ media: ListingMedia[] }>(`/listings/${id}/media`, {
      method: 'POST',
      body,
    });
  },
  uploadListingDocument: (
    id: string,
    input: { file: File; type: ListingDocumentType; validUntil?: string },
  ) => {
    const body = new FormData();
    body.append('type', input.type);
    if (input.validUntil) body.append('validUntil', input.validUntil);
    body.append('document', input.file);
    return request<{ document: ListingDocument }>(`/listings/${id}/documents`, {
      method: 'POST',
      body,
    });
  },
  removeListingDocument: (id: string, documentId: string) =>
    request<void>(`/listings/${id}/documents/${documentId}`, {
      method: 'DELETE',
    }),
  submitListing: (id: string) =>
    request<{ listing: unknown }>(`/listings/${id}/submit`, {
      method: 'POST',
    }),
  moderationCases: () =>
    request<{ cases: ModerationCase[] }>('/admin/moderation/cases'),
  approveModeration: (id: string) =>
    request<{ listing: unknown }>(`/admin/moderation/cases/${id}/approve`, {
      method: 'POST',
      headers: { 'X-Admin-Action': '1' },
    }),
  rejectModeration: (id: string, reason: string) =>
    request<{ listing: unknown }>(`/admin/moderation/cases/${id}/reject`, {
      method: 'POST',
      headers: { 'X-Admin-Action': '1' },
      body: JSON.stringify({ reason }),
    }),
  favorites: () => request<{ favorites: Favorite[] }>('/favorites'),
  addFavorite: (id: string) =>
    request<{ listingId: string; favorited: boolean }>(
      `/listings/${id}/favorite`,
      { method: 'POST' },
    ),
  removeFavorite: (id: string) =>
    request<{ listingId: string; favorited: boolean }>(
      `/listings/${id}/favorite`,
      { method: 'DELETE' },
    ),
  proposals: () => request<{ proposals: Proposal[] }>('/proposals'),
  proposal: (id: string) => request<{ proposal: Proposal }>(`/proposals/${id}`),
  createProposal: (input: {
    listingId: string;
    proposerCompanyId: string;
    quantity: string;
    unitPrice: string;
    notes?: string;
  }) =>
    request<{ proposal: Proposal }>('/proposals', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  acceptProposal: (id: string) =>
    request<{ deal: { id: string; status: string } }>(
      `/proposals/${id}/accept`,
      {
        method: 'POST',
      },
    ),
  rejectProposal: (id: string) =>
    request<{ proposal: Proposal }>(`/proposals/${id}/reject`, {
      method: 'POST',
    }),
  counterProposal: (
    id: string,
    input: { quantity: string; unitPrice: string; notes?: string },
  ) =>
    request<{ proposal: Proposal }>(`/proposals/${id}/counter`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  cancelProposal: (id: string) =>
    request<{ proposal: Proposal }>(`/proposals/${id}/cancel`, {
      method: 'POST',
    }),
  conversations: () =>
    request<{ conversations: Conversation[] }>('/conversations'),
  createConversation: (proposalId: string) =>
    request<{ conversation: Conversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
    }),
  messages: (id: string) =>
    request<{ messages: Message[] }>(`/conversations/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    request<{ message: Message }>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  markConversationRead: (id: string) =>
    request<{ participant: unknown }>(`/conversations/${id}/read`, {
      method: 'POST',
    }),
  notifications: () =>
    request<{ notifications: Notification[] }>('/notifications'),
  readNotification: (id: string) =>
    request<{ id: string; read: boolean }>(`/notifications/${id}/read`, {
      method: 'POST',
    }),
  readAllNotifications: () =>
    request<{ read: number }>('/notifications/read-all', { method: 'POST' }),
  adminStats: () => request<AdminStats>('/admin/dashboard/stats'),
  adminUsers: () => request<AdminUser[]>('/admin/dashboard/users'),
  updateAdminUserRole: (id: string, platformRole: AdminUser['platformRole']) =>
    request<AdminUser>(`/admin/dashboard/users/${id}/role`, {
      method: 'PATCH',
      headers: { 'X-Admin-Action': '1' },
      body: JSON.stringify({ platformRole }),
    }),
  adminResourceUsers: (input?: {
    q?: string;
    status?: string;
    platformRole?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{ users: AdminUser[]; pagination: AdminCursorPagination }>(
      `/admin/users${adminQuery(input)}`,
    ),
  adminCompanies: (input?: {
    q?: string;
    status?: string;
    verification?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{
      companies: AdminCompanyRow[];
      pagination: AdminCursorPagination;
    }>(`/admin/companies${adminQuery(input)}`),
  updateAdminCompanyStatus: (
    id: string,
    status: 'ACTIVE' | 'PENDING' | 'BLOCKED',
  ) =>
    request<AdminCompanyRow>(`/admin/companies/${id}/status`, {
      method: 'PATCH',
      headers: { 'X-Admin-Action': '1' },
      body: JSON.stringify({ status }),
    }),
  adminListings: (input?: {
    q?: string;
    status?: string;
    type?: string;
    categoryId?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{
      listings: AdminListingRow[];
      pagination: AdminCursorPagination;
    }>(`/admin/listings${adminQuery(input)}`),
  adminTakeDownListing: (id: string, reason?: string) =>
    request<{ id: string; title: string; status: string }>(
      `/admin/listings/${id}/take-down`,
      {
        method: 'POST',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify({ reason }),
      },
    ),
  adminPayments: (input?: {
    status?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{
      payments: AdminPaymentRow[];
      pagination: AdminCursorPagination;
    }>(`/admin/payments${adminQuery(input)}`),
  adminPlans: () => request<{ plans: AdminPlan[] }>('/admin/plans'),
  adminSubscriptions: (input?: {
    status?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{
      subscriptions: AdminSubscriptionRow[];
      pagination: AdminCursorPagination;
    }>(`/admin/subscriptions${adminQuery(input)}`),
  adminAuditLogs: (input?: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    cursor?: string;
    pageSize?: number;
  }) =>
    request<{
      auditLogs: AdminAuditLog[];
      pagination: AdminCursorPagination;
    }>(`/admin/audit-logs${adminQuery(input)}`),
  adminSettings: () =>
    request<{ settings: PlatformSettingItem[] }>('/admin/settings'),
  updateAdminSetting: (key: string, value: number | string) =>
    request<{ key: string; value: number | string; updatedAt: string }>(
      `/admin/settings/${key}`,
      {
        method: 'PUT',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify({ value }),
      },
    ),
  adminCarouselSlides: () =>
    request<{ slides: HomeCarouselSlide[] }>('/admin/home-carousel/slides'),
  replaceCarouselSlide: (
    position: number,
    input: { image: File; altText: string; expectedVersion: number },
  ) => {
    const body = new FormData();
    body.append('image', input.image);
    body.append('altText', input.altText);
    body.append('expectedVersion', String(input.expectedVersion));
    return request<{ slide: HomeCarouselSlide }>(
      `/admin/home-carousel/slides/${position}`,
      { method: 'PUT', headers: { 'X-Admin-Action': '1' }, body },
    );
  },
  resetCarouselSlide: (position: number, expectedVersion: number) =>
    request<{ position: number; reset: boolean }>(
      `/admin/home-carousel/slides/${position}`,
      {
        method: 'DELETE',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify({ expectedVersion }),
      },
    ),
  payments: () => request<{ payments: Payment[] }>('/payments'),
  createPaymentCheckout: (dealId: string, idempotencyKey: string) =>
    request<Payment>('/payments/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ dealId }),
    }),
  logistics: () => request<{ requests: LogisticsRequest[] }>('/logistics'),
  createLogisticsRequest: (input: {
    dealId: string;
    origin: string;
    destination: string;
    quantity: string;
    unit: string;
    pickupWindow?: string;
    requirements?: string;
  }) =>
    request<LogisticsRequest>('/logistics/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  acceptLogisticsQuote: (requestId: string, quoteId: string) =>
    request<{ accepted: boolean }>(
      `/logistics/requests/${requestId}/quotes/${quoteId}/accept`,
      { method: 'PATCH' },
    ),
  forgotPassword: (email: string) =>
    request<{ requested: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
  verifyEmail: (token: string) =>
    request<{ verified: boolean }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  paymentProvider: () =>
    request<{ provider: 'SIMULATED' | 'MERCADO_PAGO' }>('/payments/provider'),
  payment: (id: string) => request<{ payment: Payment }>(`/payments/${id}`),
  simulatePayment: (id: string, outcome: 'approved' | 'rejected') =>
    request<{ payment: Payment }>(`/payments/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    }),
  deals: (input?: { status?: string; cursor?: string; pageSize?: number }) =>
    request<{
      deals: DealSummary[];
      countsByStatus: Partial<Record<DealStatus, number>>;
      pagination: CursorPagination;
    }>(`/deals${adminQuery(input)}`),
  deal: (id: string) => request<{ deal: DealDetail }>(`/deals/${id}`),
  dealAction: (id: string, action: DealAction, reason?: string) =>
    request<{ deal: DealDetail }>(`/deals/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    }),
  adminDisputes: () =>
    request<{ deals: DealSummary[] }>('/admin/deals/disputes'),
  resolveDispute: (
    id: string,
    resolution: 'complete' | 'cancel',
    notes?: string,
  ) =>
    request<{ id: string; status: DealStatus }>(
      `/admin/deals/${id}/resolve-dispute`,
      {
        method: 'POST',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify({ resolution, notes }),
      },
    ),
  account: () => request<{ user: AccountProfile }>('/me'),
  updateAccount: (input: { name: string }) =>
    request<{ user: AccountProfile }>('/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  acceptCurrentTerms: () =>
    request<{ user: AccountProfile }>('/me/consents', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ changed: boolean }>('/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  accountSessions: () =>
    request<{ sessions: AccountSession[] }>('/me/sessions'),
  revokeAccountSession: (id: string) =>
    request<{ revoked: boolean }>(`/me/sessions/${id}`, { method: 'DELETE' }),
  revokeOtherSessions: () =>
    request<{ revoked: number }>('/me/sessions/revoke-others', {
      method: 'POST',
    }),
  startMfaSetup: () =>
    request<{ secret: string; otpauthUrl: string }>('/me/mfa/setup', {
      method: 'POST',
    }),
  enableMfa: (code: string) =>
    request<{ enabled: boolean; recoveryCodes: string[] }>('/me/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  disableMfa: (password: string, code: string) =>
    request<{ enabled: boolean }>('/me/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code }),
    }),
  dataExportUrl: () => `${API_URL}/me/data-export`,
  deleteAccount: (password: string, confirmation: string) =>
    request<{ deleted: boolean }>('/me/delete-account', {
      method: 'POST',
      body: JSON.stringify({ password, confirmation }),
    }),
  adminDataRequests: () =>
    request<{
      requests: {
        id: string;
        type: 'EXPORT' | 'DELETION';
        status: 'COMPLETED' | 'REJECTED';
        notes: string | null;
        createdAt: string;
        completedAt: string | null;
        user: { id: string; name: string };
      }[];
    }>('/admin/data-requests'),
  adminObservability: () =>
    request<{
      uptimeSeconds: number;
      totalRequests: number;
      totalErrors: number;
      memory: { rssMb: number; heapUsedMb: number };
      counters: Record<string, number>;
      routes: {
        method: string;
        route: string;
        count: number;
        errors: number;
        averageMs: number;
        p95Ms: number;
      }[];
      realtimeConnections: number;
      outbox: Record<string, number>;
      failedEvents: {
        id: string;
        type: string;
        attempts: number;
        lastError: string | null;
        updatedAt: string;
      }[];
      environment: string;
      paymentProvider: string;
    }>('/admin/observability'),
  adminFiles: (status?: string) =>
    request<{
      files: {
        id: string;
        purpose: string;
        resourceId: string | null;
        mimeType: string;
        sizeBytes: number;
        sha256: string;
        accessLevel: string;
        scanStatus: string;
        scanEngine: string | null;
        scanDetails: string | null;
        createdAt: string;
        owner: { id: string; name: string };
      }[];
      summary: Record<string, number>;
    }>(`/admin/files${status ? `?status=${status}` : ''}`),
  simulateLogisticsQuotes: (requestId: string) =>
    request<{ request: LogisticsRequest }>(
      `/logistics/requests/${requestId}/simulate-quotes`,
      { method: 'POST' },
    ),
  simulateShipmentEvent: (shipmentId: string) =>
    request<{ shipment: Shipment }>(
      `/logistics/shipments/${shipmentId}/simulate-next`,
      { method: 'POST' },
    ),
  adminLogistics: (status?: string) =>
    request<{ requests: LogisticsRequest[] }>(
      `/admin/logistics${status ? `?status=${status}` : ''}`,
    ),
  adminAddLogisticsQuote: (
    requestId: string,
    input: {
      carrierName: string;
      amount: string;
      estimatedDays?: number;
      notes?: string;
    },
  ) =>
    request<unknown>(`/logistics/requests/${requestId}/quotes`, {
      method: 'POST',
      headers: { 'X-Admin-Action': '1' },
      body: JSON.stringify(input),
    }),
  adminShipmentEvent: (
    shipmentId: string,
    input: { status: string; description?: string; location?: string },
  ) =>
    request<{ shipment: Shipment }>(
      `/admin/logistics/shipments/${shipmentId}/events`,
      {
        method: 'POST',
        headers: { 'X-Admin-Action': '1' },
        body: JSON.stringify(input),
      },
    ),
};
