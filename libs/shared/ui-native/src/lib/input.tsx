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
        'font-sans w-full border bg-white px-3 text-sm text-gray-900',
        // A fixed h-11 fights min-h-* utilities on multiline TextInputs — the
        // native view can grow taller than the Yoga-computed box and paint
        // over whatever's below it. Single-line inputs still want h-11.
        props.multiline ? 'min-h-11 py-2.5' : 'h-11',
        error ? 'border-red-500' : 'border-gray-300',
        className,
      )}
      placeholderTextColor="#9ca3af"
      {...props}
    />
  );
}
