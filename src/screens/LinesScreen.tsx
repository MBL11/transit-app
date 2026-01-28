/**
 * Lines Screen
 * Displays all available transit lines with filters
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { LineCard } from '../components/transit/LineCard';
import { SearchBar } from '../components/transit/SearchBar';
import { useRoutes, usePagination } from '../hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import { detectTransitType } from '../utils/transport-detection';
import type { TransitType } from '../utils/transport-detection';
import type { Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<LinesStackParamList, 'LinesList'>;

type FilterType = 'all' | TransitType;

export function LinesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { routes, loading, error, refresh } = useRoutes();
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh routes when screen comes into focus (reloads after data import)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Debug: Log all routes once when loaded
  useEffect(() => {
    if (routes.length > 0) {
      console.log(`[LinesScreen] ===== LOADED ${routes.length} ROUTES =====`);

      // Group routes by detected type
      const byType: Record<FilterType, typeof routes> = {
        all: [],
        metro: [],
        bus: [],
        tram: [],
        izban: [],
        ferry: [],
      };

      routes.forEach(route => {
        const type = detectTransitType(route.type, route.shortName, route.longName);
        byType[type].push(route);
      });

      console.log(`[LinesScreen] Metro (${byType.metro.length}):`, byType.metro.map(r => `${r.shortName}|${r.longName}|type=${r.type}`).slice(0, 5));
      console.log(`[LinesScreen] İZBAN (${byType.izban.length}):`, byType.izban.map(r => `${r.shortName}|${r.longName}|type=${r.type}`).slice(0, 5));
      console.log(`[LinesScreen] Tram (${byType.tram.length}):`, byType.tram.map(r => `${r.shortName}|${r.longName}|type=${r.type}`).slice(0, 5));
      console.log(`[LinesScreen] Ferry (${byType.ferry.length}):`, byType.ferry.map(r => `${r.shortName}|${r.longName}|type=${r.type}`).slice(0, 5));
      console.log(`[LinesScreen] Bus (${byType.bus.length}):`, byType.bus.slice(0, 3).map(r => `${r.shortName}|${r.longName}|type=${r.type}`));

      // Show ALL unique route_types in database
      const typeMap = new Map<number, string[]>();
      routes.forEach(r => {
        if (!typeMap.has(r.type)) typeMap.set(r.type, []);
        typeMap.get(r.type)!.push(r.shortName || r.id);
      });
      console.log(`[LinesScreen] ALL route_types in DB:`);
      typeMap.forEach((names, type) => {
        console.log(`  type=${type}: ${names.slice(0, 10).join(', ')} (${names.length} routes)`);
      });
    }
  }, [routes]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const typeLabels: Record<FilterType, string> = {
    all: `🚏 ${t('transit.allTypes')}`,
    metro: `🚇 ${t('transit.metro')}`,
    tram: `🚊 ${t('transit.tram')}`,
    izban: `🚆 ${t('transit.izban', { defaultValue: 'İZBAN' })}`,
    ferry: `⛴️ ${t('transit.ferry', { defaultValue: 'Vapur' })}`,
    bus: `🚌 ${t('transit.bus')}`,
  };

  // Filter routes by type AND search query
  const filteredRoutes = useMemo(() => {
    let filtered = routes;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(route => {
        const type = detectTransitType(route.type, route.shortName, route.longName);
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
    // Get İzmir transport type
    const transitType = detectTransitType(item.type, item.shortName, item.longName);

    return (
      <LineCard
        lineNumber={item.shortName || item.id}
        lineName={item.longName}
        lineColor={item.color || '#0066CC'}
        type={transitType as any}
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
        {(Object.keys(typeLabels) as FilterType[]).map((type) => (
          <TouchableOpacity
            key={type}
            activeOpacity={0.7}
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
          </TouchableOpacity>
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
      backgroundColor: colors.isDark ? '#1A1A1A' : '#FFFFFF',
      borderBottomWidth: 2,
      borderBottomColor: colors.isDark ? '#444444' : '#E0E0E0',
      maxHeight: 64,
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
      alignItems: 'center',
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: colors.isDark ? '#3A3A3A' : '#F0F0F0',
      borderWidth: 2,
      borderColor: colors.isDark ? '#666666' : '#CCCCCC',
    },
    filterButtonActive: {
      backgroundColor: '#0066CC',
      borderColor: '#0066CC',
    },
    filterText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.isDark ? '#FFFFFF' : '#222222',
    },
    filterTextActive: {
      color: '#FFFFFF',
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
