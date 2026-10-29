import { parseCsv, csvCell } from '../src/modules/integrations/csv';
import { ApiKeysService } from '../src/modules/integrations/api-keys.service';
import { IntegrationsService } from '../src/modules/integrations/integrations.service';
import { toKilograms } from '../src/modules/reports-analytics/emission-factors';

describe('CSV helpers', () => {
  it('parses quoted cells with either delimiter', () => {
    expect(parseCsv('a;b\n"x;1";"di ""aspas"""\n', 10)).toEqual([
      ['a', 'b'],
      ['x;1', 'di "aspas"'],
    ]);
    expect(parseCsv('﻿a,b\r\n1,2', 10)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('neutralizes spreadsheet formulas on export', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('Papelão')).toBe('Papelão');
  });
});

describe('ApiKeysService', () => {
  it('returns the secret once and stores only a hash', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      apiKey: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'key-1' }),
      },
      auditLog: { create: jest.fn() },
    };
    const service = new ApiKeysService(prisma as never);
    const result = await service.create('u', 'c', 'ERP Protheus');
    expect(result.secret).toMatch(/^la_demo_/);
    const data = prisma.apiKey.create.mock.calls[0][0].data;
    expect(data.keyHash).not.toContain(result.secret);
    expect(data.keyHash).toHaveLength(64);
  });

  it('rejects members without management role', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
    };
    const service = new ApiKeysService(prisma as never);
    await expect(service.create('u', 'c', 'ERP')).rejects.toThrow(
      'COMPANY_MANAGEMENT_REQUIRED',
    );
  });

  it('does not authenticate revoked keys or keys without the prefix', async () => {
    const prisma = {
      apiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'k',
          companyId: 'c',
          createdByUserId: 'u',
          revokedAt: new Date(),
          company: { status: 'ACTIVE' },
        }),
      },
    };
    const service = new ApiKeysService(prisma as never);
    await expect(service.authenticate('la_demo_abc')).resolves.toBeNull();
    await expect(service.authenticate('outra-chave')).resolves.toBeNull();
  });
});

describe('IntegrationsService.importListingsCsv', () => {
  function setup() {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      wasteCategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'cat-1', slug: 'plastico', name: 'Plástico' },
          ]),
      },
      auditLog: { create: jest.fn() },
    };
    const listings = {
      create: jest
        .fn()
        .mockImplementation((_u, input) =>
          Promise.resolve({ id: `l-${input.title}`, title: input.title }),
        ),
      submit: jest.fn(),
    };
    return {
      service: new IntegrationsService(prisma as never, listings as never),
      listings,
    };
  }

  it('creates valid rows and reports invalid ones by line', async () => {
    const { service, listings } = setup();
    const csv =
      'tipo;titulo;categoria;quantidade;unidade;preco_unitario\n' +
      'VENDA;Aparas de PET;plastico;100;kg;2,50\n' +
      'TROCA;Algo inválido;plastico;1;kg;\n' +
      'COMPRA;Compra de PEAD;inexistente;10;kg;\n';
    const result = await service.importListingsCsv('u', 'c', csv, false);
    expect(result.created).toHaveLength(1);
    expect(result.errors.map((error) => error.line)).toEqual([3, 4]);
    expect(listings.create).toHaveBeenCalledWith(
      'u',
      expect.objectContaining({ type: 'SELL', unitPrice: '2.50' }),
    );
    expect(listings.submit).not.toHaveBeenCalled();
  });

  it('requires the mandatory columns', async () => {
    const { service } = setup();
    await expect(
      service.importListingsCsv('u', 'c', 'titulo\nx', false),
    ).rejects.toThrow('CSV_MISSING_COLUMNS');
  });
});

describe('report unit conversion', () => {
  it('converts mass units and ignores others', () => {
    expect(toKilograms(2, 't')).toBe(2000);
    expect(toKilograms(5, 'KG')).toBe(5);
    expect(toKilograms(10, 'un')).toBeNull();
  });
});
