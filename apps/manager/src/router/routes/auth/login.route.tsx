import { createRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authLayoutRoute } from './layout.route';
import { Button, FormField, Input, PasswordInput, Alert, Separator } from '@hecto/ui';
import { loginSchema } from '@hecto/schemas';
import type { LoginInput } from '@hecto/schemas';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import type { LoginResponse } from '@hecto/shared-types';

export const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/auth/login',
  component: LoginPage,
});

function LoginPage() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: (data: LoginInput) =>
      apiClient
        .post<LoginResponse>('/auth/login', data)
        .then((res) => res.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      navigate({ to: '/' });
    },
  });

  const serverError = error ? getApiError(error) : null;

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your credentials to continue</p>
      </div>

      <form
        onSubmit={form.handleSubmit((data) => login(data))}
        className="space-y-4"
        noValidate
      >
        <FormField
          label="Email"
          htmlFor="email"
          required
          error={form.formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          required
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </FormField>

        {serverError && (
          <Alert variant="error">{serverError}</Alert>
        )}

        <Button type="submit" className="w-full" loading={isPending}>
          Sign in
        </Button>
      </form>

      <Separator label="or" />

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          to="/auth/register"
          className="font-medium text-blue-600 underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
