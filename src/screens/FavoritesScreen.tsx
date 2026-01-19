/**
 * Favorites Screen
 * Displays user's saved favorites (stops, routes, journeys)
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useFavorites } from '../hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import { StopCard } from '../components/transit/StopCard';
import { LineCard } from '../components/transit/LineCard';
import type { FavoriteStop, FavoriteRoute, FavoriteJourney } from '../core/types/favorites';

type Props = NativeStackScreenProps<any, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { favorites, stops, routes, journeys, loading, refresh, toggleStop, toggleRoute, remove, isFavorite } =
    useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleStopPress = (stop: FavoriteStop) => {
    // Navigate to MapView and show the stop
    // For now, just log it
    console.log('[FavoritesScreen] Stop pressed:', stop.data.name);
    // TODO: Navigate to MapView with stop selected
  };

  const handleRoutePress = (route: FavoriteRoute) => {
    console.log('[FavoritesScreen] Route pressed:', route.data.shortName);
    // TODO: Navigate to Lines tab with route selected
  };

  const handleJourneyPress = (journey: FavoriteJourney) => {
    console.log('[FavoritesScreen] Journey pressed:', journey.data);
    // TODO: Navigate to Route screen with pre-filled stops
  };

  const getRouteType = (routeType: number): 'metro' | 'bus' | 'tram' | 'rer' | 'train' => {
    switch (routeType) {
      case 1:
        return 'metro';
      case 3:
        return 'bus';
      case 0:
        return 'tram';
      case 2:
        return 'train';
      default:
        return 'bus';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('favorites.loadingFavorites')}</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={styles.emptyIcon}>⭐</Text>
        <Text style={styles.emptyTitle}>{t('favorites.noFavorites')}</Text>
        <Text style={styles.emptyText}>
          {t('favorites.addHint')}
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
      }
    >
      {/* Favorite Stops */}
      {stops.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 {t('favorites.stopsSection')} ({stops.length})</Text>
          {stops.map((favorite) => {
            const fav = favorite as FavoriteStop;
            return (
              <View key={fav.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => handleStopPress(fav)}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{fav.data.name}</Text>
                    <Text style={styles.cardSubtitle}>{t('favorites.stopSubtitle')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => toggleStop(fav.data)}
                >
                  <Text style={styles.removeButtonText}>⭐</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Favorite Routes */}
      {routes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚇 {t('favorites.linesSection')} ({routes.length})</Text>
          {routes.map((favorite) => {
            const fav = favorite as FavoriteRoute;
            return (
              <LineCard
                key={fav.id}
                lineNumber={fav.data.shortName}
                lineName={fav.data.longName}
                lineColor={`#${fav.data.color}`}
                type={getRouteType(fav.data.type)}
                isFavorite={isFavorite(fav.id, 'route')}
                onFavoritePress={() => toggleRoute(fav.data)}
                onPress={() => handleRoutePress(fav)}
              />
            );
          })}
        </View>
      )}

      {/* Favorite Journeys */}
      {journeys.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ {t('favorites.journeysSection')} ({journeys.length})</Text>
          {journeys.map((favorite) => {
            const fav = favorite as FavoriteJourney;
            return (
              <View key={fav.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => handleJourneyPress(fav)}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>
                      {fav.data.fromStopName} → {fav.data.toStopName}
                    </Text>
                    <Text style={styles.cardSubtitle}>{t('favorites.journeySubtitle')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => remove(fav.id, 'journey')}
                >
                  <Text style={styles.removeButtonText}>⭐</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    content: {
      padding: 16,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardContent: {
      flex: 1,
      padding: 16,
    },
    cardInfo: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    removeButton: {
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    removeButtonText: {
      fontSize: 24,
    },
  });
