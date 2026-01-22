/**
 * Diagnostic Screen
 * Simple screen to test basic rendering without hooks
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useAdapter } from '../hooks/useAdapter';
import * as db from '../core/database';

export function DiagnosticScreen() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const { adapter, loading: adapterLoading, error: adapterError } = useAdapter();

  const addLog = (message: string) => {
    console.log('[Diagnostic]', message);
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].slice(0, 8)} - ${message}`]);
  };

  useEffect(() => {
    addLog('DiagnosticScreen mounted');
    addLog(`Adapter loading: ${adapterLoading}`);
    addLog(`Adapter error: ${adapterError?.message || 'none'}`);
    addLog(`Adapter ready: ${!!adapter}`);
  }, []);

  useEffect(() => {
    if (!adapterLoading) {
      addLog('Adapter loading finished');
      if (adapter) {
        addLog('Adapter is ready');
        checkDatabase();
      } else if (adapterError) {
        addLog(`Adapter error: ${adapterError.message}`);
      }
    }
  }, [adapterLoading, adapter, adapterError]);

  const checkDatabase = async () => {
    try {
      addLog('Checking database...');
      const stats = db.getDatabaseStats();
      addLog(`Database stats - Stops: ${stats.stops}, Routes: ${stats.routes}`);
      const isEmpty = db.isDatabaseEmpty();
      addLog(`Database empty: ${isEmpty}`);
    } catch (error: any) {
      addLog(`Database check error: ${error.message}`);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader title="🔧 Diagnostic" />
      <ScrollView className="flex-1 p-4">
        <View className="bg-card rounded-lg p-4 mb-4">
          <Text className="text-foreground font-bold text-lg mb-2">
            App Status
          </Text>
          <View className="flex-row items-center mb-2">
            <View className={`w-3 h-3 rounded-full mr-2 ${adapter ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <Text className="text-foreground">
              Adapter: {adapterLoading ? 'Loading...' : adapter ? 'Ready' : 'Not Ready'}
            </Text>
          </View>
          {adapterError && (
            <Text className="text-red-500 mt-2">
              Error: {adapterError.message}
            </Text>
          )}
        </View>

        <View className="bg-card rounded-lg p-4">
          <Text className="text-foreground font-bold text-lg mb-2">
            Logs
          </Text>
          {logs.map((log, index) => (
            <Text key={index} className="text-sm text-muted-foreground font-mono mb-1">
              {log}
            </Text>
          ))}
          {logs.length === 0 && (
            <ActivityIndicator size="small" color="#0066CC" />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
