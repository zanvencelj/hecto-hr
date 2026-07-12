import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { cn } from './utils';

const variants = {
  primary: { container: 'bg-blue-600 active:bg-blue-700', text: 'text-white' },
  secondary: { container: 'bg-gray-100 active:bg-gray-200', text: 'text-gray-900' },
  destructive: { container: 'bg-red-600 active:bg-red-700', text: 'text-white' },
  ghost: { container: 'bg-transparent active:bg-gray-100', text: 'text-gray-700' },
  outline: { container: 'border border-gray-300 bg-white active:bg-gray-50', text: 'text-gray-900' },
} as const;

const sizes = {
  sm: { container: 'h-9 px-3', text: 'text-sm' },
  md: { container: 'h-11 px-4', text: 'text-sm' },
  lg: { container: 'h-12 px-6', text: 'text-base' },
} as const;

export interface ButtonProps extends TouchableOpacityProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  label: string;
  className?: string;
  textClassName?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  label,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const v = variants[variant];
  const s = sizes[size];

  return (
    <TouchableOpacity
      disabled={disabled ?? loading}
      className={cn(
        'flex-row items-center justify-center gap-2',
        v.container,
        s.container,
        disabled || loading ? 'opacity-50' : '',
        className,
      )}
      activeOpacity={0.8}
      {...props}
    >
      {loading && <ActivityIndicator size="small" color={variant === 'primary' || variant === 'destructive' ? '#fff' : '#2563eb'} />}
      <Text className={cn('font-sans font-medium', v.text, s.text, textClassName)}>{label}</Text>
    </TouchableOpacity>
  );
}
