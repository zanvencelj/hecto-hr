import { Text, View, type ViewProps } from 'react-native';
import { cn } from './utils';

const variants = {
  default: { container: 'bg-gray-100', text: 'text-gray-700' },
  secondary: { container: 'bg-blue-50', text: 'text-blue-700' },
  success: { container: 'bg-green-50', text: 'text-green-700' },
  warning: { container: 'bg-amber-50', text: 'text-amber-700' },
  destructive: { container: 'bg-red-50', text: 'text-red-700' },
} as const;

export interface BadgeProps extends ViewProps {
  variant?: keyof typeof variants;
  label: string;
  className?: string;
}

export function Badge({ variant = 'default', label, className, ...props }: BadgeProps) {
  const v = variants[variant];
  return (
    <View className={cn('px-2 py-0.5 self-start', v.container, className)} {...props}>
      <Text className={cn('font-sans text-xs font-medium', v.text)}>{label}</Text>
    </View>
  );
}
