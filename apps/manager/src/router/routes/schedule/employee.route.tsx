import { createRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
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
  Card,
  CardContent,
  PageHeader,
  Spinner,
} from '@hecto/ui';
import type { ShiftPublic } from '@hecto/shared-types';

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

export const scheduleEmployeeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-schedule',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
  },
  component: ScheduleEmployeePage,
});

function ScheduleEmployeePage() {
  const { user } = useAuthStore();
  const [weekStart, setWeekStart] = useState(() => new Date());
  const { from, to } = getWeekRange(weekStart);

  const { data: shifts, isLoading, error } = useQuery({
    queryKey: ['shifts', 'me', from, to],
    queryFn: () =>
      user
        ? apiClient
            .get<ShiftPublic[]>(`/shifts/employee/${user.id}`, { params: { from, to } })
            .then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!user,
  });

  function prevWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 7);
      return n;
    });
  }
  function nextWeek() {
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 7);
      return n;
    });
  }

  const days = useMemo(() => {
    const [y, m, d] = from.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(Date.UTC(y!, m! - 1, d! + i));
      return dt.toISOString().split('T')[0]!;
    });
  }, [from]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftPublic[]>();
    shifts?.forEach((s) => {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return map;
  }, [shifts]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <PageHeader
          title="My Schedule"
          description={`${formatDate(from)} – ${formatDate(to)}`}
        />

        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={prevWeek}>← Prev</Button>
          <Button size="sm" variant="secondary" onClick={() => setWeekStart(new Date())}>
            This week
          </Button>
          <Button size="sm" variant="secondary" onClick={nextWeek}>Next →</Button>
        </div>

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((d) => {
              const dayShifts = shiftsByDay.get(d) ?? [];
              const isToday = d === new Date().toISOString().split('T')[0];
              return (
                <Card key={d} className={isToday ? 'ring-2 ring-indigo-500' : ''}>
                  <CardContent className="py-3">
                    <h3 className={`text-sm font-semibold ${isToday ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {fmtDateWithWeekday(d, true)}
                      {isToday && <span className="ml-2 text-xs font-normal text-indigo-500">Today</span>}
                    </h3>
                    {dayShifts.length === 0 ? (
                      <p className="mt-1 text-xs text-gray-400">No shift scheduled</p>
                    ) : (
                      dayShifts.map((shift) => (
                        <div key={shift.id} className="mt-2">
                          <span className="font-medium text-gray-900">
                            {shift.startTime.slice(0, 5)} – {shift.endTime.slice(0, 5)}
                          </span>
                          {shift.notes && (
                            <span className="ml-2 text-sm text-gray-500">{shift.notes}</span>
                          )}
                          {shift.breaks.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {shift.breaks.map((b) => (
                                <div key={b.id} className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>
                                    {b.isFixed && b.startTime && b.endTime
                                      ? `Break: ${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}`
                                      : `Break: ${b.durationMinutes ?? '?'} min (flexible)`}
                                  </span>
                                  {b.isPaid && <span className="text-green-600">paid</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
