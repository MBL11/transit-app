import React from 'react';
import { View, ViewProps } from 'react-native';
import { cn } from '@/utils';

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <View
      className={cn(
        'rounded-lg bg-gray-200 dark:bg-gray-700',
        className
      )}
      {...props}
    />
  );
}
