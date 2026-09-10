import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateAppLinksDto {
  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  androidApkUrl?: string | null;

  @IsOptional()
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  iosDownloadUrl?: string | null;
}
