import { CompanyVerificationService } from '../src/modules/company-verification/company-verification.service';

function makeService(prisma: unknown) {
  const storage = {
    uploadDocument: jest.fn(),
    read: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const outbox = { enqueueWithin: jest.fn().mockResolvedValue({}) };
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const service = new CompanyVerificationService(
    prisma as never,
    storage as never,
    outbox as never,
    notifications as never,
  );
  return { service, storage, notifications, outbox };
}

describe('CompanyVerificationService', () => {
  it('blocks a regular member from uploading a document', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
    };
    const { service, storage } = makeService(prisma);

    await expect(
      service.addDocument('user-id', 'company-id', 'CNPJ_CARD', undefined),
    ).rejects.toThrow('COMPANY_MANAGEMENT_REQUIRED');
    expect(storage.uploadDocument).not.toHaveBeenCalled();
  });

  it('requires at least one document to request verification', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      company: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'company-id', verification: 'UNVERIFIED' }),
      },
      companyDocument: { count: jest.fn().mockResolvedValue(0) },
    };
    const { service } = makeService(prisma);

    await expect(
      service.requestVerification('user-id', 'company-id'),
    ).rejects.toThrow('DOCUMENTS_REQUIRED');
  });

  it('approves a verification, marks the company verified and notifies admins', async () => {
    const decided = {
      id: 'verification-id',
      status: 'APPROVED',
      company: {
        id: 'company-id',
        legalName: 'Empresa',
        verification: 'VERIFIED',
      },
    };
    const tx = {
      companyVerification: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(decided),
      },
      company: { update: jest.fn().mockResolvedValue({}) },
      companyDocument: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      companyVerification: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'verification-id',
          companyId: 'company-id',
          status: 'PENDING',
        }),
      },
      companyMember: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'owner-1' }]),
      },
      $transaction: jest.fn(async (callback: (client: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const { service, notifications } = makeService(prisma);

    await expect(
      service.approve('admin-1', 'verification-id'),
    ).resolves.toEqual(decided);
    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: 'company-id' },
      data: { verification: 'VERIFIED' },
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({ type: 'COMPANY_VERIFIED' }),
    );
  });

  it('requires a reason to reject a verification', async () => {
    const prisma = {
      companyVerification: { findFirst: jest.fn() },
    };
    const { service } = makeService(prisma);

    await expect(
      service.reject('admin-1', 'verification-id', 'no'),
    ).rejects.toThrow('MODERATION_REASON_REQUIRED');
    expect(prisma.companyVerification.findFirst).not.toHaveBeenCalled();
  });

  it('lets a reviewer read documents without company membership', async () => {
    const prisma = {
      companyMember: { findUnique: jest.fn().mockResolvedValue(null) },
      companyDocument: {
        findFirst: jest.fn().mockResolvedValue({
          storageKey: 'company-documents/file.pdf',
          mimeType: 'application/pdf',
          fileName: 'documento.pdf',
        }),
      },
    };
    const { service, storage } = makeService(prisma);

    await expect(
      service.readDocument('admin-1', 'ADMIN', 'company-id', 'document-id'),
    ).resolves.toEqual({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      fileName: 'documento.pdf',
    });
    expect(storage.read).toHaveBeenCalledWith('company-documents/file.pdf');
  });

  it('denies document access to outsiders', async () => {
    const prisma = {
      companyMember: { findUnique: jest.fn().mockResolvedValue(null) },
      companyDocument: { findFirst: jest.fn() },
    };
    const { service } = makeService(prisma);

    await expect(
      service.readDocument('user-id', 'USER', 'company-id', 'document-id'),
    ).rejects.toThrow('COMPANY_ACCESS_DENIED');
  });
});
