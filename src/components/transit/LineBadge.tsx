/**
 * LineBadge - Official IDFM-style line badges
 * Displays Metro, RER, Tram, and Bus line badges with official colors and shapes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Rect, G, Text as SvgText } from 'react-native-svg';

export type TransportType = 'metro' | 'rer' | 'tram' | 'bus' | 'train' | 'noctilien';

export interface LineBadgeProps {
  lineNumber: string;
  type: TransportType;
  color?: string;
  textColor?: string;
  size?: 'small' | 'medium' | 'large';
}

// Official IDFM Metro line colors
const METRO_COLORS: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#FFCD00', text: '#000000' },
  '2': { bg: '#003CA6', text: '#FFFFFF' },
  '3': { bg: '#837902', text: '#FFFFFF' },
  '3bis': { bg: '#6EC4E8', text: '#000000' },
  '4': { bg: '#CF009E', text: '#FFFFFF' },
  '5': { bg: '#FF7E2E', text: '#000000' },
  '6': { bg: '#6ECA97', text: '#000000' },
  '7': { bg: '#FA9ABA', text: '#000000' },
  '7bis': { bg: '#6ECA97', text: '#000000' },
  '8': { bg: '#E19BDF', text: '#000000' },
  '9': { bg: '#B6BD00', text: '#000000' },
  '10': { bg: '#C9910D', text: '#000000' },
  '11': { bg: '#704B1C', text: '#FFFFFF' },
  '12': { bg: '#007852', text: '#FFFFFF' },
  '13': { bg: '#6EC4E8', text: '#000000' },
  '14': { bg: '#62259D', text: '#FFFFFF' },
};

// Official IDFM RER line colors
const RER_COLORS: Record<string, { bg: string; text: string }> = {
  'A': { bg: '#E3051C', text: '#FFFFFF' },
  'B': { bg: '#5291CE', text: '#FFFFFF' },
  'C': { bg: '#FFCD00', text: '#000000' },
  'D': { bg: '#00814F', text: '#FFFFFF' },
  'E': { bg: '#CF76C8', text: '#000000' },
};

// Official IDFM Tram line colors
const TRAM_COLORS: Record<string, { bg: string; text: string }> = {
  'T1': { bg: '#003CA6', text: '#FFFFFF' },
  'T2': { bg: '#CF009E', text: '#FFFFFF' },
  'T3a': { bg: '#FF7E2E', text: '#000000' },
  'T3b': { bg: '#00814F', text: '#FFFFFF' },
  'T4': { bg: '#E19BDF', text: '#000000' },
  'T5': { bg: '#837902', text: '#FFFFFF' },
  'T6': { bg: '#E3051C', text: '#FFFFFF' },
  'T7': { bg: '#704B1C', text: '#FFFFFF' },
  'T8': { bg: '#837902', text: '#FFFFFF' },
  'T9': { bg: '#5291CE', text: '#FFFFFF' },
  'T10': { bg: '#FFCD00', text: '#000000' },
  'T11': { bg: '#FF7E2E', text: '#000000' },
  'T12': { bg: '#B90845', text: '#FFFFFF' },
  'T13': { bg: '#8D5E2A', text: '#FFFFFF' },
};

// Transilien line colors
const TRANSILIEN_COLORS: Record<string, { bg: string; text: string }> = {
  'H': { bg: '#704B1C', text: '#FFFFFF' },
  'J': { bg: '#CEAF00', text: '#000000' },
  'K': { bg: '#C1B400', text: '#000000' },
  'L': { bg: '#6E4C9F', text: '#FFFFFF' },
  'N': { bg: '#00A092', text: '#FFFFFF' },
  'P': { bg: '#FFBE00', text: '#000000' },
  'R': { bg: '#E6007E', text: '#FFFFFF' },
  'U': { bg: '#B90845', text: '#FFFFFF' },
};

const SIZES = {
  small: { width: 24, height: 24, fontSize: 12 },
  medium: { width: 36, height: 36, fontSize: 16 },
  large: { width: 48, height: 48, fontSize: 20 },
};

function getLineColors(lineNumber: string, type: TransportType, customColor?: string, customTextColor?: string) {
  const normalizedLine = lineNumber.toUpperCase().trim();

  let colors = { bg: customColor || '#666666', text: customTextColor || '#FFFFFF' };

  switch (type) {
    case 'metro':
      const metroLine = normalizedLine.toLowerCase();
      if (METRO_COLORS[metroLine]) {
        colors = METRO_COLORS[metroLine];
      }
      break;
    case 'rer':
      if (RER_COLORS[normalizedLine]) {
        colors = RER_COLORS[normalizedLine];
      }
      break;
    case 'tram':
      // Try with T prefix first
      const tramKey = normalizedLine.startsWith('T') ? normalizedLine : `T${normalizedLine}`;
      if (TRAM_COLORS[tramKey]) {
        colors = TRAM_COLORS[tramKey];
      }
      break;
    case 'train':
      if (TRANSILIEN_COLORS[normalizedLine]) {
        colors = TRANSILIEN_COLORS[normalizedLine];
      } else if (RER_COLORS[normalizedLine]) {
        colors = RER_COLORS[normalizedLine];
      }
      break;
    case 'noctilien':
      colors = { bg: '#003366', text: '#FFFFFF' };
      break;
    case 'bus':
    default:
      // Use custom color or default green for buses
      colors = { bg: customColor || '#00AA55', text: customTextColor || '#FFFFFF' };
      break;
  }

  // Override with custom colors if provided
  if (customColor) colors.bg = customColor;
  if (customTextColor) colors.text = customTextColor;

  return colors;
}

export function LineBadge({
  lineNumber,
  type,
  color,
  textColor,
  size = 'medium',
}: LineBadgeProps) {
  const { width, height, fontSize } = SIZES[size];
  const colors = getLineColors(lineNumber, type, color, textColor);

  // Determine display text
  let displayText = lineNumber;
  if (type === 'tram' && !lineNumber.toUpperCase().startsWith('T')) {
    displayText = `T${lineNumber}`;
  }

  // Adjust font size for longer text
  const adjustedFontSize = displayText.length > 2
    ? fontSize * 0.7
    : displayText.length > 1
      ? fontSize * 0.85
      : fontSize;

  // Metro: Circle
  if (type === 'metro') {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={colors.bg} stroke="#FFFFFF" strokeWidth="2" />
        <SvgText
          x="50"
          y="50"
          textAnchor="middle"
          alignmentBaseline="central"
          dy="4"
          fontSize={displayText.length > 2 ? 28 : displayText.length > 1 ? 34 : 42}
          fontWeight="bold"
          fill={colors.text}
        >
          {displayText}
        </SvgText>
      </Svg>
    );
  }

  // RER: Rounded square
  if (type === 'rer') {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Rect x="5" y="5" width="90" height="90" rx="15" fill={colors.bg} stroke="#FFFFFF" strokeWidth="2" />
        <SvgText
          x="50"
          y="50"
          textAnchor="middle"
          alignmentBaseline="central"
          dy="4"
          fontSize={42}
          fontWeight="bold"
          fill={colors.text}
        >
          {displayText}
        </SvgText>
      </Svg>
    );
  }

  // Tram: Circle with border
  if (type === 'tram') {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="46" fill={colors.bg} stroke={colors.bg} strokeWidth="4" />
        <Circle cx="50" cy="50" r="42" fill={colors.bg} stroke="#FFFFFF" strokeWidth="2" />
        <SvgText
          x="50"
          y="50"
          textAnchor="middle"
          alignmentBaseline="central"
          dy="4"
          fontSize={displayText.length > 3 ? 22 : displayText.length > 2 ? 26 : 32}
          fontWeight="bold"
          fill={colors.text}
        >
          {displayText}
        </SvgText>
      </Svg>
    );
  }

  // Train/Transilien: Rounded rectangle
  if (type === 'train') {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Rect x="5" y="15" width="90" height="70" rx="12" fill={colors.bg} stroke="#FFFFFF" strokeWidth="2" />
        <SvgText
          x="50"
          y="50"
          textAnchor="middle"
          alignmentBaseline="central"
          dy="4"
          fontSize={displayText.length > 1 ? 32 : 40}
          fontWeight="bold"
          fill={colors.text}
        >
          {displayText}
        </SvgText>
      </Svg>
    );
  }

  // Noctilien: Circle with N prefix styling
  if (type === 'noctilien') {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="48" fill={colors.bg} stroke="#FFCD00" strokeWidth="3" />
        <SvgText
          x="50"
          y="50"
          textAnchor="middle"
          alignmentBaseline="central"
          dy="4"
          fontSize={displayText.length > 2 ? 24 : 30}
          fontWeight="bold"
          fill={colors.text}
        >
          {displayText}
        </SvgText>
      </Svg>
    );
  }

  // Bus: Rounded rectangle (default)
  return (
    <Svg width={width} height={height} viewBox="0 0 100 100">
      <Rect x="5" y="20" width="90" height="60" rx="10" fill={colors.bg} stroke="#FFFFFF" strokeWidth="2" />
      <SvgText
        x="50"
        y="50"
        textAnchor="middle"
        alignmentBaseline="central"
        dy="4"
        fontSize={displayText.length > 3 ? 20 : displayText.length > 2 ? 24 : 30}
        fontWeight="bold"
        fill={colors.text}
      >
        {displayText}
      </SvgText>
    </Svg>
  );
}

// Simple View-based badge as fallback
export function LineBadgeSimple({
  lineNumber,
  type,
  color,
  textColor,
  size = 'medium',
}: LineBadgeProps) {
  const { width, height, fontSize } = SIZES[size];
  const colors = getLineColors(lineNumber, type, color, textColor);

  const isCircle = type === 'metro' || type === 'tram';
  const isSquare = type === 'rer';

  return (
    <View
      style={[
        styles.badge,
        {
          width,
          height,
          backgroundColor: colors.bg,
          borderRadius: isCircle ? width / 2 : isSquare ? 6 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            fontSize: lineNumber.length > 2 ? fontSize * 0.7 : fontSize,
            color: colors.text,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {lineNumber}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LineBadge;
