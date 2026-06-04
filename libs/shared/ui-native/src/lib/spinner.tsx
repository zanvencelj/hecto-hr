import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

export interface SpinnerProps extends ActivityIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'small', md: 'small', lg: 'large' } as const;

export function Spinner({ size = 'md', color = '#2563eb', ...props }: SpinnerProps) {
  return <ActivityIndicator size={sizeMap[size]} color={color} {...props} />;
}
