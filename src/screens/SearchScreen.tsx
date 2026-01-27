/**
 * Search Screen
 * Search for stops and lines with real-time filtering and tabs
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { SearchBar } from '../components/transit/SearchBar';
import { StopCard } from '../components/transit/StopCard';
import { LineCard } from '../components/transit/LineCard';
import { useDebounce } from '../hooks/useDebounce';
import { usePagination } from '../hooks/usePagination';
import { useThemeColors } from '../hooks/useThemeColors';
import { searchStops, searchRoutes, getRoutesByStopIds } from '../core/database';
import type { Stop, Route } from '../core/types/models';
import type { SearchStackParamList } from '../navigation/SearchStackNavigator';

type Props = NativeStackScreenProps<SearchStackParamList, 'Search'>;

type TabType = 'stops' | 'lines';

interface StopWithRoutes extends Stop {
  routes: Route[];
}

// Helper to get route type from GTFS route type
function getRouteType(type: number): 'metro' | 'bus' | 'tram' | 'rer' | 'train' {
  switch (type) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 2: return 'train';
    case 3: return 'bus';
    case 4: return 'train';
    default: return 'bus';
  }
}

export function SearchScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('stops');
  const [stopResults, setStopResults] = useState<StopWithRoutes[]>([]);
  const [lineResults, setLineResults] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Pagination for stops
  const stopPagination = usePagination(stopResults, { pageSize: 20 });
  // Pagination for lines
  const linePagination = usePagination(lineResults, { pageSize: 20 });

  // Search when debounced query changes or tab changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setStopResults([]);
        setLineResults([]);
        return;
      }

      setLoading(true);
      try {
        if (activeTab === 'stops') {
          // Search stops (no limit, we'll paginate)
          const stops = await searchStops(debouncedQuery);

          // Fetch routes for all stops in a single batch query (avoids N+1 problem)
          const stopIds = stops.map(stop => stop.id);
          const routesMap = await getRoutesByStopIds(stopIds);

          // Combine stops with their routes
          const stopsWithRoutes = stops.map(stop => ({
            ...stop,
            routes: routesMap.get(stop.id) || [],
          }));

          setStopResults(stopsWithRoutes);
        } else {
          // Search lines (no limit, we'll paginate)
          const routes = await searchRoutes(debouncedQuery);
          setLineResults(routes);
        }
      } catch (error) {
        console.error('[SearchScreen] Search error:', error);
        setStopResults([]);
        setLineResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, activeTab]);

  // Reset pagination when tab or query changes
  useEffect(() => {
    stopPagination.reset();
    linePagination.reset();
  }, [activeTab, debouncedQuery]);

  const handleStopPress = useCallback((stop: Stop) => {
    navigation.navigate('StopDetails', { stopId: stop.id });
  }, [navigation]);

  const handleLinePress = useCallback((route: Route) => {
    // Navigate to LineDetailsScreen (assuming it's in the navigation)
    // @ts-ignore - Navigation might not have this route in SearchStack
    navigation.navigate('LineDetails', { routeId: route.id });
  }, [navigation]);

  const handleClear = useCallback(() => {
    setQuery('');
    setStopResults([]);
    setLineResults([]);
  }, []);

  const renderStopItem = useCallback(({ item }: { item: StopWithRoutes }) => (
    <StopCard
      stopName={item.name}
      lines={item.routes.map((r) => r.shortName)}
      onPress={() => handleStopPress(item)}
    />
  ), [handleStopPress]);

  const renderLineItem = useCallback(({ item }: { item: Route }) => (
    <LineCard
      lineNumber={item.shortName}
      lineName={item.longName}
      lineColor={item.color}
      type={getRouteType(item.type)}
      onPress={() => handleLinePress(item)}
    />
  ), [handleLinePress]);

  const keyExtractor = useCallback((item: Stop | Route) => item.id, []);

  const onEndReachedStops = useCallback(() => {
    if (stopPagination.hasMore && !loading) {
      stopPagination.loadMore();
    }
  }, [stopPagination, loading]);

  const onEndReachedLines = useCallback(() => {
    if (linePagination.hasMore && !loading) {
      linePagination.loadMore();
    }
  }, [linePagination, loading]);

  const currentResults = activeTab === 'stops' ? stopResults : lineResults;
  const hasResults = currentResults.length > 0;

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.search')} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder={activeTab === 'stops' ? t('transit.searchStop') : t('transit.searchLine')}
          value={query}
          onChangeText={setQuery}
          onClear={handleClear}
          autoFocus
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'stops' && styles.tabActive]}
          onPress={() => setActiveTab('stops')}
        >
          <Text style={[styles.tabText, activeTab === 'stops' && styles.tabTextActive]}>
            {t('search.stopsTab')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'lines' && styles.tabActive]}
          onPress={() => setActiveTab('lines')}
        >
          <Text style={[styles.tabText, activeTab === 'lines' && styles.tabTextActive]}>
            {t('search.linesTab')}
          </Text>
        </Pressable>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>{t('search.searching')}</Text>
        </View>
      ) : query.trim() && !hasResults ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>{t('common.noResults')}</Text>
          <Text style={styles.emptyText}>
            {t('search.noResultsTryAgain')}
          </Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>{activeTab === 'stops' ? '🚏' : '🚇'}</Text>
          <Text style={styles.emptyTitle}>{t('search.typeToSearch')}</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'stops'
              ? t('search.searchStopByName')
              : t('search.searchLineByName')}
          </Text>
        </View>
      ) : (
        <>
          {activeTab === 'stops' ? (
            <FlatList
              data={stopPagination.paginatedData}
              keyExtractor={keyExtractor}
              renderItem={renderStopItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {stopResults.length} {t(stopResults.length === 1 ? 'common.result' : 'common.result_plural')}
                </Text>
              }
              // Performance optimizations
              onEndReached={onEndReachedStops}
              onEndReachedThreshold={0.5}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
              windowSize={5}
              removeClippedSubviews={true}
              ListFooterComponent={
                stopPagination.hasMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          ) : (
            <FlatList
              data={linePagination.paginatedData}
              keyExtractor={keyExtractor}
              renderItem={renderLineItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {lineResults.length} {t(lineResults.length === 1 ? 'common.result' : 'common.result_plural')}
                </Text>
              }
              // Performance optimizations
              onEndReached={onEndReachedLines}
              onEndReachedThreshold={0.5}
              maxToRenderPerBatch={10}
              initialNumToRender={15}
              windowSize={5}
              removeClippedSubviews={true}
              ListFooterComponent={
                linePagination.hasMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    searchContainer: {
      padding: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
    },
    resultCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
      fontWeight: '500',
    },
    footerLoader: {
      paddingVertical: 20,
      alignItems: 'center',
    },
  });
