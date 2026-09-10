export interface CompanySettingsPublic {
  organizationId: string;
  name: string;
  weekendDays: number[];
  unpaidBreakThresholdMinutes: number;
}
