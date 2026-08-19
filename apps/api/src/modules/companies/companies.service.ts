import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';

export type CompanyInput = {
  legalName?: string;
  tradeName?: string;
  description?: string;
  city?: string;
  state?: string;
  taxId?: string;
  contactName?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  addressLine?: string;
  addressNumber?: string;
  addressDistrict?: string;
  addressPostalCode?: string;
  contactVisibility?: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
};

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CompanyInput & { legalName: string }) {
    const taxId = this.normalizeTaxId(input.taxId);
    const company = await this.prisma.company.create({
      data: {
        legalName: input.legalName,
        tradeName: input.tradeName,
        description: input.description,
        city: input.city,
        state: input.state?.toUpperCase(),
        taxIdHash: taxId ? this.hashTaxId(taxId) : undefined,
        taxIdEncrypted: taxId ? this.encrypt(taxId) : undefined,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactWhatsapp: input.contactWhatsapp,
        addressLine: input.addressLine,
        addressNumber: input.addressNumber,
        addressDistrict: input.addressDistrict,
        addressPostalCode: input.addressPostalCode,
        contactVisibility: input.contactVisibility,
        status: 'ACTIVE',
        members: { create: { userId, role: 'OWNER' } },
      },
      select: this.companySelect,
    });
    return this.withMaskedTaxId(company, taxId);
  }

  async listForUser(userId: string) {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      select: this.companySelect,
    });
    return companies.map((company) => this.withMaskedTaxId(company));
  }

  async findById(id: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      select: this.companySelect,
    });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    const masked = this.withMaskedTaxId(company);
    if (company.contactVisibility === 'PUBLIC') return masked;
    if (company.contactVisibility === 'MEMBERS') {
      const membership = await this.prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId: id, userId } },
      });
      if (membership) return masked;
    }
    return {
      ...masked,
      contactName: null,
      contactEmail: null,
      contactWhatsapp: null,
      addressLine: null,
      addressNumber: null,
      addressDistrict: null,
      addressPostalCode: null,
    };
  }

  async update(userId: string, id: string, input: Partial<CompanyInput>) {
    await this.assertCanManage(userId, id);
    const taxId =
      input.taxId !== undefined ? this.normalizeTaxId(input.taxId) : undefined;
    const company = await this.prisma.company.update({
      where: { id },
      data: {
        ...(input.legalName !== undefined
          ? { legalName: input.legalName }
          : {}),
        ...(input.tradeName !== undefined
          ? { tradeName: input.tradeName }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined
          ? { state: input.state.toUpperCase() }
          : {}),
        ...(taxId !== undefined
          ? taxId
            ? {
                taxIdHash: this.hashTaxId(taxId),
                taxIdEncrypted: this.encrypt(taxId),
              }
            : { taxIdHash: null, taxIdEncrypted: null }
          : {}),
        ...(input.contactName !== undefined
          ? { contactName: input.contactName }
          : {}),
        ...(input.contactEmail !== undefined
          ? { contactEmail: input.contactEmail }
          : {}),
        ...(input.contactWhatsapp !== undefined
          ? { contactWhatsapp: input.contactWhatsapp }
          : {}),
        ...(input.addressLine !== undefined
          ? { addressLine: input.addressLine }
          : {}),
        ...(input.addressNumber !== undefined
          ? { addressNumber: input.addressNumber }
          : {}),
        ...(input.addressDistrict !== undefined
          ? { addressDistrict: input.addressDistrict }
          : {}),
        ...(input.addressPostalCode !== undefined
          ? { addressPostalCode: input.addressPostalCode }
          : {}),
        ...(input.contactVisibility
          ? { contactVisibility: input.contactVisibility }
          : {}),
      },
      select: this.companySelect,
    });
    return this.withMaskedTaxId(company, taxId);
  }

  private async assertCanManage(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
    }
  }

  private normalizeTaxId(value?: string) {
    if (!value) return '';
    const normalized = value.replace(/[^A-Za-z0-9]/g, '');
    if (normalized.length !== 14) {
      throw new BadRequestException('INVALID_TAX_ID');
    }
    return normalized;
  }

  private hashTaxId(value: string) {
    return createHash('sha256').update(value.toLowerCase()).digest('hex');
  }

  private encrypt(value: string) {
    const key = createHash('sha256')
      .update(process.env.FIELD_ENCRYPTION_KEY ?? 'loop-local-field-key')
      .digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
    return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
  }

  private decrypt(value: string) {
    try {
      const [, ivB64, tagB64, dataB64] = value.split(':');
      if (!ivB64 || !tagB64 || !dataB64) return null;
      const key = createHash('sha256')
        .update(process.env.FIELD_ENCRYPTION_KEY ?? 'loop-local-field-key')
        .digest();
      const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(ivB64, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64url')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      return null;
    }
  }

  private maskTaxId(value: string) {
    if (value.length !== 14) return value;
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.XXX/XXXX-${value.slice(12)}`;
  }

  private withMaskedTaxId(
    company: Record<string, unknown>,
    explicitTaxId?: string,
  ) {
    const encrypted =
      typeof company.taxIdEncrypted === 'string'
        ? company.taxIdEncrypted
        : null;
    const taxId = explicitTaxId ?? (encrypted ? this.decrypt(encrypted) : null);
    const { taxIdEncrypted, ...rest } = company;
    return {
      ...rest,
      taxIdMasked: taxId ? this.maskTaxId(taxId) : null,
    };
  }

  private readonly companySelect = {
    id: true,
    legalName: true,
    tradeName: true,
    description: true,
    city: true,
    state: true,
    taxIdEncrypted: true,
    contactName: true,
    contactEmail: true,
    contactWhatsapp: true,
    addressLine: true,
    addressNumber: true,
    addressDistrict: true,
    addressPostalCode: true,
    contactVisibility: true,
    status: true,
    verification: true,
    createdAt: true,
  } as const;
}
