/**
 * MapLegend - Floating legend overlay for the transit map
 * Shows all transport types with their official logos and labels
 * Collapsible to save screen space
 */

import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TransitLogo, getAllTransitBrands, type TransitType } from '../transit/TransitLogo';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Which transit types to show in the legend (exclude bus since not on map) */
const LEGEND_TYPES: TransitType[] = ['metro', 'izban', 'tram', 'ferry'];

export const MapLegend = memo(function MapLegend() {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const allBrands = getAllTransitBrands().filter(b => LEGEND_TYPES.includes(b.type));

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        {expanded ? (
          // Expanded: show all transport types
          <View style={styles.expandedContent}>
            <View style={styles.headerRow}>
              <Text style={styles.headerText}>{t('common.mapLegend')}</Text>
              <Text style={styles.collapseIcon}>▼</Text>
            </View>
            {allBrands.map((brand) => (
              <View key={brand.type} style={styles.legendRow}>
                <TransitLogo type={brand.type} size="tiny" bordered />
                <Text style={styles.legendLabel}>{brand.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          // Collapsed: show compact row of logos
          <View style={styles.collapsedContent}>
            {allBrands.map((brand, index) => (
              <View key={brand.type} style={index > 0 ? styles.collapsedLogoSpaced : undefined}>
                <TransitLogo type={brand.type} size="tiny" bordered />
              </View>
            ))}
            <Text style={styles.expandIcon}>▲</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    zIndex: 10,
  },
  toggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Expanded state
  expandedContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  collapseIcon: {
    fontSize: 8,
    color: '#999',
    marginLeft: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  legendLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Collapsed state
  collapsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  collapsedLogoSpaced: {
    marginLeft: 4,
  },
  expandIcon: {
    fontSize: 8,
    color: '#999',
    marginLeft: 6,
  },
});
