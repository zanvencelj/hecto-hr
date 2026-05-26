import { forwardRef } from 'react';
import { cn } from './utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          'flex w-full border bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-150 resize-none',
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

Textarea.displayName = 'Textarea';
