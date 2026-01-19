import * as React from 'react';
import { Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'flex-row items-center rounded-full px-2.5 py-0.5',
  {
    variants: {
      variant: {
        default: 'bg-transit-primary',
        secondary: 'bg-muted',
        destructive: 'bg-red-500',
        outline: 'border border-border',
        success: 'bg-green-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
      success: 'text-white',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<typeof badgeVariants> {
  label?: string;
  labelClasses?: string;
}

function Badge({
  label,
  labelClasses,
  className,
  variant,
  children,
  ...props
}: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      {children || (
        <Text className={cn(badgeTextVariants({ variant }), labelClasses)}>
          {label}
        </Text>
      )}
    </View>
  );
}

export { Badge, badgeVariants, badgeTextVariants };
