import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { ModerationGuard } from '../auth/moderation.guard';
import { CompanyVerificationService } from './company-verification.service';

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

@Controller('companies')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class CompanyDocumentController {
  constructor(private readonly service: CompanyVerificationService) {}

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('document', { limits: { fileSize: MAX_DOCUMENT_SIZE } }),
  )
  async upload(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { type?: unknown },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const type = typeof body.type === 'string' ? body.type : '';
    if (!this.service.isValidDocumentType(type))
      throw new BadRequestException('INVALID_DOCUMENT_TYPE');
    return {
      document: await this.service.addDocument(request.user.id, id, type, file),
    };
  }

  @Get(':id/documents')
  async list(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      documents: await this.service.listDocuments(request.user.id, id),
    };
  }

  @Get(':id/documents/:documentId/file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async file(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    const document = await this.service.readDocument(
      request.user.id,
      request.user.platformRole,
      id,
      documentId,
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.fileName)}"`,
    );
    return new StreamableFile(document.buffer, { type: document.mimeType });
  }

  @Delete(':id/documents/:documentId')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ): Promise<unknown> {
    return this.service.removeDocument(request.user.id, id, documentId);
  }

  @Post(':id/verification')
  async requestVerification(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { notes?: unknown },
  ): Promise<unknown> {
    return {
      verification: await this.service.requestVerification(
        request.user.id,
        id,
        typeof body.notes === 'string'
          ? body.notes.trim().slice(0, 2000)
          : undefined,
      ),
    };
  }

  @Get(':id/verification')
  async verifications(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      verifications: await this.service.listVerifications(request.user.id, id),
    };
  }
}

@Controller('admin/company-verifications')
@UseGuards(AuthGuard, ModerationGuard)
export class AdminCompanyVerificationController {
  constructor(private readonly service: CompanyVerificationService) {}

  @Get()
  async list(): Promise<unknown> {
    return { verifications: await this.service.listAdmin() };
  }

  @Post(':id/approve')
  @UseGuards(AdminMutationGuard)
  async approve(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      verification: await this.service.approve(request.user.id, id),
    };
  }

  @Post(':id/reject')
  @UseGuards(AdminMutationGuard)
  async reject(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: unknown },
  ): Promise<unknown> {
    return {
      verification: await this.service.reject(
        request.user.id,
        id,
        typeof body.reason === 'string' ? body.reason : '',
      ),
    };
  }
}
