import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  const originalVerification = process.env.REQUIRE_EMAIL_VERIFICATION;
  afterEach(() => {
    process.env.REQUIRE_EMAIL_VERIFICATION = originalVerification;
  });

  it('creates a user and a session when verification is disabled', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    const user = {
      id: 'user-id',
      name: 'Empresa Teste',
      email: 'teste@empresa.com',
      status: 'ACTIVE',
      createdAt: new Date(),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(user),
      },
      session: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new AuthService(prisma as never);

    const result = await service.register(
      'Empresa Teste',
      'TESTE@EMPRESA.COM',
      'senha-segura',
      {},
      { acceptTerms: true },
    );

    expect(result.user).toEqual(user);
    expect(result.token).toEqual(expect.any(String));
    expect(result.verificationRequired).toBe(false);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'teste@empresa.com',
          status: 'ACTIVE',
          consents: {
            create: expect.arrayContaining([
              expect.objectContaining({ type: 'TERMS' }),
              expect.objectContaining({ type: 'PRIVACY' }),
            ]),
          },
        }),
      }),
    );
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
    const sessionData = prisma.session.create.mock.calls[0][0].data;
    expect(sessionData.absoluteExpiresAt).toBeInstanceOf(Date);
    expect(sessionData.absoluteExpiresAt.getTime()).toBeGreaterThan(
      sessionData.expiresAt.getTime(),
    );
  });

  it('rejects a session past its absolute expiry without refreshing it', async () => {
    const prisma = {
      session: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-id',
          expiresAt: new Date(Date.now() + 60_000),
          absoluteExpiresAt: new Date(Date.now() - 1),
          user: { status: 'ACTIVE' },
        }),
        updateMany: jest.fn(),
      },
    };
    const service = new AuthService(prisma as never);

    await expect(service.getUserByToken('token')).resolves.toBeNull();
    expect(prisma.session.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-id',
          status: 'ACTIVE',
          passwordHash: 'invalid',
        }),
      },
    };
    const service = new AuthService(prisma as never);

    await expect(
      service.login('teste@empresa.com', 'senha-errada', {}),
    ).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('requires accepting the terms to register', async () => {
    const service = new AuthService({} as never);
    await expect(
      service.register('Empresa', 'a@b.com', 'senha-segura', {}),
    ).rejects.toThrow('TERMS_NOT_ACCEPTED');
  });

  it('does not open a session before the e-mail is verified', async () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'u', email: 'a@b.com' }),
      },
      session: { create: jest.fn() },
    };
    const service = new AuthService(prisma as never);
    const result = await service.register(
      'Empresa',
      'a@b.com',
      'senha-segura',
      {},
      {
        acceptTerms: true,
      },
    );
    expect(result.token).toBeNull();
    expect(result.verificationRequired).toBe(true);
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  async function loginSetup(user: Record<string, unknown>) {
    const service = new AuthService({} as never);
    const passwordHash = await service.hashPassword('senha-segura');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u',
          name: 'U',
          email: 'a@b.com',
          status: 'ACTIVE',
          platformRole: 'USER',
          createdAt: new Date(),
          passwordHash,
          emailVerifiedAt: new Date(),
          mfaEnabledAt: null,
          ...user,
        }),
      },
      session: { create: jest.fn().mockResolvedValue({}) },
      authToken: { create: jest.fn().mockResolvedValue({}) },
    };
    return { service: new AuthService(prisma as never), prisma };
  }

  it('blocks login of an unverified e-mail after a correct password', async () => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
    const { service } = await loginSetup({ emailVerifiedAt: null });
    await expect(service.login('a@b.com', 'senha-segura', {})).rejects.toThrow(
      'EMAIL_NOT_VERIFIED',
    );
    await expect(service.login('a@b.com', 'errada!!', {})).rejects.toThrow(
      'INVALID_CREDENTIALS',
    );
  });

  it('asks for a second factor instead of opening a session', async () => {
    const { service, prisma } = await loginSetup({ mfaEnabledAt: new Date() });
    const result = await service.login('a@b.com', 'senha-segura', {});
    expect(result.mfaRequired).toBe(true);
    expect(result.token).toBeNull();
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(prisma.authToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'MFA_CHALLENGE' }),
    });
  });
});
