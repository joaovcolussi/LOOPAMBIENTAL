import { AuthService } from '../src/modules/auth/auth.service';

describe('AuthService', () => {
  it('creates a user and a session when registering', async () => {
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
    );

    expect(result.user).toEqual(user);
    expect(result.token).toEqual(expect.any(String));
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'teste@empresa.com',
          status: 'ACTIVE',
        }),
      }),
    );
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
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
});
