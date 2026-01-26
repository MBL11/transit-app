/**
 * Offline Banner Component
 * Displays a banner when the device is offline
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.warning || '#F59E0B' }]}>
      <Text style={styles.text}>
        📡 {t('network.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
