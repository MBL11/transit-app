/**
 * Favorites Screen
 * Displays user's saved favorites (stops, routes, journeys)
 * Uses FlatList for performant scrolling
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useFavorites } from '../hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import { LineCard } from '../components/transit/LineCard';
import type { FavoriteStop, FavoriteRoute, FavoriteJourney } from '../core/types/favorites';
import type { FavoritesStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<FavoritesStackParamList, 'FavoritesList'>;

// Discriminated union for FlatList items
type SectionHeader = { type: 'header'; key: string; icon: string; title: string; count: number };
type StopItem = { type: 'stop'; key: string; data: FavoriteStop };
type RouteItem = { type: 'route'; key: string; data: FavoriteRoute };
type JourneyItem = { type: 'journey'; key: string; data: FavoriteJourney };
type ListItem = SectionHeader | StopItem | RouteItem | JourneyItem;

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

  const handleStopPress = useCallback((stop: FavoriteStop) => {
    navigation.navigate('StopDetails', { stopId: stop.data.id });
  }, [navigation]);

  const handleRoutePress = useCallback((route: FavoriteRoute) => {
    navigation.navigate('LineDetails', { routeId: route.data.id });
  }, [navigation]);

  const handleJourneyPress = useCallback((_journey: FavoriteJourney) => {
    // TODO: Navigate to Route screen with pre-filled stops when RouteScreen supports params
  }, []);

  const getRouteType = (routeType: number): 'metro' | 'bus' | 'tram' | 'rer' | 'train' => {
    switch (routeType) {
      case 1: return 'metro';
      case 3: return 'bus';
      case 0: return 'tram';
      case 2: return 'train';
      default: return 'bus';
    }
  };

  // Build flat data array with section headers
  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (stops.length > 0) {
      items.push({ type: 'header', key: 'header-stops', icon: '📍', title: t('favorites.stopsSection'), count: stops.length });
      stops.forEach(fav => {
        items.push({ type: 'stop', key: `stop-${fav.id}`, data: fav as FavoriteStop });
      });
    }

    if (routes.length > 0) {
      items.push({ type: 'header', key: 'header-routes', icon: '🚇', title: t('favorites.linesSection'), count: routes.length });
      routes.forEach(fav => {
        items.push({ type: 'route', key: `route-${fav.id}`, data: fav as FavoriteRoute });
      });
    }

    if (journeys.length > 0) {
      items.push({ type: 'header', key: 'header-journeys', icon: '🗺️', title: t('favorites.journeysSection'), count: journeys.length });
      journeys.forEach(fav => {
        items.push({ type: 'journey', key: `journey-${fav.id}`, data: fav as FavoriteJourney });
      });
    }

    return items;
  }, [stops, routes, journeys, t]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{item.icon} {item.title} ({item.count})</Text>
          </View>
        );

      case 'stop':
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={() => handleStopPress(item.data)}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.data.data.name}</Text>
                <Text style={styles.cardSubtitle}>{t('favorites.stopSubtitle')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => toggleStop(item.data.data)}
            >
              <Text style={styles.removeButtonText}>⭐</Text>
            </TouchableOpacity>
          </View>
        );

      case 'route':
        return (
          <LineCard
            lineNumber={item.data.data.shortName}
            lineName={item.data.data.longName}
            lineColor={`#${item.data.data.color}`}
            type={getRouteType(item.data.data.type)}
            isFavorite={isFavorite(item.data.id, 'route')}
            onFavoritePress={() => toggleRoute(item.data.data)}
            onPress={() => handleRoutePress(item.data)}
          />
        );

      case 'journey':
        return (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardContent}
              onPress={() => handleJourneyPress(item.data)}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                  {item.data.data.fromStopName} → {item.data.data.toStopName}
                </Text>
                <Text style={styles.cardSubtitle}>{t('favorites.journeySubtitle')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => remove(item.data.id, 'journey')}
            >
              <Text style={styles.removeButtonText}>⭐</Text>
            </TouchableOpacity>
          </View>
        );
    }
  }, [styles, t, handleStopPress, handleRoutePress, handleJourneyPress, toggleStop, toggleRoute, remove, isFavorite]);

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.favorites')} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('favorites.loadingFavorites')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.favorites')} />
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.container}
        contentContainerStyle={listData.length === 0 ? styles.emptyContainer : styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>{t('favorites.noFavorites')}</Text>
            <Text style={styles.emptyText}>{t('favorites.addHint')}</Text>
          </View>
        }
      />
    </ScreenContainer>
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
    },
    emptyContent: {
      flex: 1,
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
    sectionHeader: {
      marginBottom: 12,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
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
