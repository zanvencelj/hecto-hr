import { cn } from './utils';

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
}

export function TextLink({ className, children, ...props }: TextLinkProps) {
  return (
    <a
      className={cn(
        'font-medium text-blue-600 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 rounded-sm',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
