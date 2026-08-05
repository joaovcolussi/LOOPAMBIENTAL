import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
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
    const company = await this.prisma.company.create({
      data: {
        legalName: input.legalName,
        tradeName: input.tradeName,
        description: input.description,
        city: input.city,
        state: input.state?.toUpperCase(),
        taxIdHash: input.taxId ? this.hashTaxId(input.taxId) : undefined,
        taxIdEncrypted: input.taxId ? this.encrypt(input.taxId) : undefined,
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
    return company;
  }

  async listForUser(userId: string) {
    return this.prisma.company.findMany({
      where: { deletedAt: null, members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      select: this.companySelect,
    });
  }

  async findById(id: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, deletedAt: null },
      select: this.companySelect,
    });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    if (company.contactVisibility === 'PUBLIC') return company;
    if (company.contactVisibility === 'MEMBERS') {
      const membership = await this.prisma.companyMember.findUnique({
        where: { companyId_userId: { companyId: id, userId } },
      });
      if (membership) return company;
    }
    return {
      ...company,
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
    return this.prisma.company.update({
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
        ...(input.taxId
          ? {
              taxIdHash: this.hashTaxId(input.taxId),
              taxIdEncrypted: this.encrypt(input.taxId),
            }
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

  private hashTaxId(value: string) {
    return createHash('sha256').update(value.replace(/\D/g, '')).digest('hex');
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

  private readonly companySelect = {
    id: true,
    legalName: true,
    tradeName: true,
    description: true,
    city: true,
    state: true,
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
