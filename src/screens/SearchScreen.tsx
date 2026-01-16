/**
 * Search Screen
 * Search for stops and lines with real-time filtering and tabs
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchBar } from '../components/transit/SearchBar';
import { StopCard } from '../components/transit/StopCard';
import { LineCard } from '../components/transit/LineCard';
import { useDebounce } from '../hooks/useDebounce';
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
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('stops');
  const [stopResults, setStopResults] = useState<StopWithRoutes[]>([]);
  const [lineResults, setLineResults] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

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
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder={activeTab === 'stops' ? 'Rechercher un arrêt...' : 'Rechercher une ligne...'}
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
            Arrêts
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'lines' && styles.tabActive]}
          onPress={() => setActiveTab('lines')}
        >
          <Text style={[styles.tabText, activeTab === 'lines' && styles.tabTextActive]}>
            Lignes
          </Text>
        </Pressable>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Recherche...</Text>
        </View>
      ) : query.trim() && !hasResults ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essayez de modifier votre recherche
          </Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>{activeTab === 'stops' ? '🚏' : '🚇'}</Text>
          <Text style={styles.emptyTitle}>Tapez pour rechercher</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'stops'
              ? 'Recherchez un arrêt par son nom'
              : 'Recherchez une ligne par son nom ou numéro'}
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
                  {stopResults.length} {stopResults.length === 1 ? 'résultat' : 'résultats'}
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
                  {lineResults.length} {lineResults.length === 1 ? 'résultat' : 'résultats'}
                </Text>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#0066CC',
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
    color: '#666',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
});
