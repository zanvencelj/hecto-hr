import { Text, View, type ViewProps } from 'react-native';
import { cn } from './utils';

export interface FormFieldProps extends ViewProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, required, className, children, ...props }: FormFieldProps) {
  return (
    <View className={cn('gap-1.5', className)} {...props}>
      <Text className="font-sans text-sm font-medium text-slate-700">
        {label}
        {required && <Text className="font-sans text-red-500"> *</Text>}
      </Text>
      {children}
      {error && <Text className="font-sans text-xs text-red-500">{error}</Text>}
    </View>
  );
}
