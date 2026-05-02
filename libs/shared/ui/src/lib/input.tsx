import { forwardRef } from 'react';
import { cn } from './utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full border bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-150',
          error
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-gray-300 focus-visible:ring-blue-600',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
