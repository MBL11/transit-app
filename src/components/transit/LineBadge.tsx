/**
 * LineBadge - Official IDFM-style line badges
 * Displays Metro, RER, Tram, and Bus line badges with official colors and shapes
 * Uses View-based rendering for maximum compatibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type TransportType = 'metro' | 'rer' | 'tram' | 'bus' | 'train' | 'noctilien' | 'izban' | 'ferry';

export interface LineBadgeProps {
  lineNumber: string;
  type: TransportType;
  color?: string;
  textColor?: string;
  size?: 'small' | 'medium' | 'large';
}

// İzmir Metro line colors - Red (kırmızı, #D61C1F)
const METRO_COLORS: Record<string, { bg: string; text: string }> = {
  'M1': { bg: '#D61C1F', text: '#FFFFFF' },
  'M2': { bg: '#D61C1F', text: '#FFFFFF' },
  '1': { bg: '#D61C1F', text: '#FFFFFF' },
  '2': { bg: '#D61C1F', text: '#FFFFFF' },
};

// İZBAN (İzmir commuter rail) colors - Dark Blue (#005BBB)
const RER_COLORS: Record<string, { bg: string; text: string }> = {
  'S1': { bg: '#005BBB', text: '#FFFFFF' },
  'S2': { bg: '#4A90E2', text: '#FFFFFF' }, // Tepeköy-Selçuk segment (lighter blue)
  'IZBAN': { bg: '#005BBB', text: '#FFFFFF' },
  'İZBAN': { bg: '#005BBB', text: '#FFFFFF' },
  'A': { bg: '#005BBB', text: '#FFFFFF' },
  'B': { bg: '#005BBB', text: '#FFFFFF' },
};

// İzmir Tramway colors - Green (#00A651)
// T3 Çiğli: İç Hat = light blue (#4ABEFF), Dış Hat = rose (#FF6EC7)
const TRAM_COLORS: Record<string, { bg: string; text: string }> = {
  'T1': { bg: '#00A651', text: '#FFFFFF' },
  'T2': { bg: '#00A651', text: '#FFFFFF' },
  'T3': { bg: '#00A651', text: '#FFFFFF' },
  '1': { bg: '#00A651', text: '#FFFFFF' },
  '2': { bg: '#00A651', text: '#FFFFFF' },
  '3': { bg: '#00A651', text: '#FFFFFF' },
  'CIGLI-IC': { bg: '#4ABEFF', text: '#000000' },  // İç Hat (inner, light blue)
  'CIGLI-DIS': { bg: '#FF6EC7', text: '#000000' },  // Dış Hat (outer, rose/magenta)
};

// İzdeniz (Ferry/Vapur) colors - Turquoise (#0099CC)
const TRANSILIEN_COLORS: Record<string, { bg: string; text: string }> = {
  'F1': { bg: '#0099CC', text: '#FFFFFF' },
  'F2': { bg: '#0099CC', text: '#FFFFFF' },
  'VAPUR': { bg: '#0099CC', text: '#FFFFFF' },
  'FERRY': { bg: '#0099CC', text: '#FFFFFF' },
};

const SIZES = {
  small: { width: 24, height: 24, fontSize: 11, borderWidth: 1.5 },
  medium: { width: 36, height: 36, fontSize: 14, borderWidth: 2 },
  large: { width: 48, height: 48, fontSize: 18, borderWidth: 2.5 },
};

// Ensure color has # prefix
function ensureColorPrefix(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function getLineColors(lineNumber: string, type: TransportType, customColor?: string, customTextColor?: string) {
  const normalizedLine = lineNumber.toUpperCase().trim();
  // Extract just the number/letter part (e.g., "M1" -> "1", "RER A" -> "A")
  const lineKey = normalizedLine.replace(/^(M|RER|T|BUS|METRO)\s*/i, '').trim();

  // Ensure custom colors have # prefix
  const safeCustomColor = ensureColorPrefix(customColor, '#666666');
  const safeCustomTextColor = ensureColorPrefix(customTextColor, '#FFFFFF');

  let colors = { bg: safeCustomColor, text: safeCustomTextColor };

  switch (type) {
    case 'metro':
      // Try both original line key and lowercase version
      const metroKey = lineKey.toLowerCase();
      if (METRO_COLORS[metroKey]) {
        colors = METRO_COLORS[metroKey];
      } else if (METRO_COLORS[lineKey]) {
        colors = METRO_COLORS[lineKey];
      }
      // If no match found, colors keeps the custom color
      break;
    case 'rer':
      // Try lineKey (e.g., "A" from "RER A" or just "A")
      if (RER_COLORS[lineKey]) {
        colors = RER_COLORS[lineKey];
      } else if (RER_COLORS[normalizedLine]) {
        colors = RER_COLORS[normalizedLine];
      }
      break;
    case 'tram':
      // Try with T prefix first, then without
      const tramKey = lineKey.startsWith('T') ? lineKey : `T${lineKey}`;
      if (TRAM_COLORS[tramKey]) {
        colors = TRAM_COLORS[tramKey];
      } else if (TRAM_COLORS[lineKey]) {
        colors = TRAM_COLORS[lineKey];
      }
      break;
    case 'train':
      if (TRANSILIEN_COLORS[lineKey]) {
        colors = TRANSILIEN_COLORS[lineKey];
      } else if (RER_COLORS[lineKey]) {
        colors = RER_COLORS[lineKey];
      } else if (TRANSILIEN_COLORS[normalizedLine]) {
        colors = TRANSILIEN_COLORS[normalizedLine];
      }
      break;
    case 'noctilien':
      colors = { bg: '#003366', text: '#FFFFFF' };
      break;
    case 'bus':
    default:
      // Custom colors are already set in the initial colors object
      break;
  }

  return colors;
}

export function LineBadge({
  lineNumber,
  type,
  color,
  textColor,
  size = 'medium',
}: LineBadgeProps) {
  const { width, height, fontSize, borderWidth } = SIZES[size];
  const colors = getLineColors(lineNumber, type, color, textColor);

  // Determine display text
  let displayText = lineNumber;

  // Adjust font size for longer text
  const adjustedFontSize = displayText.length > 3
    ? fontSize * 0.6
    : displayText.length > 2
      ? fontSize * 0.75
      : displayText.length > 1
        ? fontSize * 0.9
        : fontSize;

  // Determine badge shape based on type
  const isCircle = type === 'metro' || type === 'tram' || type === 'noctilien';
  const isSquare = type === 'rer';
  // bus and train are rounded rectangles

  const borderRadius = isCircle
    ? width / 2
    : isSquare
      ? width * 0.2
      : width * 0.15;

  const badgeStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: colors.bg,
    borderWidth,
    borderColor: type === 'noctilien' ? '#FFCD00' : '#FFFFFF',
  };

  const textStyle = {
    fontSize: adjustedFontSize,
    color: colors.text,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  };

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={textStyle} numberOfLines={1} adjustsFontSizeToFit>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LineBadge;
