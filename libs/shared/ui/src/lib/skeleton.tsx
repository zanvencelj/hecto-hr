import { cn } from './utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200', className)}
      {...props}
    />
  );
}
