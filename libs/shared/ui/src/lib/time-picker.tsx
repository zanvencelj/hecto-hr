import { useRef } from 'react';
import { cn } from './utils';

export interface TimePickerProps {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, className, disabled }: TimePickerProps) {
  const [hh = '00', mm = '00'] = value.split(':');
  const minuteRef = useRef<HTMLInputElement>(null);

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  function handleHours(raw: string) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(23, n));
    onChange(`${pad(clamped)}:${mm}`);
    if (raw.length >= 2) minuteRef.current?.focus();
  }

  function handleMinutes(raw: string) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(59, n));
    onChange(`${hh}:${pad(clamped)}`);
  }

  function handleHoursKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = parseInt(hh, 10);
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(`${pad((n + 1) % 24)}:${mm}`); }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(`${pad((n - 1 + 24) % 24)}:${mm}`); }
  }

  function handleMinutesKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = parseInt(mm, 10);
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(`${hh}:${pad((n + 1) % 60)}`); }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(`${hh}:${pad((n - 1 + 60) % 60)}`); }
  }

  const baseClass = cn(
    'flex h-10 w-24 items-center border bg-white px-3 text-sm',
    'border-gray-300 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-1',
    'transition-colors duration-150',
    disabled && 'cursor-not-allowed opacity-50',
    className,
  );

  const segmentClass =
    'w-6 bg-transparent text-center outline-none tabular-nums select-all' +
    ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

  return (
    <div className={baseClass}>
      <input
        type="number"
        min={0}
        max={23}
        value={hh}
        disabled={disabled}
        onChange={(e) => handleHours(e.target.value)}
        onKeyDown={handleHoursKey}
        onFocus={(e) => e.target.select()}
        className={segmentClass}
        aria-label="Hours"
      />
      <span className="select-none text-gray-400">:</span>
      <input
        ref={minuteRef}
        type="number"
        min={0}
        max={59}
        value={mm}
        disabled={disabled}
        onChange={(e) => handleMinutes(e.target.value)}
        onKeyDown={handleMinutesKey}
        onFocus={(e) => e.target.select()}
        className={segmentClass}
        aria-label="Minutes"
      />
    </div>
  );
}
