/**
 * Lines Screen
 * Displays all available transit lines with filters
 */

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { LineCard } from '../components/transit/LineCard';
import { SearchBar } from '../components/transit/SearchBar';
import { useRoutes } from '../hooks';
import type { Route } from '../core/types/models';

type TransitType = 'all' | 'metro' | 'bus' | 'tram' | 'rer';

// Map GTFS route types to our types
const getTransitType = (gtfsType: number): 'metro' | 'bus' | 'tram' | 'rer' | 'train' => {
  switch (gtfsType) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 2: return 'rer';
    case 3: return 'bus';
    default: return 'train';
  }
};

const typeLabels: Record<TransitType, string> = {
  all: 'Tous',
  metro: 'Métro',
  bus: 'Bus',
  tram: 'Tram',
  rer: 'RER',
};

export function LinesScreen() {
  const { routes, loading, error } = useRoutes();
  const [selectedType, setSelectedType] = useState<TransitType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter routes by type AND search query
  const filteredRoutes = useMemo(() => {
    let filtered = routes;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(route => {
        const type = getTransitType(route.type);
        return type === selectedType;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(route => {
        const matchesNumber = route.shortName.toLowerCase().includes(query);
        const matchesName = route.longName.toLowerCase().includes(query);
        return matchesNumber || matchesName;
      });
    }

    return filtered;
  }, [routes, selectedType, searchQuery]);

  const handleLinePress = (route: Route) => {
    // TODO: Navigate to line details screen
    console.log('Line pressed:', route.shortName, route.longName);
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des lignes...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
      </View>
    );
  }

  // Empty state
  if (routes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🚇</Text>
        <Text style={styles.emptyText}>Aucune ligne disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Lignes de transport</Text>
        <Text style={styles.subtitle}>
          {filteredRoutes.length} ligne{filteredRoutes.length > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Rechercher une ligne..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Type Filters */}
      <View style={styles.filtersContainer}>
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
      </View>

      {/* Lines List */}
      <FlatList
        data={filteredRoutes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LineCard
            lineNumber={item.shortName}
            lineName={item.longName}
            lineColor={item.color ? `#${item.color}` : '#FF6600'}
            type={getTransitType(item.type)}
            onPress={() => handleLinePress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyFilterContainer}>
            <Text style={styles.emptyFilterText}>
              Aucune ligne de type "{typeLabels[selectedType]}"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#0066CC',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CC0000',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptyFilterContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontSize: 16,
    color: '#666',
  },
});
