function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function fmtDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function fmtDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDateShort(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function fmtDateWithWeekday(value: string | Date, long = false): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const wd = long ? WEEKDAY_LONG[d.getDay()] : WEEKDAY_SHORT[d.getDay()];
  return `${wd}, ${fmtDate(d)}`;
}
