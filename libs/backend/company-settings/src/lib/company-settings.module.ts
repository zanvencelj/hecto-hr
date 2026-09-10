import { Module } from '@nestjs/common';
import { AuthModule } from '@hecto/auth';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsRepository } from './company-settings.repository';

@Module({
  imports: [AuthModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, CompanySettingsRepository],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
