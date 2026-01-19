import React from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
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
        'flex-row items-center bg-card rounded-xl px-4 py-3',
        'border-2',
        isFocused
          ? 'border-transit-primary'
          : 'border-border',
        containerClassName
      )}
    >
      {/* Search Icon */}
      <View className="mr-3">
        <View className="w-5 h-5 items-center justify-center">
          <Text className="text-muted-foreground text-lg">🔍</Text>
        </View>
      </View>

      {/* Input */}
      <TextInput
        className={cn(
          'flex-1 text-base text-foreground',
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
          className="ml-2 w-6 h-6 rounded-full bg-muted items-center justify-center"
        >
          <Text className="text-muted-foreground text-xs">✕</Text>
        </Pressable>
      )}
    </View>
  );
}
