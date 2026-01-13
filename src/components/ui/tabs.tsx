import React, { createContext, useContext, useState } from 'react';
import { View, Text, Pressable, ViewProps, PressableProps } from 'react-native';
import { cn } from '@/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

interface TabsProps extends ViewProps {
  defaultValue: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [value, setValue] = useState(defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <View className={cn('gap-2', className)} {...props}>
        {children}
      </View>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends ViewProps {}

export function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <View
      className={cn(
        'flex-row bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
        className
      )}
      {...props}
    >
      {children}
    </View>
  );
}

interface TabsTriggerProps extends PressableProps {
  value: string;
  label: string;
}

export function TabsTrigger({
  value,
  label,
  className,
  ...props
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <Pressable
      className={cn(
        'flex-1 py-2 px-4 rounded-md items-center justify-center',
        isSelected && 'bg-white dark:bg-gray-700 shadow-sm',
        className
      )}
      onPress={() => onValueChange(value)}
      {...props}
    >
      <Text
        className={cn(
          'text-sm font-medium',
          isSelected
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface TabsContentProps extends ViewProps {
  value: string;
}

export function TabsContent({
  value,
  children,
  className,
  ...props
}: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();

  if (selectedValue !== value) {
    return null;
  }

  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}
