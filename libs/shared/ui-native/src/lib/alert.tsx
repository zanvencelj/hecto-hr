import { Text, View, type ViewProps } from 'react-native';
import { cn } from './utils';

const variants = {
  info: { container: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
  success: { container: 'bg-green-50 border-green-200', text: 'text-green-800' },
  warning: { container: 'bg-amber-50 border-amber-200', text: 'text-amber-800' },
  destructive: { container: 'bg-red-50 border-red-200', text: 'text-red-800' },
} as const;

export interface AlertProps extends ViewProps {
  variant?: keyof typeof variants;
  message: string;
  className?: string;
}

export function Alert({ variant = 'info', message, className, ...props }: AlertProps) {
  const v = variants[variant];
  return (
    <View className={cn('border px-4 py-3', v.container, className)} {...props}>
      <Text className={cn('font-sans text-sm', v.text)}>{message}</Text>
    </View>
  );
}
