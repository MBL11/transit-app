import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-transit-primary',
        secondary: 'bg-gray-200',
        destructive: 'bg-red-500',
        outline: 'border-2 border-transit-primary bg-transparent',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-4',
        sm: 'h-9 px-3',
        lg: 'h-14 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      default: 'text-white',
      secondary: 'text-gray-900',
      destructive: 'text-white',
      outline: 'text-transit-primary',
      ghost: 'text-transit-primary',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: 'text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof Pressable>,
    VariantProps<typeof buttonVariants> {
  label?: string;
  labelClasses?: string;
}

function Button({
  label,
  labelClasses,
  className,
  variant,
  size,
  children,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        buttonVariants({ variant, size }),
        props.disabled && 'opacity-50',
        className
      )}
      {...props}
    >
      {children || (
        <Text className={cn(buttonTextVariants({ variant, size }), labelClasses)}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export { Button, buttonVariants, buttonTextVariants };
