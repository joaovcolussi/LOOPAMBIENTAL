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
    const service = new CompaniesService(prisma as never);

    await expect(
      service.update('user-id', 'company-id', { tradeName: 'Novo nome' }),
    ).resolves.toEqual(updated);
  });
});
