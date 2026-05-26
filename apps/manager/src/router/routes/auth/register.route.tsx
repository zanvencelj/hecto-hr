import { useState, useRef, useEffect } from 'react';
import { createRoute, useNavigate, Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authLayoutRoute } from './layout.route';
import { Button, FormField, Input, PasswordInput, Alert } from '@hecto/ui';
import { registerSchema, companySchema } from '@hecto/schemas';
import type { RegisterInput, RegisterFormInput, CompanyInput } from '@hecto/schemas';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api';
import { getApiError } from '@hecto/api-client';
import type {
  LoginResponse,
  RegistrationInitiatedResponse,
  ResendCodeResponse,
} from '@hecto/shared-types';

export const registerRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/auth/register',
  component: RegisterPage,
});

type RegistrationStep = 'company' | 'personal' | 'verification';

interface PendingVerification {
  maskedEmail: string;
  rawEmail: string;
  expiresAt: string;
  resentCount: number;
  nextResendAvailableAt: string | null;
}

function StepIndicator({ current }: { current: RegistrationStep }) {
  const steps: { key: RegistrationStep; label: string }[] = [
    { key: 'company', label: 'Company' },
    { key: 'personal', label: 'Account' },
    { key: 'verification', label: 'Verify' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isDone
                    ? 'bg-blue-600 text-white'
                    : isActive
                      ? 'border-2 border-blue-600 bg-white text-blue-600'
                      : 'border-2 border-gray-200 bg-white text-gray-400',
                ].join(' ')}
              >
                {isDone ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={[
                  'text-xs',
                  isActive ? 'font-medium text-blue-600' : isDone ? 'text-gray-500' : 'text-gray-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  'mb-4 h-px w-12',
                  isDone ? 'bg-blue-600' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RegisterPage() {
  const [step, setStep] = useState<RegistrationStep>('company');
  const [organizationName, setOrganizationName] = useState('');
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  function handleSuccess(user: LoginResponse['user'], accessToken: string) {
    setAuth(user, accessToken);
    navigate({ to: '/' });
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <StepIndicator current={step} />

      {step === 'company' && (
        <CompanyStep
          defaultValue={organizationName}
          onNext={(name) => {
            setOrganizationName(name);
            setStep('personal');
          }}
        />
      )}

      {step === 'personal' && (
        <RegistrationForm
          organizationName={organizationName}
          onBack={() => setStep('company')}
          onInitiated={(res, rawEmail) => {
            setPending({
              maskedEmail: res.email,
              rawEmail,
              expiresAt: res.expiresAt,
              resentCount: 0,
              nextResendAvailableAt: null,
            });
            setStep('verification');
          }}
        />
      )}

      {step === 'verification' && pending && (
        <VerificationStep
          pending={pending}
          onResent={(updated) =>
            setPending((prev) =>
              prev
                ? {
                    ...prev,
                    resentCount: updated.resentCount,
                    nextResendAvailableAt: updated.nextResendAvailableAt,
                  }
                : prev,
            )
          }
          onSuccess={handleSuccess}
          onBack={() => {
            setPending(null);
            setStep('personal');
          }}
        />
      )}

      {step === 'company' && (
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            to="/auth/login"
            className="font-medium text-blue-600 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}

function CompanyStep({
  defaultValue,
  onNext,
}: {
  defaultValue: string;
  onNext: (organizationName: string) => void;
}) {
  const form = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { organizationName: defaultValue },
  });

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Set up your company</h1>
        <p className="mt-1 text-sm text-gray-500">Tell us about your organisation</p>
      </div>

      <form
        onSubmit={form.handleSubmit((data) => onNext(data.organizationName))}
        className="space-y-4"
        noValidate
      >
        <FormField
          label="Company name"
          htmlFor="organizationName"
          required
          error={form.formState.errors.organizationName?.message}
        >
          <Input
            id="organizationName"
            autoComplete="organization"
            placeholder="Acme Corp"
            autoFocus
            error={!!form.formState.errors.organizationName}
            {...form.register('organizationName')}
          />
        </FormField>

        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </>
  );
}

function RegistrationForm({
  organizationName,
  onBack,
  onInitiated,
}: {
  organizationName: string;
  onBack: () => void;
  onInitiated: (res: RegistrationInitiatedResponse, rawEmail: string) => void;
}) {
  const form = useForm<RegisterFormInput, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      organizationName,
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  const { mutate: register, isPending, error } = useMutation({
    mutationFn: (data: RegisterInput) => {
      const { confirmPassword, ...payload } = data;
      void confirmPassword;
      return apiClient
        .post<RegistrationInitiatedResponse>('/auth/register', payload)
        .then((res) => ({ data: res.data, email: data.email }));
    },
    onSuccess: ({ data, email }) => onInitiated(data, email),
  });

  const serverError = error ? getApiError(error) : null;

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Setting up{' '}
          <span className="font-medium text-gray-700">{organizationName}</span>
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit((data) => register(data))}
        className="space-y-4"
        noValidate
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="First name"
            htmlFor="firstName"
            error={form.formState.errors.firstName?.message}
          >
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="Jane"
              {...form.register('firstName')}
            />
          </FormField>

          <FormField
            label="Last name"
            htmlFor="lastName"
            error={form.formState.errors.lastName?.message}
          >
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Doe"
              {...form.register('lastName')}
            />
          </FormField>
        </div>

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
          hint="Min 8 chars, one uppercase, one number"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            error={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirmPassword"
          required
          error={form.formState.errors.confirmPassword?.message}
        >
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            error={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
        </FormField>

        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Button type="submit" className="w-full" loading={isPending}>
          Continue
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to company details
      </button>
    </>
  );
}

function VerificationStep({
  pending,
  onResent,
  onSuccess,
  onBack,
}: {
  pending: PendingVerification;
  onResent: (res: ResendCodeResponse) => void;
  onSuccess: (user: LoginResponse['user'], accessToken: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const resendCooldown = useCountdown(pending.nextResendAvailableAt);
  const canResend = resendCooldown === 0 && pending.resentCount < 3;
  const maxResendsReached = pending.resentCount >= 3;
  const [otpKey, setOtpKey] = useState(0);

  const { mutate: verify, isPending: isVerifying } = useMutation({
    mutationFn: (submittedCode: string) =>
      apiClient
        .post<LoginResponse>('/auth/register/verify', {
          email: pending.rawEmail,
          code: submittedCode,
        })
        .then((res) => res.data),
    onSuccess: ({ user, accessToken }) => onSuccess(user, accessToken),
    onError: (err) => {
      setCodeError(getApiError(err));
      setCode('');
      setOtpKey((k) => k + 1);
    },
  });

  const { mutate: resend, isPending: isResending } = useMutation({
    mutationFn: () =>
      apiClient
        .post<ResendCodeResponse>('/auth/register/resend-code', {
          email: pending.rawEmail,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      onResent(data);
      setCodeError(null);
      setCode('');
      setOtpKey((k) => k + 1);
    },
    onError: (err) => setCodeError(getApiError(err)),
  });

  function handleCodeChange(value: string) {
    setCode(value);
    if (value.length === 6 && !isVerifying) {
      setCodeError(null);
      verify(value);
    }
  }

  return (
    <>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Check your email</h1>
        <p className="mt-1 text-sm text-gray-500">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-700">{pending.maskedEmail}</span>
        </p>
      </div>

      <div className="space-y-4">
        <OtpInput
          key={otpKey}
          value={code}
          onChange={handleCodeChange}
          disabled={isVerifying}
          hasError={!!codeError}
        />

        {codeError && <Alert variant="error">{codeError}</Alert>}

        {isVerifying && (
          <p className="text-center text-sm text-gray-500">Verifying…</p>
        )}
      </div>

      <div className="space-y-3">
        {!maxResendsReached ? (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="text-gray-400">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => resend()}
                  disabled={!canResend || isResending}
                  className="font-medium text-blue-600 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </p>
            {pending.resentCount > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                {3 - pending.resentCount} resend{3 - pending.resentCount === 1 ? '' : 's'} remaining
              </p>
            )}
          </div>
        ) : (
          <Alert variant="error">
            Maximum resend limit reached. Please{' '}
            <button
              type="button"
              onClick={onBack}
              className="font-medium underline underline-offset-2"
            >
              start over
            </button>
            .
          </Alert>
        )}

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Use a different email
        </button>
      </div>
    </>
  );
}

function OtpInput({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(''));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        onChange(next.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = '';
        onChange(next.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div>
      <div className="flex justify-center gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={i === 0}
            autoComplete="one-time-code"
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={[
              'h-12 w-10 border text-center text-lg font-semibold',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              hasError
                ? 'border-red-400 text-red-600 focus:ring-red-500'
                : 'border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-600',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">
        Enter the 6-digit code from your email
      </p>
    </div>
  );
}

function useCountdown(targetIso: string | null): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    targetIso ? Math.max(0, Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!targetIso) {
      setSecondsLeft(0);
      return;
    }
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return secondsLeft;
}
