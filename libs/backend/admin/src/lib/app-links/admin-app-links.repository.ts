import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION, type Database, appLinks, type AppLinks } from '@hecto/database';

const SINGLETON_ID = 'singleton';

@Injectable()
export class AdminAppLinksRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
  ) {}

  async get(): Promise<AppLinks | undefined> {
    const rows = await this.db.select().from(appLinks).where(eq(appLinks.id, SINGLETON_ID));
    return rows[0];
  }

  async upsert(
    patch: { androidApkUrl?: string | null; iosDownloadUrl?: string | null },
    updatedBy: string,
  ): Promise<AppLinks> {
    const existing = await this.get();

    const result = await this.db
      .insert(appLinks)
      .values({
        id: SINGLETON_ID,
        androidApkUrl: patch.androidApkUrl ?? null,
        iosDownloadUrl: patch.iosDownloadUrl ?? null,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: appLinks.id,
        set: {
          androidApkUrl: 'androidApkUrl' in patch ? patch.androidApkUrl : existing?.androidApkUrl,
          iosDownloadUrl: 'iosDownloadUrl' in patch ? patch.iosDownloadUrl : existing?.iosDownloadUrl,
          updatedAt: new Date(),
          updatedBy,
        },
      })
      .returning();

    return result[0]!;
  }
}
