import { Text, View, type ViewProps } from 'react-native';
import { cn } from './utils';

export interface AvatarProps extends ViewProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: { container: 'h-8 w-8', text: 'text-xs' },
  md: { container: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-16 w-16', text: 'text-xl' },
} as const;

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, size = 'md', className, style, ...props }: AvatarProps) {
  const s = sizes[size];
  return (
    <View
      className={cn('bg-blue-100 items-center justify-center', s.container, className)}
      style={[{ borderRadius: 9999 }, style as object]}
      {...props}
    >
      <Text className={cn('font-sans font-semibold text-blue-700', s.text)}>{getInitials(name)}</Text>
    </View>
  );
}
