import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CompaniesService } from './companies.service';

type CompanyBody = {
  legalName?: unknown;
  tradeName?: unknown;
  description?: unknown;
  city?: unknown;
  state?: unknown;
  taxId?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactWhatsapp?: unknown;
  addressLine?: unknown;
  addressNumber?: unknown;
  addressDistrict?: unknown;
  addressPostalCode?: unknown;
  contactVisibility?: unknown;
};

@Controller('companies')
@UseGuards(AuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: CompanyBody,
  ) {
    const input = this.validate(body, true);
    if (!input.legalName) throw new BadRequestException('INVALID_COMPANY_NAME');
    return {
      company: await this.companiesService.create(
        request.user.id,
        input as { legalName: string },
      ),
    };
  }

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return {
      companies: await this.companiesService.listForUser(request.user.id),
    };
  }

  @Get(':id')
  async find(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return {
      company: await this.companiesService.findById(id, request.user.id),
    };
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CompanyBody,
  ) {
    return {
      company: await this.companiesService.update(
        request.user.id,
        id,
        this.validate(body, false),
      ),
    };
  }

  private validate(body: CompanyBody, required: boolean) {
    const legalName =
      typeof body.legalName === 'string' ? body.legalName.trim() : '';
    if (required && (legalName.length < 2 || legalName.length > 200)) {
      throw new BadRequestException('INVALID_COMPANY_NAME');
    }
    const stringValue = (value: unknown, max: number) =>
      typeof value === 'string' ? value.trim().slice(0, max) : undefined;
    return {
      ...(legalName ? { legalName } : {}),
      tradeName: stringValue(body.tradeName, 200),
      description: stringValue(body.description, 2000),
      city: stringValue(body.city, 120),
      state: stringValue(body.state, 2),
      taxId: stringValue(body.taxId, 30),
      contactName: stringValue(body.contactName, 150),
      contactEmail: stringValue(body.contactEmail, 320),
      contactWhatsapp: stringValue(body.contactWhatsapp, 20),
      addressLine: stringValue(body.addressLine, 200),
      addressNumber: stringValue(body.addressNumber, 20),
      addressDistrict: stringValue(body.addressDistrict, 120),
      addressPostalCode: stringValue(body.addressPostalCode, 12),
      contactVisibility:
        body.contactVisibility === 'PRIVATE' ||
        body.contactVisibility === 'MEMBERS' ||
        body.contactVisibility === 'PUBLIC'
          ? (body.contactVisibility as 'PRIVATE' | 'MEMBERS' | 'PUBLIC')
          : undefined,
    };
  }
}
