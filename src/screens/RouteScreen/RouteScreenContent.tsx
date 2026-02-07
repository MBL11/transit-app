/**
 * RouteScreenContent - UI Component
 * Separated from main RouteScreen for better organization
 * Uses state and dispatch from reducer
 */

import React, { Dispatch } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '../../hooks/useThemeColors';
import { RouteOptionCard } from '../../components/routing/RouteOptionCard';
import { RouteFiltersModal } from '../../components/routing/RouteFiltersModal';
import { RouteSearchAnimation } from '../../components/routing/RouteSearchAnimation';
import type { Stop } from '../../core/types/models';
import type { JourneyResult } from '../../core/types/routing';
import { AddressSearchModal } from '../../components/routing/AddressSearchModal';
import type { RoutingPreferences } from '../../types/routing-preferences';
import type { RouteScreenState, RouteScreenAction } from './routeReducer';

interface RouteScreenContentProps {
  state: RouteScreenState;
  dispatch: Dispatch<RouteScreenAction>;
  onCalculateRoute: () => Promise<void>;
  onJourneyPress: (journey: JourneyResult) => void;
  onSavePreferences: (prefs: RoutingPreferences) => Promise<void>;
  formatTime: (date: Date) => string;
  isDataRefreshing?: boolean;
  recentStops?: Stop[];
  onStopSelect?: (stop: Stop) => void;
}

export function RouteScreenContent({
  state,
  dispatch,
  onCalculateRoute,
  onJourneyPress,
  onSavePreferences,
  formatTime,
  isDataRefreshing = false,
  recentStops = [],
  onStopSelect,
}: RouteScreenContentProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Extract base station name (removes suffixes like İskelesi, İskeli, Metro, etc.)
  const getBaseName = (name: string): string => {
    const MODE_SUFFIXES = [
      'iskele', 'iskelesi', 'iskeli',
      'metro', 'istasyon', 'istasyonu',
      'gar', 'gari', 'durak', 'duragi', 'tren', 'izban',
      'tramvay', 'otobus', 'vapur', 'feribot'
    ];
    const normalized = name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
    const words = normalized.trim().split(/\s+/);
    while (words.length > 1 && MODE_SUFFIXES.includes(words[words.length - 1])) {
      words.pop();
    }
    return words.join(' ');
  };

  // Get stop priority (lower = better). Prioritize rail/metro/ferry over bus.
  const getStopPriority = (stopId: string): number => {
    if (stopId.startsWith('rail_')) return 0;   // İZBAN
    if (stopId.startsWith('ferry_')) return 1;  // Ferry
    if (stopId.startsWith('metro_')) return 2;  // Metro
    if (stopId.startsWith('tram_')) return 3;   // Tram
    return 4;                                    // Bus
  };

  // Helper functions
  const filterStops = (query: string): Stop[] => {
    const lowerQuery = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // If no query, show recent stops first
    if (!lowerQuery && recentStops.length > 0) {
      // Start with recent stops
      const recentBaseNames = new Set(recentStops.map(s => getBaseName(s.name)));

      // Get remaining stops (not in recent), deduplicated by base name
      // Keep the stop with highest priority (rail > ferry > metro > tram > bus)
      const seen = new Map<string, Stop>();
      for (const stop of state.stops) {
        const key = getBaseName(stop.name);
        if (!recentBaseNames.has(key)) {
          const existing = seen.get(key);
          if (!existing || getStopPriority(stop.id) < getStopPriority(existing.id)) {
            seen.set(key, stop);
          }
        }
      }
      const otherStops = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

      // Combine: recent first, then other stops (no limit)
      return [...recentStops, ...otherStops];
    }

    // Filter by query
    let filtered = !lowerQuery ? state.stops : state.stops.filter(stop =>
      stop.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lowerQuery)
    );

    // Deduplicate by BASE name - "Karşıyaka İskeli" and "Karşıyaka İskelesi" become one
    // Keep the stop with highest priority (rail > ferry > metro > tram > bus)
    const seen = new Map<string, Stop>();
    for (const stop of filtered) {
      const key = getBaseName(stop.name);
      const existing = seen.get(key);
      if (!existing || getStopPriority(stop.id) < getStopPriority(existing.id)) {
        seen.set(key, stop);
      }
    }

    // Sort by name for better UX, but put recent stops first if they match
    const recentIds = new Set(recentStops.map(s => s.id));
    const unique = Array.from(seen.values()).sort((a, b) => {
      const aRecent = recentIds.has(a.id);
      const bRecent = recentIds.has(b.id);
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      return a.name.localeCompare(b.name);
    });

    // No limit - show all unique stations
    return unique;
  };

  const hasFromLocation = state.fromMode === 'stop' ? state.fromStop !== null : state.fromAddress !== null;
  const hasToLocation = state.toMode === 'stop' ? state.toStop !== null : state.toAddress !== null;
  const canSearch = hasFromLocation && hasToLocation;

  const getFromDisplayText = () => {
    if (state.fromMode === 'stop') {
      return state.fromStop ? state.fromStop.name : t('search.placeholder');
    } else {
      return state.fromAddress ? (state.fromAddress.shortAddress || state.fromAddress.displayName) : t('route.enterAddress');
    }
  };

  const getToDisplayText = () => {
    if (state.toMode === 'stop') {
      return state.toStop ? state.toStop.name : t('search.placeholder');
    } else {
      return state.toAddress ? (state.toAddress.shortAddress || state.toAddress.displayName) : t('route.enterAddress');
    }
  };

  const openFromSearch = () => {
    if (state.fromMode === 'stop') {
      dispatch({ type: 'SHOW_FROM_SEARCH', payload: true });
    } else {
      dispatch({ type: 'SHOW_FROM_ADDRESS_SEARCH', payload: true });
    }
  };

  const openToSearch = () => {
    if (state.toMode === 'stop') {
      dispatch({ type: 'SHOW_TO_SEARCH', payload: true });
    } else {
      dispatch({ type: 'SHOW_TO_ADDRESS_SEARCH', payload: true });
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      dispatch({ type: 'SHOW_TIME_PICKER', payload: false });
    }
    if (selectedDate) {
      dispatch({ type: 'SET_DEPARTURE_TIME', payload: selectedDate });
    }
  };

  // Loading state - show when loading OR when data is refreshing and no stops yet
  if (state.loading || (isDataRefreshing && state.stops.length === 0)) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {isDataRefreshing
            ? t('data.refreshing', { defaultValue: 'Mise à jour des données...' })
            : t('common.loading')}
        </Text>
        {isDataRefreshing && (
          <Text style={styles.loadingSubtext}>
            {t('data.refreshingHint', { defaultValue: 'Veuillez patienter quelques instants' })}
          </Text>
        )}
      </View>
    );
  }

  // Empty state - only show if not refreshing data
  if (state.stops.length === 0 && !isDataRefreshing) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>{t('common.noResults')}</Text>
        <Text style={styles.emptySubtext}>Import data from the Map screen</Text>
      </View>
    );
  }

  const filteredFromStops = filterStops(state.fromSearchQuery);
  const filteredToStops = filterStops(state.toSearchQuery);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Single ScrollView for both form and results */}
      <ScrollView
        style={styles.mainScrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={styles.searchContainer}>
          {/* From Location */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>📍 {t('transit.from')}</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeButton, state.fromMode === 'stop' && styles.modeButtonActive]}
                  onPress={() => state.fromMode !== 'stop' && dispatch({ type: 'TOGGLE_FROM_MODE' })}
                >
                  <Text style={[styles.modeButtonText, state.fromMode === 'stop' && styles.modeButtonTextActive]}>
                    🚏 {t('route.stop')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, state.fromMode === 'address' && styles.modeButtonActive]}
                  onPress={() => state.fromMode !== 'address' && dispatch({ type: 'TOGGLE_FROM_MODE' })}
                >
                  <Text style={[styles.modeButtonText, state.fromMode === 'address' && styles.modeButtonTextActive]}>
                    📍 {t('route.address')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.stopInput} onPress={openFromSearch}>
              <Text style={[styles.stopInputText, !hasFromLocation && styles.stopInputPlaceholder]}>
                {getFromDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Swap Button */}
          <TouchableOpacity
            style={[styles.swapButton, (!hasFromLocation || !hasToLocation) && styles.swapButtonDisabled]}
            onPress={() => dispatch({ type: 'SWAP_LOCATIONS' })}
            disabled={!hasFromLocation || !hasToLocation}
          >
            <Text style={styles.swapIcon}>↕️</Text>
          </TouchableOpacity>

          {/* To Location */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>🎯 {t('transit.to')}</Text>
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeButton, state.toMode === 'stop' && styles.modeButtonActive]}
                  onPress={() => state.toMode !== 'stop' && dispatch({ type: 'TOGGLE_TO_MODE' })}
                >
                  <Text style={[styles.modeButtonText, state.toMode === 'stop' && styles.modeButtonTextActive]}>
                    🚏 {t('route.stop')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, state.toMode === 'address' && styles.modeButtonActive]}
                  onPress={() => state.toMode !== 'address' && dispatch({ type: 'TOGGLE_TO_MODE' })}
                >
                  <Text style={[styles.modeButtonText, state.toMode === 'address' && styles.modeButtonTextActive]}>
                    📍 {t('route.address')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.stopInput} onPress={openToSearch}>
              <Text style={[styles.stopInputText, !hasToLocation && styles.stopInputPlaceholder]}>
                {getToDisplayText()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Depart at / Arrive by - Segmented Control */}
          <View style={styles.timeModeSegmented}>
            <TouchableOpacity
              style={[styles.timeModeOption, state.timeMode === 'departure' && styles.timeModeOptionActive]}
              onPress={() => dispatch({ type: 'SET_TIME_MODE', payload: 'departure' })}
            >
              <Text style={[styles.timeModeOptionText, state.timeMode === 'departure' && styles.timeModeOptionTextActive]}>
                🕐 {t('route.departAt')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeModeOption, state.timeMode === 'arrival' && styles.timeModeOptionActive]}
              onPress={() => dispatch({ type: 'SET_TIME_MODE', payload: 'arrival' })}
            >
              <Text style={[styles.timeModeOptionText, state.timeMode === 'arrival' && styles.timeModeOptionTextActive]}>
                🎯 {t('route.arriveBy')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Controls */}
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => dispatch({ type: 'ADJUST_DEPARTURE_TIME', payload: -15 })}
            >
              <Text style={styles.timeButtonText}>-15</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeDisplay}
              onPress={() => dispatch({ type: 'SHOW_TIME_PICKER', payload: true })}
            >
              <Text style={styles.timeDisplayText}>{formatTime(state.departureTime)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => dispatch({ type: 'ADJUST_DEPARTURE_TIME', payload: 15 })}
            >
              <Text style={styles.timeButtonText}>+15</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dispatch({ type: 'SET_DEPARTURE_TO_NOW' })} style={styles.nowButtonContainer}>
              <Text style={styles.nowButton}>{t('time.now')}</Text>
            </TouchableOpacity>

            {/* DateTimePicker - Platform specific */}
            {state.showTimePicker && Platform.OS === 'ios' && (
              <Modal
                transparent
                animationType="slide"
                visible={state.showTimePicker}
                onRequestClose={() => dispatch({ type: 'SHOW_TIME_PICKER', payload: false })}
              >
                <View style={styles.pickerModal}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => dispatch({ type: 'SHOW_TIME_PICKER', payload: false })}>
                        <Text style={styles.pickerDoneButton}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={state.departureTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.picker}
                      textColor={colors.text}
                      themeVariant="dark"
                    />
                  </View>
                </View>
              </Modal>
            )}

            {state.showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={state.departureTime}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Optimize Options + More Options */}
          <View style={styles.optimizeRow}>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'fastest' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'fastest' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'fastest' && styles.optimizeChipTextActive]}>
                ⚡ {t('routing.filters.fastest')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'least-transfers' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'least-transfers' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'least-transfers' && styles.optimizeChipTextActive]}>
                🔄 {t('routing.filters.leastTransfers')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'least-walking' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'least-walking' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'least-walking' && styles.optimizeChipTextActive]}>
                🚶 {t('routing.filters.leastWalking')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.moreOptionsChip}
              onPress={() => dispatch({ type: 'SHOW_FILTERS', payload: true })}
            >
              <Text style={styles.moreOptionsChipText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Calculate Button */}
          <TouchableOpacity
            style={[styles.calculateButton, (!canSearch || state.calculating) && styles.calculateButtonDisabled]}
            onPress={onCalculateRoute}
            disabled={!canSearch || state.calculating}
          >
            {state.calculating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.calculateButtonText}>{t('route.searchRoute')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Results - now part of the same ScrollView */}
        <View style={styles.resultsContainer}>
          {state.calculating && (
          <RouteSearchAnimation />
        )}

        {!state.calculating && state.hasSearched && state.journeys.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>🚫</Text>
            <Text style={styles.noResultsText}>{t('route.noRouteFound')}</Text>
          </View>
        )}

        {!state.calculating && state.journeys.length > 0 && (() => {
          const hour = state.departureTime.getHours();
          const isNightHours = hour >= 1 && hour < 5;
          const hasNoTransitService = state.journeys.some(j => j.tags?.includes('no-transit-service'));

          return (
          <>
            {hasNoTransitService && (
              <View style={styles.noTransitBanner}>
                <Text style={styles.noTransitBannerText}>
                  {t('route.noServiceAtTime', { defaultValue: 'Aucun transport en commun ne circule a cette heure. Voici le trajet a pied.' })}
                </Text>
              </View>
            )}
            {isNightHours && !hasNoTransitService && (
              <View style={styles.nightServiceBanner}>
                <Text style={styles.nightServiceBannerText}>
                  🌙 {t('route.nightServiceLimited', { defaultValue: 'Service de nuit limité - Seuls les bus Baykuş (910-950) circulent.' })}
                </Text>
              </View>
            )}
            <Text style={styles.resultsTitle}>
              {state.journeys.some(j => j.tags?.includes('no-transit-service'))
                ? t('route.walkingSuggestion', { defaultValue: 'Trajet a pied' })
                : t('routing.availableRoutes', { count: state.journeys.length })}
            </Text>
            {state.journeys.map((journey, index) => (
              <RouteOptionCard
                key={index}
                route={journey}
                isSelected={state.selectedRoute === journey}
                onPress={() => {
                  dispatch({ type: 'SELECT_ROUTE', payload: journey });
                  onJourneyPress(journey);
                }}
              />
            ))}
          </>
          );
        })()}
        </View>
      </ScrollView>

      {/* From Stop Search Modal */}
      <Modal
        visible={state.showFromSearch}
        animationType="slide"
        onRequestClose={() => dispatch({ type: 'SHOW_FROM_SEARCH', payload: false })}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📍 {t('time.departure')}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => dispatch({ type: 'SHOW_FROM_SEARCH', payload: false })}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={state.fromSearchQuery}
              onChangeText={(text) => dispatch({ type: 'SET_FROM_SEARCH_QUERY', payload: text })}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
            <Text style={{ paddingHorizontal: 12, paddingTop: 8, color: colors.textMuted, fontSize: 12 }}>
              {filteredFromStops.length} arrêts trouvés
            </Text>
          </View>
          <FlatList
            data={filteredFromStops}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.stopListFullScreen}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isRecent = recentStops.some(s => s.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.stopItem, state.fromStop?.id === item.id && styles.stopItemSelected]}
                  onPress={() => {
                    dispatch({ type: 'SELECT_FROM_STOP', payload: item });
                    onStopSelect?.(item);
                  }}
                >
                  <View style={styles.stopItemContent}>
                    {isRecent && <Text style={styles.recentIcon}>🕐</Text>}
                    <Text style={[styles.stopItemText, state.fromStop?.id === item.id && styles.stopItemTextSelected]}>
                      {item.name}
                    </Text>
                  </View>
                  {state.fromStop?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>{t('common.noResults')}</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* To Stop Search Modal */}
      <Modal
        visible={state.showToSearch}
        animationType="slide"
        onRequestClose={() => dispatch({ type: 'SHOW_TO_SEARCH', payload: false })}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎯 {t('time.arrival')}</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => dispatch({ type: 'SHOW_TO_SEARCH', payload: false })}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={state.toSearchQuery}
              onChangeText={(text) => dispatch({ type: 'SET_TO_SEARCH_QUERY', payload: text })}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
            <Text style={{ paddingHorizontal: 12, paddingTop: 8, color: colors.textMuted, fontSize: 12 }}>
              {filteredToStops.length} arrêts trouvés
            </Text>
          </View>
          <FlatList
            data={filteredToStops}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={styles.stopListFullScreen}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isRecent = recentStops.some(s => s.id === item.id);
              return (
                <TouchableOpacity
                  style={[styles.stopItem, state.toStop?.id === item.id && styles.stopItemSelected]}
                  onPress={() => {
                    dispatch({ type: 'SELECT_TO_STOP', payload: item });
                    onStopSelect?.(item);
                  }}
                >
                  <View style={styles.stopItemContent}>
                    {isRecent && <Text style={styles.recentIcon}>🕐</Text>}
                    <Text style={[styles.stopItemText, state.toStop?.id === item.id && styles.stopItemTextSelected]}>
                      {item.name}
                    </Text>
                  </View>
                  {state.toStop?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>{t('common.noResults')}</Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* From Address Search Modal */}
      <AddressSearchModal
        visible={state.showFromAddressSearch}
        onClose={() => dispatch({ type: 'SHOW_FROM_ADDRESS_SEARCH', payload: false })}
        onSelect={(addr) => dispatch({ type: 'SELECT_FROM_ADDRESS', payload: addr })}
        title={`📍 ${t('transit.from')}`}
      />

      {/* To Address Search Modal */}
      <AddressSearchModal
        visible={state.showToAddressSearch}
        onClose={() => dispatch({ type: 'SHOW_TO_ADDRESS_SEARCH', payload: false })}
        onSelect={(addr) => dispatch({ type: 'SELECT_TO_ADDRESS', payload: addr })}
        title={`🎯 ${t('transit.to')}`}
      />

      {/* Route Filters Modal */}
      <RouteFiltersModal
        visible={state.showFilters}
        preferences={state.preferences}
        onClose={() => dispatch({ type: 'SHOW_FILTERS', payload: false })}
        onApply={onSavePreferences}
      />
    </KeyboardAvoidingView>
  );
}

// Styles (copied from original RouteScreen)
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
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    loadingSubtext: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    searchContainer: {
      backgroundColor: colors.background,
      padding: 12,
      paddingTop: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    inputContainer: {
      marginBottom: 8,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.buttonBackground,
      borderRadius: 6,
      padding: 2,
    },
    modeButton: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
    },
    modeButtonText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    modeButtonTextActive: {
      color: '#fff',
    },
    stopInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      minHeight: 44,
      justifyContent: 'center',
    },
    stopInputText: {
      fontSize: 16,
      color: colors.text,
    },
    stopInputPlaceholder: {
      color: colors.textMuted,
    },
    swapButton: {
      alignSelf: 'center',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 4,
    },
    swapButtonDisabled: {
      opacity: 0.4,
    },
    swapIcon: {
      fontSize: 20,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      gap: 8,
    },
    timeModeSegmented: {
      flexDirection: 'row',
      backgroundColor: colors.buttonBackground,
      borderRadius: 8,
      padding: 3,
      marginBottom: 4,
    },
    timeModeOption: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    timeModeOptionActive: {
      backgroundColor: colors.primary,
    },
    timeModeOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeModeOptionTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    timeButton: {
      backgroundColor: colors.buttonBackground,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    timeButtonText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    timeDisplay: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: 'center',
    },
    timeDisplayText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
    },
    nowButtonContainer: {
      marginLeft: 'auto',
    },
    nowButton: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },
    optimizeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    optimizeChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optimizeChipActive: {
      backgroundColor: colors.primary,
    },
    optimizeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    optimizeChipTextActive: {
      color: '#fff',
    },
    moreOptionsChip: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    moreOptionsChipText: {
      fontSize: 14,
    },
    optimizeButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    optimizeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.buttonBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optimizeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optimizeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    optimizeButtonTextActive: {
      color: '#fff',
    },
    moreOptionsButton: {
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    moreOptionsText: {
      fontSize: 13,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    calculateButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    calculateButtonDisabled: {
      opacity: 0.4,
    },
    calculateButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    mainScrollView: {
      flex: 1,
    },
    resultsContainer: {
      padding: 16,
      minHeight: 200,
    },
    calculatingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    calculatingText: {
      marginTop: 16,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    calculatingSubtext: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textMuted,
    },
    noTransitBanner: {
      backgroundColor: '#f97316',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    noTransitBannerText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    nightServiceBanner: {
      backgroundColor: '#1e3a5f',
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    nightServiceBannerText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    noResultsContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    noResultsIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    noResultsText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    resultsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      paddingBottom: 20,
    },
    fullScreenModal: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 60,
    },
    stopListFullScreen: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseText: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    searchInputContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      fontSize: 16,
      color: colors.text,
    },
    stopList: {
      flex: 1,
      maxHeight: '100%',
    },
    stopItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    stopItemSelected: {
      backgroundColor: colors.activeBackground,
    },
    stopItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    recentIcon: {
      fontSize: 14,
      marginRight: 8,
    },
    stopItemText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    stopItemTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    checkmark: {
      fontSize: 18,
      color: colors.primary,
      marginLeft: 8,
    },
    emptySearchContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptySearchText: {
      fontSize: 16,
      color: colors.textMuted,
    },
    pickerModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerContainer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerDoneButton: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.primary,
    },
    picker: {
      width: '100%',
    },
  });
