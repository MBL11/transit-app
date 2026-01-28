/**
 * Data Loading Screen
 * Shows progress while downloading and importing GTFS data
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { downloadAndImportAllIzmir, GTFS_SOURCES } from '../core/gtfs-downloader';
import { useThemeColors } from '../hooks/useThemeColors';

interface DataLoadingScreenProps {
  onComplete: (sourceName: string) => void;
}

const STAGE_LABELS: Record<string, { tr: string; fr: string; en: string }> = {
  downloading: { tr: 'Veriler indiriliyor...', fr: 'Téléchargement des données...', en: 'Downloading data...' },
  extracting: { tr: 'Dosyalar çıkarılıyor...', fr: 'Extraction des fichiers...', en: 'Extracting files...' },
  parsing: { tr: 'GTFS verileri analiz ediliyor...', fr: 'Analyse des données GTFS...', en: 'Parsing GTFS data...' },
  validating: { tr: 'Veriler doğrulanıyor...', fr: 'Validation des données...', en: 'Validating data...' },
  clearing: { tr: 'Veritabanı hazırlanıyor...', fr: 'Préparation de la base de données...', en: 'Preparing database...' },
  importing: { tr: 'Veritabanına aktarılıyor...', fr: 'Importation dans la base de données...', en: 'Importing to database...' },
};

export function DataLoadingScreen({ onComplete }: DataLoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState('downloading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ stops: number; routes: number; trips: number; stopTimes: number } | null>(null);
  const [currentSource, setCurrentSource] = useState<string | undefined>(undefined);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      paddingTop: insets.top + 24,
      paddingBottom: insets.bottom + 24,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 40,
    },
    errorContainer: {
      alignItems: 'center',
      width: '100%',
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    errorText: {
      color: '#DC143C',
      textAlign: 'center',
      marginBottom: 24,
      fontSize: 14,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      alignItems: 'center',
      width: '100%',
    },
    stageText: {
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
      fontSize: 16,
    },
    progressBarContainer: {
      width: '100%',
      height: 8,
      backgroundColor: colors.buttonBackground,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    progressText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    sourceInfo: {
      marginTop: 40,
      alignItems: 'center',
    },
    sourceText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    successContainer: {
      alignItems: 'center',
      width: '100%',
    },
    successIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    successText: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    statsText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setStage('downloading');
      setProgress(0);
      setCurrentSource(undefined);

      const result = await downloadAndImportAllIzmir((currentStage, currentProgress, sourceName) => {
        setStage(currentStage);
        setProgress(currentProgress);
        setCurrentSource(sourceName);
      });

      setStats(result);
      setStage('complete');
      setProgress(1);

      // Wait a bit then complete
      setTimeout(() => {
        onComplete('İzmir');
      }, 2000);

    } catch (err) {
      console.error('[DataLoadingScreen] Failed to load GTFS:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStageLabel = (stageName: string): string => {
    let lang: 'tr' | 'fr' | 'en' = 'tr';
    if (i18n.language === 'fr') lang = 'fr';
    else if (i18n.language === 'en') lang = 'en';
    return STAGE_LABELS[stageName]?.[lang] || stageName;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>İzmir Transit</Text>
        <Text style={styles.subtitle}>ESHOT • Metro • İZBAN</Text>

        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sourceInfo}>
          <Text style={styles.sourceText}>
            {i18n.language === 'tr' ? 'İnternet bağlantınızı kontrol edin' : t('data.importWarning')}
          </Text>
        </View>
      </View>
    );
  }

  if (stage === 'complete' && stats) {
    const successText = i18n.language === 'tr' ? 'Veriler başarıyla yüklendi!' : t('data.importSuccess');
    return (
      <View style={styles.container}>
        <Text style={styles.title}>İzmir Transit</Text>
        <Text style={styles.subtitle}>ESHOT • Metro • İZBAN</Text>

        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>{successText}</Text>
          <Text style={styles.statsText}>
            {stats.stops} {i18n.language === 'tr' ? 'durak' : t('transit.stops')}{'\n'}
            {stats.routes} {i18n.language === 'tr' ? 'hat' : t('transit.routes')}{'\n'}
            {stats.trips} {i18n.language === 'tr' ? 'sefer' : t('transit.trips')}{'\n'}
            {stats.stopTimes.toLocaleString()} {i18n.language === 'tr' ? 'kalkış saati' : 'stop times'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>İzmir Transit</Text>
      <Text style={styles.subtitle}>ESHOT • Metro • İZBAN</Text>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 24 }} />

        <Text style={styles.stageText}>{getStageLabel(stage)}</Text>

        {currentSource && (
          <Text style={[styles.sourceText, { marginBottom: 16 }]}>
            {currentSource}
          </Text>
        )}

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
      </View>

      <View style={styles.sourceInfo}>
        <Text style={styles.sourceText}>
          {i18n.language === 'tr' ? 'İlk yükleme biraz zaman alabilir' : 'First load may take a few minutes'}
        </Text>
      </View>
    </View>
  );
}
