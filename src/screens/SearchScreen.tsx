/**
 * Search Screen
 * Search for stops and lines with real-time filtering and tabs
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { SearchBar } from '../components/transit/SearchBar';
import { StopCard } from '../components/transit/StopCard';
import { LineCard } from '../components/transit/LineCard';
import { useDebounce } from '../hooks/useDebounce';
import { useThemeColors } from '../hooks/useThemeColors';
import { searchStops, searchRoutes, getRoutesByStopId } from '../core/database';
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
          // Search stops
          const stops = await searchStops(debouncedQuery);

          // Fetch routes for each stop (limit to 20)
          const stopsWithRoutes = await Promise.all(
            stops.slice(0, 20).map(async (stop) => {
              const routes = await getRoutesByStopId(stop.id);
              return { ...stop, routes };
            })
          );

          setStopResults(stopsWithRoutes);
        } else {
          // Search lines
          const routes = await searchRoutes(debouncedQuery);
          setLineResults(routes.slice(0, 20));
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

  const handleStopPress = (stop: Stop) => {
    navigation.navigate('StopDetails', { stopId: stop.id });
  };

  const handleLinePress = (route: Route) => {
    // Navigate to LineDetailsScreen (assuming it's in the navigation)
    // @ts-ignore - Navigation might not have this route in SearchStack
    navigation.navigate('LineDetails', { routeId: route.id });
  };

  const handleClear = () => {
    setQuery('');
    setStopResults([]);
    setLineResults([]);
  };

  const currentResults = activeTab === 'stops' ? stopResults : lineResults;
  const hasResults = currentResults.length > 0;

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.search')} />
      <View style={styles.container}>
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
              data={stopResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <StopCard
                  stopName={item.name}
                  lines={item.routes.map((r) => r.shortName)}
                  onPress={() => handleStopPress(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {stopResults.length} {t(stopResults.length === 1 ? 'common.result' : 'common.result_plural')}
                </Text>
              }
            />
          ) : (
            <FlatList
              data={lineResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <LineCard
                  lineNumber={item.shortName}
                  lineName={item.longName}
                  lineColor={item.color}
                  type={getRouteType(item.type)}
                  onPress={() => handleLinePress(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <Text style={styles.resultCount}>
                  {lineResults.length} {t(lineResults.length === 1 ? 'common.result' : 'common.result_plural')}
                </Text>
              }
            />
          )}
        </>
      )}
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
  });
