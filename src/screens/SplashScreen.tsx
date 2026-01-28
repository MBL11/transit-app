/**
 * Splash Screen
 * Loading screen shown while app initializes
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

// Metro line colors (Paris)
const METRO_COLORS = [
  '#FFCD00', // Line 1
  '#003CA6', // Line 2
  '#837902', // Line 3
  '#CF009E', // Line 4
  '#FF7E2E', // Line 5
  '#6ECA97', // Line 6
  '#FA9ABA', // Line 7
  '#E19BDF', // Line 8
  '#B6BD00', // Line 9
  '#C9910D', // Line 10
  '#704B1C', // Line 11
  '#007852', // Line 12
  '#6EC4E8', // Line 13
  '#62259D', // Line 14
];

interface Props {
  onReady?: () => void;
}

// Animated metro line component
function MetroLine({
  color,
  startX,
  delay,
  duration
}: {
  color: string;
  startX: number;
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
            toValue: 0.15,
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
        styles.metroLine,
        {
          backgroundColor: color,
          top: startX,
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
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
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
  }, []);

  // Generate metro lines at different positions
  const metroLines = METRO_COLORS.map((color, index) => ({
    color,
    startX: (height / METRO_COLORS.length) * index + 20,
    delay: index * 400,
    duration: 3000 + Math.random() * 2000,
  }));

  return (
    <View style={styles.container}>
      {/* Gradient background layers */}
      <View style={styles.gradientLayer1} />
      <View style={styles.gradientLayer2} />
      <View style={styles.gradientLayer3} />

      {/* Animated metro lines in background */}
      {metroLines.map((line, index) => (
        <MetroLine
          key={index}
          color={line.color}
          startX={line.startX}
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
        {/* Metro Logo */}
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Text style={styles.logoM}>M</Text>
          </View>
        </View>

        <Text style={styles.appName}>Transit</Text>
        <Text style={styles.cityName}>Paris - Île-de-France</Text>
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
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.poweredBy}>Données IDFM</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#16213e',
  },
  gradientLayer2: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#1a1a2e',
  },
  gradientLayer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#0f3460',
  },
  metroLine: {
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
  logoOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFCD00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FFCD00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  logoInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#003CA6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  logoM: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 205, 0, 0.9)',
    letterSpacing: 3,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFCD00',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  poweredBy: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 4,
    letterSpacing: 1,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});
