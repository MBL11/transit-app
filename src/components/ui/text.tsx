import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const textVariants = cva('', {
  variants: {
    variant: {
      default: 'text-gray-900',
      muted: 'text-gray-600',
      subtle: 'text-gray-500',
      primary: 'text-transit-primary',
      destructive: 'text-red-500',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'base',
    weight: 'normal',
  },
});

export interface TextProps
  extends React.ComponentPropsWithoutRef<typeof RNText>,
    VariantProps<typeof textVariants> {}

const Text = React.forwardRef<React.ElementRef<typeof RNText>, TextProps>(
  ({ className, variant, size, weight, ...props }, ref) => {
    return (
      <RNText
        ref={ref}
        className={cn(textVariants({ variant, size, weight }), className)}
        {...props}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text, textVariants };
