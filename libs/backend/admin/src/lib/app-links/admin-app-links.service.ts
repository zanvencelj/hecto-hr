import { Injectable } from '@nestjs/common';
import type { AppLinks } from '@hecto/database';
import { AdminAppLinksRepository } from './admin-app-links.repository';
import type { UpdateAppLinksDto } from '../dto/update-app-links.dto';

@Injectable()
export class AdminAppLinksService {
  constructor(private readonly repo: AdminAppLinksRepository) {}

  async get(): Promise<{ androidApkUrl: string | null; iosDownloadUrl: string | null }> {
    const row = await this.repo.get();
    return {
      androidApkUrl: row?.androidApkUrl ?? null,
      iosDownloadUrl: row?.iosDownloadUrl ?? null,
    };
  }

  update(dto: UpdateAppLinksDto, updatedBy: string): Promise<AppLinks> {
    return this.repo.upsert(dto, updatedBy);
  }
}
