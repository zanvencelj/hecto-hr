import { cn } from './utils';

const variants = {
  default: 'bg-gray-100 text-gray-700 ring-gray-200',
  secondary: 'bg-blue-50 text-blue-700 ring-blue-200',
  success: 'bg-green-50 text-green-700 ring-green-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  destructive: 'bg-red-50 text-red-700 ring-red-200',
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
