/**
 * Simple Test Screen
 * Minimal screen for testing basic rendering
 */

import React from 'react';
import { View, Text } from 'react-native';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';

interface Props {
  title: string;
}

export function SimpleTestScreen({ title }: Props) {
  console.log(`[SimpleTestScreen] Rendering ${title}`);

  return (
    <ScreenContainer>
      <ScreenHeader title={title} />
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-2xl mb-2">✅</Text>
        <Text className="text-foreground text-lg font-bold">
          {title} OK
        </Text>
        <Text className="text-muted-foreground mt-2 text-center">
          This screen loaded successfully
        </Text>
      </View>
    </ScreenContainer>
  );
}
