/**
 * MetroLogo - Official Paris Metro "M" logo
 * Blue circle with yellow "M" as seen on metro stations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface MetroLogoProps {
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: { width: 20, height: 20, fontSize: 12 },
  medium: { width: 28, height: 28, fontSize: 16 },
  large: { width: 40, height: 40, fontSize: 24 },
};

// Official Paris Metro colors
const METRO_BLUE = '#003CA6';
const METRO_YELLOW = '#FFCD00';

export function MetroLogo({ size = 'medium' }: MetroLogoProps) {
  const dimensions = SIZES[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.width / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            fontSize: dimensions.fontSize,
          },
        ]}
      >
        M
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: METRO_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: METRO_YELLOW,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default MetroLogo;
