import { CompanyMembersService } from '../src/modules/company-members/company-members.service';

function makeService(prisma: unknown, emailService: unknown = {}) {
  return new CompanyMembersService(prisma as never, emailService as never);
}

describe('CompanyMembersService', () => {
  it('blocks a regular member from inviting', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.invite('user-id', 'company-id', 'novo@empresa.com', 'MEMBER'),
    ).rejects.toThrow('COMPANY_MANAGEMENT_REQUIRED');
  });

  it('lets an owner invite a new e-mail and sends the invitation', async () => {
    const invitation = {
      id: 'invitation-id',
      email: 'novo@empresa.com',
      role: 'MEMBER',
      status: 'PENDING',
    };
    const emailService = {
      sendCompanyInvitation: jest.fn().mockResolvedValue({}),
    };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'company-id', legalName: 'Empresa' }),
      },
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ name: 'Dono' }),
      },
      companyInvitation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(invitation),
      },
    };
    const service = makeService(prisma, emailService);

    await expect(
      service.invite('user-id', 'company-id', 'Novo@Empresa.com', 'MEMBER'),
    ).resolves.toEqual(invitation);
    expect(prisma.companyInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'novo@empresa.com' }),
      }),
    );
    expect(emailService.sendCompanyInvitation).toHaveBeenCalled();
  });

  it('rejects a duplicate pending invitation', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: {
        findFirst: jest.fn().mockResolvedValue({ id: 'company-id' }),
      },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      companyInvitation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.invite('user-id', 'company-id', 'novo@empresa.com', 'MEMBER'),
    ).rejects.toThrow('INVITATION_ALREADY_PENDING');
  });

  it('accepts an invitation for the matching e-mail', async () => {
    const prisma = {
      companyInvitation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'invitation-id',
          companyId: 'company-id',
          email: 'novo@empresa.com',
          role: 'MEMBER',
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 60_000),
          company: { id: 'company-id', deletedAt: null },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'novo@empresa.com' }),
      },
      companyMember: { upsert: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(async (operations: unknown[]) => operations),
    };
    const service = makeService(prisma);

    await expect(service.acceptInvitation('user-id', 'token')).resolves.toEqual(
      { companyId: 'company-id', role: 'MEMBER' },
    );
    expect(prisma.companyMember.upsert).toHaveBeenCalled();
  });

  it('requires owner rights to change a role', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.changeRole('user-id', 'company-id', 'target-id', 'ADMIN'),
    ).rejects.toThrow('COMPANY_OWNER_REQUIRED');
  });

  it('does not allow removing the owner', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ role: 'ADMIN' })
          .mockResolvedValueOnce({ role: 'OWNER' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.removeMember('admin-id', 'company-id', 'owner-id'),
    ).rejects.toThrow('OWNER_CANNOT_BE_REMOVED');
  });
});
