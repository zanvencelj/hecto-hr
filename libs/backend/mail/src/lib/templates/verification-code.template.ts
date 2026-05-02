export function verificationCodeEmailHtml(code: string, firstName: string | null): string {
  const name = firstName ?? 'there';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email – HectoHR</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1d4ed8;padding:28px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">HectoHR</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:600;">Verify your email address</h2>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                Hi ${name}, use the code below to complete your HectoHR registration.
                This code expires in <strong>10 minutes</strong>.
              </p>
              <div style="background:#f0f4ff;border:2px dashed #93c5fd;border-radius:10px;padding:24px;text-align:center;margin:0 0 28px;">
                <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1d4ed8;font-variant-numeric:tabular-nums;">${code}</span>
              </div>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                If you didn't create a HectoHR account, you can safely ignore this email.
                Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} HectoHR · This email was sent because a registration was initiated with your email address.
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
