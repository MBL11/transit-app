/**
 * RouteSearchAnimation
 * Animated loading indicator shown while routes are being calculated.
 * Cycles through status messages to give user feedback on progress.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';

const TRANSPORT_ICONS = ['🚇', '🚌', '🚊', '🚆', '⛴️'];

export function RouteSearchAnimation() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Cycling status messages
  const statusMessages = [
    t('route.searchingStops', { defaultValue: 'Recherche des arrêts proches...' }),
    t('route.analyzingLines', { defaultValue: 'Analyse des lignes...' }),
    t('route.findingTransfers', { defaultValue: 'Recherche de correspondances...' }),
    t('route.optimizingRoute', { defaultValue: 'Optimisation de l\'itinéraire...' }),
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  // Animate transport icons sliding
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Continuous sliding animation for the transport icons
    const slideLoop = Animated.loop(
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    slideLoop.start();

    // Pulse animation for the center dot
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Cycle status messages every 2 seconds
    const messageInterval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex(prev => (prev + 1) % statusMessages.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 2000);

    return () => {
      slideLoop.stop();
      pulseLoop.stop();
      clearInterval(messageInterval);
    };
  }, []);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 260],
  });

  return (
    <View style={styles.container}>
      {/* Animated track with moving transport icon */}
      <View style={styles.trackContainer}>
        <View style={styles.track} />
        {/* Dots representing stops */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.dotSpacer} />
          <Animated.View style={[styles.dotCenter, { transform: [{ scale: pulseAnim }], backgroundColor: colors.primary }]} />
          <View style={styles.dotSpacer} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
        </View>
        {/* Moving transport icon */}
        <Animated.Text style={[styles.movingIcon, { transform: [{ translateX }] }]}>
          {TRANSPORT_ICONS[messageIndex % TRANSPORT_ICONS.length]}
        </Animated.Text>
      </View>

      {/* Status message with fade animation */}
      <Animated.Text style={[styles.statusText, { opacity: fadeAnim }]}>
        {statusMessages[messageIndex]}
      </Animated.Text>

      {/* Subtle hint */}
      <Text style={styles.hintText}>
        {t('route.calculatingHint', { defaultValue: 'Analyse des lignes et correspondances' })}
      </Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    trackContainer: {
      width: 200,
      height: 40,
      marginBottom: 24,
      justifyContent: 'center',
    },
    track: {
      position: 'absolute',
      left: 20,
      right: 20,
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      top: 18,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    dotCenter: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    dotSpacer: {
      width: 60,
    },
    movingIcon: {
      position: 'absolute',
      top: -4,
      left: 0,
      fontSize: 28,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    hintText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
