/**
 * Data Management Screen
 * Manage İzmir GTFS data import and updates
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
import { downloadAndImportAllIzmir } from '../core/gtfs-downloader';
import { clearAllData, getAllStops, getAllRoutes } from '../core/database';

type ImportStage =
  | 'downloading'
  | 'extracting'
  | 'parsing'
  | 'validating'
  | 'clearing'
  | 'importing';

const STAGE_LABELS: Record<string, { tr: string; en: string }> = {
  downloading: { tr: 'İndiriliyor...', en: 'Downloading...' },
  extracting: { tr: 'Çıkarılıyor...', en: 'Extracting...' },
  parsing: { tr: 'Analiz ediliyor...', en: 'Parsing...' },
  validating: { tr: 'Doğrulanıyor...', en: 'Validating...' },
  clearing: { tr: 'Temizleniyor...', en: 'Clearing...' },
  importing: { tr: 'Aktarılıyor...', en: 'Importing...' },
};

export function DataManagementScreen() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const { isLoaded, lastUpdate, source, checking, markAsLoaded, refresh } = useGTFSData();
  const [dataCounts, setDataCounts] = useState({ stops: 0, routes: 0 });
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<string>('downloading');
  const [importProgress, setImportProgress] = useState(0);
  const [currentSource, setCurrentSource] = useState<string | undefined>();

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

  const getStageLabel = (stage: string): string => {
    const lang = i18n.language === 'tr' ? 'tr' : 'en';
    return STAGE_LABELS[stage]?.[lang] || stage;
  };

  const handleImportGTFS = async () => {
    const warningText = i18n.language === 'tr'
      ? 'İzmir toplu taşıma verileri indirilecek (ESHOT Otobüs, Metro, Tramvay, İZBAN, Vapur).\n\nBu işlem internet bağlantısı gerektirir ve birkaç dakika sürebilir.\n\nDevam etmek istiyor musunuz?'
      : 'İzmir transit data will be downloaded (ESHOT Bus, Metro, Tram, İZBAN, Ferry).\n\nThis requires an internet connection and may take a few minutes.\n\nContinue?';

    Alert.alert(
      i18n.language === 'tr' ? 'Verileri İndir' : 'Download Data',
      warningText,
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.language === 'tr' ? 'İndir' : 'Download',
          onPress: async () => {
            try {
              setImporting(true);
              setImportProgress(0);

              const result = await downloadAndImportAllIzmir((stage, progress, sourceName) => {
                setImportStage(stage);
                setImportProgress(progress);
                setCurrentSource(sourceName);
              });

              await markAsLoaded('İzmir');

              const successText = i18n.language === 'tr'
                ? `Veriler başarıyla yüklendi!\n\nDurak: ${result.stops.toLocaleString()}\nHat: ${result.routes}\nSefer: ${result.trips.toLocaleString()}\nHareket: ${result.stopTimes.toLocaleString()}`
                : `Data imported successfully!\n\nStops: ${result.stops.toLocaleString()}\nRoutes: ${result.routes}\nTrips: ${result.trips.toLocaleString()}\nStop Times: ${result.stopTimes.toLocaleString()}`;

              Alert.alert(t('common.success'), successText);

              await loadDataCounts();
            } catch (error) {
              console.error('[DataManagement] Import error:', error);
              const errorText = i18n.language === 'tr'
                ? 'Veri indirme başarısız:\n\n'
                : 'Import failed:\n\n';
              Alert.alert(t('common.error'), errorText + (error as Error).message);
            } finally {
              setImporting(false);
              setImportProgress(0);
              setCurrentSource(undefined);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleClearData = () => {
    const warningText = i18n.language === 'tr'
      ? 'Tüm veriler silinecek. Bu işlem geri alınamaz.'
      : 'All data will be deleted. This cannot be undone.';

    Alert.alert(
      i18n.language === 'tr' ? 'Verileri Sil' : 'Clear Data',
      warningText,
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
              const successText = i18n.language === 'tr' ? 'Veriler silindi' : 'Data cleared';
              Alert.alert(t('common.success'), successText);
              await refresh();
              setDataCounts({ stops: 0, routes: 0 });
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
        <ScreenHeader title={i18n.language === 'tr' ? 'Veri Yönetimi' : 'Data Management'} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={i18n.language === 'tr' ? 'Veri Yönetimi' : 'Data Management'} showBack />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: '#0D47A1' }]}>
          <Text style={styles.headerTitle}>İzmir Transit</Text>
          <Text style={styles.headerSubtitle}>ESHOT Otobüs • Metro • Tramvay • İZBAN • Vapur</Text>
        </View>

        {/* Current Data Status */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {i18n.language === 'tr' ? 'Mevcut Veriler' : 'Current Data'}
          </Text>

          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              {t('common.status')}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isLoaded ? '#10B981' : '#EF4444' },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {isLoaded
                  ? (i18n.language === 'tr' ? 'Yüklendi' : 'Loaded')
                  : (i18n.language === 'tr' ? 'Veri Yok' : 'No Data')}
              </Text>
            </View>
          </View>

          {isLoaded && (
            <>
              {source && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'tr' ? 'Kaynak:' : 'Source:'}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {source}
                  </Text>
                </View>
              )}

              {lastUpdate && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'tr' ? 'Son güncelleme:' : 'Last update:'}
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {lastUpdate.toLocaleDateString(i18n.language)}
                  </Text>
                </View>
              )}

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.stops.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'tr' ? 'Durak' : 'Stops'}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {dataCounts.routes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {i18n.language === 'tr' ? 'Hat' : 'Routes'}
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
              {getStageLabel(importStage)}
            </Text>
            {currentSource && (
              <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
                {currentSource}
              </Text>
            )}
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
          {/* Download İzmir Data */}
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
                {isLoaded
                  ? (i18n.language === 'tr' ? '🔄 Verileri Güncelle' : '🔄 Update Data')
                  : (i18n.language === 'tr' ? '📥 İzmir Verilerini İndir' : '📥 Download İzmir Data')}
              </Text>
            )}
          </TouchableOpacity>

          {isLoaded && !importing && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={handleClearData}
            >
              <Text style={styles.actionButtonText}>
                {i18n.language === 'tr' ? '🗑️ Verileri Sil' : '🗑️ Clear Data'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.buttonBackground }]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {i18n.language === 'tr'
              ? 'Veriler Metro, Tramvay, İZBAN, Vapur (GTFS) ve ESHOT Otobüs (açık veri portalı) kaynaklarından indirilir. İlk indirme birkaç dakika sürebilir.'
              : 'Data is downloaded from Metro, Tram, İZBAN, Ferry (GTFS) and ESHOT Bus (open data portal). First download may take a few minutes.'}
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
  headerCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
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
  sourceText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
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
