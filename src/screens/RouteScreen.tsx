/**
 * Route Screen
 * Allows users to search for routes between two stops
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
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
  const [fromStopId, setFromStopId] = useState<string>('');
  const [toStopId, setToStopId] = useState<string>('');

  // Modal state for stop selection
  const [showStopPicker, setShowStopPicker] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'from' | 'to'>('from');

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

      // Pre-select first two stops if available
      if (allStops.length >= 2) {
        setFromStopId(allStops[0].id);
        setToStopId(allStops[1].id);
      }
    } catch (err) {
      console.error('[RouteScreen] Error loading stops:', err);
      Alert.alert('Erreur', 'Impossible de charger les arrêts');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async () => {
    if (!fromStopId || !toStopId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un départ et une arrivée');
      return;
    }

    if (fromStopId === toStopId) {
      Alert.alert('Erreur', 'Le départ et l\'arrivée doivent être différents');
      return;
    }

    try {
      setCalculating(true);
      setHasSearched(false);
      console.log('[RouteScreen] Calculating route from', fromStopId, 'to', toStopId);

      const departureTime = new Date(); // Now
      const results = await findRoute(fromStopId, toStopId, departureTime);

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
    const temp = fromStopId;
    setFromStopId(toStopId);
    setToStopId(temp);
  };

  const handleJourneyPress = (journey: JourneyResult) => {
    // TODO: Show detailed journey view
    console.log('[RouteScreen] Journey pressed:', journey);
  };

  const openStopPicker = (type: 'from' | 'to') => {
    setSelectingFor(type);
    setShowStopPicker(true);
  };

  const selectStop = (stopId: string) => {
    if (selectingFor === 'from') {
      setFromStopId(stopId);
    } else {
      setToStopId(stopId);
    }
    setShowStopPicker(false);
  };

  const getStopName = (stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    return stop ? stop.name : 'Sélectionner un arrêt';
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

  return (
    <View style={styles.container}>
      {/* Header with stop selection */}
      <View style={styles.searchContainer}>
        <Text style={styles.title}>Calculer un itinéraire</Text>

        {/* From Stop */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Départ</Text>
          <TouchableOpacity
            style={styles.stopSelector}
            onPress={() => openStopPicker('from')}
          >
            <Text style={[styles.stopSelectorText, !fromStopId && styles.stopSelectorPlaceholder]}>
              {getStopName(fromStopId)}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={handleSwapStops}>
          <Text style={styles.swapIcon}>⇅</Text>
        </TouchableOpacity>

        {/* To Stop */}
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Arrivée</Text>
          <TouchableOpacity
            style={styles.stopSelector}
            onPress={() => openStopPicker('to')}
          >
            <Text style={[styles.stopSelectorText, !toStopId && styles.stopSelectorPlaceholder]}>
              {getStopName(toStopId)}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateButton, calculating && styles.calculateButtonDisabled]}
          onPress={handleCalculateRoute}
          disabled={calculating}
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

      {/* Stop Selection Modal */}
      <Modal
        visible={showStopPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStopPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectingFor === 'from' ? 'Choisir le départ' : 'Choisir l\'arrivée'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowStopPicker(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={stops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stopItem,
                    (selectingFor === 'from' ? fromStopId : toStopId) === item.id && styles.stopItemSelected,
                  ]}
                  onPress={() => selectStop(item.id)}
                >
                  <Text style={[
                    styles.stopItemText,
                    (selectingFor === 'from' ? fromStopId : toStopId) === item.id && styles.stopItemTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {(selectingFor === 'from' ? fromStopId : toStopId) === item.id && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
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
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stopSelector: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  stopSelectorText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  stopSelectorPlaceholder: {
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
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
  swapIcon: {
    fontSize: 24,
    color: '#fff',
  },
  calculateButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  calculateButtonDisabled: {
    opacity: 0.6,
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
});
