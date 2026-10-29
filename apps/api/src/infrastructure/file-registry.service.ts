import { Injectable, Logger } from '@nestjs/common';
import type { FilePurpose } from '@loopambiental/database';
import { PrismaService } from './prisma.service';
import type { ScanVerdict } from './file-scanner';

export type UploadContext = {
  ownerUserId: string;
  purpose: FilePurpose;
  resourceId?: string;
};

/**
 * Keeps the `files` table: one row per stored (or rejected) upload with its
 * hash, detected MIME type, access level and scan result.
 */
@Injectable()
export class FileRegistryService {
  private readonly logger = new Logger(FileRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    context: UploadContext,
    file: {
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
      sha256: string;
      accessLevel: 'PUBLIC' | 'PRIVATE';
    },
    verdict: ScanVerdict,
  ) {
    try {
      await this.prisma.fileObject.create({
        data: {
          ownerUserId: context.ownerUserId,
          purpose: context.purpose,
          resourceId: context.resourceId,
          storageKey: file.storageKey,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          sha256: file.sha256,
          accessLevel: file.accessLevel,
          scanStatus: verdict.clean ? 'CLEAN' : 'INFECTED',
          scanEngine: verdict.engine,
          scanDetails: verdict.signature ?? null,
          scannedAt: new Date(),
        },
      });
    } catch (error) {
      // The registry is an audit trail; it must not break a stored upload.
      this.logger.warn(
        `File registry failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  list(options: { status?: string; take?: number }): Promise<unknown> {
    const allowed = ['PENDING', 'CLEAN', 'INFECTED', 'ERROR'];
    return this.prisma.fileObject.findMany({
      where:
        options.status && allowed.includes(options.status)
          ? { scanStatus: options.status as 'CLEAN' }
          : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(options.take ?? 100, 200),
      select: {
        id: true,
        purpose: true,
        resourceId: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        accessLevel: true,
        scanStatus: true,
        scanEngine: true,
        scanDetails: true,
        scannedAt: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
      },
    });
  }

  async summary() {
    const rows = await this.prisma.fileObject.groupBy({
      by: ['scanStatus'],
      _count: { _all: true },
    });
    return Object.fromEntries(
      rows.map((row) => [row.scanStatus, row._count._all]),
    );
  }
}
