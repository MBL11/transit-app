/**
 * TransportLogos - İzmir transit type logos
 * Metro: Red circle with white M
 * İZBAN: Dark blue with white text
 * Tram: Green circle with white T
 * Bus: Blue rounded rectangle
 * Ferry: Turquoise rounded rectangle
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type TransportLogoType = 'metro' | 'rer' | 'tram' | 'bus' | 'train' | 'walk';

export interface TransportLogoProps {
  type: TransportLogoType;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 20, height: 20, fontSize: 11 },
  medium: { width: 28, height: 28, fontSize: 15 },
  large: { width: 40, height: 40, fontSize: 22 },
};

// İzmir official transit colors
const COLORS = {
  metro: { bg: '#D61C1F', text: '#FFFFFF' },       // Red (kırmızı)
  rer: { bg: '#005BBB', text: '#FFFFFF' },         // İZBAN Dark Blue (mavi)
  tram: { bg: '#00A651', text: '#FFFFFF' },        // Green (yeşil)
  bus: { bg: '#0066CC', text: '#FFFFFF' },         // ESHOT Blue
  train: { bg: '#005BBB', text: '#FFFFFF' },       // İZBAN Dark Blue
  walk: { bg: '#666666', text: '#FFFFFF' },        // Gray for walking
};

const LABELS = {
  metro: 'M',
  rer: 'İZB',
  tram: 'T',
  bus: 'BUS',
  train: 'İZB',
  walk: '🚶',
};

export function TransportLogo({ type, size = 'medium' }: TransportLogoProps) {
  const dimensions = SIZES[size];
  const colors = COLORS[type];
  const label = LABELS[type];

  // Adjust font size for longer labels
  const adjustedFontSize = label.length > 2
    ? dimensions.fontSize * 0.65
    : label.length > 1
      ? dimensions.fontSize * 0.8
      : dimensions.fontSize;

  // Shape varies by transport type
  const isCircle = type === 'metro' || type === 'tram' || type === 'walk';
  const isRoundedSquare = type === 'rer' || type === 'train';

  const borderRadius = isCircle
    ? dimensions.width / 2
    : isRoundedSquare
      ? dimensions.width * 0.2
      : dimensions.width * 0.15;

  const containerStyle = {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius,
    backgroundColor: colors.bg,
    ...(type === 'rer' && {
      borderWidth: 2,
      borderColor: '#000000',
    }),
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text
        style={[
          styles.label,
          {
            fontSize: adjustedFontSize,
            color: colors.text,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Helper component to show transport mode with line number
 * e.g., Metro logo + "1" badge
 */
export interface TransportWithLineProps {
  type: TransportLogoType;
  lineNumber?: string;
  lineColor?: string;
  size?: 'small' | 'medium' | 'large';
}

export function TransportWithLine({
  type,
  lineNumber,
  lineColor,
  size = 'medium',
}: TransportWithLineProps) {
  const dimensions = SIZES[size];

  return (
    <View style={styles.row}>
      <TransportLogo type={type} size={size} />
      {lineNumber && (
        <View
          style={[
            styles.lineNumber,
            {
              backgroundColor: lineColor || '#666666',
              minWidth: dimensions.width,
              height: dimensions.height,
              borderRadius: dimensions.height / 2,
            },
          ]}
        >
          <Text
            style={[
              styles.lineNumberText,
              { fontSize: dimensions.fontSize * 0.9 },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {lineNumber}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '900',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lineNumber: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  lineNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TransportLogo;
