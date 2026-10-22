// ====================================================================
// Hisbo Control — Platform Settings Types
// ====================================================================

export interface PlatformSetting<T = Record<string, unknown>> {
  key: string;
  value: T;
  description?: string;
  updated_at: string;
  updated_by?: string;
}

export interface MaintenanceModeValue {
  enabled: boolean;
  message: string;
}

export interface AllowSignupsValue {
  enabled: boolean;
}

export interface AnnouncementBarValue {
  enabled: boolean;
  message: string;
  link: string;
}

export interface SupportContactValue {
  email: string;
  phone?: string;
}

export interface AllPlatformSettings {
  maintenance_mode?: MaintenanceModeValue;
  allow_signups?: AllowSignupsValue;
  announcement_bar?: AnnouncementBarValue;
  support_contact?: SupportContactValue;
}

