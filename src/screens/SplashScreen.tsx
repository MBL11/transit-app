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

const { width } = Dimensions.get('window');

interface Props {
  onReady?: () => void;
}

export function SplashScreen({ onReady }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate loading dots
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundTop} />
      <View style={styles.backgroundBottom} />

      {/* Logo placeholder */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Placeholder for future logo - replace with Image component */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoEmoji}>🚇</Text>
        </View>

        <Text style={styles.appName}>Transit App</Text>
        <Text style={styles.tagline}>Votre compagnon de transport</Text>
      </Animated.View>

      {/* Loading indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingDots}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: [0.3, 1, 0.3, 0.3],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: [0.3, 0.3, 1, 0.3],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotsAnim.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: [0.3, 0.3, 0.3, 1],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#0066CC',
  },
  backgroundBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#0055AA',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 120,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  version: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
