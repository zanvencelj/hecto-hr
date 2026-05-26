import { createRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { rootRoute } from '../root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import { fmtDateWithWeekday } from '@/lib/date';
import {
  Alert,
  Button,
  DatePicker,
  Dialog,
  FormField,
  Input,
  PageHeader,
  Skeleton,
  TimePicker,
  useToast,
} from '@hecto/ui';
import type { EmployeePublic, ShiftPublic } from '@hecto/shared-types';

// ─── helpers ────────────────────────────────────────────────────────────────

function getWeekRange(date: Date): { from: string; to: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().split('T')[0]!,
    to: sunday.toISOString().split('T')[0]!,
  };
}

function formatDate(d: string) {
  return fmtDateWithWeekday(d);
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function shiftDurationHours(shift: ShiftPublic): number {
  return (toMinutes(shift.endTime) - toMinutes(shift.startTime)) / 60;
}

function shiftColor(hours: number): string {
  if (hours < 6) return 'bg-gray-100 text-gray-700 border-gray-200';
  if (hours <= 9) return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

// ─── route ──────────────────────────────────────────────────────────────────

export const scheduleManagerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/my-schedule' });
    }
  },
  component: ScheduleManagerPage,
});

// ─── types ──────────────────────────────────────────────────────────────────

interface ShiftModalState {
  open: boolean;
  mode: 'create' | 'edit';
  prefillEmployee?: string;
  prefillDate?: string;
  shift?: ShiftPublic;
}

// ─── page ───────────────────────────────────────────────────────────────────

function ScheduleManagerPage() {
  const [weekStart, setWeekStart] = useState(() => new Date());
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [modal, setModal] = useState<ShiftModalState>({ open: false, mode: 'create' });
  const { from, to } = getWeekRange(weekStart);
  const qc = useQueryClient();
  const toast = useToast();
  const todayStr = today();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeePublic[]>('/employees').then((r) => r.data),
  });

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', 'org', from, to],
    queryFn: () =>
      apiClient.get<ShiftPublic[]>('/shifts/org', { params: { from, to } }).then((r) => r.data),
  });

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }

  const days = useMemo(() => {
    const [y, m, d] = from.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(Date.UTC(y!, m! - 1, d! + i));
      return dt.toISOString().split('T')[0]!;
    });
  }, [from]);

  const shiftsByEmployee = useMemo(() => {
    const map = new Map<string, ShiftPublic[]>();
    shifts?.forEach((s) => {
      const arr = map.get(s.userId) ?? [];
      arr.push(s);
      map.set(s.userId, arr);
    });
    return map;
  }, [shifts]);

  const filteredEmployees = useMemo(() => {
    const active = employees?.filter((e) => e.isActive) ?? [];
    if (!employeeFilter.trim()) return active;
    const q = employeeFilter.toLowerCase();
    return active.filter((e) =>
      [e.firstName, e.lastName, e.email, e.position]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [employees, employeeFilter]);

  const weeklyHours = useMemo(() => {
    const map = new Map<string, number>();
    shifts?.forEach((s) => {
      const h = shiftDurationHours(s);
      map.set(s.userId, (map.get(s.userId) ?? 0) + h);
    });
    return map;
  }, [shifts]);

  function openCreate(employeeId?: string, date?: string) {
    setModal({ open: true, mode: 'create', prefillEmployee: employeeId, prefillDate: date });
  }

  function openEdit(shift: ShiftPublic) {
    setModal({ open: true, mode: 'edit', shift });
  }

  function closeModal() {
    setModal({ open: false, mode: 'create' });
  }

  function onShiftSaved() {
    closeModal();
    qc.invalidateQueries({ queryKey: ['shifts'] });
    toast(modal.mode === 'create' ? 'Shift created' : 'Shift updated');
  }

  const copyWeek = useMutation({
    mutationFn: async () => {
      if (!shifts?.length) return;
      const nextWeekShifts = shifts.map((s) => {
        const [sy, sm, sd] = s.date.split('-').map(Number);
        const dt = new Date(Date.UTC(sy!, sm! - 1, sd! + 7));
        return {
          userId: s.userId,
          date: dt.toISOString().split('T')[0],
          startTime: s.startTime,
          endTime: s.endTime,
          notes: s.notes ?? undefined,
        };
      });
      await Promise.all(nextWeekShifts.map((s) => apiClient.post('/shifts', s)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast('Week copied to next week');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <PageHeader
          title="Schedule"
          description={`${formatDate(from)} – ${formatDate(to)}`}
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => copyWeek.mutate()}
                loading={copyWeek.isPending}
                disabled={!shifts?.length}
              >
                Copy week →
              </Button>
              <Button size="sm" onClick={() => openCreate()}>
                Add shift
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="secondary" onClick={prevWeek}>← Prev</Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(new Date())}>
            This week
          </Button>
          <Button size="sm" variant="secondary" onClick={nextWeek}>Next →</Button>
          <Input
            placeholder="Filter employees…"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="h-8 w-48 text-sm"
          />
        </div>

        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
          <div>
            <table className="w-full border-collapse border border-gray-200 bg-white text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-[140px]">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={`border border-gray-200 px-3 py-2 text-center font-medium min-w-[100px] ${
                        d === todayStr ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      {(() => { const [,,dd] = d.split('-'); const dt = new Date(`${d}T00:00:00Z`); return `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getUTCDay()]} ${dd}`; })()}
                      {d === todayStr && (
                        <span className="ml-1 text-[10px] font-semibold text-blue-500">TODAY</span>
                      )}
                    </th>
                  ))}
                  <th className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-600 min-w-[60px]">
                    Hrs
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 align-top">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-medium text-gray-900">
                            {[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email}
                          </div>
                          {emp.position && (
                            <div className="text-xs text-gray-400">{emp.position}</div>
                          )}
                        </div>
                        <EmployeeMenu
                          employeeId={emp.id}
                          onDeleted={() => {
                            qc.invalidateQueries({ queryKey: ['shifts'] });
                            toast('Shifts deleted');
                          }}
                          onError={(msg) => toast(msg, 'error')}
                        />
                      </div>
                    </td>
                    {days.map((d) => {
                      const dayShifts =
                        shiftsByEmployee.get(emp.id)?.filter((s) => s.date === d) ?? [];
                      return (
                        <DayCell
                          key={d}
                          date={d}
                          isToday={d === todayStr}
                          shifts={dayShifts}
                          onAdd={() => openCreate(emp.id, d)}
                          onEdit={openEdit}
                          onDeleted={() => {
                            qc.invalidateQueries({ queryKey: ['shifts'] });
                            toast('Shift deleted');
                          }}
                          onDeleteError={(msg) => toast(msg, 'error')}
                        />
                      );
                    })}
                    <td className="border border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-500">
                      {(weeklyHours.get(emp.id) ?? 0).toFixed(1)}h
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="border border-gray-200 py-8 text-center text-gray-400"
                    >
                      {employeeFilter ? 'No employees match filter.' : 'No employees found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={modal.open}
        onClose={closeModal}
        title={modal.mode === 'create' ? 'Create shift' : 'Edit shift'}
      >
        <div className="p-6">
          <ShiftForm
            mode={modal.mode}
            employees={employees ?? []}
            prefillEmployee={modal.prefillEmployee}
            prefillDate={modal.prefillDate}
            shift={modal.shift}
            onSuccess={onShiftSaved}
            onCancel={closeModal}
          />
        </div>
      </Dialog>
    </AppLayout>
  );
}

// ─── day cell ────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: string;
  isToday: boolean;
  shifts: ShiftPublic[];
  onAdd: () => void;
  onEdit: (shift: ShiftPublic) => void;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
}

function DayCell({ date, isToday, shifts, onAdd, onEdit, onDeleted, onDeleteError }: DayCellProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <td
      className={`border border-gray-200 px-2 py-1 align-top min-h-[48px] relative ${
        isToday ? 'bg-blue-50/30' : ''
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {shifts.map((shift) => (
        <ShiftChip
          key={shift.id}
          shift={shift}
          onEdit={() => onEdit(shift)}
          onDeleted={onDeleted}
          onDeleteError={onDeleteError}
        />
      ))}
      {hovered && (
        <button
          onClick={onAdd}
          className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-indigo-100 hover:text-indigo-600 transition-colors text-sm font-medium"
          title={`Add shift for ${date}`}
        >
          +
        </button>
      )}
    </td>
  );
}

// ─── shift chip ──────────────────────────────────────────────────────────────

interface ShiftChipProps {
  shift: ShiftPublic;
  onEdit: () => void;
  onDeleted: () => void;
  onDeleteError: (msg: string) => void;
}

function ShiftChip({ shift, onEdit, onDeleted, onDeleteError }: ShiftChipProps) {
  const hours = shiftDurationHours(shift);
  const colorClass = shiftColor(hours);

  const deleteShift = useMutation({
    mutationFn: () => apiClient.delete(`/shifts/${shift.id}`),
    onSuccess: onDeleted,
    onError: (err) => onDeleteError(getApiError(err)),
  });

  return (
    <div
      className={`mb-1 cursor-pointer rounded border px-1.5 py-1 text-xs group relative ${colorClass}`}
      onClick={onEdit}
      title="Click to edit"
    >
      <div className="font-medium pr-4">
        {shift.startTime.slice(0, 5)}–{shift.endTime.slice(0, 5)}
      </div>
      {shift.breaks.length > 0 && (
        <div className="opacity-70">
          {shift.breaks.length} break{shift.breaks.length > 1 ? 's' : ''}
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); deleteShift.mutate(); }}
        disabled={deleteShift.isPending}
        className="absolute right-1 top-1 hidden text-current opacity-40 hover:opacity-100 group-hover:block transition-opacity"
        title="Delete shift"
      >
        ×
      </button>
    </div>
  );
}

// ─── employee kebab menu ─────────────────────────────────────────────────────

interface EmployeeMenuProps {
  employeeId: string;
  onDeleted: () => void;
  onError: (msg: string) => void;
}

type ConfirmState = 'idle' | 'future' | 'all';

function EmployeeMenu({ employeeId, onDeleted, onError }: EmployeeMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>('idle');

  const bulkDelete = useMutation({
    mutationFn: (future: boolean) =>
      apiClient.delete(`/shifts/user/${employeeId}`, { params: { future } }),
    onSuccess: () => {
      setOpen(false);
      setConfirm('idle');
      onDeleted();
    },
    onError: (err) => {
      setOpen(false);
      setConfirm('idle');
      onError(getApiError(err));
    },
  });

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => { setOpen((v) => !v); setConfirm('idle'); }}
        className="flex h-5 w-5 items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        title="Employee actions"
      >
        ⋯
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => { setOpen(false); setConfirm('idle'); }}
          />
          <div className="absolute right-0 top-6 z-20 w-52 border border-gray-200 bg-white shadow-lg text-sm">
          {confirm === 'idle' ? (
            <>
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-amber-700"
                onClick={() => setConfirm('future')}
              >
                Delete future shifts…
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-700"
                onClick={() => setConfirm('all')}
              >
                Delete all shifts…
              </button>
            </>
          ) : (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs text-gray-600">
                {confirm === 'future'
                  ? 'Delete all shifts from today onwards?'
                  : 'Delete ALL shifts for this employee?'}
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 rounded bg-red-600 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={() => bulkDelete.mutate(confirm === 'future')}
                  disabled={bulkDelete.isPending}
                >
                  {bulkDelete.isPending ? 'Deleting…' : 'Confirm'}
                </button>
                <button
                  className="flex-1 rounded bg-gray-100 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  onClick={() => setConfirm('idle')}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}

// ─── shift form ───────────────────────────────────────────────────────────────

interface ShiftFormProps {
  mode: 'create' | 'edit';
  employees: EmployeePublic[];
  prefillEmployee?: string;
  prefillDate?: string;
  shift?: ShiftPublic;
  onSuccess: () => void;
  onCancel: () => void;
}

function ShiftForm({
  mode,
  employees,
  prefillEmployee,
  prefillDate,
  shift,
  onSuccess,
  onCancel,
}: ShiftFormProps) {
  const [userId, setUserId] = useState(prefillEmployee ?? shift?.userId ?? '');
  const [date, setDate] = useState(prefillDate ?? shift?.date ?? '');
  const [startTime, setStartTime] = useState((shift?.startTime ?? '09:00').slice(0, 5));
  const [endTime, setEndTime] = useState((shift?.endTime ?? '17:00').slice(0, 5));
  const [notes, setNotes] = useState(shift?.notes ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [error, setError] = useState('');

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const save = useMutation({
    mutationFn: () => {
      if (mode === 'edit' && shift) {
        return apiClient.patch(`/shifts/${shift.id}`, {
          date,
          startTime,
          endTime,
          notes: notes || undefined,
        });
      }
      return apiClient.post('/shifts', {
        userId,
        date,
        startTime,
        endTime,
        notes: notes || undefined,
        isRecurring,
        recurringDays: isRecurring ? recurringDays : undefined,
        recurringStartDate: isRecurring ? date : undefined,
        recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
      });
    },
    onSuccess,
    onError: (err) => setError(getApiError(err)),
  });

  function toggleDay(d: number) {
    setRecurringDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        {mode === 'create' && (
          <FormField label="Employee *" className="sm:col-span-2">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 w-full border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select employee…</option>
              {employees.filter((e) => e.isActive).map((e) => (
                <option key={e.id} value={e.id}>
                  {[e.firstName, e.lastName].filter(Boolean).join(' ') || e.email}
                </option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Date *">
          <DatePicker value={date} onChange={setDate} />
        </FormField>
        <FormField label="Start time">
          <TimePicker value={startTime} onChange={setStartTime} />
        </FormField>
        <FormField label="End time">
          <TimePicker value={endTime} onChange={setEndTime} />
        </FormField>
        <FormField label="Notes">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </FormField>
      </div>

      {mode === 'create' && (
        <>
          <div className="flex items-center gap-2">
            <input
              id="recurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">
              Recurring shift
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-gray-600">Repeat on</p>
                <div className="flex gap-1.5">
                  {dayLabels.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                        recurringDays.includes(i)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <FormField label="End date (optional)">
                <DatePicker value={recurringEndDate} onChange={setRecurringEndDate} />
              </FormField>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!date || (mode === 'create' && !userId)}
        >
          {mode === 'create' ? 'Create shift' : 'Save changes'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <div>
      <table className="w-full border-collapse border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-50">
            {Array.from({ length: 9 }).map((_, i) => (
              <th key={i} className="border border-gray-200 px-3 py-2">
                <Skeleton className="h-4 w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, ri) => (
            <tr key={ri}>
              <td className="border border-gray-200 px-3 py-2">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </td>
              {Array.from({ length: 7 }).map((_, ci) => (
                <td key={ci} className="border border-gray-200 px-2 py-1">
                  {Math.random() > 0.6 && <Skeleton className="h-8 w-full rounded" />}
                </td>
              ))}
              <td className="border border-gray-200 px-3 py-2">
                <Skeleton className="h-4 w-8 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
