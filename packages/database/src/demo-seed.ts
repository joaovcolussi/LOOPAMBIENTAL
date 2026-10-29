/*
 * Dados de DEMONSTRAÇÃO da LOOP AMBIENTAL (somente estudo/testes).
 *
 * Todas as empresas, pessoas, CNPJs e valores são fictícios. O script é
 * idempotente: se os dados já existirem ele não duplica nada.
 *
 * Uso: corepack pnpm db:demo
 * Senha de todas as contas de demonstração: Demo@12345
 */
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';

const scrypt = promisify(nodeScrypt);
const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Demo@12345';
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (days: number) => new Date(now - days * DAY);

// Deterministic ids keep the seed idempotent and easy to reference.
const id = (group: number, index: number) =>
  `d${String(group).padStart(7, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`;

const CATEGORY = {
  plastico: '00000000-0000-4000-8000-000000000001',
  metais: '00000000-0000-4000-8000-000000000002',
  papel: '00000000-0000-4000-8000-000000000003',
  vidro: '00000000-0000-4000-8000-000000000004',
  madeira: '00000000-0000-4000-8000-000000000005',
  borracha: '00000000-0000-4000-8000-000000000006',
  eletro: '00000000-0000-4000-8000-000000000009',
  construcao: '00000000-0000-4000-8000-00000000000a',
  oleo: '00000000-0000-4000-8000-00000000000c',
};

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

const users = [
  {
    key: 'admin',
    name: 'Admin Demonstração',
    email: 'admin@loopambiental.demo',
    role: 'ADMIN' as const,
  },
  {
    key: 'ana',
    name: 'Ana Ribeiro',
    email: 'ana@reciclasul.demo',
    role: 'USER' as const,
  },
  {
    key: 'bruno',
    name: 'Bruno Tavares',
    email: 'bruno@polimerosverdes.demo',
    role: 'USER' as const,
  },
  {
    key: 'carla',
    name: 'Carla Menezes',
    email: 'carla@papelcircular.demo',
    role: 'USER' as const,
  },
  {
    key: 'diego',
    name: 'Diego Alves',
    email: 'diego@horizonte.demo',
    role: 'USER' as const,
  },
  {
    key: 'elisa',
    name: 'Elisa Prado',
    email: 'elisa@reciclasul.demo',
    role: 'USER' as const,
  },
  {
    key: 'moderador',
    name: 'Moderação Demo',
    email: 'moderacao@loopambiental.demo',
    role: 'MODERATOR' as const,
  },
];
const userId = (key: string) =>
  id(1, users.findIndex((user) => user.key === key) + 1);

const companies = [
  {
    key: 'reciclasul',
    owner: 'ana',
    legalName: 'Recicla Sul Metais Ltda. (demo)',
    tradeName: 'Recicla Sul Metais',
    slug: 'recicla-sul-metais-demo',
    city: 'Campinas',
    state: 'SP',
    latitude: -22.9056,
    longitude: -47.0608,
    verification: 'VERIFIED' as const,
    description:
      'Empresa fictícia de demonstração: recicladora de metais ferrosos e não ferrosos com pátio próprio e balança rodoviária.',
  },
  {
    key: 'polimeros',
    owner: 'bruno',
    legalName: 'Polímeros Verdes Indústria S.A. (demo)',
    tradeName: 'Polímeros Verdes',
    slug: 'polimeros-verdes-demo',
    city: 'Joinville',
    state: 'SC',
    latitude: -26.3045,
    longitude: -48.8487,
    verification: 'VERIFIED' as const,
    description:
      'Empresa fictícia: fabricante de embalagens que compra resina reciclada e vende paletes e aparas de produção.',
  },
  {
    key: 'papelcircular',
    owner: 'carla',
    legalName: 'Papel Circular Embalagens Ltda. (demo)',
    tradeName: 'Papel Circular',
    slug: 'papel-circular-demo',
    city: 'Curitiba',
    state: 'PR',
    latitude: -25.4284,
    longitude: -49.2733,
    verification: 'PENDING' as const,
    description:
      'Empresa fictícia: aparista de papel e papelão que compra OCC e vende fardos classificados.',
  },
  {
    key: 'horizonte',
    owner: 'diego',
    legalName: 'Construtora Horizonte Ltda. (demo)',
    tradeName: 'Construtora Horizonte',
    slug: 'construtora-horizonte-demo',
    city: 'Belo Horizonte',
    state: 'MG',
    latitude: -19.9167,
    longitude: -43.9345,
    verification: 'UNVERIFIED' as const,
    description:
      'Empresa fictícia: construtora que destina resíduos classe A e B de suas obras.',
  },
];
const companyId = (key: string) =>
  id(2, companies.findIndex((company) => company.key === key) + 1);

type ListingSeed = {
  company: string;
  creator: string;
  type: 'BUY' | 'SELL';
  title: string;
  category: keyof typeof CATEGORY;
  quantity: string;
  unit: string;
  unitPrice?: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'PENDING_REVIEW' | 'PAUSED' | 'NEGOTIATING';
  frequency?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS';
  description: string;
  publishedDaysAgo?: number;
  attributes?: Record<string, string>;
};

const listings: ListingSeed[] = [
  {
    company: 'reciclasul',
    creator: 'ana',
    type: 'SELL',
    title: 'Alumínio prensado em fardos',
    category: 'metais',
    quantity: '12000',
    unit: 'kg',
    unitPrice: '7.80',
    frequency: 'MONTHLY',
    description:
      'Latas e perfis de alumínio prensados, fardos de ~400 kg, sem contaminação por plástico.',
    publishedDaysAgo: 3,
    attributes: {
      alloy: 'Alumínio',
      purity: '96',
      form: 'Prensado',
      packaging: 'Fardo',
    },
  },
  {
    company: 'reciclasul',
    creator: 'elisa',
    type: 'SELL',
    title: 'Sucata de cobre mista (cabos e tubos)',
    category: 'metais',
    quantity: '1800',
    unit: 'kg',
    unitPrice: '38.50',
    description:
      'Cobre misto de desmontagem industrial, parcialmente decapado.',
    publishedDaysAgo: 8,
    attributes: {
      alloy: 'Cobre',
      purity: '88',
      form: 'Sucata mista',
      packaging: 'Big bag',
    },
  },
  {
    company: 'reciclasul',
    creator: 'ana',
    type: 'BUY',
    title: 'Compra contínua de cavaco de aço inox',
    category: 'metais',
    quantity: '20000',
    unit: 'kg',
    unitPrice: '5.10',
    frequency: 'CONTINUOUS',
    description:
      'Buscamos fornecedores de cavaco de inox 304/316 com laudo de composição.',
    publishedDaysAgo: 15,
    attributes: { alloy: 'Inox', form: 'Cavaco' },
  },
  {
    company: 'reciclasul',
    creator: 'ana',
    type: 'SELL',
    title: 'Óleo lubrificante usado de máquinas',
    category: 'oleo',
    quantity: '3000',
    unit: 'l',
    unitPrice: '1.20',
    description:
      'Óleo usado armazenado em bombonas; destinação somente para rerrefinador licenciado.',
    publishedDaysAgo: 20,
    attributes: { type: 'Lubrificante', packaging: 'Bombona' },
  },
  {
    company: 'polimeros',
    creator: 'bruno',
    type: 'BUY',
    title: 'Compramos PET cristal moído (flake)',
    category: 'plastico',
    quantity: '25000',
    unit: 'kg',
    unitPrice: '4.20',
    frequency: 'MONTHLY',
    description:
      'Flake de PET cristal lavado, umidade < 1%, para produção de embalagens.',
    publishedDaysAgo: 2,
    attributes: {
      polymer: 'PET',
      color: 'Cristal',
      form: 'Flake',
      contamination: '1',
    },
  },
  {
    company: 'polimeros',
    creator: 'bruno',
    type: 'SELL',
    title: 'Aparas de PEAD de produção',
    category: 'plastico',
    quantity: '6500',
    unit: 'kg',
    unitPrice: '2.35',
    frequency: 'WEEKLY',
    description:
      'Aparas limpas de PEAD branco, geradas na extrusão de frascos.',
    publishedDaysAgo: 5,
    attributes: {
      polymer: 'PEAD',
      color: 'Branco',
      form: 'Peças',
      packaging: 'Big bag',
    },
  },
  {
    company: 'polimeros',
    creator: 'bruno',
    type: 'SELL',
    title: 'Paletes de madeira PBR usados',
    category: 'madeira',
    quantity: '420',
    unit: 'un',
    unitPrice: '18.00',
    description: 'Paletes PBR em bom estado, alguns com reparos.',
    publishedDaysAgo: 11,
    attributes: { type: 'Palete', treated: 'false' },
  },
  {
    company: 'polimeros',
    creator: 'bruno',
    type: 'SELL',
    title: 'Pneus inteiros de empilhadeira',
    category: 'borracha',
    quantity: '3',
    unit: 't',
    unitPrice: '250.00',
    description: 'Pneus maciços de empilhadeira fora de uso.',
    publishedDaysAgo: 30,
    attributes: { type: 'Pneu inteiro' },
  },
  {
    company: 'papelcircular',
    creator: 'carla',
    type: 'BUY',
    title: 'Compra de papelão ondulado (OCC)',
    category: 'papel',
    quantity: '40',
    unit: 't',
    unitPrice: '620.00',
    frequency: 'CONTINUOUS',
    description:
      'Compramos OCC enfardado, umidade até 12%, retirada em todo o PR e SC.',
    publishedDaysAgo: 4,
    attributes: {
      grade: 'Papelão ondulado',
      moisture: '12',
      packaging: 'Fardo',
    },
  },
  {
    company: 'papelcircular',
    creator: 'carla',
    type: 'SELL',
    title: 'Fardos de papel branco classificado',
    category: 'papel',
    quantity: '8000',
    unit: 'kg',
    unitPrice: '1.45',
    description: 'Aparas de papel branco de gráfica, sem grampos.',
    publishedDaysAgo: 9,
    attributes: { grade: 'Branco', moisture: '8', packaging: 'Fardo' },
  },
  {
    company: 'horizonte',
    creator: 'diego',
    type: 'SELL',
    title: 'Resíduo classe A — concreto britado',
    category: 'construcao',
    quantity: '120',
    unit: 't',
    unitPrice: '15.00',
    description: 'Concreto de demolição já britado, ideal para sub-base.',
    publishedDaysAgo: 6,
    attributes: { class: 'A', granulometry: '0-40' },
  },
  {
    company: 'horizonte',
    creator: 'diego',
    type: 'SELL',
    title: 'Vidro plano de esquadrias',
    category: 'vidro',
    quantity: '2500',
    unit: 'kg',
    unitPrice: '0.30',
    description: 'Vidro incolor de reforma, separado em caçamba.',
    publishedDaysAgo: 13,
    attributes: { color: 'Incolor', form: 'Plano' },
  },
  {
    company: 'horizonte',
    creator: 'diego',
    type: 'BUY',
    title: 'Compra de placas eletrônicas para descaracterização',
    category: 'eletro',
    quantity: '500',
    unit: 'kg',
    description:
      'Interessados em lotes pequenos com certificado de destinação.',
    status: 'DRAFT',
    attributes: { type: 'Placas', certification: 'true' },
  },
  {
    company: 'papelcircular',
    creator: 'carla',
    type: 'SELL',
    title: 'Tubetes de papelão industriais',
    category: 'papel',
    quantity: '2000',
    unit: 'kg',
    unitPrice: '0.90',
    description: 'Tubetes de bobinas, aguardando análise da moderação.',
    status: 'PENDING_REVIEW',
  },
  {
    company: 'reciclasul',
    creator: 'ana',
    type: 'SELL',
    title: 'Latão em cavaco de usinagem',
    category: 'metais',
    quantity: '900',
    unit: 'kg',
    unitPrice: '22.00',
    description: 'Cavaco de latão seco, sem óleo.',
    status: 'PAUSED',
    publishedDaysAgo: 40,
    attributes: { alloy: 'Latão', form: 'Cavaco' },
  },
];
const listingId = (index: number) => id(3, index + 1);
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function seedPlans() {
  const plans = [
    {
      id: id(9, 1),
      code: 'gratuito',
      name: 'Gratuito',
      priceMonthly: '0.00',
      description:
        'Para começar: anúncios ilimitados e 3 desbloqueios de contato por mês.',
      features: { contactUnlocks: 3, highlightedListings: 0 },
    },
    {
      id: id(9, 2),
      code: 'essencial',
      name: 'Essencial',
      priceMonthly: '149.90',
      description: 'Para operações recorrentes: 30 desbloqueios e relatórios.',
      features: { contactUnlocks: 30, highlightedListings: 2, reports: true },
    },
    {
      id: id(9, 3),
      code: 'profissional',
      name: 'Profissional',
      priceMonthly: '399.90',
      description:
        'Desbloqueios ilimitados, API para ERP e suporte prioritário.',
      features: {
        contactUnlocks: -1,
        highlightedListings: 10,
        reports: true,
        api: true,
      },
    },
  ];
  for (const plan of plans)
    await prisma.plan.upsert({
      where: { code: plan.code },
      create: { ...plan, currency: 'BRL', isActive: true },
      update: {},
    });
}

async function seedUsers() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const [index, user] of users.entries())
    await prisma.user.create({
      data: {
        id: id(1, index + 1),
        name: user.name,
        email: user.email,
        passwordHash,
        status: 'ACTIVE',
        platformRole: user.role,
        emailVerifiedAt: daysAgo(90),
        createdAt: daysAgo(90 - index),
        consents: {
          create: [
            { type: 'TERMS', version: '2026-10', acceptedAt: daysAgo(90) },
            { type: 'PRIVACY', version: '2026-10', acceptedAt: daysAgo(90) },
          ],
        },
      },
    });
}

async function seedCompanies() {
  for (const [index, company] of companies.entries()) {
    const { key, owner, ...data } = company;
    void key;
    await prisma.company.create({
      data: {
        id: id(2, index + 1),
        ...data,
        status: 'ACTIVE',
        contactName: users.find((user) => user.key === owner)?.name,
        contactEmail: users.find((user) => user.key === owner)?.email,
        contactWhatsapp: `+5511900000${String(index + 1).padStart(3, '0')}`,
        contactVisibility: index === 0 ? 'PUBLIC' : 'PRIVATE',
        ratingAverage:
          index === 0 ? new Prisma.Decimal('4.50') : new Prisma.Decimal(0),
        ratingCount: index === 0 ? 2 : 0,
        createdAt: daysAgo(85),
        members: {
          create: {
            userId: userId(owner),
            role: 'OWNER',
            joinedAt: daysAgo(85),
          },
        },
      },
    });
  }
  await prisma.companyMember.create({
    data: {
      companyId: companyId('reciclasul'),
      userId: userId('elisa'),
      role: 'MEMBER',
      joinedAt: daysAgo(60),
    },
  });
  await prisma.companyVerification.create({
    data: {
      companyId: companyId('papelcircular'),
      requestedByUserId: userId('carla'),
      status: 'PENDING',
      notes: 'Documentos enviados para análise (demo).',
      createdAt: daysAgo(2),
    },
  });
}

async function seedListings() {
  const attributeDefinitions = await prisma.materialAttribute.findMany({
    select: { id: true, key: true, categoryId: true, type: true },
  });
  for (const [index, listing] of listings.entries()) {
    const company = companies.find((item) => item.key === listing.company)!;
    const status = listing.status ?? 'PUBLISHED';
    const publishedAt =
      listing.publishedDaysAgo !== undefined &&
      status !== 'DRAFT' &&
      status !== 'PENDING_REVIEW'
        ? daysAgo(listing.publishedDaysAgo)
        : null;
    const categoryId = CATEGORY[listing.category];
    const created = daysAgo((listing.publishedDaysAgo ?? 1) + 1);
    await prisma.listing.create({
      data: {
        id: listingId(index),
        companyId: companyId(listing.company),
        createdByUserId: userId(listing.creator),
        categoryId,
        type: listing.type,
        status,
        title: listing.title,
        slug: `${slugify(listing.title)}-demo${index + 1}`,
        description: listing.description,
        quantity: listing.quantity,
        availableQuantity: listing.quantity,
        unit: listing.unit,
        unitPrice: listing.unitPrice,
        frequency: listing.frequency ?? 'ONE_TIME',
        riskClassification:
          listing.category === 'oleo' ? 'HAZARDOUS' : 'NON_HAZARDOUS',
        city: company.city,
        state: company.state,
        latitude: company.latitude + (index % 3) * 0.01,
        longitude: company.longitude - (index % 2) * 0.01,
        publishedAt,
        viewCount: 12 + index * 7,
        createdAt: created,
        statusHistory: {
          create: [
            {
              fromStatus: null,
              toStatus: 'DRAFT',
              actorUserId: userId(listing.creator),
              reason: 'LISTING_CREATED',
              createdAt: created,
            },
            ...(publishedAt
              ? [
                  {
                    fromStatus: 'PENDING_REVIEW' as const,
                    toStatus: 'PUBLISHED' as const,
                    actorUserId: userId('admin'),
                    reason: 'MODERATION_APPROVED',
                    createdAt: publishedAt,
                  },
                ]
              : []),
          ],
        },
        ...(status === 'PENDING_REVIEW'
          ? {
              moderationCases: {
                create: { status: 'OPEN', createdAt: daysAgo(1) },
              },
            }
          : {}),
      },
    });
    for (const [key, value] of Object.entries(listing.attributes ?? {})) {
      const definition = attributeDefinitions.find(
        (item) => item.categoryId === categoryId && item.key === key,
      );
      if (!definition) continue;
      await prisma.listingAttribute.create({
        data: {
          listingId: listingId(index),
          attributeId: definition.id,
          ...(definition.type === 'NUMBER'
            ? { valueNumber: value }
            : { valueText: value }),
        },
      });
    }
  }
}

type DealSeed = {
  listing: number;
  proposer: string;
  proposerUser: string;
  quantity: string;
  unitPrice: string;
  status: 'COMPLETED' | 'IN_TRANSIT' | 'AWAITING_PAYMENT' | 'DISPUTED';
  daysAgo: number;
};

const deals: DealSeed[] = [
  {
    listing: 0,
    proposer: 'polimeros',
    proposerUser: 'bruno',
    quantity: '4000',
    unitPrice: '7.60',
    status: 'COMPLETED',
    daysAgo: 70,
  },
  {
    listing: 5,
    proposer: 'reciclasul',
    proposerUser: 'ana',
    quantity: '2000',
    unitPrice: '2.30',
    status: 'COMPLETED',
    daysAgo: 40,
  },
  {
    listing: 9,
    proposer: 'polimeros',
    proposerUser: 'bruno',
    quantity: '3000',
    unitPrice: '1.40',
    status: 'COMPLETED',
    daysAgo: 22,
  },
  {
    listing: 1,
    proposer: 'polimeros',
    proposerUser: 'bruno',
    quantity: '500',
    unitPrice: '37.90',
    status: 'IN_TRANSIT',
    daysAgo: 6,
  },
  {
    listing: 10,
    proposer: 'reciclasul',
    proposerUser: 'ana',
    quantity: '30',
    unitPrice: '14.00',
    status: 'AWAITING_PAYMENT',
    daysAgo: 3,
  },
  {
    listing: 6,
    proposer: 'papelcircular',
    proposerUser: 'carla',
    quantity: '120',
    unitPrice: '17.00',
    status: 'DISPUTED',
    daysAgo: 12,
  },
];

const FLOW: Record<DealSeed['status'], string[]> = {
  AWAITING_PAYMENT: ['OPEN', 'AWAITING_PAYMENT'],
  IN_TRANSIT: ['OPEN', 'AWAITING_PAYMENT', 'AWAITING_PICKUP', 'IN_TRANSIT'],
  COMPLETED: [
    'OPEN',
    'AWAITING_PAYMENT',
    'AWAITING_PICKUP',
    'IN_TRANSIT',
    'DELIVERED',
    'COMPLETED',
  ],
  DISPUTED: [
    'OPEN',
    'AWAITING_PAYMENT',
    'AWAITING_PICKUP',
    'IN_TRANSIT',
    'DISPUTED',
  ],
};
const NOTES: Record<string, string> = {
  OPEN: 'DEAL_CREATED',
  AWAITING_PAYMENT: 'CHECKOUT_CREATED',
  AWAITING_PICKUP: 'PAYMENT_CONFIRMED',
  IN_TRANSIT: 'SHIPMENT_CONFIRMED',
  DELIVERED: 'DELIVERY_CONFIRMED',
  COMPLETED: 'DEAL_COMPLETED',
};

async function seedNegotiations() {
  const webUrl = process.env.WEB_PUBLIC_URL ?? 'http://localhost:3000';
  for (const [index, seed] of deals.entries()) {
    const listing = listings[seed.listing];
    const listingCompany = listing.company;
    const buyer = listing.type === 'SELL' ? seed.proposer : listingCompany;
    const seller = listing.type === 'SELL' ? listingCompany : seed.proposer;
    const start = daysAgo(seed.daysAgo);
    const proposalId = id(4, index + 1);
    const dealId = id(5, index + 1);
    await prisma.proposal.create({
      data: {
        id: proposalId,
        listingId: listingId(seed.listing),
        proposerCompanyId: companyId(seed.proposer),
        createdByUserId: userId(seed.proposerUser),
        quantity: seed.quantity,
        unitPrice: seed.unitPrice,
        status: 'ACCEPTED',
        notes: 'Proposta de demonstração.',
        createdAt: start,
        revisions: {
          create: {
            actorUserId: userId(seed.proposerUser),
            quantity: seed.quantity,
            unitPrice: seed.unitPrice,
            createdAt: start,
          },
        },
      },
    });
    const flow = FLOW[seed.status];
    await prisma.deal.create({
      data: {
        id: dealId,
        listingId: listingId(seed.listing),
        proposalId,
        buyerCompanyId: companyId(buyer),
        sellerCompanyId: companyId(seller),
        status: seed.status,
        createdAt: start,
        updatedAt: new Date(start.getTime() + (flow.length - 1) * 2 * DAY),
        statusHistory: {
          create: flow.map((status, step) => ({
            fromStatus: step === 0 ? null : (flow[step - 1] as never),
            toStatus: status as never,
            actorUserId: userId(
              step % 2 === 0 ? seed.proposerUser : listing.creator,
            ),
            note:
              status === 'DISPUTED'
                ? 'DISPUTE_OPENED: material com umidade acima do combinado (demo)'
                : NOTES[status],
            createdAt: new Date(start.getTime() + step * 2 * DAY),
          })),
        },
      },
    });
    await prisma.listing.update({
      where: { id: listingId(seed.listing) },
      data: {
        availableQuantity: { decrement: seed.quantity },
        ...(seed.status !== 'COMPLETED' ? { status: 'NEGOTIATING' } : {}),
      },
    });
    const amount = new Prisma.Decimal(seed.quantity)
      .mul(seed.unitPrice)
      .toFixed(2);
    const paid = seed.status !== 'AWAITING_PAYMENT';
    const paymentId = id(6, index + 1);
    await prisma.paymentTransaction.create({
      data: {
        id: paymentId,
        idempotencyKey: `demo-deal-${index + 1}`,
        purpose: 'DEAL',
        dealId,
        companyId: companyId(buyer),
        createdByUserId: userId(
          buyer === seed.proposer ? seed.proposerUser : listing.creator,
        ),
        provider: 'SIMULATED',
        externalId: `sim_demo_${index + 1}`,
        amount,
        status: paid ? 'PAID' : 'PENDING',
        checkoutUrl: `${webUrl}/pagamento-simulado/${paymentId}`,
        paidAt: paid ? new Date(start.getTime() + 2 * DAY) : null,
        createdAt: new Date(start.getTime() + DAY),
      },
    });
    if (seed.status !== 'AWAITING_PAYMENT') {
      const requestId = id(7, index + 1);
      const delivered = seed.status === 'COMPLETED';
      await prisma.logisticsRequest.create({
        data: {
          id: requestId,
          dealId,
          requestedByUserId: userId(seed.proposerUser),
          origin: `${companies.find((c) => c.key === seller)!.city}/${companies.find((c) => c.key === seller)!.state}`,
          destination: `${companies.find((c) => c.key === buyer)!.city}/${companies.find((c) => c.key === buyer)!.state}`,
          quantity: seed.quantity,
          unit: listing.unit,
          status: delivered ? 'COMPLETED' : 'IN_TRANSIT',
          createdAt: new Date(start.getTime() + 2 * DAY),
          quotes: {
            create: [
              {
                id: id(8, index * 2 + 1),
                quotedByUserId: userId('admin'),
                carrierName: 'TransVerde Logística (demo)',
                amount: '980.00',
                estimatedDays: 3,
                status: 'ACCEPTED',
              },
              {
                id: id(8, index * 2 + 2),
                quotedByUserId: userId('admin'),
                carrierName: 'Rota Circular Cargas (demo)',
                amount: '840.00',
                estimatedDays: 5,
                status: 'REJECTED',
              },
            ],
          },
        },
      });
      const events = delivered
        ? ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
        : ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT'];
      await prisma.shipment.create({
        data: {
          logisticsRequestId: requestId,
          quoteId: id(8, index * 2 + 1),
          carrierName: 'TransVerde Logística (demo)',
          trackingCode: `LADEMO${String(index + 1).padStart(6, '0')}BR`,
          status: delivered ? 'DELIVERED' : 'IN_TRANSIT',
          estimatedDeliveryAt: new Date(start.getTime() + 7 * DAY),
          deliveredAt: delivered ? new Date(start.getTime() + 8 * DAY) : null,
          createdAt: new Date(start.getTime() + 3 * DAY),
          events: {
            create: events.map((status, step) => ({
              status: status as never,
              description: {
                SCHEDULED: 'Coleta agendada com a transportadora',
                PICKED_UP: 'Material coletado na origem',
                IN_TRANSIT: 'Carga em trânsito',
                DELIVERED: 'Carga entregue no destino',
              }[status]!,
              location: step === 2 ? 'Centro de distribuição (demo)' : null,
              createdAt: new Date(start.getTime() + (3 + step) * DAY),
            })),
          },
        },
      });
    }
    await prisma.conversation.create({
      data: {
        listingId: listingId(seed.listing),
        proposalId,
        dealId,
        createdAt: start,
        participants: {
          create: [
            { userId: userId(seed.proposerUser), lastReadAt: daysAgo(1) },
            { userId: userId(listing.creator), lastReadAt: daysAgo(2) },
          ],
        },
        messages: {
          create: [
            {
              senderUserId: userId(seed.proposerUser),
              body: 'Olá! Conseguimos retirar na próxima semana?',
              createdAt: start,
            },
            {
              senderUserId: userId(listing.creator),
              body: 'Sim, nosso pátio funciona das 7h às 17h. Pode agendar.',
              createdAt: new Date(start.getTime() + 3_600_000),
            },
            {
              senderUserId: userId(seed.proposerUser),
              body: 'Perfeito, vamos contratar o frete pela plataforma.',
              createdAt: new Date(start.getTime() + 7_200_000),
            },
          ],
        },
      },
    });
    if (seed.status === 'COMPLETED' && index === 0)
      await prisma.review.createMany({
        data: [
          {
            dealId,
            authorUserId: userId('bruno'),
            authorCompanyId: companyId('polimeros'),
            reviewedCompanyId: companyId('reciclasul'),
            rating: 5,
            comment: 'Material conforme o anunciado e coleta pontual.',
          },
        ],
      });
    if (seed.status === 'COMPLETED' && index === 1)
      await prisma.review.create({
        data: {
          dealId,
          authorUserId: userId('ana'),
          authorCompanyId: companyId('reciclasul'),
          reviewedCompanyId: companyId('polimeros'),
          rating: 4,
          comment: 'Boa negociação, fardos um pouco úmidos.',
        },
      });
  }
  // Open proposals waiting for an answer.
  const open = [
    {
      listing: 4,
      proposer: 'papelcircular',
      user: 'carla',
      quantity: '5000',
      unitPrice: '4.05',
      status: 'PENDING' as const,
    },
    {
      listing: 8,
      proposer: 'polimeros',
      user: 'bruno',
      quantity: '10',
      unitPrice: '600.00',
      status: 'COUNTERED' as const,
    },
    {
      listing: 2,
      proposer: 'horizonte',
      user: 'diego',
      quantity: '1500',
      unitPrice: '4.90',
      status: 'PENDING' as const,
    },
  ];
  for (const [index, proposal] of open.entries())
    await prisma.proposal.create({
      data: {
        id: id(4, 100 + index),
        listingId: listingId(proposal.listing),
        proposerCompanyId: companyId(proposal.proposer),
        createdByUserId: userId(proposal.user),
        quantity: proposal.quantity,
        unitPrice: proposal.unitPrice,
        status: proposal.status,
        notes: 'Proposta aberta de demonstração.',
        validUntil: new Date(now + 20 * DAY),
        createdAt: daysAgo(index + 1),
        revisions: {
          create: [
            {
              actorUserId: userId(proposal.user),
              quantity: proposal.quantity,
              unitPrice: proposal.unitPrice,
              createdAt: daysAgo(index + 1),
            },
            ...(proposal.status === 'COUNTERED'
              ? [
                  {
                    actorUserId: userId(listings[proposal.listing].creator),
                    quantity: proposal.quantity,
                    unitPrice: '615.00',
                    notes: 'Contraproposta: frete por conta do comprador.',
                    createdAt: daysAgo(index),
                  },
                ]
              : []),
          ],
        },
      },
    });
}

async function seedEngagement() {
  const subscriptionId = id(10, 1);
  await prisma.subscription.create({
    data: {
      id: subscriptionId,
      companyId: companyId('reciclasul'),
      planId: id(9, 3),
      provider: 'SIMULATED',
      status: 'ACTIVE',
      currentPeriodStart: daysAgo(10),
      currentPeriodEnd: new Date(now + 20 * DAY),
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      idempotencyKey: 'demo-subscription-1',
      purpose: 'SUBSCRIPTION',
      subscriptionId,
      companyId: companyId('reciclasul'),
      createdByUserId: userId('ana'),
      provider: 'SIMULATED',
      amount: '399.90',
      status: 'PAID',
      paidAt: daysAgo(10),
      metadata: { planId: id(9, 3) },
    },
  });
  await prisma.subscription.create({
    data: {
      companyId: companyId('polimeros'),
      planId: id(9, 1),
      provider: 'INTERNAL',
      status: 'ACTIVE',
      currentPeriodStart: daysAgo(5),
      currentPeriodEnd: new Date(now + 25 * DAY),
    },
  });
  await prisma.favorite.createMany({
    data: [
      { userId: userId('bruno'), listingId: listingId(9) },
      { userId: userId('bruno'), listingId: listingId(10) },
      { userId: userId('carla'), listingId: listingId(5) },
    ],
  });
  await prisma.savedSearch.create({
    data: {
      userId: userId('bruno'),
      name: 'PET e PEAD no Sul',
      filters: { q: 'PET', categoryId: CATEGORY.plastico, type: 'SELL' },
      frequency: 'DAILY',
    },
  });
  const notifications = [
    {
      user: 'ana',
      type: 'PROPOSAL_CREATED' as const,
      title: 'Nova proposta recebida',
      body: 'Construtora Horizonte enviou uma proposta para cavaco de inox.',
    },
    {
      user: 'bruno',
      type: 'SHIPMENT_UPDATED' as const,
      title: 'Remessa LADEMO000004BR',
      body: 'Carga em trânsito.',
    },
    {
      user: 'bruno',
      type: 'PAYMENT_CONFIRMED' as const,
      title: 'Pagamento confirmado',
      body: 'O pagamento da negociação foi confirmado (simulado).',
    },
    {
      user: 'carla',
      type: 'COMPANY_VERIFICATION_REQUESTED' as const,
      title: 'Verificação em análise',
      body: 'Recebemos seus documentos. A análise leva até 2 dias úteis.',
    },
  ];
  for (const [index, item] of notifications.entries())
    await prisma.notification.create({
      data: {
        userId: userId(item.user),
        type: item.type,
        title: item.title,
        body: item.body,
        createdAt: daysAgo(index),
      },
    });
  await prisma.report.create({
    data: {
      reporterUserId: userId('carla'),
      targetType: 'LISTING',
      listingId: listingId(11),
      reason: 'MISLEADING',
      details: 'Fotos não correspondem ao material (denúncia de demonstração).',
    },
  });
}

async function main() {
  const marker = await prisma.user.findUnique({
    where: { email: users[1].email },
    select: { id: true },
  });
  await seedPlans();
  if (marker) {
    console.log('Dados de demonstração já existem; nada a fazer.');
    return;
  }
  const categories = await prisma.wasteCategory.count();
  if (categories === 0)
    throw new Error(
      'Catálogo vazio: rode as migrações antes (pnpm db:migrate).',
    );
  await seedUsers();
  await seedCompanies();
  await seedListings();
  await seedNegotiations();
  await seedEngagement();
  console.log('Dados de demonstração criados. Contas (senha Demo@12345):');
  for (const user of users) console.log(`  - ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
