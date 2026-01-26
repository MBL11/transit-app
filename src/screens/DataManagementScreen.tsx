/**
 * Data Management Screen
 * Manage GTFS data import and updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useThemeColors } from '../hooks/useThemeColors';
import { useGTFSData } from '../hooks/useGTFSData';
import {
  downloadAndImportGTFS,
  GTFS_SOURCES,
  type GTFSSourceKey,
} from '../core/gtfs-downloader';
import { clearAllData, getAllStops, getAllRoutes } from '../core/database';
import { loadTestData, type LoadingProgress } from '../core/load-test-data';

type ImportStage =
  | 'downloading'
  | 'extracting'
  | 'parsing'
  | 'validating'
  | 'clearing'
  | 'importing';

const STAGE_LABELS: Record<ImportStage, string> = {
  downloading: 'Downloading GTFS...',
  extracting: 'Extracting files...',
  parsing: 'Parsing data...',
  validating: 'Validating...',
  clearing: 'Clearing old data...',
  importing: 'Importing to database...',
};

export function DataManagementScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { isLoaded, lastUpdate, source, checking, markAsLoaded, refresh } = useGTFSData();
  const [dataCounts, setDataCounts] = useState({ stops: 0, routes: 0 });
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>('downloading');
  const [importProgress, setImportProgress] = useState(0);
  const [selectedSource, setSelectedSource] = useState<GTFSSourceKey>('IDFM');

  useEffect(() => {
    if (isLoaded) {
      loadDataCounts();
    }
  }, [isLoaded]);

  const loadDataCounts = async () => {
    try {
      const [stops, routes] = await Promise.all([getAllStops(), getAllRoutes()]);
      setDataCounts({ stops: stops.length, routes: routes.length });
    } catch (error) {
      console.error('[DataManagement] Error loading counts:', error);
    }
  };

  const handleImportGTFS = async () => {
    const sourceInfo = GTFS_SOURCES[selectedSource];
    Alert.alert(
      t('data.importRealData'),
      `${t('data.importWarning')}\n\nCity: ${sourceInfo.name}\nSize: ${sourceInfo.size}`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('data.import'),
          onPress: async () => {
            try {
              setImporting(true);
              setImportProgress(0);

              const result = await downloadAndImportGTFS(selectedSource, (stage, progress) => {
                setImportStage(stage as ImportStage);
                setImportProgress(progress);
              });

              await markAsLoaded(sourceInfo.name);

              Alert.alert(
                t('common.success'),
                `${t('data.importSuccess')}\n\n` +
                  `${t('transit.stops')}: ${result.stops}\n` +
                  `${t('transit.lines')}: ${result.routes}`
              );

              await loadDataCounts();
            } catch (error) {
              console.error('[DataManagement] Import error:', error);
              Alert.alert(
                t('common.error'),
                t('data.importFailed') + '\n\n' + (error as Error).message
              );
            } finally {
              setImporting(false);
              setImportProgress(0);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleLoadTestData = async () => {
    Alert.alert(
      '🚇 Charger données test',
      'Ceci va charger des données réalistes du métro parisien (lignes 1, 4, 14, RER A, Bus 38) pour tester l\'application.\n\nContinuer ?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: 'Charger',
          onPress: async () => {
            try {
              setImporting(true);
              setImportProgress(0);

              const result = await loadTestData((progress: LoadingProgress) => {
                setImportStage(progress.stage as ImportStage);
                setImportProgress(progress.progress);
              });

              await markAsLoaded('Paris Metro Test Data');

              Alert.alert(
                t('common.success'),
                `Données test chargées !\n\n` +
                  `${t('transit.stops')}: ${result.stops}\n` +
                  `${t('transit.lines')}: ${result.routes}\n` +
                  `Trajets: ${result.trips}\n` +
                  `Horaires: ${result.stopTimes}`
              );

              await loadDataCounts();
            } catch (error) {
              console.error('[DataManagement] Test data error:', error);
              Alert.alert(
                t('common.error'),
                'Erreur lors du chargement des données test:\n\n' + (error as Error).message
              );
            } finally {
              setImporting(false);
              setImportProgress(0);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleClearData = () => {
    Alert.alert(
      t('data.clearData'),
      t('data.clearWarning'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              clearAllData();
              Alert.alert(t('common.success'), t('data.dataCleared'));
              await refresh();
            } catch (error) {
              console.error('[DataManagement] Clear error:', error);
              Alert.alert(t('common.error'), t('data.clearFailed'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (checking) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('data.title')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={t('data.title')} showBack />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Current Data Status */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('data.currentData')}
          </Text>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t('common.status')}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isLoaded ? colors.success : colors.error },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {isLoaded ? t('data.dataLoaded') : t('data.noData')}
              </Text>
            </View>
          </View>

          {isLoaded && (
            <>
              {source && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Source:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {source}
                  </Text>
                </View>
              )}

              {lastUpdate && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Last update:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {lastUpdate.toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.stops}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('transit.stops')}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.routes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {t('transit.lines')}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Import Progress */}
        {importing && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {STAGE_LABELS[importStage]}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.buttonBackground }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${importProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {Math.round(importProgress * 100)}%
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {/* Test Data Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: '#10B981' },
              importing && styles.actionButtonDisabled,
            ]}
            onPress={handleLoadTestData}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                🚇 Charger données test (Métro Paris)
              </Text>
            )}
          </TouchableOpacity>

          {/* Real GTFS Import Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              importing && styles.actionButtonDisabled,
            ]}
            onPress={handleImportGTFS}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                {isLoaded ? t('data.updateData') : t('data.importRealData')}
              </Text>
            )}
          </TouchableOpacity>

          {isLoaded && !importing && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error || '#DC2626' }]}
              onPress={handleClearData}
            >
              <Text style={styles.actionButtonText}>{t('data.clearData')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.buttonBackground }]}>
          <Text style={[styles.infoIcon]}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {t('data.infoMessage')}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
