export function invitationEmailHtml(
  inviteLink: string,
  firstName: string | null,
  organizationName: string,
  inviterName: string | null,
): string {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const inviterText = inviterName ? `${inviterName} has invited you` : 'You have been invited';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;padding:32px">
    <h1 style="font-size:24px;color:#18181b;margin:0 0 8px">You're invited to HectoHR</h1>
    <p style="color:#52525b;line-height:1.6">${greeting}</p>
    <p style="color:#52525b;line-height:1.6">
      ${inviterText} to join <strong>${organizationName}</strong> on HectoHR.
      Click the button below to set up your account.
    </p>
    <a href="${inviteLink}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
      Accept invitation
    </a>
    <p style="color:#a1a1aa;font-size:13px">This invitation expires in 7 days. If you did not expect this, you can ignore it.</p>
    <p style="color:#a1a1aa;font-size:12px">Or copy this link: ${inviteLink}</p>
  </div>
</body>
</html>`;
}
