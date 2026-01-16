/**
 * Route Screen
 * Allows users to search for routes between two stops with autocomplete
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, TextInput } from 'react-native';
import { RouteResult } from '../components/transit/RouteResult';
import { findRoute } from '../core/routing';
import type { Stop } from '../core/types/models';
import type { JourneyResult } from '../core/types/routing';
import * as db from '../core/database';

export function RouteScreen() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Selected stops
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);

  // Search states
  const [showFromSearch, setShowFromSearch] = useState(false);
  const [showToSearch, setShowToSearch] = useState(false);
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');

  // Departure time
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
      Alert.alert('Erreur', 'Impossible de charger les arrêts');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!fromStop || !toStop) {
      Alert.alert('Erreur', 'Veuillez sélectionner un départ et une arrivée');
      return;
    }

    if (fromStop.id === toStop.id) {
      Alert.alert('Erreur', 'Le départ et l\'arrivée doivent être différents');
      return;
    }

    try {
      setCalculating(true);
      setHasSearched(false);
      console.log('[RouteScreen] Calculating route from', fromStop.id, 'to', toStop.id);

      const results = await findRoute(fromStop.id, toStop.id, departureTime);

      setJourneys(results);
      setHasSearched(true);
      console.log('[RouteScreen] Found', results.length, 'journeys');
    } catch (err) {
      console.error('[RouteScreen] Error calculating route:', err);
      Alert.alert('Erreur', 'Impossible de calculer l\'itinéraire');
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
    // TODO: Show detailed journey view
    console.log('[RouteScreen] Journey pressed:', journey);
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des arrêts...</Text>
      </View>
    );
  }

  if (stops.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Aucun arrêt disponible</Text>
        <Text style={styles.emptySubtext}>Importez des données depuis l'écran Carte</Text>
      </View>
    );
  }

  const filteredFromStops = filterStops(fromSearchQuery);
  const filteredToStops = filterStops(toSearchQuery);
  const canSearch = fromStop !== null && toStop !== null && fromStop.id !== toStop.id;

  return (
    <View style={styles.container}>
      {/* Header with stop selection */}
      <View style={styles.searchContainer}>
        <Text style={styles.title}>Calculer un itinéraire</Text>

        {/* From Stop */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>📍 Départ</Text>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openFromSearch}
          >
            <Text style={[styles.stopInputText, !fromStop && styles.stopInputPlaceholder]}>
              {fromStop ? fromStop.name : 'Sélectionner un arrêt'}
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
          <Text style={styles.label}>🎯 Arrivée</Text>
          <TouchableOpacity
            style={styles.stopInput}
            onPress={openToSearch}
          >
            <Text style={[styles.stopInputText, !toStop && styles.stopInputPlaceholder]}>
              {toStop ? toStop.name : 'Sélectionner un arrêt'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Departure Time Selector */}
        <View style={styles.timeContainer}>
          <Text style={styles.label}>🕒 Heure de départ</Text>
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
            <Text style={styles.nowButton}>Maintenant</Text>
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
            <Text style={styles.calculateButtonText}>Rechercher</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
        {calculating && (
          <View style={styles.calculatingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.calculatingText}>Calcul en cours...</Text>
          </View>
        )}

        {!calculating && hasSearched && journeys.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsIcon}>🚫</Text>
            <Text style={styles.noResultsText}>Aucun itinéraire trouvé</Text>
          </View>
        )}

        {!calculating && journeys.length > 0 && (
          <>
            <Text style={styles.resultsTitle}>
              {journeys.length} itinéraire{journeys.length > 1 ? 's' : ''} trouvé{journeys.length > 1 ? 's' : ''}
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
              <Text style={styles.modalTitle}>📍 Choisir le départ</Text>
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
                placeholder="Rechercher un arrêt..."
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
                  <Text style={styles.emptySearchText}>Aucun arrêt trouvé</Text>
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
              <Text style={styles.modalTitle}>🎯 Choisir l'arrivée</Text>
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
                placeholder="Rechercher un arrêt..."
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
                  <Text style={styles.emptySearchText}>Aucun arrêt trouvé</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    minHeight: 50,
    justifyContent: 'center',
  },
  stopInputText: {
    fontSize: 16,
    color: '#000',
  },
  stopInputPlaceholder: {
    color: '#999',
  },
  swapButton: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
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
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
  timeDisplay: {
    backgroundColor: '#0066CC',
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
    color: '#0066CC',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  calculateButton: {
    backgroundColor: '#0066CC',
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
    color: '#666',
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
    color: '#666',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },
  searchInputContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    fontSize: 16,
  },
  stopItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stopItemSelected: {
    backgroundColor: '#E6F2FF',
  },
  stopItemText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  stopItemTextSelected: {
    color: '#0066CC',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#0066CC',
    marginLeft: 8,
  },
  emptySearchContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 16,
    color: '#999',
  },
});
