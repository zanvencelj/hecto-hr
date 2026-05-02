import { cn } from './utils';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export function Separator({ orientation = 'horizontal', label, className }: SeparatorProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400">{label}</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>
    );
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'vertical' ? 'w-px self-stretch bg-gray-200' : 'h-px w-full bg-gray-200',
        className,
      )}
    />
  );
}
