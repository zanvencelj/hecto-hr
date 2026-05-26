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
  Input,
  PageHeader,
  Spinner,
} from '@hecto/ui';
import type { EmployeePublic, InvitationPublic } from '@hecto/shared-types';
import { fmtDate } from '@/lib/date';

export const employeesListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employees',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: '/auth/login' });
    const role = user?.role;
    if (role !== 'admin' && role !== 'hr' && role !== 'manager') {
      throw redirect({ to: '/' });
    }
  },
  component: EmployeesListPage,
});

function EmployeesListPage() {
  const [search, setSearch] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const qc = useQueryClient();

  const { data: employees, isLoading, error } = useQuery({
    queryKey: ['employees', search],
    queryFn: () =>
      apiClient
        .get<EmployeePublic[]>('/employees', { params: search ? { search } : {} })
        .then((r) => r.data),
  });

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => apiClient.get<InvitationPublic[]>('/employees/invitations').then((r) => r.data),
  });

  const cancelInvite = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/employees/invitations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invitations'] }),
  });

  const pendingInvitations = invitations?.filter((i) => i.status === 'pending') ?? [];

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <PageHeader
          title="Employees"
          description="Manage your team members."
          action={
            <Button onClick={() => setShowInviteForm(true)} size="sm">
              Invite employee
            </Button>
          }
        />

        {showInviteForm && (
          <InviteForm
            onSuccess={() => {
              setShowInviteForm(false);
              qc.invalidateQueries({ queryKey: ['invitations'] });
            }}
            onCancel={() => setShowInviteForm(false)}
          />
        )}

        {error && <Alert variant="error">{getApiError(error)}</Alert>}

        <div className="flex gap-3">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {employees?.map((emp) => (
              <EmployeeRow key={emp.id} employee={emp} />
            ))}
            {employees?.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No employees found.</p>
            )}
          </div>
        )}

        {pendingInvitations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-500">Pending invitations</h3>
            {pendingInvitations.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                    {(inv.firstName || inv.lastName) && (
                      <p className="text-xs text-gray-500">
                        {[inv.firstName, inv.lastName].filter(Boolean).join(' ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-gray-400">
                      Expires {fmtDate(inv.expiresAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="warning">Pending</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvite.mutate(inv.id)}
                      loading={cancelInvite.isPending && cancelInvite.variables === inv.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function EmployeeRow({ employee }: { employee: EmployeePublic }) {
  const navigate = useNavigate();
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-sm"
      onClick={() => navigate({ to: '/employees/$id', params: { id: employee.id } })}
    >
      <CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
            {(employee.firstName?.[0] ?? employee.email[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {employee.firstName || employee.lastName
                ? [employee.firstName, employee.lastName].filter(Boolean).join(' ')
                : employee.email}
            </p>
            <p className="text-xs text-gray-500">{employee.email}</p>
            {employee.position && (
              <p className="text-xs text-gray-400">{employee.position}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={employee.role === 'manager' ? 'secondary' : 'default'}>
            {employee.role}
          </Badge>
          {!employee.isActive && <Badge variant="destructive">Inactive</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

function InviteForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'employee' | 'manager' | 'hr'>('employee');
  const [error, setError] = useState('');

  const invite = useMutation({
    mutationFn: () =>
      apiClient.post('/employees/invite', { email, firstName, lastName, role }),
    onSuccess,
    onError: (err) => setError(getApiError(err)),
  });

  return (
    <Card className="border-indigo-100 bg-indigo-50">
      <CardContent className="pt-4">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Invite a new employee</h3>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              Email address <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employee@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">First name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Last name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="h-10 w-full border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="hr">HR</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            onClick={() => invite.mutate()}
            loading={invite.isPending}
            disabled={!email}
          >
            Send invitation
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
