/**
 * MetroLogo - Official İzmir Metro "M" logo
 * Red circle with white "M" as seen on İzmir Metro stations
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

// Official İzmir Metro colors
const METRO_RED = '#D61C1F';
const METRO_WHITE = '#FFFFFF';

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
    backgroundColor: METRO_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: METRO_WHITE,
    fontWeight: '900',
    textAlign: 'center',
  },
});

export default MetroLogo;
