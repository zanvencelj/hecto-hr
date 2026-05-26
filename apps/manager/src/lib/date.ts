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

export function fmtDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateShort(value: string | Date): string {
  if (typeof value === 'string' && isDateOnly(value)) {
    const [, m, d] = value.split('-');
    return `${d}.${m}`;
  }
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtDateWithWeekday(value: string | Date, long = false): string {
  if (typeof value === 'string' && isDateOnly(value)) {
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d!));
    const wd = long ? WEEKDAY_LONG[dt.getUTCDay()] : WEEKDAY_SHORT[dt.getUTCDay()];
    return `${wd}, ${pad(d!)}.${pad(m!)}.${y}`;
  }
  const d = typeof value === 'string' ? new Date(value) : value;
  const wd = long ? WEEKDAY_LONG[d.getDay()] : WEEKDAY_SHORT[d.getDay()];
  return `${wd}, ${fmtDate(d)}`;
}
