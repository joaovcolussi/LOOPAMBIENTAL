import { ReportsService } from '../src/modules/reports/reports.service';

describe('ReportsService', () => {
  it('rejects a report with more than one target', async () => {
    const prisma = {};
    const service = new ReportsService(prisma as never);

    await expect(
      service.create('user-id', {
        targetType: 'LISTING',
        listingId: 'listing-id',
        companyId: 'company-id',
        reason: 'SPAM',
      }),
    ).rejects.toThrow('INVALID_REPORT_TARGET');
  });

  it('rejects an invalid reason', async () => {
    const prisma = {};
    const service = new ReportsService(prisma as never);

    await expect(
      service.create('user-id', {
        targetType: 'LISTING',
        listingId: 'listing-id',
        reason: 'NOT_A_REASON',
      }),
    ).rejects.toThrow('INVALID_REPORT_REASON');
  });

  it('blocks reporting your own user', async () => {
    const prisma = {
      user: { findFirst: jest.fn() },
    };
    const service = new ReportsService(prisma as never);

    await expect(
      service.create('user-id', {
        targetType: 'USER',
        reportedUserId: 'user-id',
        reason: 'SPAM',
      }),
    ).rejects.toThrow('SELF_REPORT_NOT_ALLOWED');
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('creates a listing report', async () => {
    const created = { id: 'report-id', targetType: 'LISTING', status: 'OPEN' };
    const prisma = {
      listing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-id' }) },
      report: { create: jest.fn().mockResolvedValue(created) },
    };
    const service = new ReportsService(prisma as never);

    await expect(
      service.create('user-id', {
        targetType: 'LISTING',
        listingId: 'listing-id',
        reason: 'MISLEADING',
        details: 'Detalhes',
      }),
    ).resolves.toEqual(created);
    expect(prisma.report.create).toHaveBeenCalled();
  });

  it('validates the resolution status', async () => {
    const prisma = { report: { updateMany: jest.fn() } };
    const service = new ReportsService(prisma as never);

    await expect(
      service.resolve('admin-id', 'report-id', 'OPEN'),
    ).rejects.toThrow('INVALID_REPORT_STATUS');
    expect(prisma.report.updateMany).not.toHaveBeenCalled();
  });
});
