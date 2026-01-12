import React from 'react';
import { View, TextInput, Pressable, TextInputProps } from 'react-native';
import { cn } from '@/utils';

export interface SearchBarProps extends TextInputProps {
  onClear?: () => void;
  showClearButton?: boolean;
  containerClassName?: string;
}

export function SearchBar({
  onClear,
  showClearButton = true,
  containerClassName,
  className,
  ...props
}: SearchBarProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const hasValue = props.value && props.value.length > 0;

  return (
    <View
      className={cn(
        'flex-row items-center bg-white dark:bg-gray-800 rounded-xl px-4 py-3',
        'border-2',
        isFocused
          ? 'border-transit-primary'
          : 'border-gray-200 dark:border-gray-700',
        containerClassName
      )}
    >
      {/* Search Icon */}
      <View className="mr-3">
        <View className="w-5 h-5 items-center justify-center">
          <Text className="text-gray-400 text-lg">🔍</Text>
        </View>
      </View>

      {/* Input */}
      <TextInput
        className={cn(
          'flex-1 text-base text-gray-900 dark:text-white',
          className
        )}
        placeholderTextColor="#9CA3AF"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />

      {/* Clear Button */}
      {showClearButton && hasValue && (
        <Pressable
          onPress={onClear}
          className="ml-2 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center"
        >
          <Text className="text-gray-600 dark:text-gray-300 text-xs">✕</Text>
        </Pressable>
      )}
    </View>
  );
}
