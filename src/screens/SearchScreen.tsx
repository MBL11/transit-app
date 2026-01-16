/**
 * Search Screen
 * Search for stops and lines with real-time filtering
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SearchBar } from '../components/transit/SearchBar';
import { StopCard } from '../components/transit/StopCard';
import { useDebounce } from '../hooks/useDebounce';
import { searchStops, getRoutesByStopId } from '../core/database';
import type { Stop, Route } from '../core/types/models';
import type { SearchStackParamList } from '../navigation/SearchStackNavigator';

type Props = NativeStackScreenProps<SearchStackParamList, 'Search'>;

interface StopWithRoutes extends Stop {
  routes: Route[];
}

export function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StopWithRoutes[]>([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // Search stops
        const stops = await searchStops(debouncedQuery);

        // Fetch routes for each stop
        const stopsWithRoutes = await Promise.all(
          stops.map(async (stop) => {
            const routes = await getRoutesByStopId(stop.id);
            return { ...stop, routes };
          })
        );

        setResults(stopsWithRoutes);
      } catch (error) {
        console.error('[SearchScreen] Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  const handleStopPress = (stop: Stop) => {
    navigation.navigate('StopDetails', { stopId: stop.id });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Rechercher un arrêt..."
          value={query}
          onChangeText={setQuery}
          onClear={handleClear}
          autoFocus
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Recherche...</Text>
        </View>
      ) : query.trim() && results.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun résultat</Text>
          <Text style={styles.emptyText}>
            Essayez de modifier votre recherche
          </Text>
        </View>
      ) : !query.trim() ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🚏</Text>
          <Text style={styles.emptyTitle}>Rechercher un arrêt</Text>
          <Text style={styles.emptyText}>
            Entrez le nom d'un arrêt pour commencer
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
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
              {results.length} {results.length === 1 ? 'résultat' : 'résultats'}
            </Text>
          }
        />
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
