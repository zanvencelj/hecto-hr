import { TextInput, type TextInputProps } from 'react-native';
import { cn } from './utils';

export interface InputProps extends TextInputProps {
  error?: boolean;
  className?: string;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'font-sans h-11 w-full border bg-white px-3 text-sm text-gray-900',
        error ? 'border-red-500' : 'border-gray-300',
        className,
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}
