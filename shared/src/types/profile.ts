export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  country: string | null;
  currency: string;
  language: string;
  timezone: string;
  date_format: string;
  notification_preferences: NotificationPreferences;
  default_dashboard_view: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  email_notifications: boolean;
  weekly_summary: boolean;
  monthly_report: boolean;
}

export interface ProfileUpdate {
  full_name?: string;
  username?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  country?: string | null;
  currency?: string;
  language?: string;
  timezone?: string;
  date_format?: string;
  notification_preferences?: NotificationPreferences;
  default_dashboard_view?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface EmailChange {
  new_email: string;
  password: string;
}

export interface AccountDeletionRequest {
  confirmation: string;
  password: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  email_notifications: true,
  weekly_summary: false,
  monthly_report: true,
};
