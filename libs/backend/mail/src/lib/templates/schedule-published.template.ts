function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export function schedulePublishedEmailHtml(
  firstName: string | null,
  shiftCount: number,
  dateFrom: string,
  dateTo: string,
): string {
  const name = firstName ?? 'there';
  const shifts = shiftCount === 1 ? '1 shift' : `${shiftCount} shifts`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your new schedule is ready</title>
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
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Hi ${name}, your schedule is ready</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                You have been assigned ${shifts} for ${formatDate(dateFrom)} – ${formatDate(dateTo)}.
              </p>
              <p style="margin:0 0 32px;color:#475569;font-size:15px;line-height:1.6;">
                Open the HectoHR app to see the details of your upcoming shifts.
              </p>
              <p style="margin:0;color:#94a3b8;font-size:13px;">— The HectoHR Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                You received this email because your organization published a new schedule.
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
