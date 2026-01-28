/**
 * Splash Screen
 * Loading screen shown while app initializes
 * Theme: İzmir - Aegean Sea & Turkish colors
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Transit colors - İzmir/Turkish theme (Aegean blue, Turkish red, white)
const TRANSIT_COLORS = [
  '#E30A17', // Turkish red
  '#1E5AAF', // Aegean blue
  '#FFFFFF', // White
  '#E30A17', // Turkish red
  '#2196F3', // Light blue (sea)
  '#1E5AAF', // Aegean blue
  '#E30A17', // Turkish red
  '#00ACC1', // Cyan (Aegean coast)
  '#1E5AAF', // Aegean blue
  '#FFFFFF', // White
];

interface Props {
  onReady?: () => void;
}

// Animated transit line component
function TransitLine({
  color,
  startY,
  delay,
  duration
}: {
  color: string;
  startY: number;
  delay: number;
  duration: number;
}) {
  const translateX = useRef(new Animated.Value(-width * 0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: width * 1.2,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -width * 0.6,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.transitLine,
        {
          backgroundColor: color,
          top: startY,
          opacity,
          transform: [{ translateX }],
        },
      ]}
    />
  );
}

export function SplashScreen({ onReady }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress bar animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Wave animation for Aegean theme
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Generate transit lines at different positions
  const transitLines = TRANSIT_COLORS.map((color, index) => ({
    color,
    startY: (height / TRANSIT_COLORS.length) * index + 30,
    delay: index * 350,
    duration: 2500 + Math.random() * 1500,
  }));

  return (
    <View style={styles.container}>
      {/* Gradient background - Aegean sea theme */}
      <View style={styles.gradientLayer1} />
      <View style={styles.gradientLayer2} />
      <View style={styles.gradientLayer3} />

      {/* Animated transit lines in background */}
      {transitLines.map((line, index) => (
        <TransitLine
          key={index}
          color={line.color}
          startY={line.startY}
          delay={line.delay}
          duration={line.duration}
        />
      ))}

      {/* Main content */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        {/* İzmir Transit Logo */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>İZMİR</Text>
          <View style={styles.logoUnderline} />
        </View>

        <Text style={styles.appName}>Transit</Text>
        <Text style={styles.tagline}>Toplu Taşıma Rehberi</Text>
      </Animated.View>

      {/* Loading section */}
      <View style={styles.loadingContainer}>
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.poweredBy}>ESHOT • Metro • İZBAN</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#1565C0', // Lighter blue (sky)
  },
  gradientLayer2: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#0D47A1', // Aegean blue
  },
  gradientLayer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#0A3D91', // Deep Aegean
  },
  transitLine: {
    position: 'absolute',
    left: 0,
    width: width * 0.5,
    height: 4,
    borderRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0D47A1', // Aegean blue
    letterSpacing: 4,
  },
  logoUnderline: {
    width: '100%',
    height: 4,
    backgroundColor: '#E30A17', // Turkish red accent
    borderRadius: 2,
    marginTop: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 2,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#E30A17', // Turkish red
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
    letterSpacing: 2,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
