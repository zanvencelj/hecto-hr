import { cn } from './utils';

const variants = {
  info: {
    root: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: (
      <svg className="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  success: {
    root: 'bg-green-50 border-green-200 text-green-800',
    icon: (
      <svg className="h-4 w-4 shrink-0 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    root: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: (
      <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  error: {
    root: 'bg-red-50 border-red-200 text-red-800',
    icon: (
      <svg className="h-4 w-4 shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
} as const;

export interface AlertProps {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const { root, icon } = variants[variant];
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 border px-4 py-3 text-sm',
        root,
        className,
      )}
    >
      <span className="mt-0.5">{icon}</span>
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
}
