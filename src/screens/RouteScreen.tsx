/**
 * Route Screen
 * Allows users to search for routes between two stops with autocomplete
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useThemeColors } from '../hooks/useThemeColors';
import { RouteResult } from '../components/transit/RouteResult';
import { findRoute } from '../core/routing';
import type { Stop } from '../core/types/models';
import type { JourneyResult } from '../core/types/routing';
import type { RouteStackParamList } from '../navigation/RouteStackNavigator';
import { serializeJourney } from '../core/types/routing-serialization';
import * as db from '../core/database';

type NavigationProp = NativeStackNavigationProp<RouteStackParamList, 'RouteCalculation'>;

export function RouteScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Selected stops
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);

  // Search states
  const [showFromSearch, setShowFromSearch] = useState(false);
  const [showToSearch, setShowToSearch] = useState(false);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');

  // Time mode: 'departure' or 'arrival'
  const [timeMode, setTimeMode] = useState<'departure' | 'arrival'>('departure');

  // Departure/Arrival time
  const [departureTime, setDepartureTime] = useState(new Date());

  // Results
  const [journeys, setJourneys] = useState<JourneyResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Load all stops on mount
  useEffect(() => {
    loadStops();
  }, []);

  const loadStops = async () => {
    try {
      setLoading(true);
      const allStops = await db.getAllStops();
      setStops(allStops);
    } catch (err) {
      console.error('[RouteScreen] Error loading stops:', err);
      Alert.alert(t('common.error'), 'Unable to load stops');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!fromStop || !toStop) {
      Alert.alert(t('common.error'), 'Please select a departure and arrival stop');
      return;
    }

    if (fromStop.id === toStop.id) {
      Alert.alert(t('common.error'), 'Departure and arrival must be different');
      return;
    }

    try {
      setCalculating(true);
      setHasSearched(false);
      console.log('[RouteScreen] Calculating route from', fromStop.id, 'to', toStop.id, 'mode:', timeMode);

      // Calculate departure time based on mode
      let searchTime = departureTime;
      if (timeMode === 'arrival') {
        // For arrival mode, subtract estimated journey time (30 min by default)
        // This is a simplified approach - in reality we'd need reverse pathfinding
        searchTime = new Date(departureTime.getTime() - 30 * 60000);
        console.log('[RouteScreen] Arrival mode: searching from', formatTime(searchTime));
      }

      const results = await findRoute(fromStop.id, toStop.id, searchTime);

      // Filter results for arrival mode (keep only journeys arriving before target time)
      const filteredResults = timeMode === 'arrival'
        ? results.filter(j => j.arrivalTime <= departureTime)
        : results;

      setJourneys(filteredResults);
      setHasSearched(true);
      console.log('[RouteScreen] Found', filteredResults.length, 'journeys');
    } catch (err) {
      console.error('[RouteScreen] Error calculating route:', err);
      Alert.alert(t('common.error'), 'Unable to calculate route');
    } finally {
      setCalculating(false);
    }
  };

  const handleSwapStops = () => {
    const tempStop = fromStop;
    setFromStop(toStop);
    setToStop(tempStop);
  };

  const handleJourneyPress = (journey: JourneyResult) => {
    navigation.navigate('RouteDetails', { journey: serializeJourney(journey) });
  };

  const openFromSearch = () => {
    setFromSearchQuery('');
    setShowFromSearch(true);
  };

  const openToSearch = () => {
    setToSearchQuery('');
    setShowToSearch(true);
  };

  const selectFromStop = (stop: Stop) => {
    setFromStop(stop);
    setShowFromSearch(false);
  };

  const selectToStop = (stop: Stop) => {
    setToStop(stop);
    setShowToSearch(false);
  };

  const filterStops = (query: string) => {
    if (!query.trim()) return stops;
    const lowerQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return stops.filter(stop =>
      stop.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lowerQuery)
    );
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const setDepartureToNow = () => {
    setDepartureTime(new Date());
  };

  const adjustDepartureTime = (minutes: number) => {
    const newTime = new Date(departureTime.getTime() + minutes * 60000);
    setDepartureTime(newTime);
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.route')} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (stops.length === 0) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('tabs.route')} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          <Text style={styles.emptySubtext}>Import data from the Map screen</Text>
        </View>
      </ScreenContainer>
    );
  }

  const filteredFromStops = filterStops(fromSearchQuery);
  const filteredToStops = filterStops(toSearchQuery);
  const canSearch = fromStop !== null && toStop !== null && fromStop.id !== toStop.id;

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.route')} />
      <View style={styles.container}>
      {/* Header with stop selection */}
      <View style={styles.searchContainer}>
        <Text style={styles.title}>{t('route.title')}</Text>

        {/* From Stop */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>📍 {t('transit.from')}</Text>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openFromSearch}
          >
            <Text style={[styles.stopInputText, !fromStop && styles.stopInputPlaceholder]}>
              {fromStop ? fromStop.name : t('search.placeholder')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swap Button */}
        <TouchableOpacity
          style={[styles.swapButton, (!fromStop || !toStop) && styles.swapButtonDisabled]}
          onPress={handleSwapStops}
          disabled={!fromStop || !toStop}
        >
          <Text style={styles.swapIcon}>↕️</Text>
        </TouchableOpacity>

        {/* To Stop */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>🎯 {t('transit.to')}</Text>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openToSearch}
          >
            <Text style={[styles.stopInputText, !toStop && styles.stopInputPlaceholder]}>
              {toStop ? toStop.name : t('search.placeholder')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time Mode Toggle */}
        <View style={styles.timeModeContainer}>
          <TouchableOpacity
            style={[
              styles.timeModeButton,
              timeMode === 'departure' && styles.timeModeButtonActive,
            ]}
            onPress={() => setTimeMode('departure')}
          >
            <Text
              style={[
                styles.timeModeButtonText,
                timeMode === 'departure' && styles.timeModeButtonTextActive,
              ]}
            >
              {t('route.departAt')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeModeButton,
              timeMode === 'arrival' && styles.timeModeButtonActive,
            ]}
            onPress={() => setTimeMode('arrival')}
          >
            <Text
              style={[
                styles.timeModeButtonText,
                timeMode === 'arrival' && styles.timeModeButtonTextActive,
              ]}
            >
              {t('route.arriveBy')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Departure/Arrival Time Selector */}
        <View style={styles.timeContainer}>
          <Text style={styles.label}>
            🕒 {timeMode === 'departure' ? t('route.departureTime') : t('route.arrivalTime')}
          </Text>
          <View style={styles.timeControls}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => adjustDepartureTime(-15)}
            >
              <Text style={styles.timeButtonText}>-15min</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeDisplay}
              onPress={setDepartureToNow}
            >
              <Text style={styles.timeDisplayText}>{formatTime(departureTime)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => adjustDepartureTime(15)}
            >
              <Text style={styles.timeButtonText}>+15min</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={setDepartureToNow}>
            <Text style={styles.nowButton}>{t('time.now')}</Text>
          </TouchableOpacity>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, (!canSearch || calculating) && styles.calculateButtonDisabled]}
          onPress={handleCalculateRoute}
          disabled={!canSearch || calculating}
        >
          {calculating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.calculateButtonText}>{t('route.searchRoute')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
        {calculating && (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.calculatingText}>{t('common.loading')}</Text>
          </View>
        )}

        {!calculating && hasSearched && journeys.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>🚫</Text>
            <Text style={styles.noResultsText}>{t('route.noRouteFound')}</Text>
          </View>
        )}

        {!calculating && journeys.length > 0 && (
          <>
            <Text style={styles.resultsTitle}>
              {journeys.length} {journeys.length > 1 ? 'routes found' : 'route found'}
            </Text>
            {journeys.map((journey, index) => (
              <RouteResult
                key={index}
                journey={journey}
                onPress={() => handleJourneyPress(journey)}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* From Stop Search Modal */}
      <Modal
        visible={showFromSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFromSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 {t('time.departure')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFromSearch(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('search.placeholder')}
                value={fromSearchQuery}
                onChangeText={setFromSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={filteredFromStops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stopItem,
                    fromStop?.id === item.id && styles.stopItemSelected,
                  ]}
                  onPress={() => selectFromStop(item)}
                >
                  <Text style={[
                    styles.stopItemText,
                    fromStop?.id === item.id && styles.stopItemTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {fromStop?.id === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearchContainer}>
                  <Text style={styles.emptySearchText}>{t('common.noResults')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* To Stop Search Modal */}
      <Modal
        visible={showToSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToSearch(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 {t('time.arrival')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowToSearch(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('search.placeholder')}
                value={toSearchQuery}
                onChangeText={setToSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={filteredToStops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stopItem,
                    toStop?.id === item.id && styles.stopItemSelected,
                  ]}
                  onPress={() => selectToStop(item)}
                >
                  <Text style={[
                    styles.stopItemText,
                    toStop?.id === item.id && styles.stopItemTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {toStop?.id === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearchContainer}>
                  <Text style={styles.emptySearchText}>{t('common.noResults')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
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
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    stopInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      minHeight: 50,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 8,
    },
    swapButtonDisabled: {
      opacity: 0.4,
    },
    swapIcon: {
      fontSize: 20,
    },
    timeModeContainer: {
      flexDirection: 'row',
      marginVertical: 12,
      backgroundColor: colors.buttonBackground,
      borderRadius: 8,
      padding: 2,
    },
    timeModeButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: 'center',
    },
    timeModeButtonActive: {
      backgroundColor: colors.primary,
    },
    timeModeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeModeButtonTextActive: {
      color: '#fff',
    },
    timeContainer: {
      marginBottom: 12,
      marginTop: 8,
    },
    timeControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    timeButton: {
      backgroundColor: colors.buttonBackground,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    timeButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    timeDisplay: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
    },
    timeDisplayText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
    },
    nowButton: {
      fontSize: 14,
      color: colors.primary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    calculateButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 12,
    },
    calculateButtonDisabled: {
      opacity: 0.4,
    },
    calculateButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    resultsContainer: {
      flex: 1,
    },
    resultsContent: {
      padding: 16,
    },
    calculatingContainer: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    calculatingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
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
    // Modal styles
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
  });
