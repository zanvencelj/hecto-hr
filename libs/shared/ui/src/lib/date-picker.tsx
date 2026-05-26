import { useRef, useState } from 'react';
import { cn } from './utils';

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

function pad(n: number | string): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function DatePicker({ value, onChange, className, disabled }: DatePickerProps) {
  const parts = value ? value.split('-') : ['', '', ''];
  const yyyyRaw = parts[0] ?? '';
  const mmRaw = parts[1] ?? '';
  const ddRaw = parts[2] ?? '';

  const [ddInput, setDdInput] = useState(ddRaw);
  const [mmInput, setMmInput] = useState(mmRaw);
  const [yyyyInput, setYyyyInput] = useState(yyyyRaw);

  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

  function emit(dd: string, mm: string, yyyy: string) {
    const d = parseInt(dd, 10);
    const m = parseInt(mm, 10);
    const y = parseInt(yyyy, 10);
    if (
      !isNaN(d) && d >= 1 && d <= 31 &&
      !isNaN(m) && m >= 1 && m <= 12 &&
      !isNaN(y) && y >= 1000 && y <= 9999
    ) {
      const maxDay = daysInMonth(m, y);
      const clampedD = Math.min(d, maxDay);
      onChange(`${pad(y)}-${pad(m)}-${pad(clampedD)}`);
    } else if (!dd && !mm && !yyyy) {
      onChange('');
    }
  }

  function handleDd(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setDdInput(digits);
    if (digits.length === 2) {
      const n = parseInt(digits, 10);
      const clamped = Math.max(1, Math.min(31, n));
      const s = pad(clamped);
      setDdInput(s);
      emit(s, mmInput, yyyyInput);
      mmRef.current?.focus();
    } else {
      emit(digits, mmInput, yyyyInput);
    }
  }

  function handleMm(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setMmInput(digits);
    if (digits.length === 2) {
      const n = parseInt(digits, 10);
      const clamped = Math.max(1, Math.min(12, n));
      const s = pad(clamped);
      setMmInput(s);
      emit(ddInput, s, yyyyInput);
      yyyyRef.current?.focus();
    } else {
      emit(ddInput, digits, yyyyInput);
    }
  }

  function handleYyyy(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    setYyyyInput(digits);
    emit(ddInput, mmInput, digits);
  }

  function handleDdKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = parseInt(ddInput, 10) || 1;
    if (e.key === 'ArrowUp') { e.preventDefault(); const s = pad(n >= 31 ? 1 : n + 1); setDdInput(s); emit(s, mmInput, yyyyInput); }
    if (e.key === 'ArrowDown') { e.preventDefault(); const s = pad(n <= 1 ? 31 : n - 1); setDdInput(s); emit(s, mmInput, yyyyInput); }
  }

  function handleMmKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = parseInt(mmInput, 10) || 1;
    if (e.key === 'ArrowUp') { e.preventDefault(); const s = pad(n >= 12 ? 1 : n + 1); setMmInput(s); emit(ddInput, s, yyyyInput); }
    if (e.key === 'ArrowDown') { e.preventDefault(); const s = pad(n <= 1 ? 12 : n - 1); setMmInput(s); emit(ddInput, s, yyyyInput); }
  }

  function handleYyyyKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = parseInt(yyyyInput, 10) || new Date().getFullYear();
    if (e.key === 'ArrowUp') { e.preventDefault(); const s = String(n + 1); setYyyyInput(s); emit(ddInput, mmInput, s); }
    if (e.key === 'ArrowDown') { e.preventDefault(); const s = String(n - 1); setYyyyInput(s); emit(ddInput, mmInput, s); }
  }

  const base = cn(
    'flex h-10 w-36 items-center border bg-white px-3 text-sm',
    'border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-1',
    'transition-colors duration-150',
    disabled && 'cursor-not-allowed opacity-50',
    className,
  );

  const seg = 'bg-transparent text-center outline-none tabular-nums select-all ' +
    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  const sep = <span className="select-none text-gray-400">.</span>;

  return (
    <div className={base}>
      <input
        type="number"
        min={1} max={31}
        value={ddInput}
        placeholder="DD"
        disabled={disabled}
        onChange={(e) => handleDd(e.target.value)}
        onKeyDown={handleDdKey}
        onFocus={(e) => e.target.select()}
        className={cn(seg, 'w-6')}
        aria-label="Day"
      />
      {sep}
      <input
        ref={mmRef}
        type="number"
        min={1} max={12}
        value={mmInput}
        placeholder="MM"
        disabled={disabled}
        onChange={(e) => handleMm(e.target.value)}
        onKeyDown={handleMmKey}
        onFocus={(e) => e.target.select()}
        className={cn(seg, 'w-6')}
        aria-label="Month"
      />
      {sep}
      <input
        ref={yyyyRef}
        type="number"
        min={1900} max={2100}
        value={yyyyInput}
        placeholder="YYYY"
        disabled={disabled}
        onChange={(e) => handleYyyy(e.target.value)}
        onKeyDown={handleYyyyKey}
        onFocus={(e) => e.target.select()}
        className={cn(seg, 'w-10')}
        aria-label="Year"
      />
    </div>
  );
}
