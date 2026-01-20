# Transit App - Guide de Développement Complet

Ce document contient **tous les prompts** à utiliser avec Claude Code pour construire l'app complète.

**Claude Code** : Tu peux exécuter les étapes une par une. Chaque étape contient un prompt complet avec les instructions détaillées.

---

## 📊 ROADMAP GLOBALE

| Phase | Nom | Étapes | Status |
|-------|-----|--------|--------|
| 0 | Fondations | 1-5 | ✅ Terminé |
| 1 | Interface de Base | 6-9 | ✅ Terminé |
| 2 | Temps Réel & Itinéraire | 10-13 | ✅ Terminé |
| 3 | Polish & Features | 14-17 | ✅ Terminé |
| 4 | Features Critiques | 18-22 | 🔄 En cours |
| 5 | Polish & Growth | 23-27 | ⏳ À faire |
| 6 | Expansion | 28-30 | ⏳ À faire |

---

## ✅ PHASE 0 : FONDATIONS (TERMINÉ)

- [x] Étape 1 : Setup Expo + NativeWind + TypeScript
- [x] Étape 2 : Composants UI de base (Button, Card, Input, Badge, LineCard, StopCard, SearchBar)
- [x] Étape 3 : Parser GTFS statique (papaparse)
- [x] Étape 4 : Base SQLite locale (expo-sqlite)
- [x] Étape 5 : Interface Adapter + Adapter Paris

---

## ✅ PHASE 1 : INTERFACE DE BASE (TERMINÉ)

- [x] Étape 6 : Carte avec arrêts (react-native-maps)
- [x] Étape 7 : Liste des lignes + filtres + navigation
- [x] Étape 8 : Détails d'un arrêt + prochains passages
- [x] Étape 9 : Recherche arrêts/lignes avec debounce

---

## ✅ PHASE 2 : TEMPS RÉEL & ITINÉRAIRE (TERMINÉ)

- [x] Étape 10 : Temps réel SIRI-Lite (IDFM)
- [x] Étape 11 : Bottom sheet (@gorhom/bottom-sheet)
- [x] Étape 12 : Calcul d'itinéraire basique (Dijkstra)
- [x] Étape 13 : Alertes et perturbations

---

## ✅ PHASE 3 : POLISH & FEATURES (TERMINÉ)

- [x] Étape 14 : Favoris (AsyncStorage)
- [x] Étape 15 : Internationalisation i18n (FR/EN/TR)
- [x] Étape 16 : Dark mode (NativeWind)
- [x] Étape 17 : Header/Safe Area + Mode Hors Ligne + DateTimePicker + GTFS Management

---

### Étape 17 : Header/Safe Area + Mode Hors Ligne (TERMINÉ)

```
Implémente un header propre avec Safe Area sur tous les écrans ET le mode hors ligne.

=== PARTIE 1 : SAFE AREA + HEADER ===

1. Installe react-native-safe-area-context si pas déjà fait :
npx expo install react-native-safe-area-context

2. Crée src/components/ui/ScreenHeader.tsx :

import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, showBack = false, rightElement }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View
      className="bg-background border-b border-border"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between h-14 px-4">
        {/* Left - Back button */}
        <View className="w-10">
          {showBack && (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text className="text-2xl text-transit-primary">←</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <Text className="text-lg font-bold text-foreground flex-1 text-center" numberOfLines={1}>
          {title}
        </Text>

        {/* Right - Custom element */}
        <View className="w-10 items-end">
          {rightElement}
        </View>
      </View>
    </View>
  );
}

3. Crée src/components/ui/ScreenContainer.tsx :

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({ children, edges = ['bottom'] }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
      }}
    >
      {children}
    </View>
  );
}

4. Mets à jour App.tsx pour wrapper avec SafeAreaProvider :

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  // ... existing code
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NetworkProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppNavigator />
          </GestureHandlerRootView>
        </NetworkProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

5. Mets à jour AppNavigator.tsx :
Dans tous les Stack.Navigator, ajoute : screenOptions={{ headerShown: false }}

6. Mets à jour TOUS les écrans pour utiliser ScreenHeader + ScreenContainer :

LinesScreen.tsx :
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useTranslation } from 'react-i18next';

export function LinesScreen() {
  const { t } = useTranslation();
  return (
    <ScreenContainer>
      <ScreenHeader title={t('tabs.lines')} />
      {/* ... reste du contenu */}
    </ScreenContainer>
  );
}

SearchScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('tabs.search')} />
  {/* ... */}
</ScreenContainer>

FavoritesScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('tabs.favorites')} />
  {/* ... */}
</ScreenContainer>

SettingsScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('settings.title')} />
  {/* ... */}
</ScreenContainer>

RouteScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('tabs.route')} />
  {/* ... */}
</ScreenContainer>

AlertsScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('alerts.title')} showBack />
  {/* ... */}
</ScreenContainer>

StopDetailsScreen.tsx :
<ScreenContainer>
  <ScreenHeader
    title={stop?.name || t('common.loading')}
    showBack
    rightElement={<FavoriteButton isFavorite={isFav} onToggle={handleToggleFavorite} />}
  />
  {/* ... */}
</ScreenContainer>

LineDetailsScreen.tsx :
<ScreenContainer>
  <ScreenHeader
    title={route?.shortName || t('common.loading')}
    showBack
    rightElement={<FavoriteButton isFavorite={isFav} onToggle={handleToggleFavorite} />}
  />
  {/* ... */}
</ScreenContainer>

RouteDetailsScreen.tsx :
<ScreenContainer>
  <ScreenHeader title={t('route.title')} showBack />
  {/* ... */}
</ScreenContainer>

7. Pour MapScreen (header flottant transparent sur la carte) :

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View className="flex-1">
      {/* Carte plein écran */}
      <TransitMap stops={stops} onStopPress={handleStopPress} />

      {/* Header flottant semi-transparent */}
      <View
        className="absolute left-0 right-0 bg-background/90 border-b border-border"
        style={{ top: 0, paddingTop: insets.top }}
      >
        <View className="h-12 px-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">{t('tabs.map')}</Text>

          {/* Badge alertes si présentes */}
          {severeAlerts.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Alerts')}
              className="bg-red-500 rounded-full px-3 py-1 flex-row items-center"
            >
              <Text className="text-white font-bold">⚠️ {severeAlerts.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom sheet */}
      <BottomSheet ... />
    </View>
  );
}

=== PARTIE 2 : MODE HORS LIGNE ===

8. Installe NetInfo :
npx expo install @react-native-community/netinfo

9. Crée src/hooks/useNetworkStatus.ts :

import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: isConnected === false || isInternetReachable === false,
  };
}

10. Crée src/components/ui/OfflineBanner.tsx :

import { View, Text } from 'react-native';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View className="bg-orange-500 py-2 px-4">
      <Text className="text-white text-center font-medium">
        📡 Mode hors ligne - Données temps réel indisponibles
      </Text>
    </View>
  );
}

11. Crée src/contexts/NetworkContext.tsx :

import React, { createContext, useContext, ReactNode } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkContextType {
  isOffline: boolean;
  isConnected: boolean | null;
}

const NetworkContext = createContext<NetworkContextType>({ isOffline: false, isConnected: null });

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { isOffline, isConnected } = useNetworkStatus();

  return (
    <NetworkContext.Provider value={{ isOffline, isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

12. Mets à jour App.tsx pour wrapper avec NetworkProvider (voir étape 4 ci-dessus).

13. Mets à jour les écrans pour afficher OfflineBanner après le ScreenHeader :

MapScreen.tsx, StopDetailsScreen.tsx, AlertsScreen.tsx :

import { useNetwork } from '../contexts/NetworkContext';
import { OfflineBanner } from '../components/ui/OfflineBanner';

const { isOffline } = useNetwork();

// Dans le return, juste après ScreenHeader :
<ScreenContainer>
  <ScreenHeader title="..." />
  <OfflineBanner visible={isOffline} />
  {/* ... reste du contenu */}
</ScreenContainer>

14. Mets à jour StopDetailsScreen.tsx pour le mode offline :

const { isOffline } = useNetwork();

// Charge les départs avec le flag offline
const departures = await adapter.getNextDepartures(stopId, isOffline);

// Désactive l'auto-refresh si offline
useEffect(() => {
  if (isOffline) return;
  const interval = setInterval(loadDepartures, 30000);
  return () => clearInterval(interval);
}, [isOffline]);

// Dans le render, affiche le mode :
<View className="flex-row items-center mb-2">
  {isOffline ? (
    <Text className="text-muted-foreground">⏱️ Horaires théoriques (hors ligne)</Text>
  ) : (
    <Text className="text-green-600">🔴 Temps réel</Text>
  )}
</View>

15. Mets à jour src/adapters/paris/paris-adapter.ts :

async getNextDepartures(stopId: string, isOffline: boolean = false): Promise<NextDeparture[]> {
  // Si offline, retourne directement les horaires théoriques
  if (isOffline) {
    console.log('Offline mode: using theoretical schedules');
    return this.getTheoreticalDepartures(stopId);
  }

  try {
    const realtime = await fetchNextDepartures(stopId);
    if (realtime.length > 0) {
      return realtime;
    }
  } catch (error) {
    console.warn('SIRI fetch failed, falling back to theoretical:', error);
  }

  return this.getTheoreticalDepartures(stopId);
}

16. Mets à jour AlertsScreen.tsx pour le mode offline :

const { isOffline } = useNetwork();

// Si offline et pas d'alertes en cache
{isOffline && alerts.length === 0 && (
  <View className="flex-1 items-center justify-center p-4">
    <Text className="text-muted-foreground text-center">
      📡 Alertes non disponibles hors ligne
    </Text>
  </View>
)}

// Si offline avec alertes en cache
{isOffline && alerts.length > 0 && (
  <View className="bg-orange-100 dark:bg-orange-900 p-2 rounded-lg mx-4 mb-2">
    <Text className="text-orange-800 dark:text-orange-200 text-center text-sm">
      📡 Données en cache
    </Text>
  </View>
)}

17. Ajoute dans SettingsScreen.tsx une section "Données" :

<View className="mt-6">
  <Text className="text-lg font-semibold text-foreground mb-2">
    {t('settings.dataSource')}
  </Text>
  <View className="bg-card rounded-lg p-4">
    <Text className="text-foreground">IDFM - Île-de-France Mobilités</Text>
    <Text className="text-muted-foreground text-sm mt-1">
      {isOffline ? '📡 Hors ligne' : '✅ Connecté'}
    </Text>
  </View>
</View>
```

---

## 🔄 PHASE 4 : FEATURES CRITIQUES (EN COURS)

- [x] Étape 18 : Chargement Données GTFS Réelles (infrastructure complète)
- [ ] **Étape 19 : Routing Adresse → Adresse (Géocodage)** ← PROCHAINE
- [ ] Étape 19b : Filtres de Routing & Itinéraires Multiples
- [ ] Étape 20 : Publicités AdMob
- [ ] Étape 21 : Notifications Push
- [ ] Étape 22 : Analytics + Crash Reporting

---

### Étape 18 : Chargement Données GTFS Réelles (TERMINÉ)

```
Implémente le téléchargement et chargement des vraies données GTFS d'IDFM.

1. Crée src/core/gtfs-loader.ts avec les fonctions :
- downloadGTFS(url: string): Promise<string> - Télécharge le ZIP GTFS
- extractGTFS(zipPath: string): Promise<string> - Extrait le ZIP avec expo-file-system
- loadGTFSToDatabase(): Promise<void> - Parse tous les fichiers et insère dans SQLite

2. Crée src/screens/DataLoadingScreen.tsx :
Un écran de chargement initial qui affiche une progress bar avec étapes :
- "Téléchargement des données..." (0-30%)
- "Extraction..." (30-50%)
- "Chargement des arrêts..." (50-60%)
- "Chargement des lignes..." (60-70%)
- "Chargement des horaires..." (70-95%)
- "Finalisation..." (95-100%)

3. Dans App.tsx, vérifie si les données sont chargées :
- Si @gtfs_loaded n'existe pas dans AsyncStorage, affiche DataLoadingScreen
- Sinon, affiche l'app normale

4. Dans SettingsScreen, ajoute "Mettre à jour les données" qui :
- Affiche la date de dernière mise à jour
- Propose de recharger si > 7 jours

Note : GTFS IDFM disponible sur https://prim.iledefrance-mobilites.fr
```

### Étape 19 : Routing Adresse → Adresse (Géocodage)

```
Implémente le routing depuis une adresse vers une adresse (pas seulement arrêt → arrêt).

1. Crée src/core/geocoding.ts avec Nominatim (OpenStreetMap, gratuit) :

export async function geocodeAddress(query: string): Promise<{lat: number, lon: number, displayName: string}[]>
export async function reverseGeocode(lat: number, lon: number): Promise<string>

2. Crée src/core/nearby-stops.ts :

export async function findNearbyStops(lat: number, lon: number, radiusMeters: number = 500): Promise<Stop[]>

3. Mets à jour src/core/routing.ts avec :

export async function findRouteFromAddresses(fromAddress: string, toAddress: string, departureTime: Date): Promise<JourneyResult[]>
- Géocode les adresses
- Trouve les arrêts proches
- Calcule l'itinéraire avec marche au début/fin

4. Installe expo-location :
npx expo install expo-location

5. Crée src/hooks/useLocation.ts pour "Ma position"

6. Mets à jour RouteScreen.tsx :
- Toggle "Adresse" / "Arrêt"
- Bouton "📍 Ma position" qui géolocalise l'utilisateur
- Autocomplete avec Nominatim pour les adresses
```

### Étape 19b : Filtres de Routing & Itinéraires Multiples

```
Ajoute des filtres de routing avancés et affiche plusieurs itinéraires alternatifs.

=== PARTIE 1 : FILTRES DE ROUTING ===

1. Crée src/types/routing-preferences.ts :

export interface RoutingPreferences {
  // Modes de transport autorisés
  allowedModes: {
    metro: boolean;
    bus: boolean;
    tram: boolean;
    train: boolean;  // RER, Transilien
    walking: boolean;
  };

  // Critères d'optimisation
  optimizeFor: 'fastest' | 'least-transfers' | 'least-walking' | 'most-accessible';

  // Limites
  maxTransfers: number;      // 0-5, -1 = illimité
  maxWalkingDistance: number; // en mètres (500-2000)
  maxWaitingTime: number;     // en minutes

  // Options d'accessibilité
  wheelchair: boolean;
  avoidStairs: boolean;
}

export const DEFAULT_PREFERENCES: RoutingPreferences = {
  allowedModes: {
    metro: true,
    bus: true,
    tram: true,
    train: true,
    walking: true,
  },
  optimizeFor: 'fastest',
  maxTransfers: -1,
  maxWalkingDistance: 1000,
  maxWaitingTime: 15,
  wheelchair: false,
  avoidStairs: false,
};

2. Mets à jour src/core/routing.ts pour prendre en compte les préférences :

export async function findMultipleRoutes(
  fromStopId: string,
  toStopId: string,
  departureTime: Date,
  preferences: RoutingPreferences = DEFAULT_PREFERENCES,
  maxRoutes: number = 3
): Promise<JourneyResult[]> {
  const routes: JourneyResult[] = [];

  // Calcule 3 variantes :
  // 1. Le plus rapide (fastest)
  // 2. Le moins de changements (least-transfers)
  // 3. Le moins de marche (least-walking)

  // Pour chaque variante, applique les filtres :
  // - Filtre les modes de transport selon allowedModes
  // - Respecte maxTransfers
  // - Respecte maxWalkingDistance
  // - Filtre les lignes non accessibles si wheelchair = true

  return routes.sort((a, b) => {
    // Tri selon optimizeFor
    if (preferences.optimizeFor === 'fastest') {
      return a.duration - b.duration;
    } else if (preferences.optimizeFor === 'least-transfers') {
      return a.legs.length - b.legs.length;
    } else if (preferences.optimizeFor === 'least-walking') {
      const aWalk = a.legs.filter(l => l.mode === 'WALK').reduce((sum, l) => sum + (l.distance || 0), 0);
      const bWalk = b.legs.filter(l => l.mode === 'WALK').reduce((sum, l) => sum + (l.distance || 0), 0);
      return aWalk - bWalk;
    }
    return 0;
  });
}

// Fonction helper pour filtrer les lignes
function filterByMode(route: GtfsRoute, allowedModes: RoutingPreferences['allowedModes']): boolean {
  const routeType = route.type;
  if (routeType === 1 && !allowedModes.metro) return false;       // Metro
  if (routeType === 3 && !allowedModes.bus) return false;         // Bus
  if (routeType === 0 && !allowedModes.tram) return false;        // Tram
  if (routeType === 2 && !allowedModes.train) return false;       // Train/RER
  return true;
}

3. Crée src/components/routing/RouteFiltersModal.tsx :

import { View, Text, Modal, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoutingPreferences, DEFAULT_PREFERENCES } from '../../types/routing-preferences';
import { Button } from '../ui/Button';

interface RouteFiltersModalProps {
  visible: boolean;
  preferences: RoutingPreferences;
  onClose: () => void;
  onApply: (preferences: RoutingPreferences) => void;
}

export function RouteFiltersModal({ visible, preferences, onClose, onApply }: RouteFiltersModalProps) {
  const { t } = useTranslation();
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleReset = () => {
    setLocalPrefs(DEFAULT_PREFERENCES);
  };

  const handleApply = () => {
    onApply(localPrefs);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="border-b border-border p-4">
          <Text className="text-xl font-bold text-foreground">{t('routing.filters.title')}</Text>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Modes de transport */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {t('routing.filters.transportModes')}
            </Text>
            {[
              { key: 'metro', icon: 'Ⓜ️', label: t('routing.filters.metro') },
              { key: 'bus', icon: '🚌', label: t('routing.filters.bus') },
              { key: 'tram', icon: '🚊', label: t('routing.filters.tram') },
              { key: 'train', icon: '🚆', label: t('routing.filters.train') },
            ].map((mode) => (
              <View key={mode.key} className="flex-row items-center justify-between py-3 border-b border-border">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{mode.icon}</Text>
                  <Text className="text-foreground">{mode.label}</Text>
                </View>
                <Switch
                  value={localPrefs.allowedModes[mode.key as keyof typeof localPrefs.allowedModes]}
                  onValueChange={(value) =>
                    setLocalPrefs({
                      ...localPrefs,
                      allowedModes: { ...localPrefs.allowedModes, [mode.key]: value }
                    })
                  }
                />
              </View>
            ))}
          </View>

          {/* Optimiser pour */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {t('routing.filters.optimizeFor')}
            </Text>
            {[
              { value: 'fastest', label: t('routing.filters.fastest'), icon: '⚡' },
              { value: 'least-transfers', label: t('routing.filters.leastTransfers'), icon: '🔄' },
              { value: 'least-walking', label: t('routing.filters.leastWalking'), icon: '🚶' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                className={`flex-row items-center p-3 rounded-lg mb-2 ${
                  localPrefs.optimizeFor === option.value
                    ? 'bg-transit-primary'
                    : 'bg-card border border-border'
                }`}
                onPress={() => setLocalPrefs({ ...localPrefs, optimizeFor: option.value as any })}
              >
                <Text className="text-2xl mr-2">{option.icon}</Text>
                <Text className={localPrefs.optimizeFor === option.value ? 'text-white font-bold' : 'text-foreground'}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nombre max de changements */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {t('routing.filters.maxTransfers')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {[0, 1, 2, 3, -1].map((num) => (
                <TouchableOpacity
                  key={num}
                  className={`px-4 py-2 rounded-lg ${
                    localPrefs.maxTransfers === num
                      ? 'bg-transit-primary'
                      : 'bg-card border border-border'
                  }`}
                  onPress={() => setLocalPrefs({ ...localPrefs, maxTransfers: num })}
                >
                  <Text className={localPrefs.maxTransfers === num ? 'text-white font-bold' : 'text-foreground'}>
                    {num === -1 ? t('routing.filters.unlimited') : num.toString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Accessibilité */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-foreground mb-3">
              {t('routing.filters.accessibility')}
            </Text>
            <View className="flex-row items-center justify-between py-3 border-b border-border">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-2">♿</Text>
                <Text className="text-foreground">{t('routing.filters.wheelchair')}</Text>
              </View>
              <Switch
                value={localPrefs.wheelchair}
                onValueChange={(value) => setLocalPrefs({ ...localPrefs, wheelchair: value })}
              />
            </View>
          </View>
        </ScrollView>

        {/* Footer buttons */}
        <View className="border-t border-border p-4 flex-row gap-2">
          <Button onPress={handleReset} variant="outline" className="flex-1">
            {t('common.reset')}
          </Button>
          <Button onPress={handleApply} className="flex-1">
            {t('common.apply')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

=== PARTIE 2 : ITINÉRAIRES MULTIPLES ===

4. Mets à jour src/types/routing.ts pour inclure les métadonnées :

export interface JourneyResult {
  legs: Leg[];
  duration: number;            // en minutes
  departureTime: Date;
  arrivalTime: Date;
  transfers: number;           // nombre de changements
  totalWalkingDistance: number; // en mètres
  co2Saved?: number;           // en grammes (vs voiture)
  calories?: number;           // brûlées en marchant

  // Nouveau : score de recommandation
  score?: number;              // 0-100, pour trier les résultats
  tags?: string[];             // ex: ['fastest', 'least-walking', 'eco-friendly']
}

5. Crée src/components/routing/RouteOptionCard.tsx :

import { View, Text, TouchableOpacity } from 'react-native';
import { JourneyResult } from '../../types/routing';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '../../utils/date';

interface RouteOptionCardProps {
  route: JourneyResult;
  onPress: () => void;
  isSelected?: boolean;
}

export function RouteOptionCard({ route, onPress, isSelected }: RouteOptionCardProps) {
  const { t } = useTranslation();

  // Calcule les icônes des modes de transport
  const modeIcons = route.legs
    .filter(leg => leg.mode !== 'WALK')
    .map(leg => {
      if (leg.route?.shortName) return leg.route.shortName;
      return leg.mode === 'METRO' ? 'Ⓜ️' : '🚌';
    })
    .slice(0, 3); // Max 3 icônes

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-card rounded-lg p-4 mb-3 border-2 ${
        isSelected ? 'border-transit-primary' : 'border-transparent'
      }`}
    >
      {/* Tags */}
      {route.tags && route.tags.length > 0 && (
        <View className="flex-row gap-2 mb-2">
          {route.tags.map((tag) => (
            <View key={tag} className="bg-transit-primary/10 px-2 py-1 rounded-full">
              <Text className="text-transit-primary text-xs font-bold">
                {t(`routing.tags.${tag}`)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Horaires & Durée */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-3">
          <Text className="text-2xl font-bold text-foreground">
            {route.departureTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text className="text-muted-foreground">→</Text>
          <Text className="text-2xl font-bold text-foreground">
            {route.arrivalTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View className="bg-transit-primary rounded-full px-3 py-1">
          <Text className="text-white font-bold">{formatDuration(route.duration)}</Text>
        </View>
      </View>

      {/* Lignes utilisées */}
      <View className="flex-row items-center gap-2 mb-2">
        {modeIcons.map((icon, index) => (
          <View key={index} className="bg-background rounded px-2 py-1">
            <Text className="text-foreground font-bold text-sm">{icon}</Text>
          </View>
        ))}
        {route.legs.length > 4 && (
          <Text className="text-muted-foreground text-sm">
            +{route.legs.length - 3}
          </Text>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row items-center gap-4">
        {route.transfers > 0 && (
          <View className="flex-row items-center">
            <Text className="text-muted-foreground mr-1">🔄</Text>
            <Text className="text-muted-foreground text-sm">
              {route.transfers} {t('routing.transfers')}
            </Text>
          </View>
        )}
        {route.totalWalkingDistance > 0 && (
          <View className="flex-row items-center">
            <Text className="text-muted-foreground mr-1">🚶</Text>
            <Text className="text-muted-foreground text-sm">
              {Math.round(route.totalWalkingDistance)}m
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

6. Mets à jour RouteScreen.tsx pour afficher plusieurs options :

import { RouteOptionCard } from '../components/routing/RouteOptionCard';
import { RouteFiltersModal } from '../components/routing/RouteFiltersModal';
import { useState } from 'react';
import { DEFAULT_PREFERENCES } from '../types/routing-preferences';

export function RouteScreen() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [showFilters, setShowFilters] = useState(false);
  const [routes, setRoutes] = useState<JourneyResult[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<JourneyResult | null>(null);

  const handleCalculateRoutes = async () => {
    setLoading(true);
    const results = await findMultipleRoutes(
      fromStopId,
      toStopId,
      departureTime,
      preferences,
      3 // Calcule 3 itinéraires
    );
    setRoutes(results);
    setSelectedRoute(results[0] || null);
    setLoading(false);
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title={t('tabs.route')}
        rightElement={
          <TouchableOpacity onPress={() => setShowFilters(true)}>
            <Text className="text-2xl">⚙️</Text>
          </TouchableOpacity>
        }
      />

      {/* ... formulaire de recherche ... */}

      {/* Résultats multiples */}
      {routes.length > 0 && (
        <ScrollView className="flex-1 p-4">
          <Text className="text-lg font-bold text-foreground mb-3">
            {t('routing.availableRoutes', { count: routes.length })}
          </Text>
          {routes.map((route, index) => (
            <RouteOptionCard
              key={index}
              route={route}
              isSelected={selectedRoute === route}
              onPress={() => {
                setSelectedRoute(route);
                // Navigate vers RouteDetailsScreen avec cette route
                navigation.navigate('RouteDetails', { route });
              }}
            />
          ))}
        </ScrollView>
      )}

      <RouteFiltersModal
        visible={showFilters}
        preferences={preferences}
        onClose={() => setShowFilters(false)}
        onApply={setPreferences}
      />
    </ScreenContainer>
  );
}

7. Ajoute les traductions dans src/i18n/locales/fr.json :

{
  "routing": {
    "filters": {
      "title": "Préférences d'itinéraire",
      "transportModes": "Moyens de transport",
      "metro": "Métro",
      "bus": "Bus",
      "tram": "Tramway",
      "train": "Train / RER",
      "optimizeFor": "Optimiser pour",
      "fastest": "Le plus rapide",
      "leastTransfers": "Moins de changements",
      "leastWalking": "Moins de marche",
      "maxTransfers": "Changements maximum",
      "unlimited": "Illimité",
      "accessibility": "Accessibilité",
      "wheelchair": "Accessible en fauteuil roulant"
    },
    "tags": {
      "fastest": "⚡ Plus rapide",
      "least-transfers": "🔄 Moins de changements",
      "least-walking": "🚶 Moins de marche",
      "eco-friendly": "🌱 Écologique"
    },
    "transfers": "changement(s)",
    "availableRoutes": "{{count}} itinéraires disponibles"
  }
}

8. Sauvegarde les préférences dans AsyncStorage pour les réutiliser :

import AsyncStorage from '@react-native-async-storage/async-storage';

// Dans RouteScreen
useEffect(() => {
  loadPreferences();
}, []);

async function loadPreferences() {
  const saved = await AsyncStorage.getItem('@routing_preferences');
  if (saved) {
    setPreferences(JSON.parse(saved));
  }
}

async function savePreferences(prefs: RoutingPreferences) {
  setPreferences(prefs);
  await AsyncStorage.setItem('@routing_preferences', JSON.stringify(prefs));
}
```

### Étape 20 : Publicités AdMob

```
Intègre Google AdMob pour la monétisation.

1. Installe expo-ads-admob :
npx expo install expo-ads-admob

2. Crée src/config/ads.ts avec les IDs de test et production

3. Crée src/components/ads/BannerAd.tsx

4. Crée src/hooks/useInterstitialAd.ts (affiche une pub tous les 3 itinéraires)

5. Place les bannières en bas de :
- MapScreen
- StopDetailsScreen
- RouteScreen

6. Configure app.json avec les IDs AdMob

7. Optionnel : Prépare un bouton "Premium - Supprimer les pubs"
```

### Étape 21 : Notifications Push

```
Implémente les notifications push pour les alertes sur lignes favorites.

1. Installe expo-notifications :
npx expo install expo-notifications expo-device

2. Crée src/services/notifications.ts :
- registerForPushNotifications()
- scheduleAlertNotification(alert)

3. Crée src/hooks/useNotifications.ts pour écouter les clics sur notifications

4. Crée un service de vérification des alertes pour les lignes favorites

5. Ajoute un toggle dans SettingsScreen pour activer/désactiver
```

### Étape 22 : Analytics + Crash Reporting

```
Intègre analytics (Amplitude) et crash reporting (Sentry).

1. Installe :
npx expo install expo-analytics-amplitude
npm install @sentry/react-native

2. Crée src/services/analytics.ts :
- initAnalytics()
- trackEvent(name, properties)

3. Crée src/services/crash-reporting.ts :
- initCrashReporting()
- captureException(error, context)

4. Track les events importants :
- app_opened, search_performed, route_calculated, favorite_added, etc.

5. Wrap les appels API avec try/catch et captureException
```

---

## ⏳ PHASE 5 : POLISH & GROWTH

### Étape 23 : Onboarding / Tutorial

```
Crée un écran d'onboarding pour les nouveaux utilisateurs.

1. Crée src/screens/OnboardingScreen.tsx avec 3-4 slides :
- "Bienvenue sur Transit App"
- "Trouvez votre itinéraire"
- "Temps réel et alertes"
- "Ajoutez vos favoris"

2. Bouton "Commencer" qui sauvegarde @onboarding_done

3. Dans App.tsx, affiche OnboardingScreen si première fois
```

### Étape 24 : Historique des Recherches

```
Sauvegarde et affiche l'historique des recherches récentes.

1. Crée src/core/search-history.ts :
- Sauvegarde les 10 dernières recherches
- Structure : { query, type, timestamp, result }

2. Dans SearchScreen, affiche l'historique quand le champ est vide

3. Bouton pour effacer l'historique dans les paramètres
```

### Étape 25 : Traduction Alertes (DeepL)

```
Traduis automatiquement les alertes dans la langue de l'utilisateur.

1. Crée src/services/translation.ts avec DeepL Free API

2. Cache les traductions dans AsyncStorage

3. Dans AlertsScreen, traduis si langue != FR
```

### Étape 26 : Widget iOS/Android

```
Crée un widget pour afficher les prochains passages sur l'écran d'accueil.

1. Utilise expo-widgets ou react-native-widget-extension

2. Affiche 2-3 arrêts favoris avec prochains passages

3. Mise à jour toutes les 15 minutes
```

### Étape 27 : Partage d'Itinéraire

```
Permet de partager un itinéraire calculé.

1. Installe expo-sharing :
npx expo install expo-sharing

2. Dans RouteDetailsScreen, bouton "Partager" qui :
- Génère un texte résumé
- Ouvre le menu de partage natif
```

---

## ⏳ PHASE 6 : EXPANSION

### Étape 28 : Adapter Ville #2 (Bucarest)

```
Crée un nouvel adapter pour valider la portabilité.

1. Télécharge le GTFS de Bucarest (gtfs.ro ou MobilityDatabase)

2. Crée src/adapters/bucharest/ :
- config.ts
- bucharest-adapter.ts
- Client GTFS-RT si disponible

3. Teste sans modifier le core
```

### Étape 29 : Multi-Villes dans l'App

```
Permet à l'utilisateur de choisir sa ville.

1. Sélecteur de ville dans les paramètres

2. Stocke la ville active dans AsyncStorage

3. Recharge l'adapter au changement
```

### Étape 30 : Vélos/Trottinettes Libre-Service

```
Intègre les vélos et trottinettes en libre-service.

1. Utilise l'API GBFS (standard vélos partagés)

2. Affiche les stations sur la carte

3. Intègre dans le calcul d'itinéraire multimodal
```

---

## 📋 COMMANDES UTILES

```bash
# Développement
npx expo start
npx expo start --clear

# Tests
npm test
npm run type-check

# Build
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Soumission stores
eas submit --platform android
eas submit --platform ios
```

---

## 🔑 VARIABLES D'ENVIRONNEMENT (.env)

```env
EXPO_PUBLIC_IDFM_API_KEY=xxx           # API IDFM temps réel
EXPO_PUBLIC_ADMOB_APP_ID_IOS=xxx       # AdMob iOS
EXPO_PUBLIC_ADMOB_APP_ID_ANDROID=xxx   # AdMob Android
EXPO_PUBLIC_AMPLITUDE_KEY=xxx          # Analytics
EXPO_PUBLIC_SENTRY_DSN=xxx             # Crash reporting
EXPO_PUBLIC_DEEPL_KEY=xxx              # Traduction alertes
```

---

## 📚 RESSOURCES

- [Expo Documentation](https://docs.expo.dev)
- [React Native Reusables](https://reactnativereusables.com)
- [NativeWind](https://www.nativewind.dev)
- [GTFS Spec](https://gtfs.org)
- [IDFM Open Data](https://prim.iledefrance-mobilites.fr)
- [Nominatim API](https://nominatim.org/release-docs/latest/api/Search/)
- [AdMob](https://admob.google.com)
- [Sentry](https://sentry.io)
- [Amplitude](https://amplitude.com)

---

**Dernière mise à jour** : Janvier 2025
**Status** : Phase 4 en cours (Étape 19)
