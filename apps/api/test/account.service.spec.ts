import { AccountService } from '../src/modules/account/account.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { encryptField } from '../src/common/field-encryption';
import { generateTotpSecret, totpCode } from '../src/common/totp';

async function setup(overrides: Record<string, unknown> = {}) {
  const auth = new AuthService({} as never);
  const passwordHash = await auth.hashPassword('senha-segura');
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ passwordHash, ...overrides }),
      update: jest.fn().mockReturnValue('user.update'),
    },
    companyMember: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    session: { deleteMany: jest.fn().mockReturnValue('session.deleteMany') },
    authToken: { deleteMany: jest.fn() },
    favorite: { deleteMany: jest.fn() },
    savedSearch: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    dataRequest: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { service: new AccountService(prisma as never, auth), prisma };
}

describe('AccountService.deleteAccount', () => {
  it('requires the typed confirmation', async () => {
    const { service } = await setup();
    await expect(
      service.deleteAccount('u', {
        password: 'senha-segura',
        confirmation: 'ok',
      }),
    ).rejects.toThrow('DELETE_CONFIRMATION_REQUIRED');
  });

  it('requires the current password', async () => {
    const { service } = await setup();
    await expect(
      service.deleteAccount('u', {
        password: 'errada',
        confirmation: 'EXCLUIR',
      }),
    ).rejects.toThrow('INVALID_PASSWORD');
  });

  it('blocks deletion of the last owner of a company with a team', async () => {
    const { service, prisma } = await setup();
    prisma.companyMember.findMany.mockResolvedValue([{ companyId: 'c1' }]);
    prisma.companyMember.count
      .mockResolvedValueOnce(0) // other owners
      .mockResolvedValueOnce(2); // other members
    await expect(
      service.deleteAccount('u', {
        password: 'senha-segura',
        confirmation: 'EXCLUIR',
      }),
    ).rejects.toThrow('TRANSFER_COMPANY_OWNERSHIP_FIRST');
    expect(prisma.dataRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'DELETION', status: 'REJECTED' }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('anonymizes personal data and keeps commercial history', async () => {
    const { service, prisma } = await setup();
    await expect(
      service.deleteAccount('u', {
        password: 'senha-segura',
        confirmation: 'EXCLUIR',
      }),
    ).resolves.toEqual({ deleted: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u' },
      data: expect.objectContaining({
        name: 'Usuário removido',
        email: 'removido+u@anonimizado.invalid',
        passwordHash: null,
        status: 'DELETED',
      }),
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u' },
    });
  });
});

describe('AccountService MFA', () => {
  it('enables MFA only with a valid code and returns recovery codes once', async () => {
    const secret = generateTotpSecret();
    const { service, prisma } = await setup({
      mfaEnabledAt: null,
      mfaSecretEncrypted: encryptField(secret),
    });
    await expect(service.enableMfa('u', '000000')).rejects.toThrow(
      'INVALID_MFA_CODE',
    );
    const result = await service.enableMfa('u', totpCode(secret));
    expect(result.recoveryCodes).toHaveLength(8);
    const stored = prisma.user.update.mock.calls[0][0].data.mfaRecoveryCodes;
    expect(stored).not.toContain(result.recoveryCodes[0]);
  });

  it('refuses to set up MFA twice', async () => {
    const { service } = await setup({
      email: 'a@b.com',
      mfaEnabledAt: new Date(),
    });
    await expect(service.startMfaSetup('u')).rejects.toThrow(
      'MFA_ALREADY_ENABLED',
    );
  });
});
