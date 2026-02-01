/**
 * Alerts Screen
 * Displays all active service alerts and disruptions
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { AlertBanner } from '../components/transit/AlertBanner';
import { useAlerts } from '../hooks';
import { useNetwork } from '../contexts/NetworkContext';
import { useThemeColors } from '../hooks/useThemeColors';
import type { Alert } from '../core/types/adapter';
import { trackEvent, AnalyticsEvents } from '../services/analytics';

export function AlertsScreen() {
  const { t, i18n } = useTranslation();
  const { isOffline } = useNetwork();
  const { alerts, loading, refresh } = useAlerts();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleAlertPress = (alert: Alert) => {
    trackEvent(AnalyticsEvents.ALERT_VIEWED, { alertId: alert.id, severity: alert.severity, affectedRoutes: alert.affectedRoutes });
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedAlert(null);
  };

  // Map i18n language codes to BCP 47 locale tags for date formatting
  const getDateLocale = (): string => {
    const localeMap: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-GB',
      tr: 'tr-TR',
      es: 'es-ES',
      ru: 'ru-RU',
    };
    return localeMap[i18n.language] || i18n.language;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(getDateLocale(), {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && alerts.length === 0) {
    return (
      <ScreenContainer>
        <ScreenHeader title={t('alerts.title')} showBack />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title={t('alerts.title')} showBack />
      <OfflineBanner visible={isOffline} />
      <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertBanner alert={item} compact={false} onPress={() => handleAlertPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>{t('alerts.noAlerts')}</Text>
            <Text style={styles.emptySubtext}>{t('alerts.normalTraffic')}</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('alerts.details')}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedAlert && (
              <ScrollView style={styles.modalBody}>
                <AlertBanner alert={selectedAlert} compact={false} />

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{t('alerts.startTime')}</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedAlert.startTime)}</Text>
                </View>

                {selectedAlert.endTime && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{t('alerts.endTime')}</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedAlert.endTime)}</Text>
                  </View>
                )}

                {selectedAlert.affectedRoutes && selectedAlert.affectedRoutes.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{t('alerts.affectedLines')}</Text>
                    <Text style={styles.detailValue}>{selectedAlert.affectedRoutes.join(', ')}</Text>
                  </View>
                )}

                {selectedAlert.affectedStops && selectedAlert.affectedStops.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>{t('alerts.affectedStops')}</Text>
                    <Text style={styles.detailValue}>{t('alerts.stopsCount', { count: selectedAlert.affectedStops.length })}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      </View>
    </ScreenContainer>
  );
}

const createStyles = (colors: ReturnType<typeof import('../hooks/useThemeColors').useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    listContent: {
      padding: 16,
    },
    emptyContainer: {
      paddingVertical: 60,
      alignItems: 'center',
    },
    emptyIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
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
      backgroundColor: colors.borderLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 20,
      color: colors.textSecondary,
    },
    modalBody: {
      padding: 16,
    },
    detailSection: {
      marginTop: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
    },
    detailValue: {
      fontSize: 16,
      color: colors.text,
    },
  });
