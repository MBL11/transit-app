import React, { ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { cn } from '@/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[90%]">
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface SheetHeaderProps {
  children: ReactNode;
  className?: string;
}

export function SheetHeader({ children, className }: SheetHeaderProps) {
  return (
    <View className={cn('p-6 border-b border-gray-200 dark:border-gray-800', className)}>
      {children}
    </View>
  );
}

interface SheetTitleProps {
  children: ReactNode;
  className?: string;
}

export function SheetTitle({ children, className }: SheetTitleProps) {
  return (
    <Text className={cn('text-xl font-semibold text-gray-900 dark:text-white', className)}>
      {children}
    </Text>
  );
}

interface SheetDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function SheetDescription({ children, className }: SheetDescriptionProps) {
  return (
    <Text className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}>
      {children}
    </Text>
  );
}

interface SheetContentProps {
  children: ReactNode;
  className?: string;
}

export function SheetContent({ children, className }: SheetContentProps) {
  return (
    <ScrollView className={cn('p-6', className)}>
      {children}
    </ScrollView>
  );
}

interface SheetFooterProps {
  children: ReactNode;
  className?: string;
}

export function SheetFooter({ children, className }: SheetFooterProps) {
  return (
    <View className={cn('p-6 border-t border-gray-200 dark:border-gray-800', className)}>
      {children}
    </View>
  );
}
