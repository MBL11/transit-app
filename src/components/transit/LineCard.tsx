import React, { useMemo } from 'react';
import { View, Text, Pressable, PressableProps, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { LineBadge, TransportType } from './LineBadge';

export interface LineCardProps extends Omit<PressableProps, 'children'> {
  lineNumber: string;
  lineName: string;
  lineColor: string;
  direction?: string;
  type?: TransportType;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
}

const typeColors: Record<TransportType, string> = {
  metro: '#D61C1F',    // İzmir Metro - Red
  bus: '#0066CC',      // ESHOT Bus - Blue
  tram: '#00A651',     // İzmir Tram - Green
  rer: '#005BBB',      // İZBAN - Dark Blue
  train: '#005BBB',    // Train/İZBAN
  izban: '#005BBB',    // İZBAN - Dark Blue
  ferry: '#0099CC',    // İzdeniz Ferry - Turquoise
};

export function LineCard({
  lineNumber,
  lineName,
  lineColor,
  direction,
  type = 'bus',
  isFavorite = false,
  onFavoritePress,
  ...props
}: LineCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Ensure color has # prefix
  const formattedColor = lineColor.startsWith('#') ? lineColor : `#${lineColor}`;

  const typeLabels: Record<TransportType, string> = {
    metro: t('transit.metro'),
    bus: t('transit.bus'),
    tram: t('transit.tram'),
    rer: t('transit.rer'),
    train: t('transit.train'),
    izban: t('transit.izban', { defaultValue: 'İZBAN' }),
    ferry: t('transit.ferry', { defaultValue: 'Vapur' }),
  };

  return (
    <Pressable {...props} style={styles.pressable}>
      <View style={[styles.card, { borderLeftColor: formattedColor }]}>
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {/* Official Line Badge */}
            <LineBadge
              lineNumber={lineNumber}
              type={type}
              color={formattedColor}
              size="large"
            />

            {/* Line Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.lineName}>{lineName}</Text>
              {direction && (
                <Text style={styles.direction}>→ {direction}</Text>
              )}
            </View>
          </View>

          <View style={styles.rightSection}>
            {/* Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: typeColors[type] }]}>
              <Text style={styles.typeBadgeText}>{typeLabels[type]}</Text>
            </View>

            {/* Favorite Button */}
            {onFavoritePress && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onFavoritePress();
                }}
                style={styles.favoriteButton}
              >
                <Text style={styles.favoriteButtonText}>
                  {isFavorite ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    pressable: {
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    badge: {
      width: 48,
      height: 48,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 18,
    },
    infoContainer: {
      flex: 1,
      marginLeft: 12,
    },
    lineName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    direction: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typeBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    typeBadgeText: {
      color: 'white',
      fontSize: 12,
      fontWeight: '600',
    },
    favoriteButton: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    favoriteButtonText: {
      fontSize: 22,
    },
  });
