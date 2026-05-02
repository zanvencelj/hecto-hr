import { forwardRef } from 'react';
import { cn } from './utils';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
  link: 'bg-transparent text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10',
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2"
            style={{
              borderColor: 'color-mix(in srgb, currentColor 25%, transparent)',
              borderTopColor: 'currentColor',
            }}
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
