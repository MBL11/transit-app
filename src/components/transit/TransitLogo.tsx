/**
 * TransitLogo - Unified transit logo component for all İzmir transport types
 * Professional circle-with-letter design matching official İzmir rapid transit branding
 *
 * Types:
 *   Metro  → Red circle (#D61C1F) with white "M"
 *   İZBAN  → Dark Blue circle (#005BBB) with white "İ"
 *   Tram   → Green circle (#00A651) with white "T"
 *   Ferry  → Turquoise circle (#0099CC) with ⛴️ emoji
 *   Bus    → ESHOT Blue circle (#0066CC) with white "B"
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type TransitType = 'metro' | 'izban' | 'tram' | 'ferry' | 'bus';

export interface TransitLogoProps {
  type: TransitType;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  /** Show white border (useful on map markers) */
  bordered?: boolean;
  /** Override the default brand color (e.g. per-line tram colors) */
  colorOverride?: string;
}

const SIZES = {
  tiny:   { width: 16, height: 16, fontSize: 9,  borderWidth: 1.5 },
  small:  { width: 22, height: 22, fontSize: 12, borderWidth: 2 },
  medium: { width: 28, height: 28, fontSize: 16, borderWidth: 2 },
  large:  { width: 40, height: 40, fontSize: 24, borderWidth: 2.5 },
};

interface TransitBrand {
  color: string;
  letter: string;
  label: string;
}

const TRANSIT_BRANDS: Record<TransitType, TransitBrand> = {
  metro: { color: '#D61C1F', letter: 'M', label: 'Metro' },
  izban: { color: '#005BBB', letter: 'İ', label: 'İZBAN' },
  tram:  { color: '#00A651', letter: 'T', label: 'Tram' },
  ferry: { color: '#0099CC', letter: '⛴️', label: 'Vapur' },
  bus:   { color: '#0066CC', letter: 'B', label: 'Bus' },
};

/**
 * Map GTFS route_type number to TransitType
 */
export function routeTypeToTransitType(routeType: number): TransitType {
  switch (routeType) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 2: return 'izban';
    case 3: return 'bus';
    case 4: return 'ferry';
    default: return 'bus';
  }
}

/**
 * Get the official İzmir color for a transport type
 */
export function getTransitColor(type: TransitType): string {
  return TRANSIT_BRANDS[type].color;
}

/**
 * Get the label for a transport type
 */
export function getTransitLabel(type: TransitType): string {
  return TRANSIT_BRANDS[type].label;
}

/**
 * Get all transit brands (for legend)
 */
export function getAllTransitBrands(): Array<{ type: TransitType } & TransitBrand> {
  return (Object.keys(TRANSIT_BRANDS) as TransitType[]).map(type => ({
    type,
    ...TRANSIT_BRANDS[type],
  }));
}

export const TransitLogo = memo(function TransitLogo({
  type,
  size = 'medium',
  bordered = false,
  colorOverride,
}: TransitLogoProps) {
  const brand = TRANSIT_BRANDS[type];
  const dimensions = SIZES[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.width / 2,
          backgroundColor: colorOverride || brand.color,
        },
        bordered && {
          borderWidth: dimensions.borderWidth,
          borderColor: '#FFFFFF',
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          { fontSize: dimensions.fontSize },
        ]}
      >
        {brand.letter}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default TransitLogo;
