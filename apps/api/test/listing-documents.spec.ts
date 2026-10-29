import { ListingsService } from '../src/modules/listings/listings.service';
import { attachmentDisposition } from '../src/common/content-disposition';

const pdf = {
  originalname: 'laudo.pdf',
  buffer: Buffer.from('%PDF-1.7'),
  size: 8,
} as Express.Multer.File;

function setup(status = 'DRAFT', role = 'OWNER', existingDocuments = 0) {
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    listingDocument: {
      create: jest.fn().mockResolvedValue({ id: 'document-id' }),
      count: jest.fn().mockResolvedValue(existingDocuments),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    listing: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    moderationCase: { create: jest.fn().mockResolvedValue({}) },
    listingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    listing: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'listing-id',
        companyId: 'company-id',
        createdByUserId: 'creator-id',
        status,
      }),
    },
    companyMember: { findUnique: jest.fn().mockResolvedValue({ role }) },
    listingDocument: {
      count: jest.fn().mockResolvedValue(existingDocuments),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(transaction)),
  };
  const storage = {
    uploadDocument: jest.fn().mockResolvedValue({
      fileName: 'laudo.pdf',
      storageKey: 'listing-documents/key.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 8,
      sha256: 'a'.repeat(64),
    }),
    remove: jest.fn(),
    read: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7')),
  };
  const service = new ListingsService(prisma as never, storage as never);
  return { service, prisma, storage, transaction };
}

describe('ListingsService documents (laudos)', () => {
  it('stores a report on a draft listing without sending it to review', async () => {
    const { service, storage, transaction } = setup();

    await service.addDocument('creator-id', 'listing-id', pdf, {
      type: 'LAB_ANALYSIS',
      validUntil: '2027-01-31',
    });

    expect(storage.uploadDocument).toHaveBeenCalledWith(
      pdf,
      'listing-documents',
      expect.objectContaining({ purpose: 'LISTING_DOCUMENT' }),
    );
    expect(transaction.listingDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          listingId: 'listing-id',
          type: 'LAB_ANALYSIS',
          validUntil: new Date('2027-01-31T00:00:00.000Z'),
        }),
      }),
    );
    expect(transaction.moderationCase.create).not.toHaveBeenCalled();
  });

  it('returns a published listing to review when a report is added', async () => {
    const { service, transaction } = setup('PUBLISHED');

    await service.addDocument('creator-id', 'listing-id', pdf, {
      type: 'TECHNICAL_REPORT',
    });

    expect(transaction.listing.updateMany).toHaveBeenCalledWith({
      where: { id: 'listing-id', status: 'PUBLISHED' },
      data: { status: 'PENDING_REVIEW', publishedAt: null },
    });
    expect(transaction.moderationCase.create).toHaveBeenCalled();
    expect(transaction.listingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'LISTING_DOCUMENT_ADDED' }),
    });
  });

  it('removes the stored file when the database write fails', async () => {
    const { service, storage, transaction } = setup('PUBLISHED');
    transaction.listing.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.addDocument('creator-id', 'listing-id', pdf, {
        type: 'TECHNICAL_REPORT',
      }),
    ).rejects.toThrow('LISTING_STATE_CHANGED');
    expect(storage.remove).toHaveBeenCalledWith('listing-documents/key.pdf');
  });

  it('enforces the per-listing document limit before uploading', async () => {
    const { service, storage } = setup('DRAFT', 'OWNER', 5);

    await expect(
      service.addDocument('creator-id', 'listing-id', pdf, {
        type: 'TECHNICAL_REPORT',
      }),
    ).rejects.toThrow('DOCUMENT_LIMIT_EXCEEDED');
    expect(storage.uploadDocument).not.toHaveBeenCalled();
  });

  it.each(['2027-02-30', '31/01/2027', '2027-1-1'])(
    'rejects invalid validity date %s',
    async (validUntil) => {
      const { service, storage } = setup();

      await expect(
        service.addDocument('creator-id', 'listing-id', pdf, {
          type: 'TECHNICAL_REPORT',
          validUntil,
        }),
      ).rejects.toThrow('INVALID_DOCUMENT_VALIDITY');
      expect(storage.uploadDocument).not.toHaveBeenCalled();
    },
  );

  it('requires a file', async () => {
    const { service } = setup();

    await expect(
      service.addDocument('creator-id', 'listing-id', undefined, {
        type: 'TECHNICAL_REPORT',
      }),
    ).rejects.toThrow('DOCUMENT_REQUIRED');
  });

  it('blocks members from attaching reports to listings of other members', async () => {
    const { service, storage } = setup('DRAFT', 'MEMBER');

    await expect(
      service.addDocument('user-id', 'listing-id', pdf, {
        type: 'TECHNICAL_REPORT',
      }),
    ).rejects.toThrow('LISTING_MANAGEMENT_REQUIRED');
    expect(storage.uploadDocument).not.toHaveBeenCalled();
  });

  it('rejects changes to closed listings', async () => {
    const { service } = setup('CLOSED');

    await expect(
      service.removeDocument('creator-id', 'listing-id', 'document-id'),
    ).rejects.toThrow('LISTING_NOT_EDITABLE');
  });

  it('soft deletes a report and scopes it to the listing', async () => {
    const { service, transaction } = setup();

    await service.removeDocument('creator-id', 'listing-id', 'document-id');

    expect(transaction.moderationCase.create).not.toHaveBeenCalled();
    expect(transaction.listingDocument.updateMany).toHaveBeenCalledWith({
      where: { id: 'document-id', listingId: 'listing-id', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('returns a published listing to review when a report is removed', async () => {
    const { service, transaction } = setup('PUBLISHED');

    await service.removeDocument('creator-id', 'listing-id', 'document-id');

    expect(transaction.moderationCase.create).toHaveBeenCalled();
    expect(transaction.listingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ reason: 'LISTING_DOCUMENT_REMOVED' }),
    });
  });

  it('re-checks the limit under the listing lock (concurrent uploads)', async () => {
    const { service, storage, transaction } = setup('DRAFT', 'OWNER', 4);
    transaction.listingDocument.count.mockResolvedValue(5);

    await expect(
      service.addDocument('creator-id', 'listing-id', pdf, {
        type: 'TECHNICAL_REPORT',
      }),
    ).rejects.toThrow('DOCUMENT_LIMIT_EXCEEDED');
    expect(transaction.$queryRaw).toHaveBeenCalled();
    expect(transaction.listingDocument.create).not.toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith('listing-documents/key.pdf');
  });

  it('serves reports of published listings or to the accepted counterparty', async () => {
    const { service, prisma } = setup();
    prisma.listingDocument.findFirst.mockResolvedValue(null);

    await expect(
      service.readPublishedDocument('buyer-id', 'document-id'),
    ).rejects.toThrow('LISTING_DOCUMENT_NOT_FOUND');
    expect(prisma.listingDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'READY',
          deletedAt: null,
          listing: {
            deletedAt: null,
            OR: [
              { status: 'PUBLISHED' },
              {
                status: 'NEGOTIATING',
                proposals: {
                  some: {
                    status: 'ACCEPTED',
                    proposerCompany: {
                      members: { some: { userId: 'buyer-id' } },
                    },
                  },
                },
              },
            ],
          },
        }),
      }),
    );
  });

  it('blocks owner downloads for users outside the company', async () => {
    const { service, prisma, storage } = setup();
    prisma.listingDocument.findFirst.mockResolvedValue({
      listing: { companyId: 'company-id', createdByUserId: 'creator-id' },
    });
    prisma.companyMember.findUnique.mockResolvedValue(null);

    await expect(
      service.readOwnedDocument('intruder-id', 'document-id'),
    ).rejects.toThrow('COMPANY_ACCESS_DENIED');
    expect(storage.read).not.toHaveBeenCalled();
  });
});

describe('attachmentDisposition', () => {
  it('keeps accented names in filename* and escapes the fallback', () => {
    expect(attachmentDisposition('Laudo "análise".pdf')).toBe(
      `attachment; filename="Laudo _analise_.pdf"; filename*=UTF-8''Laudo%20%22an%C3%A1lise%22.pdf`,
    );
  });
});
