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
}

export function RouteScreenContent({
  state,
  dispatch,
  onCalculateRoute,
  onJourneyPress,
  onSavePreferences,
  formatTime,
}: RouteScreenContentProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Helper functions
  const filterStops = (query: string): Stop[] => {
    if (!query.trim()) return state.stops;
    const lowerQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return state.stops.filter(stop =>
      stop.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lowerQuery)
    );
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

  // Loading state
  if (state.loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Empty state
  if (state.stops.length === 0) {
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

          {/* Compact Time Selector */}
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>🕒</Text>
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

          {/* Compact Optimize Options + More Options */}
          <View style={styles.optimizeRow}>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'fastest' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'fastest' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'fastest' && styles.optimizeChipTextActive]}>⚡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'least-transfers' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'least-transfers' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'least-transfers' && styles.optimizeChipTextActive]}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optimizeChip, state.preferences.optimizeFor === 'least-walking' && styles.optimizeChipActive]}
              onPress={() => onSavePreferences({ ...state.preferences, optimizeFor: 'least-walking' })}
            >
              <Text style={[styles.optimizeChipText, state.preferences.optimizeFor === 'least-walking' && styles.optimizeChipTextActive]}>🚶</Text>
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
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.calculatingText}>{t('common.loading')}</Text>
          </View>
        )}

        {!state.calculating && state.hasSearched && state.journeys.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>🚫</Text>
            <Text style={styles.noResultsText}>{t('route.noRouteFound')}</Text>
          </View>
        )}

        {!state.calculating && state.journeys.length > 0 && (
          <>
            <Text style={styles.resultsTitle}>
              {t('routing.availableRoutes', { count: state.journeys.length })}
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
        )}
        </View>
      </ScrollView>

      {/* From Stop Search Modal */}
      <Modal
        visible={state.showFromSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => dispatch({ type: 'SHOW_FROM_SEARCH', payload: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                autoFocus={false}
              />
            </View>
            <FlatList
              data={filteredFromStops}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stopItem, state.fromStop?.id === item.id && styles.stopItemSelected]}
                  onPress={() => dispatch({ type: 'SELECT_FROM_STOP', payload: item })}
                >
                  <Text style={[styles.stopItemText, state.fromStop?.id === item.id && styles.stopItemTextSelected]}>
                    {item.name}
                  </Text>
                  {state.fromStop?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
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
        visible={state.showToSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => dispatch({ type: 'SHOW_TO_SEARCH', payload: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
                autoFocus={false}
              />
            </View>
            <FlatList
              data={filteredToStops}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stopItem, state.toStop?.id === item.id && styles.stopItemSelected]}
                  onPress={() => dispatch({ type: 'SELECT_TO_STOP', payload: item })}
                >
                  <Text style={[styles.stopItemText, state.toStop?.id === item.id && styles.stopItemTextSelected]}>
                    {item.name}
                  </Text>
                  {state.toStop?.id === item.id && <Text style={styles.checkmark}>✓</Text>}
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
    timeLabel: {
      fontSize: 16,
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
      gap: 8,
      marginBottom: 8,
    },
    optimizeChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optimizeChipActive: {
      backgroundColor: colors.primary,
    },
    optimizeChipText: {
      fontSize: 16,
    },
    optimizeChipTextActive: {
      color: '#fff',
    },
    moreOptionsChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 'auto',
    },
    moreOptionsChipText: {
      fontSize: 16,
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
