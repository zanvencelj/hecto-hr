export const TASKS_QUEUE = 'tasks';

export const JOB_NAMES = {
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_VERIFICATION_EMAIL: 'send-verification-email',
  SEND_PASSWORD_RESET_EMAIL: 'send-password-reset-email',
  SEND_INVITATION_EMAIL: 'send-invitation-email',
} as const;

export type SendWelcomeEmailData = {
  email: string;
  firstName: string | null;
};

export type SendVerificationEmailData = {
  email: string;
  code: string;
  firstName: string | null;
};

export type SendPasswordResetEmailData = {
  email: string;
  resetLink: string;
  firstName: string | null;
};

export type SendInvitationEmailData = {
  email: string;
  firstName: string | null;
  inviteLink: string;
  organizationName: string;
  inviterName: string | null;
};
