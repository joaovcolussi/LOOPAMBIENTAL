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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
export type Material = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  defaultUnit: string;
};
export type ListingDetail = {
  id: string;
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
  category: { id: string; name: string; slug: string };
  material: { id: string; name: string; slug: string } | null;
  company: {
    id: string;
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
};
export type ListingMedia = {
  id: string;
  altText: string | null;
  sortOrder: number;
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
  deal: { id: string; status: string; createdAt: string } | null;
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

export function moderationMediaUrl(id: string) {
  return `${API_URL}/admin/moderation/cases/media/${id}`;
}
export type Conversation = {
  id: string;
  proposalId: string | null;
  dealId: string | null;
  updatedAt: string;
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
export type Payment = {
  id: string;
  dealId: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  checkoutUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  deal: { proposal: { listing: { title: string } } };
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

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  login: (input: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
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
  categories: () => request<{ categories: Category[] }>('/categories'),
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
  }) => {
    const params = new URLSearchParams();
    if (input?.page) params.set('page', String(input.page));
    if (input?.pageSize) params.set('pageSize', String(input.pageSize));
    if (input?.q) params.set('q', input.q);
    if (input?.type) params.set('type', input.type);
    if (input?.categoryId) params.set('categoryId', input.categoryId);
    if (input?.state) params.set('state', input.state);
    const query = params.toString();
    return request<{
      data: ListingCard[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }>(`/listings${query ? `?${query}` : ''}`);
  },
  listingBySlug: (slug: string) =>
    request<{ listing: ListingDetail }>(`/listings/${slug}`),
  myListing: (id: string) =>
    request<{ listing: ListingDetail & { status: string } }>(
      `/listings/mine/${id}`,
    ),
  createListing: (input: {
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
  }) =>
    request<{ listing: { id: string } }>('/listings', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  myListings: () => request<{ listings: ListingCard[] }>('/listings/mine'),
  uploadListingPhotos: (id: string, photos: File[]) => {
    const body = new FormData();
    photos.forEach((photo) => body.append('photos', photo));
    return request<{ media: ListingMedia[] }>(`/listings/${id}/media`, {
      method: 'POST',
      body,
    });
  },
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
};
