import { View, type ViewProps } from 'react-native';
import { cn } from './utils';

export interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <View
      className={cn('border border-gray-200 bg-white p-4', className)}
      {...props}
    >
      {children}
    </View>
  );
}
