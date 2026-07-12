function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// YYYY-MM-DD strings are UTC midnight in JS — split directly to avoid local-TZ day shift
function isDateOnly(value: string): boolean {
  return value.length === 10;
}

export function fmtDate(value: string | Date | null): string {
  if (value == null) return '—';
  if (typeof value === 'string' && isDateOnly(value)) {
    const [y, m, d] = value.split('-');
    return `${d}.${m}.${y}`;
  }
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function fmtDateTime(value: string | Date | null): string {
  if (value == null) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
