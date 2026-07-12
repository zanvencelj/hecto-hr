import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Spinner, Alert, Button, Card, CardContent } from '@hecto/ui';
import type { YearlySummary, MonthlySummary, DaySummary } from '@hecto/shared-types';
import type { WorkEventPublic, ShiftPublic } from '@hecto/shared-types';
import { fmtDate } from '@/lib/date';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtMinutes(m: number): string {
  if (m === 0) return '0h';
  const sign = m < 0 ? '-' : '';
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  return min ? `${sign}${h}h ${min}m` : `${sign}${h}h`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function localDateStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const EVENT_LABEL: Record<string, string> = {
  arrival: 'Arrival',
  departure: 'Departure',
  break_start: 'Break start',
  break_end: 'Break end',
  remote_arrival: 'Remote arrival',
  business_trip_start: 'Business trip start',
  business_trip_end: 'Business trip end',
};

function dayBg(day: DaySummary): string {
  if (day.isWeekend && day.state === 'free') return 'bg-gray-100 text-gray-400';
  switch (day.state) {
    case 'worked':           return 'bg-green-100 text-green-800';
    case 'planned_absence':  return 'bg-blue-100 text-blue-800';
    case 'missed':           return 'bg-red-100 text-red-700';
    default:                 return day.isWeekend ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-400';
  }
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-gray-600">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-100 border border-green-200" />Worked</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-100 border border-blue-200" />Planned absence</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100 border border-red-200" />Missed</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-100 border border-gray-200" />Free / Weekend</span>
    </div>
  );
}

function StatCard({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-xl font-semibold ${className}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function overtimeColor(min: number): string {
  return min > 0 ? 'text-green-700' : min < 0 ? 'text-red-600' : '';
}

function overtimeLabel(worked: number, scheduled: number): string {
  if (scheduled === 0) return '—';
  const diff = worked - scheduled;
  return (diff >= 0 ? '+' : '') + fmtMinutes(diff);
}

// ── daily view ────────────────────────────────────────────────────────────────

interface DailyViewProps {
  date: string;
  shiftsEndpoint: string;
  eventsEndpoint: string;
  onBack: () => void;
}

function DailyView({ date, shiftsEndpoint, eventsEndpoint, onBack }: DailyViewProps) {
  const { data: shifts, isLoading: sl, error: se } = useQuery({
    queryKey: ['history-shifts', shiftsEndpoint, date],
    queryFn: () =>
      apiClient.get<ShiftPublic[]>(shiftsEndpoint, { params: { from: date, to: date } }).then((r) => r.data),
  });

  const { data: events, isLoading: el, error: ee } = useQuery({
    queryKey: ['history-events', eventsEndpoint, date],
    queryFn: () =>
      apiClient.get<WorkEventPublic[]>(eventsEndpoint, {
        params: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59.999Z` },
      }).then((r) => r.data),
  });

  const isLoading = sl || el;
  const shift = shifts?.[0];
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  // Build timeline segments using a state machine so orphaned events are safely ignored.
  // workedMinutes is then derived from work segments — single source of truth.
  interface Seg { start: Date; end: Date; kind: 'work' | 'break' }
  type SegState = 'idle' | 'working' | 'in-break';
  const segs: Seg[] = [];
  let segStart: Date | null = null;
  let segState: SegState = 'idle';
  for (const ev of sorted) {
    const t = new Date(ev.occurredAt);
    if (['arrival', 'remote_arrival', 'business_trip_start'].includes(ev.type)) {
      segStart = t; segState = 'working';
    } else if (ev.type === 'break_start' && segState === 'working') {
      segs.push({ start: segStart!, end: t, kind: 'work' });
      segStart = t; segState = 'in-break';
    } else if (ev.type === 'break_end' && segState === 'in-break') {
      segs.push({ start: segStart!, end: t, kind: 'break' });
      segStart = t; segState = 'working';
    } else if (['departure', 'business_trip_end'].includes(ev.type) && segState === 'working') {
      segs.push({ start: segStart!, end: t, kind: 'work' });
      segStart = null; segState = 'idle';
    }
  }

  const workedMinutes = segs
    .filter((s) => s.kind === 'work')
    .reduce((sum, s) => sum + Math.round((s.end.getTime() - s.start.getTime()) / 60000), 0);

  const scheduledMinutes = shift ? (() => {
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const [eh, em] = shift.endTime.split(':').map(Number);
    if (isNaN(sh ?? NaN) || isNaN(sm ?? NaN) || isNaN(eh ?? NaN) || isNaN(em ?? NaN)) return 0;
    const mins = ((eh ?? 0) * 60 + (em ?? 0)) - ((sh ?? 0) * 60 + (sm ?? 0));
    return mins < 0 ? mins + 24 * 60 : mins;
  })() : 0;

  const [dy, dm, dd] = date.split('-').map(Number);
  const rangeStart = new Date(dy!, dm! - 1, dd!, 6, 0, 0);
  const rangeEnd   = new Date(dy!, dm! - 1, dd!, 22, 0, 0);
  const total = rangeEnd.getTime() - rangeStart.getTime();
  const pct = (t: Date) => Math.max(0, Math.min(100, ((t.getTime() - rangeStart.getTime()) / total) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
        <h2 className="text-lg font-semibold">{fmtDate(date)}</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (se || ee) ? (
        <Alert variant="error">Failed to load day detail.</Alert>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Worked" value={fmtMinutes(workedMinutes)} />
            <StatCard label="Scheduled" value={shift ? `${shift.startTime}–${shift.endTime}` : '—'} />
            <StatCard
              label="Overtime"
              value={overtimeLabel(workedMinutes, scheduledMinutes)}
              className={overtimeColor(workedMinutes - scheduledMinutes)}
            />
          </div>

          {segs.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-gray-500 mb-3">Timeline (06:00–22:00)</div>
                <div className="relative h-8 rounded bg-gray-100 overflow-hidden">
                  {shift && (() => {
                    const [sh, sm] = shift.startTime.split(':').map(Number);
                    const [eh, em] = shift.endTime.split(':').map(Number);
                    const ss = new Date(dy!, dm! - 1, dd!, sh ?? 0, sm ?? 0, 0);
                    const se = new Date(dy!, dm! - 1, dd!, eh ?? 0, em ?? 0, 0);
                    if (se < ss) se.setDate(se.getDate() + 1);
                    return (
                      <div
                        className="absolute top-0 h-full bg-gray-200 border-x border-gray-300"
                        style={{ left: `${pct(ss)}%`, width: `${Math.max(0, pct(se) - pct(ss))}%` }}
                      />
                    );
                  })()}
                  {segs.map((seg, i) => (
                    <div
                      key={i}
                      className={`absolute top-1 h-6 rounded ${seg.kind === 'work' ? 'bg-green-500' : 'bg-yellow-400'}`}
                      style={{ left: `${pct(seg.start)}%`, width: `${Math.max(0.5, pct(seg.end) - pct(seg.start))}%` }}
                      title={`${seg.kind}: ${fmtTime(seg.start.toISOString())}–${fmtTime(seg.end.toISOString())}`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>06:00</span><span>22:00</span>
                </div>
              </CardContent>
            </Card>
          )}

          {sorted.length > 0 ? (
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-gray-500 mb-3">Events</div>
                <div className="divide-y">
                  {sorted.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700">{EVENT_LABEL[ev.type] ?? ev.type}</span>
                      <div className="flex items-center gap-3">
                        {ev.notes && <span className="text-xs text-gray-400">{ev.notes}</span>}
                        <span className="font-mono text-sm text-gray-600">{fmtTime(ev.occurredAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-gray-500">No events recorded.</p>
          )}
        </>
      )}
    </div>
  );
}

// ── monthly view ──────────────────────────────────────────────────────────────

interface MonthlyViewProps {
  year: number;
  month: number;
  summaryEndpoint: string;
  onBack: () => void;
  onDayClick: (date: string) => void;
}

function MonthlyView({ year, month, summaryEndpoint, onBack, onDayClick }: MonthlyViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['history-monthly', summaryEndpoint, year, month, localDateStr()],
    queryFn: () =>
      apiClient.get<MonthlySummary>(summaryEndpoint, { params: { year, month, clientDate: localDateStr() } }).then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !data) return <Alert variant="error">Failed to load monthly summary.</Alert>;

  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leading = firstDow === 0 ? 6 : firstDow - 1;
  const dayMap = new Map(data.days.map((d) => [d.date, d]));
  const sel = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
        <h2 className="text-lg font-semibold">{MONTH_NAMES[month - 1]} {year}</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Worked" value={fmtMinutes(data.totalWorkedMinutes)} />
        <StatCard label="Scheduled" value={fmtMinutes(data.totalScheduledMinutes)} />
        <StatCard
          label="Overtime"
          value={overtimeLabel(data.totalWorkedMinutes, data.totalScheduledMinutes)}
          className={overtimeColor(data.totalOvertimeMinutes)}
        />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-3"><Legend /></div>
          <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-gray-500 mb-1">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leading }, (_, i) => <div key={`b${i}`} />)}
            {data.days.map((day) => {
              const dd = parseInt(day.date.split('-')[2]!, 10);
              const active = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(active ? null : day.date)}
                  className={`rounded p-1 text-xs transition-all ${dayBg(day)} ${active ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:opacity-80'}`}
                >
                  <div className="font-medium">{dd}</div>
                  {day.workedMinutes > 0 && (
                    <div className="opacity-70">{fmtMinutes(day.workedMinutes)}</div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {sel && (
        <Card>
          <CardContent className="pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">{fmtDate(sel.date)}</h3>
              <Button size="sm" variant="ghost" onClick={() => onDayClick(sel.date)}>View detail →</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div><div className="text-xs text-gray-500">State</div><div className="capitalize">{sel.state.replace('_', ' ')}</div></div>
              <div><div className="text-xs text-gray-500">Worked</div><div>{fmtMinutes(sel.workedMinutes)}</div></div>
              <div><div className="text-xs text-gray-500">Scheduled</div><div>{fmtMinutes(sel.scheduledMinutes)}</div></div>
              <div>
                <div className="text-xs text-gray-500">Overtime</div>
                <div className={overtimeColor(sel.overtimeMinutes)}>{overtimeLabel(sel.workedMinutes, sel.scheduledMinutes)}</div>
              </div>
            </div>
            {sel.leaveTypeName && <div className="mt-2 text-xs text-blue-600">Leave: {sel.leaveTypeName}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── yearly view ───────────────────────────────────────────────────────────────

interface YearlyViewProps {
  year: number;
  summaryEndpoint: string;
  onMonthClick: (month: number) => void;
}

function YearlyView({ year, summaryEndpoint, onMonthClick }: YearlyViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['history-yearly', summaryEndpoint, year, localDateStr()],
    queryFn: () =>
      apiClient.get<YearlySummary>(summaryEndpoint, { params: { year, clientDate: localDateStr() } }).then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error || !data) return <Alert variant="error">Failed to load yearly summary.</Alert>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total worked" value={fmtMinutes(data.totalWorkedMinutes)} />
        <StatCard label="Total scheduled" value={fmtMinutes(data.totalScheduledMinutes)} />
        <StatCard
          label="Total overtime"
          value={overtimeLabel(data.totalWorkedMinutes, data.totalScheduledMinutes)}
          className={overtimeColor(data.totalOvertimeMinutes)}
        />
      </div>

      <Legend />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.months.map((m) => {
          const firstDow = new Date(Date.UTC(year, m.month - 1, 1)).getUTCDay();
          const leading = firstDow === 0 ? 6 : firstDow - 1;
          return (
            <Card key={m.month}>
              <CardContent className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{MONTH_NAMES[m.month - 1]}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{fmtMinutes(m.totalWorkedMinutes)}</span>
                    <Button size="sm" variant="ghost" onClick={() => onMonthClick(m.month)} className="h-6 px-2 text-xs">
                      View →
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: leading }, (_, i) => <div key={`b${i}`} />)}
                  {m.days.map((day) => (
                    <div
                      key={day.date}
                      className={`h-3.5 w-full rounded-sm ${dayBg(day)}`}
                      title={`${day.date}: ${day.state.replace('_', ' ')}${day.workedMinutes ? ` (${fmtMinutes(day.workedMinutes)})` : ''}`}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── public HistoryView ────────────────────────────────────────────────────────

type View = 'year' | 'month' | 'day';

export interface HistoryViewProps {
  summaryEndpoint: string;
  shiftsEndpoint: string;
  eventsEndpoint: string;
}

export function HistoryView({ summaryEndpoint, shiftsEndpoint, eventsEndpoint }: HistoryViewProps) {
  const [view, setView] = useState<View>('year');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [day, setDay] = useState('');
  const now = new Date().getFullYear();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {view === 'year' && (
          <>
            <Button size="sm" variant="ghost" onClick={() => setYear((y) => y - 1)}>←</Button>
            <span className="w-14 text-center text-base font-semibold">{year}</span>
            <Button size="sm" variant="ghost" onClick={() => setYear((y) => y + 1)} disabled={year >= now}>→</Button>
          </>
        )}
        {view !== 'year' && (
          <nav className="text-sm text-gray-500 flex items-center gap-1">
            <button className="hover:text-gray-900" onClick={() => setView('year')}>{year}</button>
            {(view === 'month' || view === 'day') && (
              <>
                <span>/</span>
                <button className="hover:text-gray-900" onClick={() => setView('month')}>{MONTH_NAMES[month - 1]}</button>
              </>
            )}
            {view === 'day' && (
              <>
                <span>/</span>
                <span className="text-gray-900">{day.split('-')[2]}</span>
              </>
            )}
          </nav>
        )}
      </div>

      {view === 'year' && (
        <YearlyView
          year={year}
          summaryEndpoint={summaryEndpoint}
          onMonthClick={(m) => { setMonth(m); setView('month'); }}
        />
      )}
      {view === 'month' && (
        <MonthlyView
          year={year}
          month={month}
          summaryEndpoint={summaryEndpoint}
          onBack={() => setView('year')}
          onDayClick={(d) => { setDay(d); setView('day'); }}
        />
      )}
      {view === 'day' && (
        <DailyView
          date={day}
          shiftsEndpoint={shiftsEndpoint}
          eventsEndpoint={eventsEndpoint}
          onBack={() => setView('month')}
        />
      )}
    </div>
  );
}
