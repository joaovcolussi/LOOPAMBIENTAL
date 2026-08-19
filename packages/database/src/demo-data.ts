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

  await prisma.message.deleteMany({});
  await prisma.conversationParticipant.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.proposalRevision.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.moderationAction.deleteMany({});
  await prisma.moderationCase.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.notification.deleteMany({});

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
