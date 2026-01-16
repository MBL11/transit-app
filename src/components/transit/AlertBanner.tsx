/**
 * AlertBanner Component
 * Displays a service alert/disruption banner
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import type { Alert } from '../../core/types/adapter';

interface AlertBannerProps {
  alert: Alert;
  onPress?: () => void;
}

export function AlertBanner({ alert, onPress }: AlertBannerProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (alert.url) {
      Linking.openURL(alert.url).catch(err => console.error('Failed to open URL:', err));
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
      style={[styles.container, severityStyles.container]}
      onPress={isClickable ? handlePress : undefined}
      disabled={!isClickable}
      activeOpacity={isClickable ? 0.7 : 1}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{severityStyles.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{alert.title}</Text>
        {alert.description && (
          <Text style={styles.description} numberOfLines={2}>
            {alert.description}
          </Text>
        )}
        {alert.affectedRoutes && alert.affectedRoutes.length > 0 && (
          <Text style={styles.affected}>
            Lignes affectées : {alert.affectedRoutes.join(', ')}
          </Text>
        )}
      </View>
      {isClickable && (
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
  icon: {
    fontSize: 24,
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
  arrowContainer: {
    justifyContent: 'center',
    marginLeft: 8,
  },
  arrow: {
    fontSize: 24,
    color: '#000',
  },
});
