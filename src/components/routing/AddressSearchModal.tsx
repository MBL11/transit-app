/**
 * Address Search Modal with Geocoding Autocomplete
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SectionList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../hooks/useThemeColors';
import { searchPlaces, GeocodingResult } from '../../core/geocoding';
import { useLocation } from '../../hooks/useLocation';
import { getRecentSearches, addToHistory, SearchHistoryItem } from '../../core/search-history';

interface AddressSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: GeocodingResult) => void;
  title: string;
}

export function AddressSearchModal({
  visible,
  onClose,
  onSelect,
  title,
}: AddressSearchModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<SearchHistoryItem[]>([]);

  const { location, isLoading: isGettingLocation, getCurrentLocation } = useLocation();

  // Load recent searches when modal opens
  useEffect(() => {
    if (visible) {
      loadRecentSearches();
    }
  }, [visible]);

  const loadRecentSearches = async () => {
    const history = await getRecentSearches();
    setRecentSearches(history);
  };

  // Debounced search
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setResults([]);
      setSearchError(null);
      return;
    }

    if (searchQuery.length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      await performSearch(searchQuery);
    }, 300); // Reduced debounce for faster autocomplete

    return () => clearTimeout(timeout);
  }, [searchQuery, visible]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      setSearchError(null);

      // Use user's location for better results if available
      const searchResults = await searchPlaces(
        query,
        location?.latitude,
        location?.longitude,
        10000 // 10km radius
      );

      setResults(searchResults);

      if (searchResults.length === 0) {
        setSearchError(t('common.noResults'));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(t('common.error'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    const userLocation = await getCurrentLocation();
    if (userLocation) {
      const result: GeocodingResult = {
        lat: userLocation.latitude,
        lon: userLocation.longitude,
        displayName: t('route.currentLocation'),
        type: 'current_location',
        importance: 1,
      };
      onSelect(result);
      onClose();
    }
  };

  const handleSelectResult = async (result: GeocodingResult) => {
    // Save to history (async, don't block)
    addToHistory(result);
    onSelect(result);
    onClose();
  };

  const renderResultItem = ({ item }: { item: GeocodingResult }, isRecent: boolean = false) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectResult(item)}>
      <View style={[styles.resultIcon, isRecent && styles.recentIcon]}>
        <Text style={styles.resultIconText}>
          {isRecent ? '🕐' : item.type === 'house' || item.type === 'building' ? '🏠' : '📍'}
        </Text>
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultText} numberOfLines={1}>
          {item.shortAddress || item.displayName}
        </Text>
        {item.city && !item.shortAddress?.includes(item.city) && (
          <Text style={styles.resultSubtext} numberOfLines={1}>
            {item.city}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderRecentItem = ({ item }: { item: SearchHistoryItem }) => renderResultItem({ item }, true);
  const renderSearchItem = ({ item }: { item: GeocodingResult }) => renderResultItem({ item }, false);

  // Show recent searches when no query, otherwise show search results
  const showRecentSearches = searchQuery.length === 0 && recentSearches.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalOverlayTouchable}>
          <TouchableOpacity
            style={styles.dismissArea}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('route.enterAddress')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={false}
              />
              {isSearching && (
                <ActivityIndicator
                  style={styles.searchingIndicator}
                  size="small"
                  color={colors.primary}
                />
              )}
            </View>

            {/* Use Current Location Button */}
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={handleUseCurrentLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.currentLocationIcon}>📍</Text>
                  <Text style={styles.currentLocationText}>
                    {t('route.useCurrentLocation')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Recent Searches Section */}
            {showRecentSearches && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{t('route.recentSearches')}</Text>
                <FlatList
                  data={recentSearches}
                  keyExtractor={(item, index) => `recent-${item.lat}-${item.lon}-${index}`}
                  renderItem={renderRecentItem}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Results List */}
            {!showRecentSearches && (
              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.lat}-${item.lon}-${index}`}
                renderItem={renderSearchItem}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    {searchQuery.length < 3 ? (
                      <Text style={styles.emptyText}>{t('route.typeMoreCharacters')}</Text>
                    ) : searchError ? (
                      <Text style={styles.emptyText}>{searchError}</Text>
                    ) : isSearching ? (
                      <ActivityIndicator size="large" color={colors.primary} />
                    ) : null}
                  </View>
                }
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalOverlayTouchable: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    dismissArea: {
      flex: 1,
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
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    searchContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: 'relative',
    },
    searchInput: {
      backgroundColor: colors.inputBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      paddingRight: 40,
    },
    searchingIndicator: {
      position: 'absolute',
      right: 28,
      top: 28,
    },
    currentLocationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      backgroundColor: colors.buttonBackground,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    currentLocationIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    currentLocationText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    resultIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.buttonBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    resultIconText: {
      fontSize: 20,
    },
    resultTextContainer: {
      flex: 1,
    },
    resultText: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 4,
      fontWeight: '500',
    },
    resultSubtext: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 2,
    },
    resultType: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
    sectionContainer: {
      paddingTop: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      paddingHorizontal: 16,
      paddingVertical: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    recentIcon: {
      backgroundColor: colors.primaryLight || colors.buttonBackground,
    },
  });
