/**
 * RouteFiltersModal Component
 * Modal for configuring routing preferences (modes, optimization, limits)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { RoutingPreferences } from '../../types/routing-preferences';
import { DEFAULT_PREFERENCES } from '../../types/routing-preferences';

interface RouteFiltersModalProps {
  visible: boolean;
  preferences: RoutingPreferences;
  onClose: () => void;
  onApply: (preferences: RoutingPreferences) => void;
}

export function RouteFiltersModal({
  visible,
  preferences,
  onClose,
  onApply,
}: RouteFiltersModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [localPrefs, setLocalPrefs] = useState<RoutingPreferences>(preferences);

  // Reset preferences to default
  const handleReset = () => {
    setLocalPrefs(DEFAULT_PREFERENCES);
  };

  // Apply and close
  const handleApply = () => {
    onApply(localPrefs);
    onClose();
  };

  // Update a specific preference
  const updatePref = <K extends keyof RoutingPreferences>(
    key: K,
    value: RoutingPreferences[K]
  ) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
  };

  // Toggle a transport mode
  const toggleMode = (mode: keyof RoutingPreferences['allowedModes']) => {
    setLocalPrefs((prev) => ({
      ...prev,
      allowedModes: {
        ...prev.allowedModes,
        [mode]: !prev.allowedModes[mode],
      },
    }));
  };

  const transportModes: Array<{
    key: keyof RoutingPreferences['allowedModes'];
    icon: string;
    labelKey: string;
  }> = [
    { key: 'metro', icon: '🚇', labelKey: 'routing.filters.metro' },
    { key: 'izban', icon: '🚆', labelKey: 'routing.filters.izban' },
    { key: 'tram', icon: '🚊', labelKey: 'routing.filters.tram' },
    { key: 'bus', icon: '🚌', labelKey: 'routing.filters.bus' },
    { key: 'ferry', icon: '⛴️', labelKey: 'routing.filters.ferry' },
  ];

  const optimizationOptions: Array<{
    value: RoutingPreferences['optimizeFor'];
    labelKey: string;
    icon: string;
  }> = [
    { value: 'fastest', labelKey: 'routing.filters.fastest', icon: '⚡' },
    { value: 'least-transfers', labelKey: 'routing.filters.leastTransfers', icon: '🔄' },
    { value: 'least-walking', labelKey: 'routing.filters.leastWalking', icon: '🚶' },
  ];

  const maxTransfersOptions = [0, 1, 2, 3, -1];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('routing.filters.title')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Transport Modes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('routing.filters.transportModes')}</Text>
            {transportModes.map((mode) => (
              <View key={mode.key} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>{mode.icon}</Text>
                  <Text style={styles.rowLabel}>{t(mode.labelKey)}</Text>
                </View>
                <Switch
                  value={localPrefs.allowedModes[mode.key]}
                  onValueChange={() => toggleMode(mode.key)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* Optimize For */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('routing.filters.optimizeFor')}</Text>
            {optimizationOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  localPrefs.optimizeFor === option.value && styles.optionButtonActive,
                ]}
                onPress={() => updatePref('optimizeFor', option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text
                  style={[
                    styles.optionLabel,
                    localPrefs.optimizeFor === option.value && styles.optionLabelActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Max Transfers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('routing.filters.maxTransfers')}</Text>
            <View style={styles.chipsContainer}>
              {maxTransfersOptions.map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.chip,
                    localPrefs.maxTransfers === num && styles.chipActive,
                  ]}
                  onPress={() => updatePref('maxTransfers', num)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      localPrefs.maxTransfers === num && styles.chipTextActive,
                    ]}
                  >
                    {num === -1 ? t('routing.filters.unlimited') : num.toString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Max Walking Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('routing.filters.maxWalking')}</Text>
            <View style={styles.chipsContainer}>
              {[500, 750, 1000, 1500, 2000].map((meters) => (
                <TouchableOpacity
                  key={meters}
                  style={[
                    styles.chip,
                    localPrefs.maxWalkingDistance === meters && styles.chipActive,
                  ]}
                  onPress={() => updatePref('maxWalkingDistance', meters)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      localPrefs.maxWalkingDistance === meters && styles.chipTextActive,
                    ]}
                  >
                    {meters}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Accessibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('routing.filters.accessibility')}</Text>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowIcon}>♿</Text>
                <Text style={styles.rowLabel}>{t('routing.filters.wheelchair')}</Text>
              </View>
              <Switch
                value={localPrefs.wheelchair}
                onValueChange={(value) => updatePref('wheelchair', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>{t('common.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>{t('common.apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rowIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    rowLabel: {
      fontSize: 15,
      color: colors.text,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.buttonBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    optionButtonActive: {
      backgroundColor: colors.activeBackground,
      borderColor: colors.primary,
    },
    optionIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    optionLabel: {
      fontSize: 15,
      color: colors.text,
    },
    optionLabelActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    chipTextActive: {
      color: '#fff',
    },
    footer: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    resetButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.buttonBackground,
      alignItems: 'center',
    },
    resetButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    applyButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
    },
  });
