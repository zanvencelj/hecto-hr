import { createRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { rootRoute } from '../root.route';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import { Alert, Button, FormField, PasswordInput } from '@hecto/ui';

export const acceptInviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/accept-invite',
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search['token'] === 'string' ? search['token'] : '',
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = useSearch({ from: acceptInviteRoute.id });
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validationError, setValidationError] = useState('');
  const [done, setDone] = useState(false);

  const accept = useMutation({
    mutationFn: () => apiClient.post('/employees/invitations/accept', { token, password }),
    onSuccess: () => setDone(true),
    onError: () => {},
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError('');

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.');
      return;
    }
    accept.mutate();
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md border border-gray-200 bg-white p-8">
          <Alert variant="error">Invalid invitation link. Please contact your manager.</Alert>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Account created!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your account has been set up successfully. You can now sign in.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: '/auth/login' })}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md border border-gray-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Set up your account</h1>
        <p className="mt-2 text-sm text-gray-500">
          Create a password to complete your account setup.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {(validationError || accept.error) && (
            <Alert variant="error">{validationError || getApiError(accept.error)}</Alert>
          )}
          <FormField label="Password">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Confirm password">
            <PasswordInput
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </FormField>
          <Button type="submit" className="w-full" loading={accept.isPending}>
            Create account
          </Button>
        </form>
      </div>
    </div>
  );
}
