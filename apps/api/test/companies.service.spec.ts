import { CompaniesService } from '../src/modules/companies/companies.service';

describe('CompaniesService', () => {
  it('blocks a regular member from updating company data', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      company: { update: jest.fn() },
    };
    const service = new CompaniesService(prisma as never);

    await expect(
      service.update('user-id', 'company-id', { tradeName: 'Novo nome' }),
    ).rejects.toThrow('COMPANY_MANAGEMENT_REQUIRED');
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('allows an owner to update company data', async () => {
    const updated = { id: 'company-id', tradeName: 'Novo nome' };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: { update: jest.fn().mockResolvedValue(updated) },
    };
    Object.assign(prisma, {
      $transaction: jest.fn((callback) => callback(prisma)),
    });
    const service = new CompaniesService(prisma as never);

    await expect(
      service.update('user-id', 'company-id', { tradeName: 'Novo nome' }),
    ).resolves.toEqual({ ...updated, taxIdMasked: null });
  });

  it('drops the badge and voids pending requests when the CNPJ changes', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          verification: 'VERIFIED',
          legalName: 'Empresa Ltda',
          taxIdHash: 'old-hash',
        }),
        update: jest.fn().mockResolvedValue({ id: 'company-id' }),
      },
      companyVerification: { updateMany: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    const service = new CompaniesService(prisma as never);

    await service.update('user-id', 'company-id', {
      taxId: '11.222.333/0001-81',
    });

    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ verification: 'UNVERIFIED' }),
      }),
    );
    expect(prisma.companyVerification.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'company-id', status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  });

  it('keeps the badge when the legal identity is unchanged', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          verification: 'VERIFIED',
          legalName: 'Empresa Ltda',
          taxIdHash: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 'company-id' }),
      },
      companyVerification: { updateMany: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    const service = new CompaniesService(prisma as never);

    await service.update('user-id', 'company-id', {
      legalName: 'Empresa Ltda',
    });

    expect(prisma.company.update.mock.calls[0][0].data).not.toHaveProperty(
      'verification',
    );
    expect(prisma.companyVerification.updateMany).not.toHaveBeenCalled();
  });
});
