/**
 * AlertBanner Component
 * Displays a service alert/disruption banner
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import type { Alert } from '../../core/types/adapter';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

interface AlertBannerProps {
  alert: Alert;
  compact?: boolean; // true = version courte pour les listes
  onPress?: () => void;
}

export function AlertBanner({ alert, compact = false, onPress }: AlertBannerProps) {
  const { t } = useTranslation();
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (alert.url) {
      Linking.openURL(alert.url).catch(err => logger.error('Failed to open URL:', err));
    }
  };

  const getSeverityStyles = () => {
    switch (alert.severity) {
      case 'severe':
        return {
          container: styles.severeBg,
          icon: '🚨',
          iconColor: '#FFF',
        };
      case 'warning':
        return {
          container: styles.warningBg,
          icon: '⚠️',
          iconColor: '#000',
        };
      case 'info':
      default:
        return {
          container: styles.infoBg,
          icon: 'ℹ️',
          iconColor: '#000',
        };
    }
  };

  const severityStyles = getSeverityStyles();
  const isClickable = onPress || alert.url;

  return (
    <TouchableOpacity
      style={[styles.container, severityStyles.container, compact && styles.containerCompact]}
      onPress={isClickable ? handlePress : undefined}
      disabled={!isClickable}
      activeOpacity={isClickable ? 0.7 : 1}
    >
      <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
        <Text style={[styles.icon, compact && styles.iconCompact]}>{severityStyles.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : undefined}>
          {alert.title}
        </Text>
        {alert.description && !compact && (
          <Text style={styles.description}>
            {alert.description}
          </Text>
        )}
        {alert.affectedRoutes && alert.affectedRoutes.length > 0 && alert.affectedRoutes.length < 5 && (
          <View style={styles.badgesContainer}>
            {alert.affectedRoutes.map((route, index) => (
              <View key={index} style={[styles.badge, compact && styles.badgeCompact]}>
                <Text style={[styles.badgeText, compact && styles.badgeTextCompact]}>{route}</Text>
              </View>
            ))}
          </View>
        )}
        {alert.affectedRoutes && alert.affectedRoutes.length >= 5 && (
          <Text style={[styles.affected, compact && styles.affectedCompact]}>
            {t('transit.affectedLinesCount', { count: alert.affectedRoutes.length })}
          </Text>
        )}
        {onPress && compact && (
          <Text style={styles.seeMore}>{t('alerts.seeMore')}</Text>
        )}
      </View>
      {isClickable && !compact && (
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  containerCompact: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 0,
  },
  severeBg: {
    backgroundColor: '#DC143C',
  },
  warningBg: {
    backgroundColor: '#FFD700',
  },
  infoBg: {
    backgroundColor: '#87CEEB',
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  iconContainerCompact: {
    marginRight: 6,
  },
  icon: {
    fontSize: 24,
  },
  iconCompact: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  titleCompact: {
    fontSize: 13,
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  affected: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
  },
  affectedCompact: {
    fontSize: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  badgeTextCompact: {
    fontSize: 10,
  },
  seeMore: {
    fontSize: 11,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 4,
  },
  arrowContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#000',
  },
});
