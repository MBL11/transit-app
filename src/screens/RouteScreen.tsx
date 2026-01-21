/**
 * Route Screen
 * Allows users to search for routes between two stops with autocomplete
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useThemeColors } from '../hooks/useThemeColors';
import { RouteResult } from '../components/transit/RouteResult';
import { findRoute, findRouteFromAddresses, findRouteFromCoordinates } from '../core/routing';
import type { Stop } from '../core/types/models';
import type { JourneyResult } from '../core/types/routing';
import type { RouteStackParamList } from '../navigation/RouteStackNavigator';
import { serializeJourney } from '../core/types/routing-serialization';
import * as db from '../core/database';
import { AddressSearchModal } from '../components/routing/AddressSearchModal';
import type { GeocodingResult } from '../core/geocoding';
import { useLocation } from '../hooks/useLocation';

type NavigationProp = NativeStackNavigationProp<RouteStackParamList, 'RouteCalculation'>;

export function RouteScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const navigation = useNavigation<NavigationProp>();
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Search mode: 'stop' or 'address'
  const [fromMode, setFromMode] = useState<'stop' | 'address'>('stop');
  const [toMode, setToMode] = useState<'stop' | 'address'>('stop');

  // Selected stops
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);

  // Selected addresses
  const [fromAddress, setFromAddress] = useState<GeocodingResult | null>(null);
  const [toAddress, setToAddress] = useState<GeocodingResult | null>(null);

  // Search states
  const [showFromSearch, setShowFromSearch] = useState(false);
  const [showToSearch, setShowToSearch] = useState(false);
  const [showFromAddressSearch, setShowFromAddressSearch] = useState(false);
  const [showToAddressSearch, setShowToAddressSearch] = useState(false);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');

  // Time mode: 'departure' or 'arrival'
  const [timeMode, setTimeMode] = useState<'departure' | 'arrival'>('departure');

  // Departure/Arrival time
  const [departureTime, setDepartureTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

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
    // Validate inputs
    const hasFromLocation = fromMode === 'stop' ? fromStop !== null : fromAddress !== null;
    const hasToLocation = toMode === 'stop' ? toStop !== null : toAddress !== null;

    if (!hasFromLocation || !hasToLocation) {
      Alert.alert(t('common.error'), 'Please select departure and arrival locations');
      return;
    }

    try {
      setCalculating(true);
      setHasSearched(false);

      // Calculate departure time based on mode
      let searchTime = departureTime;
      if (timeMode === 'arrival') {
        // For arrival mode, subtract estimated journey time (30 min by default)
        searchTime = new Date(departureTime.getTime() - 30 * 60000);
        console.log('[RouteScreen] Arrival mode: searching from', formatTime(searchTime));
      }

      let results: JourneyResult[] = [];

      // Determine which routing function to use based on from/to modes
      if (fromMode === 'stop' && toMode === 'stop') {
        // Stop to Stop
        console.log('[RouteScreen] Calculating stop to stop route');
        results = await findRoute(fromStop!.id, toStop!.id, searchTime);
      } else if (fromMode === 'address' && toMode === 'address') {
        // Address to Address
        console.log('[RouteScreen] Calculating address to address route');
        results = await findRouteFromAddresses(
          fromAddress!.displayName,
          toAddress!.displayName,
          searchTime,
          'fr' // Country code for France
        );
      } else if (fromMode === 'address' && toMode === 'stop') {
        // Address to Stop
        console.log('[RouteScreen] Calculating address to stop route');
        results = await findRouteFromCoordinates(
          fromAddress!.lat,
          fromAddress!.lon,
          toStop!.name, // Use stop name as address
          searchTime,
          'fr'
        );
      } else if (fromMode === 'stop' && toMode === 'address') {
        // Stop to Address
        console.log('[RouteScreen] Calculating stop to address route');
        // For stop to address, we can reverse: find route from toAddress to fromStop
        // and then reverse the journey. For now, use coordinates approach.
        results = await findRouteFromCoordinates(
          fromStop!.lat,
          fromStop!.lon,
          toAddress!.displayName,
          searchTime,
          'fr'
        );
      }

      // Filter results for arrival mode
      const filteredResults = timeMode === 'arrival'
        ? results.filter(j => j.arrivalTime <= departureTime)
        : results;

      setJourneys(filteredResults);
      setHasSearched(true);
      console.log('[RouteScreen] Found', filteredResults.length, 'journeys');
    } catch (err: any) {
      console.error('[RouteScreen] Error calculating route:', err);
      Alert.alert(t('common.error'), err.message || 'Unable to calculate route');
    } finally {
      setCalculating(false);
    }
  };

  const handleSwapStops = () => {
    // Swap modes
    const tempMode = fromMode;
    setFromMode(toMode);
    setToMode(tempMode);

    // Swap stops
    const tempStop = fromStop;
    setFromStop(toStop);
    setToStop(tempStop);

    // Swap addresses
    const tempAddress = fromAddress;
    setFromAddress(toAddress);
    setToAddress(tempAddress);
  };

  const handleJourneyPress = (journey: JourneyResult) => {
    navigation.navigate('RouteDetails', { journey: serializeJourney(journey) });
  };

  const openFromSearch = () => {
    if (fromMode === 'stop') {
      setFromSearchQuery('');
      setShowFromSearch(true);
    } else {
      setShowFromAddressSearch(true);
    }
  };

  const openToSearch = () => {
    if (toMode === 'stop') {
      setToSearchQuery('');
      setShowToSearch(true);
    } else {
      setShowToAddressSearch(true);
    }
  };

  const selectFromStop = (stop: Stop) => {
    setFromStop(stop);
    setShowFromSearch(false);
  };

  const selectToStop = (stop: Stop) => {
    setToStop(stop);
    setShowToSearch(false);
  };

  const selectFromAddress = (address: GeocodingResult) => {
    setFromAddress(address);
    setShowFromAddressSearch(false);
  };

  const selectToAddress = (address: GeocodingResult) => {
    setToAddress(address);
    setShowToAddressSearch(false);
  };

  const toggleFromMode = () => {
    const newMode = fromMode === 'stop' ? 'address' : 'stop';
    setFromMode(newMode);
    // Clear selection when switching modes
    if (newMode === 'stop') {
      setFromAddress(null);
    } else {
      setFromStop(null);
    }
  };

  const toggleToMode = () => {
    const newMode = toMode === 'stop' ? 'address' : 'stop';
    setToMode(newMode);
    // Clear selection when switching modes
    if (newMode === 'stop') {
      setToAddress(null);
    } else {
      setToStop(null);
    }
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

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setDepartureTime(selectedDate);
    }
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
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

  const hasFromLocation = fromMode === 'stop' ? fromStop !== null : fromAddress !== null;
  const hasToLocation = toMode === 'stop' ? toStop !== null : toAddress !== null;
  const canSearch = hasFromLocation && hasToLocation;

  const getFromDisplayText = () => {
    if (fromMode === 'stop') {
      return fromStop ? fromStop.name : t('search.placeholder');
    } else {
      return fromAddress ? (fromAddress.shortAddress || fromAddress.displayName) : t('route.enterAddress');
    }
  };

  const getToDisplayText = () => {
    if (toMode === 'stop') {
      return toStop ? toStop.name : t('search.placeholder');
    } else {
      return toAddress ? (toAddress.shortAddress || toAddress.displayName) : t('route.enterAddress');
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.route')} />
      <View style={styles.container}>
      {/* Header with stop selection */}
      <View style={styles.searchContainer}>
        <Text style={styles.title}>{t('route.title')}</Text>

        {/* From Location */}
        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>📍 {t('transit.from')}</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, fromMode === 'stop' && styles.modeButtonActive]}
                onPress={() => fromMode !== 'stop' && toggleFromMode()}
              >
                <Text style={[styles.modeButtonText, fromMode === 'stop' && styles.modeButtonTextActive]}>
                  🚏 {t('route.stop')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, fromMode === 'address' && styles.modeButtonActive]}
                onPress={() => fromMode !== 'address' && toggleFromMode()}
              >
                <Text style={[styles.modeButtonText, fromMode === 'address' && styles.modeButtonTextActive]}>
                  📍 {t('route.address')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openFromSearch}
          >
            <Text style={[styles.stopInputText, !hasFromLocation && styles.stopInputPlaceholder]}>
              {getFromDisplayText()}
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

        {/* To Location */}
        <View style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>🎯 {t('transit.to')}</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, toMode === 'stop' && styles.modeButtonActive]}
                onPress={() => toMode !== 'stop' && toggleToMode()}
              >
                <Text style={[styles.modeButtonText, toMode === 'stop' && styles.modeButtonTextActive]}>
                  🚏 {t('route.stop')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, toMode === 'address' && styles.modeButtonActive]}
                onPress={() => toMode !== 'address' && toggleToMode()}
              >
                <Text style={[styles.modeButtonText, toMode === 'address' && styles.modeButtonTextActive]}>
                  📍 {t('route.address')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openToSearch}
          >
            <Text style={[styles.stopInputText, !hasToLocation && styles.stopInputPlaceholder]}>
              {getToDisplayText()}
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
              onPress={openTimePicker}
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

          {/* DateTimePicker - Platform specific */}
          {showTimePicker && Platform.OS === 'ios' && (
            <Modal
              transparent
              animationType="slide"
              visible={showTimePicker}
              onRequestClose={closeTimePicker}
            >
              <View style={styles.pickerModal}>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={closeTimePicker}>
                      <Text style={styles.pickerDoneButton}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={departureTime}
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

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={departureTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
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
                placeholderTextColor={colors.textMuted}
                value={fromSearchQuery}
                onChangeText={setFromSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>
            <FlatList
              data={filteredFromStops}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
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
                placeholderTextColor={colors.textMuted}
                value={toSearchQuery}
                onChangeText={setToSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
            </View>
            <FlatList
              data={filteredToStops}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
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

      {/* From Address Search Modal */}
      <AddressSearchModal
        visible={showFromAddressSearch}
        onClose={() => setShowFromAddressSearch(false)}
        onSelect={selectFromAddress}
        title={`📍 ${t('transit.from')}`}
      />

      {/* To Address Search Modal */}
      <AddressSearchModal
        visible={showToAddressSearch}
        onClose={() => setShowToAddressSearch(false)}
        onSelect={selectToAddress}
        title={`🎯 ${t('transit.to')}`}
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
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
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
    timeModeContainer: {
      flexDirection: 'row',
      marginVertical: 8,
      backgroundColor: colors.buttonBackground,
      borderRadius: 8,
      padding: 2,
    },
    timeModeButton: {
      flex: 1,
      paddingVertical: 8,
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
      marginBottom: 8,
      marginTop: 4,
    },
    timeControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    timeButton: {
      backgroundColor: colors.buttonBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    timeButtonText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: '600',
    },
    timeDisplay: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      minWidth: 90,
      alignItems: 'center',
    },
    timeDisplayText: {
      fontSize: 20,
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
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
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
    // Time picker modal styles (iOS)
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
