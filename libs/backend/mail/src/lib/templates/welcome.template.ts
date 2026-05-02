export function welcomeEmailHtml(firstName: string | null): string {
  const name = firstName ?? 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to HectoHR</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#1e293b;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">HectoHR</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Welcome, ${name}!</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Your HectoHR account is ready. You can now log in and start managing your HR workflows efficiently.
              </p>
              <p style="margin:0 0 32px;color:#475569;font-size:15px;line-height:1.6;">
                If you have any questions, feel free to reply to this email — we're happy to help.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;">— The HectoHR Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                You received this email because you created a HectoHR account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
