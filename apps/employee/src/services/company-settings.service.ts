import type { CompanySettingsPublic } from '@hecto/shared-types';
import { api } from '@/lib/api';

export async function getCompanySettings(): Promise<CompanySettingsPublic> {
  const { data } = await api.get<CompanySettingsPublic>('/company-settings');
  return data;
}
