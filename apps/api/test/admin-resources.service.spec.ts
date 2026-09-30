import { AdminResourcesService } from '../src/modules/admin/admin-resources.service';
import { encodeAdminCursor } from '../src/modules/admin/admin-pagination';

describe('AdminResourcesService', () => {
  it('rejects an unsupported company status', async () => {
    const service = new AdminResourcesService({} as never);
    await expect(
      service.updateCompanyStatus('admin-1', 'company-id', 'DELETED'),
    ).rejects.toThrow('INVALID_COMPANY_STATUS');
  });

  it('rejects an unknown platform setting', async () => {
    const service = new AdminResourcesService({} as never);
    await expect(
      service.updateSetting('admin-1', 'unknown_key', 'value'),
    ).rejects.toThrow('PLATFORM_SETTING_NOT_FOUND');
  });

  it('rejects an out-of-range numeric setting', async () => {
    const service = new AdminResourcesService({} as never);
    await expect(
      service.updateSetting('admin-1', 'commission_min_percent', 150),
    ).rejects.toThrow('INVALID_SETTING_VALUE');
  });

  it('rejects an invalid support email', async () => {
    const service = new AdminResourcesService({} as never);
    await expect(
      service.updateSetting('admin-1', 'support_email', 'not-an-email'),
    ).rejects.toThrow('INVALID_SETTING_VALUE');
  });

  it('upserts a valid setting and records an audit entry', async () => {
    const upsert = jest.fn().mockResolvedValue({
      key: 'commission_min_percent',
      value: 7,
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });
    const auditCreate = jest.fn().mockResolvedValue({});
    const service = new AdminResourcesService({
      platformSetting: { upsert },
      auditLog: { create: auditCreate },
    } as never);

    await service.updateSetting('admin-1', 'commission_min_percent', 7);

    expect(upsert).toHaveBeenCalled();
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin-1',
        action: 'PLATFORM_SETTING_UPDATED',
      }),
    });
  });

  it('rejects a malformed admin cursor', async () => {
    const service = new AdminResourcesService({} as never);
    await expect(
      service.listUsers({ cursor: 'broken', pageSize: 10 }),
    ).rejects.toThrow('INVALID_ADMIN_CURSOR');
  });

  it('keeps the search filter when paginating users with a cursor', async () => {
    const footer = {
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      id: 'user-id',
    };
    const cursor = encodeAdminCursor(footer);
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const service = new AdminResourcesService({
      user: { findMany, count },
    } as never);

    await service.listUsers({ q: 'acme', cursor, pageSize: 10 });

    const where = findMany.mock.calls[0][0].where;
    // The search OR and the cursor OR must coexist, otherwise page 2 silently
    // drops the search filter.
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0].OR).toEqual([
      { name: { contains: 'acme' } },
      { email: { contains: 'acme' } },
    ]);
    expect(where.AND[1].OR).toBeDefined();
  });
});
