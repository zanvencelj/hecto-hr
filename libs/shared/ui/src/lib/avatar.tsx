import { cn } from './utils';

const sizes = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
  xl: 'h-14 w-14 text-lg',
} as const;

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? 'Avatar'}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-label={name ?? 'Avatar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-blue-600 font-medium text-white select-none',
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
