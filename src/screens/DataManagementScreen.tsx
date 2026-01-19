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
import {
  downloadAndImportGTFS,
  getGTFSImportStatus,
  isGTFSDataAvailable,
} from '../core/gtfs-downloader';
import { clearAllData } from '../core/database';

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
  const [hasData, setHasData] = useState(false);
  const [dataCounts, setDataCounts] = useState({ stops: 0, routes: 0, trips: 0 });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>('downloading');
  const [importProgress, setImportProgress] = useState(0);

  useEffect(() => {
    checkDataStatus();
  }, []);

  const checkDataStatus = async () => {
    try {
      setLoading(true);
      const status = await getGTFSImportStatus();
      setHasData(status.hasData);
      setDataCounts(status.counts);
    } catch (error) {
      console.error('[DataManagement] Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportGTFS = async () => {
    Alert.alert(
      t('data.importRealData'),
      t('data.importWarning'),
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

              const result = await downloadAndImportGTFS((stage, progress) => {
                setImportStage(stage as ImportStage);
                setImportProgress(progress);
              });

              Alert.alert(
                t('common.success'),
                `${t('data.importSuccess')}\n\n` +
                  `${t('transit.stops')}: ${result.stops}\n` +
                  `${t('transit.lines')}: ${result.routes}\n` +
                  `${t('transit.trips')}: ${result.trips}`
              );

              await checkDataStatus();
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
              await checkDataStatus();
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

  if (loading) {
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
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {t('data.currentData')}
          </Text>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
              {t('common.status')}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: hasData ? colors.success : colors.destructive },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {hasData ? t('data.dataLoaded') : t('data.noData')}
              </Text>
            </View>
          </View>

          {hasData && (
            <>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.stops}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {t('transit.stops')}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.routes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
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
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {STAGE_LABELS[importStage]}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${importProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
              {Math.round(importProgress * 100)}%
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
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
                {hasData ? t('data.updateData') : t('data.importRealData')}
              </Text>
            )}
          </TouchableOpacity>

          {hasData && !importing && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              onPress={handleClearData}
            >
              <Text style={styles.actionButtonText}>{t('data.clearData')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.muted }]}>
          <Text style={[styles.infoIcon]}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
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
