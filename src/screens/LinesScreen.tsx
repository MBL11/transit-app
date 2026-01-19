/**
 * Lines Screen
 * Displays all available transit lines with filters
 */

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { LineCard } from '../components/transit/LineCard';
import { SearchBar } from '../components/transit/SearchBar';
import { useRoutes } from '../hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import type { Route } from '../core/types/models';
import type { LinesStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<LinesStackParamList, 'LinesList'>;

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

export function LinesScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const { routes, loading, error } = useRoutes();
  const [selectedType, setSelectedType] = useState<TransitType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const styles = useMemo(() => createStyles(colors), [colors]);

  const typeLabels: Record<TransitType, string> = {
    all: t('transit.allTypes'),
    metro: t('transit.metro'),
    bus: t('transit.bus'),
    tram: t('transit.tram'),
    rer: t('transit.rer'),
  };

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
    navigation.navigate('LineDetails', { routeId: route.id });
  };

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
            lineColor={item.color || '#FF6600'}
            type={getTransitType(item.type)}
            onPress={() => handleLinePress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyFilterContainer}>
            <Text style={styles.emptyFilterText}>
              {t('transit.noLinesOfType')} "{typeLabels[selectedType]}"
            </Text>
          </View>
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
    filtersContainer: {
      flexDirection: 'row',
      padding: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
  });
