/**
 * Data Loading Screen
 * Shows progress while downloading and importing GTFS data
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { downloadAndImportGTFS, GTFS_SOURCES, type GTFSSourceKey } from '../core/gtfs-downloader';
import { useThemeColors } from '../hooks/useThemeColors';

interface DataLoadingScreenProps {
  onComplete: (sourceName: string) => void;
  source?: GTFSSourceKey;
}

const STAGE_LABELS: Record<string, { fr: string; en: string }> = {
  downloading: { fr: 'Téléchargement des données...', en: 'Downloading data...' },
  extracting: { fr: 'Extraction des fichiers...', en: 'Extracting files...' },
  parsing: { fr: 'Analyse des données GTFS...', en: 'Parsing GTFS data...' },
  validating: { fr: 'Validation des données...', en: 'Validating data...' },
  clearing: { fr: 'Préparation de la base de données...', en: 'Preparing database...' },
  importing: { fr: 'Importation dans la base de données...', en: 'Importing to database...' },
};

export function DataLoadingScreen({ onComplete, source = 'IDFM' }: DataLoadingScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { t, i18n } = useTranslation();
  const [stage, setStage] = useState('downloading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ stops: number; routes: number; trips: number; stopTimes: number } | null>(null);

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

      const result = await downloadAndImportGTFS(source, (currentStage, currentProgress) => {
        setStage(currentStage);
        setProgress(currentProgress);
      });

      setStats(result);
      setStage('complete');
      setProgress(1);

      // Wait a bit then complete
      setTimeout(() => {
        onComplete(GTFS_SOURCES[source].name);
      }, 2000);

    } catch (err) {
      console.error('[DataLoadingScreen] Failed to load GTFS:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStageLabel = (stageName: string): string => {
    const lang = i18n.language === 'fr' ? 'fr' : 'en';
    return STAGE_LABELS[stageName]?.[lang] || stageName;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Transit App</Text>
        <Text style={styles.subtitle}>{GTFS_SOURCES[source].name}</Text>

        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sourceInfo}>
          <Text style={styles.sourceText}>
            {t('data.importWarning')}
          </Text>
        </View>
      </View>
    );
  }

  if (stage === 'complete' && stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Transit App</Text>
        <Text style={styles.subtitle}>{GTFS_SOURCES[source].name}</Text>

        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successText}>{t('data.importSuccess')}</Text>
          <Text style={styles.statsText}>
            {stats.stops} {t('transit.stops')}{'\n'}
            {stats.routes} {t('transit.routes')}{'\n'}
            {stats.trips} {t('transit.trips')}{'\n'}
            {stats.stopTimes.toLocaleString()} stop times
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transit App</Text>
      <Text style={styles.subtitle}>{GTFS_SOURCES[source].name}</Text>

      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 24 }} />

        <Text style={styles.stageText}>{getStageLabel(stage)}</Text>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
      </View>

      <View style={styles.sourceInfo}>
        <Text style={styles.sourceText}>
          {GTFS_SOURCES[source].size}
        </Text>
      </View>
    </View>
  );
}
