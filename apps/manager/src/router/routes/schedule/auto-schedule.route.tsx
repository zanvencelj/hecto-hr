import { createRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { rootRoute } from '../root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Alert,
  Badge,
  Button,
  DatePicker,
  Dialog,
  FormField,
  Input,
  PageHeader,
  Select,
  Skeleton,
  TimePicker,
  useToast,
  cn,
} from '@hecto/ui';
import type {
  DraftAssignmentPublic,
  EmployeePublic,
  PublishResultPublic,
  ScheduleDraftPublic,
  SchedulingSettingsPublic,
  ShiftCandidatePublic,
  StaffingTemplatePublic,
} from '@hecto/shared-types';

// ─── helpers ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().split('T')[0]!;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / 86_400_000;
}

function dayHeader(dateStr: string): string {
  const [, , d] = dateStr.split('-');
  const dt = new Date(`${dateStr}T00:00:00Z`);
  return `${DAY_LABELS[dt.getUTCDay()]} ${d}`;
}

function employeeName(e: EmployeePublic | undefined): string {
  if (!e) return 'Unknown';
  return [e.firstName, e.lastName].filter(Boolean).join(' ') || e.email;
}

function nextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().split('T')[0]!;
}

// ─── route ──────────────────────────────────────────────────────────────────

export const autoScheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auto-schedule',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/my-schedule' });
    }
  },
  component: AutoSchedulePage,
});

type Tab = 'builder' | 'templates' | 'settings';

function AutoSchedulePage() {
  const [tab, setTab] = useState<Tab>('builder');

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <PageHeader
          title="Auto-Schedule"
          description="Generate a conflict-free draft roster from open shifts, availability and leave"
        />
        <div className="flex gap-1 border-b border-gray-200">
          {(
            [
              ['builder', 'Schedule builder'],
              ['templates', 'Staffing templates'],
              ['settings', 'Settings'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'builder' && <BuilderTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </AppLayout>
  );
}

// ─── builder tab ─────────────────────────────────────────────────────────────

function BuilderTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState(nextMonday());
  const [dateTo, setDateTo] = useState(addDays(nextMonday(), 6));
  const [error, setError] = useState('');
  const [publishResult, setPublishResult] = useState<PublishResultPublic | null>(null);
  const [editAssignment, setEditAssignment] = useState<DraftAssignmentPublic | null>(null);

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiClient.get<EmployeePublic[]>('/employees').then((r) => r.data),
  });

  const { data: draft, isLoading } = useQuery({
    queryKey: ['scheduling', 'draft'],
    queryFn: () =>
      apiClient.get<ScheduleDraftPublic | null>('/scheduling/draft').then((r) => r.data),
  });

  const generate = useMutation({
    mutationFn: () =>
      apiClient.post<ScheduleDraftPublic>('/scheduling/drafts', { dateFrom, dateTo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling'] });
      setError('');
      setPublishResult(null);
      toast('Draft generated');
    },
    onError: (err) => setError(getApiError(err)),
  });

  const approve = useMutation({
    mutationFn: () =>
      apiClient.post<PublishResultPublic>('/scheduling/draft/approve').then((r) => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['scheduling'] });
      qc.invalidateQueries({ queryKey: ['shifts'] });
      setPublishResult(result);
      toast(`Schedule published — ${result.published} shifts assigned`);
    },
    onError: (err) => setError(getApiError(err)),
  });

  const discard = useMutation({
    mutationFn: () => apiClient.delete('/scheduling/draft'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling'] });
      toast('Draft discarded');
    },
    onError: (err) => setError(getApiError(err)),
  });

  const rangeDays = daysBetween(dateFrom, dateTo) + 1;
  const rangeInvalid = rangeDays < 1 || rangeDays > 35;

  const days = useMemo(() => {
    if (!draft) return [];
    const out: string[] = [];
    for (let d = draft.dateFrom; d <= draft.dateTo; d = addDays(d, 1)) out.push(d);
    return out;
  }, [draft]);

  const employeesById = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, e])),
    [employees],
  );

  const assignedUserIds = useMemo(() => {
    const ids = new Set<string>();
    draft?.assignments.forEach((a) => {
      if (a.userId) ids.add(a.userId);
    });
    return ids;
  }, [draft]);

  const gridEmployees = useMemo(
    () =>
      (employees ?? []).filter((e) => e.isActive || assignedUserIds.has(e.id)),
    [employees, assignedUserIds],
  );

  const unfilled = useMemo(
    () => draft?.assignments.filter((a) => !a.userId) ?? [],
    [draft],
  );

  const stale = useMemo(
    () => draft?.assignments.filter((a) => a.status === 'stale') ?? [],
    [draft],
  );

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      {publishResult && (
        <Alert variant={publishResult.dropped.length ? 'warning' : 'success'}>
          Published {publishResult.published} shift assignments.
          {publishResult.dropped.length > 0 && (
            <span>
              {' '}
              {publishResult.dropped.length} dropped:{' '}
              {publishResult.dropped
                .map((d) => `${d.date} ${d.startTime.slice(0, 5)} (${d.reason})`)
                .join('; ')}
            </span>
          )}
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="From">
          <DatePicker value={dateFrom} onChange={setDateFrom} />
        </FormField>
        <FormField label="To">
          <DatePicker value={dateTo} onChange={setDateTo} />
        </FormField>
        <Button
          size="sm"
          onClick={() => generate.mutate()}
          loading={generate.isPending}
          disabled={rangeInvalid}
        >
          {draft && draft.status === 'draft' ? 'Regenerate draft' : 'Generate draft'}
        </Button>
        {rangeInvalid && (
          <span className="pb-2 text-xs text-red-600">Range must be 1–35 days.</span>
        )}
      </div>

      {!draft || draft.status !== 'draft' ? (
        <div className="border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400">
          No active draft. Pick a date range and generate one.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              Draft for <span className="font-medium">{draft.dateFrom}</span> –{' '}
              <span className="font-medium">{draft.dateTo}</span> ·{' '}
              {draft.assignments.filter((a) => a.userId).length} assigned · {unfilled.length}{' '}
              unfilled
              {stale.length > 0 && ` · ${stale.length} stale`}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approve.mutate()}
                loading={approve.isPending}
              >
                Approve & publish
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => discard.mutate()}
                loading={discard.isPending}
              >
                Discard
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 bg-white text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-[150px]">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 min-w-[90px]"
                    >
                      {dayHeader(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gridEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 align-top">
                      <div className="font-medium text-gray-900">{employeeName(emp)}</div>
                      {emp.position && (
                        <div className="text-xs text-gray-400">{emp.position}</div>
                      )}
                    </td>
                    {days.map((d) => (
                      <td key={d} className="border border-gray-200 px-1.5 py-1 align-top">
                        {draft.assignments
                          .filter((a) => a.userId === emp.id && a.shift.date === d)
                          .map((a) => (
                            <AssignmentChip
                              key={a.id}
                              assignment={a}
                              onClick={() => setEditAssignment(a)}
                            />
                          ))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-amber-50/40">
                  <td className="border border-gray-200 px-3 py-2 align-top font-medium text-amber-800">
                    Unassigned
                  </td>
                  {days.map((d) => (
                    <td key={d} className="border border-gray-200 px-1.5 py-1 align-top">
                      {unfilled
                        .filter((a) => a.shift.date === d)
                        .map((a) => (
                          <AssignmentChip
                            key={a.id}
                            assignment={a}
                            onClick={() => setEditAssignment(a)}
                          />
                        ))}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {unfilled.length > 0 && (
            <div className="border border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-amber-800">
                Unfilled shifts ({unfilled.length})
              </h3>
              <ul className="space-y-1 text-xs text-amber-800">
                {unfilled.map((a) => (
                  <li key={a.id}>
                    {a.shift.date} {a.shift.startTime.slice(0, 5)}–{a.shift.endTime.slice(0, 5)}
                    {a.reason ? ` — ${a.reason}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!editAssignment}
        onClose={() => setEditAssignment(null)}
        title="Edit assignment"
      >
        {editAssignment && (
          <AssignmentEditor
            assignment={editAssignment}
            employeesById={employeesById}
            onDone={() => {
              setEditAssignment(null);
              qc.invalidateQueries({ queryKey: ['scheduling', 'draft'] });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

const STATUS_CHIP: Record<DraftAssignmentPublic['status'], string> = {
  proposed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  manual: 'bg-blue-50 text-blue-800 border-blue-200',
  stale: 'bg-red-50 text-red-800 border-red-200',
  unfilled: 'bg-amber-50 text-amber-800 border-amber-200',
};

function AssignmentChip({
  assignment,
  onClick,
}: {
  assignment: DraftAssignmentPublic;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'mb-1 cursor-pointer rounded border px-1.5 py-1 text-xs',
        STATUS_CHIP[assignment.status],
      )}
      onClick={onClick}
      title={assignment.reason ?? 'Click to edit'}
    >
      <div className="font-medium">
        {assignment.shift.startTime.slice(0, 5)}–{assignment.shift.endTime.slice(0, 5)}
      </div>
      {assignment.status !== 'proposed' && (
        <div className="opacity-70 capitalize">{assignment.status}</div>
      )}
    </div>
  );
}

function AssignmentEditor({
  assignment,
  employeesById,
  onDone,
}: {
  assignment: DraftAssignmentPublic;
  employeesById: Map<string, EmployeePublic>;
  onDone: () => void;
}) {
  const toast = useToast();
  const [error, setError] = useState('');

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['scheduling', 'candidates', assignment.shiftId],
    queryFn: () =>
      apiClient
        .get<ShiftCandidatePublic[]>(`/scheduling/draft/candidates/${assignment.shiftId}`)
        .then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: (userId: string | null) =>
      apiClient.patch(`/scheduling/draft/assignments/${assignment.id}`, { userId }),
    onSuccess: () => {
      toast('Assignment updated');
      onDone();
    },
    onError: (err) => setError(getApiError(err)),
  });

  const sorted = useMemo(
    () =>
      [...(candidates ?? [])].sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return a.weeklyHours - b.weeklyHours;
      }),
    [candidates],
  );

  return (
    <div className="space-y-4 p-6">
      {error && <Alert variant="error">{error}</Alert>}
      <p className="text-sm text-gray-600">
        {assignment.shift.date} · {assignment.shift.startTime.slice(0, 5)}–
        {assignment.shift.endTime.slice(0, 5)}
        {assignment.userId && (
          <>
            {' '}
            · currently{' '}
            <span className="font-medium">
              {employeeName(employeesById.get(assignment.userId))}
            </span>
          </>
        )}
      </p>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {sorted.map((c) => {
            const emp = employeesById.get(c.userId);
            const isCurrent = c.userId === assignment.userId;
            return (
              <button
                key={c.userId}
                disabled={isCurrent || update.isPending}
                onClick={() => update.mutate(c.userId)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 border px-3 py-2 text-left text-sm transition-colors',
                  isCurrent
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 hover:bg-gray-50',
                  !c.eligible && 'opacity-70',
                )}
              >
                <span>
                  <span className="font-medium text-gray-900">{employeeName(emp)}</span>
                  <span className="ml-2 text-xs text-gray-500">{c.weeklyHours}h this week</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {c.preference === 'preferred' && <Badge variant="success">prefers</Badge>}
                  {c.eligible ? (
                    <Badge variant="default">eligible</Badge>
                  ) : (
                    <Badge variant="warning">{c.reason}</Badge>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-2">
        {assignment.userId ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => update.mutate(null)}
            loading={update.isPending}
          >
            Unassign
          </Button>
        ) : (
          <span />
        )}
        <Button size="sm" variant="ghost" onClick={onDone}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ─── templates tab ───────────────────────────────────────────────────────────

interface TemplateForm {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  headcount: number;
  startDate: string;
  endDate: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_TEMPLATE: TemplateForm = {
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '17:00',
  headcount: 1,
  startDate: '',
  endDate: '',
  notes: '',
  isActive: true,
};

function TemplatesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [modal, setModal] = useState<{ open: boolean; template?: StaffingTemplatePublic }>({
    open: false,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ['scheduling', 'templates'],
    queryFn: () =>
      apiClient.get<StaffingTemplatePublic[]>('/scheduling/templates').then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/scheduling/templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling', 'templates'] });
      toast('Template deleted');
    },
    onError: (err) => toast(getApiError(err), 'error'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setModal({ open: true })}>
          Add template
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (templates ?? []).length === 0 ? (
        <div className="border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400">
          No staffing templates. Templates define recurring staffing needs (e.g. “3 people
          Mon–Fri 9–17”) and emit open shifts when you generate a draft.
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="border border-gray-200 px-3 py-2 font-medium">Days</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Time</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Headcount</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Active from</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Until</th>
              <th className="border border-gray-200 px-3 py-2 font-medium">Status</th>
              <th className="border border-gray-200 px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {(templates ?? []).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-3 py-2">
                  {[...t.daysOfWeek].sort().map((d) => DAY_LABELS[d]).join(', ')}
                </td>
                <td className="border border-gray-200 px-3 py-2">
                  {t.startTime.slice(0, 5)}–{t.endTime.slice(0, 5)}
                </td>
                <td className="border border-gray-200 px-3 py-2">{t.headcount}</td>
                <td className="border border-gray-200 px-3 py-2">{t.startDate}</td>
                <td className="border border-gray-200 px-3 py-2">{t.endDate ?? '—'}</td>
                <td className="border border-gray-200 px-3 py-2">
                  <Badge variant={t.isActive ? 'success' : 'default'}>
                    {t.isActive ? 'active' : 'inactive'}
                  </Badge>
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setModal({ open: true, template: t })}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove.mutate(t.id)}
                    loading={remove.isPending && remove.variables === t.id}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.template ? 'Edit template' : 'New staffing template'}
      >
        <TemplateEditor
          template={modal.template}
          onDone={() => {
            setModal({ open: false });
            qc.invalidateQueries({ queryKey: ['scheduling', 'templates'] });
          }}
          onCancel={() => setModal({ open: false })}
        />
      </Dialog>
    </div>
  );
}

function TemplateEditor({
  template,
  onDone,
  onCancel,
}: {
  template?: StaffingTemplatePublic;
  onDone: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const [error, setError] = useState('');
  const [form, setForm] = useState<TemplateForm>(
    template
      ? {
          daysOfWeek: template.daysOfWeek,
          startTime: template.startTime.slice(0, 5),
          endTime: template.endTime.slice(0, 5),
          headcount: template.headcount,
          startDate: template.startDate,
          endDate: template.endDate ?? '',
          notes: template.notes ?? '',
          isActive: template.isActive,
        }
      : EMPTY_TEMPLATE,
  );

  const save = useMutation({
    mutationFn: () => {
      const body = {
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
        headcount: form.headcount,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      };
      return template
        ? apiClient.patch(`/scheduling/templates/${template.id}`, body)
        : apiClient.post('/scheduling/templates', body);
    },
    onSuccess: () => {
      toast(template ? 'Template updated' : 'Template created');
      onDone();
    },
    onError: (err) => setError(getApiError(err)),
  });

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d)
        ? f.daysOfWeek.filter((x) => x !== d)
        : [...f.daysOfWeek, d],
    }));
  }

  return (
    <div className="space-y-4 p-6">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <p className="mb-1.5 text-xs font-medium text-gray-600">Days</p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                form.daysOfWeek.includes(i)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Start time">
          <TimePicker
            value={form.startTime}
            onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
          />
        </FormField>
        <FormField label="End time">
          <TimePicker
            value={form.endTime}
            onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
          />
        </FormField>
        <FormField label="People needed">
          <Input
            type="number"
            min={1}
            max={100}
            value={form.headcount}
            onChange={(e) => setForm((f) => ({ ...f, headcount: Number(e.target.value) }))}
          />
        </FormField>
        <FormField label="Notes">
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional"
          />
        </FormField>
        <FormField label="Active from *">
          <DatePicker
            value={form.startDate}
            onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
          />
        </FormField>
        <FormField label="Until (optional)">
          <DatePicker
            value={form.endDate}
            onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
          />
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="template-active"
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="template-active" className="text-sm text-gray-700">
          Active
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!form.startDate || form.daysOfWeek.length === 0 || form.headcount < 1}
        >
          {template ? 'Save changes' : 'Create template'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── settings tab ────────────────────────────────────────────────────────────

function SettingsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'hr';
  const [error, setError] = useState('');
  const [form, setForm] = useState<SchedulingSettingsPublic | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['scheduling', 'settings'],
    queryFn: () =>
      apiClient.get<SchedulingSettingsPublic>('/scheduling/settings').then((r) => r.data),
  });

  const current = form ?? settings ?? null;

  const save = useMutation({
    mutationFn: () => {
      const { maxHoursPerWeek, minRestHours, enforceMaxHours, enforceRestRule, defaultAvailability, assignmentStrategy, allowClaimingDuringDraft } = form!;
      return apiClient.put('/scheduling/settings', {
        maxHoursPerWeek,
        minRestHours,
        enforceMaxHours,
        enforceRestRule,
        defaultAvailability,
        assignmentStrategy,
        allowClaimingDuringDraft,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduling', 'settings'] });
      setForm(null);
      setError('');
      toast('Scheduling settings saved');
    },
    onError: (err) => setError(getApiError(err)),
  });

  function patch(partial: Partial<SchedulingSettingsPublic>) {
    setForm((f) => ({ ...(f ?? settings!), ...partial }));
  }

  if (isLoading || !current) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error && <Alert variant="error">{error}</Alert>}
      {!canEdit && (
        <Alert variant="info">Only admins and HR can change scheduling settings.</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Max hours per week (default)">
          <Input
            type="number"
            min={1}
            max={168}
            disabled={!canEdit}
            value={current.maxHoursPerWeek}
            onChange={(e) => patch({ maxHoursPerWeek: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Minimum rest between shifts (hours)">
          <Input
            type="number"
            min={0}
            max={24}
            disabled={!canEdit}
            value={current.minRestHours}
            onChange={(e) => patch({ minRestHours: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Assignment strategy">
          <Select
            disabled={!canEdit}
            value={current.assignmentStrategy}
            onChange={(e) =>
              patch({
                assignmentStrategy: e.target
                  .value as SchedulingSettingsPublic['assignmentStrategy'],
              })
            }
          >
            <option value="preference_first">
              Preference first — honor wishes, then balance hours
            </option>
            <option value="fairness_first">
              Fairness first — balance hours, then honor wishes
            </option>
            <option value="preference_only">
              Preference only — assign only preferred times
            </option>
          </Select>
        </FormField>
        <FormField label="Employees without availability set are">
          <Select
            disabled={!canEdit}
            value={current.defaultAvailability}
            onChange={(e) =>
              patch({
                defaultAvailability: e.target
                  .value as SchedulingSettingsPublic['defaultAvailability'],
              })
            }
          >
            <option value="available">Available (opt-out)</option>
            <option value="unavailable">Unavailable (opt-in)</option>
          </Select>
        </FormField>
      </div>

      <div className="space-y-2">
        {(
          [
            ['enforceMaxHours', 'Enforce weekly hour cap'],
            ['enforceRestRule', 'Enforce minimum rest between shifts'],
            ['allowClaimingDuringDraft', 'Allow employees to claim open shifts while a draft is under review'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={current[key]}
              onChange={(e) => patch({ [key]: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            {label}
          </label>
        ))}
      </div>

      {canEdit && (
        <Button
          size="sm"
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!form}
        >
          Save settings
        </Button>
      )}
    </div>
  );
}
