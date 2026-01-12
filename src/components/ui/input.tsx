import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { cn } from '@/utils';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  className,
  containerClassName,
  ...props
}: InputProps) {
  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </Text>
      )}
      <TextInput
        className={cn(
          'h-12 rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-900',
          'dark:border-gray-600 dark:bg-gray-800 dark:text-white',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text className="text-sm text-red-500">{error}</Text>
      )}
    </View>
  );
}
