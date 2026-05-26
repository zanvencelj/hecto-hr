import { createRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { AppLayout } from '@/components/layout/app-layout';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  FormField,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from '@hecto/ui';
import type { EmployeePublic } from '@hecto/shared-types';
import { fmtDate, fmtDateTime } from '@/lib/date';

export const employeeDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employees/$id',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/' });
    }
  },
  component: EmployeeDetailPage,
});

function EmployeeDetailPage() {
  const { id } = employeeDetailRoute.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => apiClient.get<EmployeePublic>(`/employees/${id}`).then((r) => r.data),
  });

  const [form, setForm] = useState<Partial<EmployeePublic>>({});

  function startEdit(emp: EmployeePublic) {
    setForm({
      firstName: emp.firstName ?? '',
      lastName: emp.lastName ?? '',
      role: emp.role,
      position: emp.position ?? '',
      department: emp.department ?? '',
      phone: emp.phone ?? '',
      hireDate: emp.hireDate ?? '',
      notes: emp.notes ?? '',
    });
    setEditing(true);
  }

  const update = useMutation({
    mutationFn: () => apiClient.patch(`/employees/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditing(false);
      setSuccess('Employee updated successfully.');
      setError('');
    },
    onError: (err) => {
      setError(getApiError(err));
      setSuccess('');
    },
  });

  const toggleActive = useMutation({
    mutationFn: () =>
      apiClient.patch(`/employees/${id}`, { isActive: !employee?.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => setError(getApiError(err)),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="p-6">
          <Alert variant="error">Employee not found.</Alert>
        </div>
      </AppLayout>
    );
  }

  const displayName =
    employee.firstName || employee.lastName
      ? [employee.firstName, employee.lastName].filter(Boolean).join(' ')
      : employee.email;

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <PageHeader
          title={displayName}
          description={employee.email}
          action={
            <div className="flex gap-2">
              {!editing && (
                <Button size="sm" variant="secondary" onClick={() => startEdit(employee)}>
                  Edit
                </Button>
              )}
              <Button
                size="sm"
                variant={employee.isActive ? 'destructive' : 'secondary'}
                onClick={() => toggleActive.mutate()}
                loading={toggleActive.isPending}
              >
                {employee.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate({ to: '/employees' })}
              >
                ← Back
              </Button>
            </div>
          }
        />

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="flex gap-2">
          <Badge variant={employee.isActive ? 'success' : 'destructive'}>
            {employee.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant={employee.role === 'manager' ? 'secondary' : 'default'}>
            {employee.role}
          </Badge>
        </div>

        {editing ? (
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="First name">
                  <Input
                    value={form.firstName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </FormField>
                <FormField label="Last name">
                  <Input
                    value={form.lastName ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </FormField>
                <FormField label="Role">
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as EmployeePublic['role'] }))}
                    className="h-10 w-full border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                  </select>
                </FormField>
                <FormField label="Position">
                  <Input
                    value={form.position ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  />
                </FormField>
                <FormField label="Department">
                  <Input
                    value={form.department ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  />
                </FormField>
                <FormField label="Phone">
                  <Input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </FormField>
                <FormField label="Hire date">
                  <DatePicker
                    value={form.hireDate ?? ''}
                    onChange={(v) => setForm((f) => ({ ...f, hireDate: v }))}
                  />
                </FormField>
                <FormField label="Notes" className="sm:col-span-2">
                  <Textarea
                    value={form.notes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                  />
                </FormField>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => update.mutate()} loading={update.isPending}>
                  Save changes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <dl className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Position" value={employee.position} />
                <InfoRow label="Department" value={employee.department} />
                <InfoRow label="Phone" value={employee.phone} />
                <InfoRow label="Hire date" value={fmtDate(employee.hireDate)} />
                <InfoRow label="Date joined" value={fmtDate(employee.dateJoined)} />
                <InfoRow
                  label="Last login"
                  value={employee.lastLogin ? fmtDateTime(employee.lastLogin) : null}
                />
                {employee.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-500">Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                      {employee.notes}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  );
}
