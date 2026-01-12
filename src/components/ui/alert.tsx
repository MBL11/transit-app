import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

const alertVariants = cva(
  'rounded-lg border p-4 gap-2',
  {
    variants: {
      variant: {
        default: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
        success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
        destructive: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const alertTextVariants = cva(
  'text-sm',
  {
    variants: {
      variant: {
        default: 'text-gray-900 dark:text-gray-100',
        info: 'text-blue-900 dark:text-blue-100',
        success: 'text-green-900 dark:text-green-100',
        warning: 'text-yellow-900 dark:text-yellow-100',
        destructive: 'text-red-900 dark:text-red-100',
      },
    },
  }
);

interface AlertProps extends ViewProps, VariantProps<typeof alertVariants> {
  title?: string;
  description?: string;
}

export function Alert({
  variant,
  title,
  description,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <View className={cn(alertVariants({ variant }), className)} {...props}>
      {title && (
        <Text className={cn('font-semibold', alertTextVariants({ variant }))}>
          {title}
        </Text>
      )}
      {description && (
        <Text className={alertTextVariants({ variant })}>
          {description}
        </Text>
      )}
      {children}
    </View>
  );
}
