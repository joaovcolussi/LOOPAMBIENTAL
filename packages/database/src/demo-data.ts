import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';

const prisma = new PrismaClient();
const scrypt = promisify(nodeScrypt);
const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? 'admin@loopambiental.com';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;

async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não definido. Copie .env.example para .env ou defina a variável antes de executar este comando.',
    );
  }
  if (!adminPassword) {
    throw new Error(
      'DEMO_ADMIN_PASSWORD não definido. Configure a credencial local antes de executar db:demo.',
    );
  }

  const now = new Date();
  const [plastic, metals, paper] = await Promise.all([
    prisma.wasteCategory.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: { name: 'Plástico', slug: 'plastico' },
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Plástico',
        slug: 'plastico',
      },
    }),
    prisma.wasteCategory.upsert({
      where: { id: '00000000-0000-4000-8000-000000000002' },
      update: { name: 'Metais', slug: 'metais' },
      create: {
        id: '00000000-0000-4000-8000-000000000002',
        name: 'Metais',
        slug: 'metais',
      },
    }),
    prisma.wasteCategory.upsert({
      where: { id: '00000000-0000-4000-8000-000000000003' },
      update: { name: 'Papel e papelão', slug: 'papel-papelao' },
      create: {
        id: '00000000-0000-4000-8000-000000000003',
        name: 'Papel e papelão',
        slug: 'papel-papelao',
      },
    }),
  ]);

  const [pet, aluminum, cardboard] = await Promise.all([
    prisma.material.upsert({
      where: { id: '00000000-0000-4000-8000-000000000011' },
      update: {
        name: 'PET cristal',
        slug: 'pet-cristal',
        categoryId: plastic.id,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000011',
        name: 'PET cristal',
        slug: 'pet-cristal',
        defaultUnit: 'kg',
        categoryId: plastic.id,
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-4000-8000-000000000012' },
      update: {
        name: 'Alumínio prensado',
        slug: 'aluminio-prensado',
        categoryId: metals.id,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000012',
        name: 'Alumínio prensado',
        slug: 'aluminio-prensado',
        defaultUnit: 'kg',
        categoryId: metals.id,
      },
    }),
    prisma.material.upsert({
      where: { id: '00000000-0000-4000-8000-000000000013' },
      update: {
        name: 'Papelão ondulado',
        slug: 'papelao-ondulado',
        categoryId: paper.id,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000013',
        name: 'Papelão ondulado',
        slug: 'papelao-ondulado',
        defaultUnit: 'kg',
        categoryId: paper.id,
      },
    }),
  ]);

  const [buyer, seller, admin] = await Promise.all([
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000021' },
      update: {
        name: 'Camila Oliveira',
        email: 'demo.comprador@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000021',
        name: 'Camila Oliveira',
        email: 'demo.comprador@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000022' },
      update: {
        name: 'Rafael Santos',
        email: 'demo.vendedor@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000022',
        name: 'Rafael Santos',
        email: 'demo.vendedor@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000023' },
      update: {
        name: 'Admin LOOP AMBIENTAL',
        email: adminEmail,
        passwordHash: await passwordHash(adminPassword),
        status: 'ACTIVE',
        platformRole: 'ADMIN',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000023',
        name: 'Admin LOOP AMBIENTAL',
        email: adminEmail,
        passwordHash: await passwordHash(adminPassword),
        status: 'ACTIVE',
        platformRole: 'ADMIN',
        emailVerifiedAt: now,
      },
    }),
  ]);
  const [buyerTwo, buyerThree, sellerTwo, sellerThree] = await Promise.all([
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000024' },
      update: {
        name: 'Daniela Freitas',
        email: 'demo.comprador2@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000024',
        name: 'Daniela Freitas',
        email: 'demo.comprador2@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000025' },
      update: {
        name: 'Marcos Lima',
        email: 'demo.comprador3@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000025',
        name: 'Marcos Lima',
        email: 'demo.comprador3@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000026' },
      update: {
        name: 'João Mendes',
        email: 'demo.vendedor2@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000026',
        name: 'João Mendes',
        email: 'demo.vendedor2@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
    prisma.user.upsert({
      where: { id: '00000000-0000-4000-8000-000000000027' },
      update: {
        name: 'Aline Rocha',
        email: 'demo.vendedor3@loopambiental.com',
        status: 'ACTIVE',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000027',
        name: 'Aline Rocha',
        email: 'demo.vendedor3@loopambiental.com',
        passwordHash: await passwordHash('LoopAmbiental123!'),
        status: 'ACTIVE',
        emailVerifiedAt: now,
      },
    }),
  ]);

  const [buyerCompany, sellerCompany] = await Promise.all([
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000031' },
      update: {
        legalName: 'Verde Norte Indústria Ltda.',
        tradeName: 'Verde Norte',
        contactVisibility: 'PUBLIC',
        contactName: 'Camila Oliveira',
        contactEmail: 'compras@verdenorte.local',
        contactWhatsapp: '+5511999990001',
        addressLine: 'Avenida Industrial',
        addressNumber: '1200',
        addressDistrict: 'Mooca',
        addressPostalCode: '03100-000',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000031',
        legalName: 'Verde Norte Indústria Ltda.',
        tradeName: 'Verde Norte',
        description:
          'Indústria que compra materiais recicláveis para incorporar em sua cadeia produtiva.',
        city: 'São Paulo',
        state: 'SP',
        contactName: 'Camila Oliveira',
        contactEmail: 'compras@verdenorte.local',
        contactWhatsapp: '+5511999990001',
        addressLine: 'Avenida Industrial',
        addressNumber: '1200',
        addressDistrict: 'Mooca',
        addressPostalCode: '03100-000',
        contactVisibility: 'PUBLIC',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
    }),
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000032' },
      update: {
        legalName: 'Circular Materiais Recicláveis Ltda.',
        tradeName: 'Circular Materiais',
        contactVisibility: 'PUBLIC',
        contactName: 'Rafael Santos',
        contactEmail: 'comercial@circular.local',
        contactWhatsapp: '+5511988880002',
        addressLine: 'Rua da Reciclagem',
        addressNumber: '85',
        addressDistrict: 'Bonsucesso',
        addressPostalCode: '07000-000',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000032',
        legalName: 'Circular Materiais Recicláveis Ltda.',
        tradeName: 'Circular Materiais',
        description:
          'Operação de triagem e comercialização de recicláveis pós-consumo.',
        city: 'Guarulhos',
        state: 'SP',
        contactName: 'Rafael Santos',
        contactEmail: 'comercial@circular.local',
        contactWhatsapp: '+5511988880002',
        addressLine: 'Rua da Reciclagem',
        addressNumber: '85',
        addressDistrict: 'Bonsucesso',
        addressPostalCode: '07000-000',
        contactVisibility: 'PUBLIC',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
    }),
  ]);
  const [
    buyerCompanyTwo,
    buyerCompanyThree,
    sellerCompanyTwo,
    sellerCompanyThree,
  ] = await Promise.all([
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000033' },
      update: {
        legalName: 'Horizonte Embalagens Industriais Ltda.',
        tradeName: 'Horizonte Embalagens',
        contactVisibility: 'MEMBERS',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000033',
        legalName: 'Horizonte Embalagens Industriais Ltda.',
        tradeName: 'Horizonte Embalagens',
        description:
          'Fabricante que compra papel, papelão e plásticos para seus processos industriais.',
        city: 'Jundiaí',
        state: 'SP',
        contactName: 'Daniela Freitas',
        contactEmail: 'compras@horizonteembalagens.com',
        contactWhatsapp: '+5511977770003',
        contactVisibility: 'MEMBERS',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
    }),
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000034' },
      update: {
        legalName: 'Alto Vale Química Circular Ltda.',
        tradeName: 'Alto Vale Circular',
        contactVisibility: 'PRIVATE',
        status: 'ACTIVE',
        verification: 'PENDING',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000034',
        legalName: 'Alto Vale Química Circular Ltda.',
        tradeName: 'Alto Vale Circular',
        description:
          'Operação industrial que busca insumos recuperados para reduzir o descarte.',
        city: 'Joinville',
        state: 'SC',
        contactName: 'Marcos Lima',
        contactEmail: 'suprimentos@altovalecircular.com',
        contactWhatsapp: '+5547997770004',
        contactVisibility: 'PRIVATE',
        status: 'ACTIVE',
        verification: 'PENDING',
      },
    }),
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000035' },
      update: {
        legalName: 'Metal Sul Recuperação Ltda.',
        tradeName: 'Metal Sul',
        contactVisibility: 'PUBLIC',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000035',
        legalName: 'Metal Sul Recuperação Ltda.',
        tradeName: 'Metal Sul',
        description:
          'Triagem e beneficiamento de sucatas metálicas para a indústria.',
        city: 'Joinville',
        state: 'SC',
        contactName: 'João Mendes',
        contactEmail: 'comercial@metalsulrecuperacao.com',
        contactWhatsapp: '+5547996660005',
        contactVisibility: 'PUBLIC',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
    }),
    prisma.company.upsert({
      where: { id: '00000000-0000-4000-8000-000000000036' },
      update: {
        legalName: 'Fibra Viva Materiais Ltda.',
        tradeName: 'Fibra Viva',
        contactVisibility: 'PRIVATE',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
      create: {
        id: '00000000-0000-4000-8000-000000000036',
        legalName: 'Fibra Viva Materiais Ltda.',
        tradeName: 'Fibra Viva',
        description:
          'Geradora de aparas e fibras industriais com fornecimento recorrente.',
        city: 'Sorocaba',
        state: 'SP',
        contactName: 'Aline Rocha',
        contactEmail: 'comercial@fibraviva.com',
        contactWhatsapp: '+5515995550006',
        contactVisibility: 'PRIVATE',
        status: 'ACTIVE',
        verification: 'VERIFIED',
      },
    }),
  ]);

  await Promise.all([
    prisma.companyMember.upsert({
      where: {
        companyId_userId: { companyId: buyerCompany.id, userId: buyer.id },
      },
      update: { role: 'OWNER' },
      create: { companyId: buyerCompany.id, userId: buyer.id, role: 'OWNER' },
    }),
    prisma.companyMember.upsert({
      where: {
        companyId_userId: { companyId: sellerCompany.id, userId: seller.id },
      },
      update: { role: 'OWNER' },
      create: { companyId: sellerCompany.id, userId: seller.id, role: 'OWNER' },
    }),
    ...[
      [buyerCompanyTwo.id, buyerTwo.id],
      [buyerCompanyThree.id, buyerThree.id],
      [sellerCompanyTwo.id, sellerTwo.id],
      [sellerCompanyThree.id, sellerThree.id],
    ].map(([companyId, userId]) =>
      prisma.companyMember.upsert({
        where: { companyId_userId: { companyId, userId } },
        update: { role: 'OWNER' },
        create: { companyId, userId, role: 'OWNER' },
      }),
    ),
  ]);

  const sellListing = await prisma.listing.upsert({
    where: { id: '00000000-0000-4000-8000-000000000041' },
    update: {
      title: 'PET cristal enfardado pós-consumo',
      description:
        'Fardos selecionados, secos e prontos para retirada em Guarulhos.',
      status: 'PUBLISHED',
      publishedAt: now,
      availableQuantity: '12500',
      frequency: 'MONTHLY',
      riskClassification: 'NON_HAZARDOUS',
      originDetails: 'Triagem industrial pós-consumo',
      ownTransport: false,
      requiresDocuments: true,
      lastAccessAt: now,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000041',
      companyId: sellerCompany.id,
      createdByUserId: seller.id,
      categoryId: plastic.id,
      materialId: pet.id,
      type: 'SELL',
      status: 'PUBLISHED',
      title: 'PET cristal enfardado pós-consumo',
      slug: 'pet-cristal-enfardado-demo',
      description:
        'Fardos selecionados, secos e prontos para retirada em Guarulhos.',
      quantity: '12500',
      availableQuantity: '12500',
      unit: 'kg',
      unitPrice: '4.80',
      city: 'Guarulhos',
      state: 'SP',
      publishedAt: now,
    },
  });
  const buyListing = await prisma.listing.upsert({
    where: { id: '00000000-0000-4000-8000-000000000042' },
    update: {
      title: 'Compra recorrente de alumínio prensado',
      description:
        'Compra mensal para abastecimento industrial, com coleta a combinar.',
      status: 'PUBLISHED',
      publishedAt: now,
      availableQuantity: '8000',
      frequency: 'MONTHLY',
      riskClassification: 'NON_HAZARDOUS',
      originDetails: 'Linha de beneficiamento de metais',
      ownTransport: true,
      requiresDocuments: false,
      lastAccessAt: now,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000042',
      companyId: buyerCompany.id,
      createdByUserId: buyer.id,
      categoryId: metals.id,
      materialId: aluminum.id,
      type: 'BUY',
      status: 'PUBLISHED',
      title: 'Compra recorrente de alumínio prensado',
      slug: 'compra-aluminio-prensado-demo',
      description:
        'Compra mensal para abastecimento industrial, com coleta a combinar.',
      quantity: '8000',
      availableQuantity: '8000',
      unit: 'kg',
      unitPrice: '7.20',
      city: 'São Paulo',
      state: 'SP',
      publishedAt: now,
    },
  });
  await prisma.listing.upsert({
    where: { id: '00000000-0000-4000-8000-000000000043' },
    update: {
      title: 'Papelão ondulado limpo para reciclagem',
      description: 'Material separado e armazenado em local coberto.',
      status: 'PUBLISHED',
      publishedAt: now,
      frequency: 'CONTINUOUS',
      riskClassification: 'NON_HAZARDOUS',
      originDetails: 'Centro de distribuição',
      ownTransport: false,
      requiresDocuments: false,
      lastAccessAt: now,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000043',
      companyId: sellerCompany.id,
      createdByUserId: seller.id,
      categoryId: paper.id,
      materialId: cardboard.id,
      type: 'SELL',
      status: 'PUBLISHED',
      title: 'Papelão ondulado limpo para reciclagem',
      slug: 'papelao-ondulado-limpo-demo',
      description: 'Material separado e armazenado em local coberto.',
      quantity: '6000',
      availableQuantity: '6000',
      unit: 'kg',
      unitPrice: '1.10',
      city: 'Campinas',
      state: 'SP',
      publishedAt: now,
    },
  });
  await Promise.all([
    prisma.listing.upsert({
      where: { id: '00000000-0000-4000-8000-000000000044' },
      update: {
        title: 'Alumínio pós-consumo separado',
        description:
          'Alumínio separado e prensado, com fornecimento mensal para recicladores.',
        status: 'PUBLISHED',
        publishedAt: now,
        availableQuantity: '4200',
        lastAccessAt: now,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000044',
        companyId: sellerCompanyTwo.id,
        createdByUserId: sellerTwo.id,
        categoryId: metals.id,
        materialId: aluminum.id,
        type: 'SELL',
        status: 'PUBLISHED',
        title: 'Alumínio pós-consumo separado',
        slug: 'aluminio-pos-consumo-separado-demo',
        description:
          'Alumínio separado e prensado, com fornecimento mensal para recicladores.',
        quantity: '4200',
        availableQuantity: '4200',
        unit: 'kg',
        unitPrice: '6.90',
        frequency: 'MONTHLY',
        riskClassification: 'NON_HAZARDOUS',
        originDetails: 'Central de triagem Metal Sul',
        ownTransport: true,
        requiresDocuments: false,
        city: 'Joinville',
        state: 'SC',
        publishedAt: now,
      },
    }),
    prisma.listing.upsert({
      where: { id: '00000000-0000-4000-8000-000000000045' },
      update: {
        title: 'Compra de papelão industrial recorrente',
        description:
          'Compra recorrente de papelão limpo para abastecimento de linha de embalagens.',
        status: 'PUBLISHED',
        publishedAt: now,
        availableQuantity: '18000',
        lastAccessAt: now,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000045',
        companyId: buyerCompanyTwo.id,
        createdByUserId: buyerTwo.id,
        categoryId: paper.id,
        materialId: cardboard.id,
        type: 'BUY',
        status: 'PUBLISHED',
        title: 'Compra de papelão industrial recorrente',
        slug: 'compra-papelao-industrial-demo',
        description:
          'Compra recorrente de papelão limpo para abastecimento de linha de embalagens.',
        quantity: '18000',
        availableQuantity: '18000',
        unit: 'kg',
        unitPrice: '1.35',
        frequency: 'MONTHLY',
        riskClassification: 'NON_HAZARDOUS',
        originDetails: 'Unidades industriais Horizonte',
        ownTransport: false,
        requiresDocuments: false,
        city: 'Jundiaí',
        state: 'SP',
        publishedAt: now,
      },
    }),
    prisma.listing.upsert({
      where: { id: '00000000-0000-4000-8000-000000000046' },
      update: {
        title: 'Aparas de papel branco para reaproveitamento',
        description:
          'Aparas secas e armazenadas em local coberto. Contato comercial confidencial.',
        status: 'PUBLISHED',
        publishedAt: now,
        availableQuantity: '9500',
        lastAccessAt: now,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000046',
        companyId: sellerCompanyThree.id,
        createdByUserId: sellerThree.id,
        categoryId: paper.id,
        materialId: cardboard.id,
        type: 'SELL',
        status: 'PUBLISHED',
        title: 'Aparas de papel branco para reaproveitamento',
        slug: 'aparas-papel-branco-demo',
        description:
          'Aparas secas e armazenadas em local coberto. Contato comercial confidencial.',
        quantity: '9500',
        availableQuantity: '9500',
        unit: 'kg',
        unitPrice: '1.80',
        frequency: 'CONTINUOUS',
        riskClassification: 'NON_HAZARDOUS',
        originDetails: 'Linha de conversão Fibra Viva',
        ownTransport: false,
        requiresDocuments: true,
        city: 'Sorocaba',
        state: 'SP',
        publishedAt: now,
      },
    }),
    prisma.listing.upsert({
      where: { id: '00000000-0000-4000-8000-000000000047' },
      update: {
        title: 'Demanda confidencial por PET cristal',
        description:
          'Demanda para contrato de fornecimento. A empresa compradora mantém o contato confidencial.',
        status: 'PUBLISHED',
        publishedAt: now,
        availableQuantity: '2500',
        lastAccessAt: now,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000047',
        companyId: buyerCompanyThree.id,
        createdByUserId: buyerThree.id,
        categoryId: plastic.id,
        materialId: pet.id,
        type: 'BUY',
        status: 'PUBLISHED',
        title: 'Demanda confidencial por PET cristal',
        slug: 'demanda-confidencial-pet-cristal-demo',
        description:
          'Demanda para contrato de fornecimento. A empresa compradora mantém o contato confidencial.',
        quantity: '2500',
        availableQuantity: '2500',
        unit: 'kg',
        unitPrice: '5.10',
        frequency: 'WEEKLY',
        riskClassification: 'NON_HAZARDOUS',
        originDetails: 'Unidade industrial Alto Vale',
        ownTransport: true,
        requiresDocuments: true,
        city: 'Joinville',
        state: 'SC',
        publishedAt: now,
      },
    }),
  ]);

  const proposal = await prisma.proposal.upsert({
    where: { id: '00000000-0000-4000-8000-000000000051' },
    update: { status: 'PENDING' },
    create: {
      id: '00000000-0000-4000-8000-000000000051',
      listingId: sellListing.id,
      proposerCompanyId: buyerCompany.id,
      createdByUserId: buyer.id,
      quantity: '3000',
      unitPrice: '4.60',
      notes: 'Podemos retirar na próxima semana.',
      status: 'PENDING',
    },
  });
  const conversation = await prisma.conversation.upsert({
    where: { proposalId: proposal.id },
    update: { listingId: sellListing.id },
    create: { proposalId: proposal.id, listingId: sellListing.id },
  });
  await Promise.all([
    prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: buyer.id,
        },
      },
      update: {},
      create: { conversationId: conversation.id, userId: buyer.id },
    }),
    prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: seller.id,
        },
      },
      update: {},
      create: { conversationId: conversation.id, userId: seller.id },
    }),
    prisma.message.upsert({
      where: { id: '00000000-0000-4000-8000-000000000061' },
      update: { body: 'Olá! Tenho interesse em negociar este lote de PET.' },
      create: {
        id: '00000000-0000-4000-8000-000000000061',
        conversationId: conversation.id,
        senderUserId: buyer.id,
        body: 'Olá! Tenho interesse em negociar este lote de PET.',
      },
    }),
    prisma.notification.upsert({
      where: { id: '00000000-0000-4000-8000-000000000071' },
      update: { title: 'Nova proposta recebida' },
      create: {
        id: '00000000-0000-4000-8000-000000000071',
        userId: seller.id,
        type: 'PROPOSAL_CREATED',
        title: 'Nova proposta recebida',
        body: 'A Verde Norte enviou uma proposta para seu anúncio de PET.',
        payload: { proposalId: proposal.id },
      },
    }),
  ]);

  void buyListing;
  console.log('Dados demonstrativos inseridos/atualizados com sucesso.');
  console.log('Login demo: demo.comprador@loopambiental.com / LoopAmbiental123!');
  console.log('Login vendedor: demo.vendedor@loopambiental.com / LoopAmbiental123!');
  console.log(`Login admin configurado para: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
