/**
 * Lines Screen
 * Displays all available transit lines with filters
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { LineCard } from '../components/transit/LineCard';
import { SearchBar } from '../components/transit/SearchBar';
import { useRoutes, usePagination } from '../hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import type { Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<LinesStackParamList, 'LinesList'>;

type TransitType = 'all' | 'metro' | 'bus' | 'tram' | 'izban' | 'ferry';

// Map GTFS route types and names to our types (İzmir)
// Uses both route_type and route name patterns for better detection
const getTransitType = (gtfsType: number, shortName?: string, longName?: string): TransitType => {
  const name = ((shortName || '') + ' ' + (longName || '')).toUpperCase();

  // Detect by name patterns first (more reliable for İzmir)
  if (name.includes('METRO') || /^M\d/.test(shortName?.toUpperCase() || '')) {
    return 'metro';
  }
  if (name.includes('İZBAN') || name.includes('IZBAN')) {
    return 'izban';
  }
  if (name.includes('TRAM') || name.includes('TRAMVAY') || /^T\d/.test(shortName?.toUpperCase() || '')) {
    return 'tram';
  }
  if (name.includes('VAPUR') || name.includes('FERİ') || name.includes('FERRY') || name.includes('İZDENİZ')) {
    return 'ferry';
  }

  // Fallback to GTFS route_type
  switch (gtfsType) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 2: return 'izban'; // İZBAN commuter rail
    case 3: return 'bus';
    case 4: return 'ferry'; // İzdeniz ferry
    default: return 'bus';
  }
};

export function LinesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { routes, loading, error, refresh } = useRoutes();
  const [selectedType, setSelectedType] = useState<TransitType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh routes when screen comes into focus (reloads after data import)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  const typeLabels: Record<TransitType, string> = {
    all: t('transit.allTypes'),
    metro: t('transit.metro'),
    tram: t('transit.tram'),
    izban: t('transit.izban', { defaultValue: 'İZBAN' }),
    ferry: t('transit.ferry', { defaultValue: 'Vapur' }),
    bus: t('transit.bus'),
  };

  // Filter routes by type AND search query
  const filteredRoutes = useMemo(() => {
    let filtered = routes;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(route => {
        const type = getTransitType(route.type, route.shortName, route.longName);
        return type === selectedType;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(route => {
        const matchesNumber = (route.shortName || '').toLowerCase().includes(query);
        const matchesName = (route.longName || '').toLowerCase().includes(query);
        return matchesNumber || matchesName;
      });
    }

    return filtered;
  }, [routes, selectedType, searchQuery]);

  // Pagination for large lists
  const { paginatedData, hasMore, loadMore, reset } = usePagination(filteredRoutes, {
    pageSize: 30,
  });

  // Reset pagination when filters change
  useEffect(() => {
    reset();
  }, [selectedType, searchQuery, reset]);

  const handleLinePress = useCallback((route: Route) => {
    navigation.navigate('LineDetails', { routeId: route.id });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Route }) => {
    // Map İzmir types to LineBadge types
    const transitType = getTransitType(item.type, item.shortName, item.longName);
    // Map İzmir-specific types to LineBadge types (rer = İZBAN, train = ferry)
    const badgeType = transitType === 'izban' ? 'rer' : transitType === 'ferry' ? 'train' : transitType;

    return (
      <LineCard
        lineNumber={item.shortName || item.id}
        lineName={item.longName}
        lineColor={item.color || '#0066CC'}
        type={badgeType as any}
        onPress={() => handleLinePress(item)}
      />
    );
  }, [handleLinePress]);

  const keyExtractor = useCallback((item: Route) => item.id, []);

  const onEndReached = useCallback(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading, loadMore]);

  // Loading state
  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.lines')} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('transit.loadingLines')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.lines')} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{t('transit.loadingError')}</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Empty state
  if (routes.length === 0) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.lines')} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🚇</Text>
          <Text style={styles.emptyText}>{t('transit.noLinesAvailable')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.lines')} />
      <View style={styles.container}>
        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            {filteredRoutes.length} {t(filteredRoutes.length > 1 ? 'transit.line_plural' : 'transit.line')}
          </Text>
        </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder={t('transit.searchLine')}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Filters - Scrollable */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {(Object.keys(typeLabels) as TransitType[]).map((type) => (
          <Pressable
            key={type}
            onPress={() => setSelectedType(type)}
            style={[
              styles.filterButton,
              selectedType === type && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedType === type && styles.filterTextActive,
              ]}
            >
              {typeLabels[type]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Lines List */}
      <FlatList
        data={paginatedData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyFilterContainer}>
            <Text style={styles.emptyFilterText}>
              {t('transit.noLinesOfType')} "{typeLabels[selectedType]}"
            </Text>
          </View>
        }
        // Performance optimizations
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        windowSize={5}
        removeClippedSubviews={true}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
      </View>
    </ScreenContainer>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundSecondary,
      padding: 20,
    },
    subtitleContainer: {
      padding: 12,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    searchContainer: {
      padding: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filtersScroll: {
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.buttonBackground,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: 'white',
    },
    listContent: {
      padding: 12,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.error,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyFilterContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyFilterText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });
