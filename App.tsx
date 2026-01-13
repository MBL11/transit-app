import { StatusBar } from 'expo-status-bar';
import { Text, View, ScrollView } from 'react-native';
import { useState } from 'react';
import { Button } from './src/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './src/components/ui/card';
import { Badge } from './src/components/ui/badge';
import { Separator } from './src/components/ui/separator';
import { Input } from './src/components/ui/input';
import { Alert } from './src/components/ui/alert';
import { Skeleton } from './src/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './src/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from './src/components/ui/sheet';
import { LineCard } from './src/components/transit/LineCard';
import { StopCard } from './src/components/transit/StopCard';
import { SearchBar } from './src/components/transit/SearchBar';
import {
  initializeDatabase,
  dropAllTables,
  getDatabaseStats,
  isDatabaseEmpty,
  insertStops,
  insertRoutes,
  insertTrips,
  insertStopTimes,
  getAllStops,
  getStopById,
  getRoutesByStopId,
  searchStops
} from './src/core/database';
import './global.css';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dbTestStatus, setDbTestStatus] = useState<string>('');
  const [dbStats, setDbStats] = useState<any>(null);

  // Test database initialization
  const testDatabaseInit = async () => {
    try {
      setDbTestStatus('🔄 Initializing database...');

      await initializeDatabase();

      const stats = getDatabaseStats();
      const isEmpty = isDatabaseEmpty();

      setDbStats(stats);
      setDbTestStatus(`✅ Database initialized!\nEmpty: ${isEmpty}\nStops: ${stats.stops}, Routes: ${stats.routes}, Trips: ${stats.trips}, Stop Times: ${stats.stopTimes}`);
    } catch (error) {
      setDbTestStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Reset database
  const resetDatabase = async () => {
    try {
      setDbTestStatus('🔄 Resetting database...');

      await dropAllTables();
      await initializeDatabase();

      const stats = getDatabaseStats();
      setDbStats(stats);

      setDbTestStatus(`✅ Database reset!\nStops: ${stats.stops}, Routes: ${stats.routes}, Trips: ${stats.trips}, Stop Times: ${stats.stopTimes}`);
    } catch (error) {
      setDbTestStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Test CRUD operations
  const testCRUD = async () => {
    try {
      setDbTestStatus('🔄 Testing CRUD operations...\n');

      // 1. Initialize database
      await initializeDatabase();
      setDbTestStatus((prev) => prev + '✅ Database initialized\n');

      // 2. Insert test data
      const testStops = [
        { id: 'CHAT', name: 'Châtelet', lat: 48.8584, lon: 2.3470, locationType: 1 },
        { id: 'GARE', name: 'Gare du Nord', lat: 48.8809, lon: 2.3553, locationType: 1 },
        { id: 'REPU', name: 'République', lat: 48.8673, lon: 2.3636, locationType: 1 },
      ];
      await insertStops(testStops);
      setDbTestStatus((prev) => prev + '✅ 3 stops inserted\n');

      const testRoutes = [
        { id: 'M1', shortName: '1', longName: 'Ligne 1', type: 1, color: '#FFCD00', textColor: '#000000' },
        { id: 'M4', shortName: '4', longName: 'Ligne 4', type: 1, color: '#A0006E', textColor: '#FFFFFF' },
      ];
      await insertRoutes(testRoutes);
      setDbTestStatus((prev) => prev + '✅ 2 routes inserted\n');

      const testTrips = [
        { id: 'T1', routeId: 'M1', serviceId: 'WD', headsign: 'La Défense', directionId: 0 },
        { id: 'T2', routeId: 'M4', serviceId: 'WD', headsign: 'Porte de Clignancourt', directionId: 0 },
      ];
      await insertTrips(testTrips);
      setDbTestStatus((prev) => prev + '✅ 2 trips inserted\n');

      const testStopTimes = [
        { tripId: 'T1', stopId: 'CHAT', arrivalTime: '08:00:00', departureTime: '08:00:30', stopSequence: 1 },
        { tripId: 'T1', stopId: 'REPU', arrivalTime: '08:05:00', departureTime: '08:05:30', stopSequence: 2 },
        { tripId: 'T2', stopId: 'CHAT', arrivalTime: '08:10:00', departureTime: '08:10:30', stopSequence: 1 },
        { tripId: 'T2', stopId: 'GARE', arrivalTime: '08:15:00', departureTime: '08:15:30', stopSequence: 2 },
      ];
      await insertStopTimes(testStopTimes);
      setDbTestStatus((prev) => prev + '✅ 4 stop times inserted\n\n');

      // 3. Test queries
      const allStops = await getAllStops();
      setDbTestStatus((prev) => prev + `✅ getAllStops(): ${allStops.length} stops\n`);

      const chatelet = await getStopById('CHAT');
      setDbTestStatus((prev) => prev + `✅ getStopById('CHAT'): ${chatelet?.name}\n`);

      const routesAtChatelet = await getRoutesByStopId('CHAT');
      setDbTestStatus((prev) => prev + `✅ getRoutesByStopId('CHAT'): ${routesAtChatelet.length} routes (${routesAtChatelet.map(r => r.shortName).join(', ')})\n`);

      const searchResults = await searchStops('gare');
      setDbTestStatus((prev) => prev + `✅ searchStops('gare'): ${searchResults.length} results (${searchResults.map(s => s.name).join(', ')})\n\n`);

      // 4. Show final stats
      const stats = getDatabaseStats();
      setDbTestStatus((prev) => prev + `📊 Final stats:\nStops: ${stats.stops}, Routes: ${stats.routes}, Trips: ${stats.trips}, Stop Times: ${stats.stopTimes}`);

    } catch (error) {
      setDbTestStatus((prev) => prev + `\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <ScrollView className="flex-1">
        <View className="p-6 gap-6">
          {/* Header */}
          <View className="items-center pt-8">
            <Text className="text-4xl font-bold text-transit-primary mb-2">
              Transit App
            </Text>
            <Text className="text-base text-gray-600 text-center">
              Composants UI avec React Native Reusables ✅
            </Text>
          </View>

          <Separator />

          {/* Database Test */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Database Test</Text>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Init DB" onPress={testDatabaseInit} />
              </View>
              <View className="flex-1">
                <Button label="Reset DB" variant="destructive" onPress={resetDatabase} />
              </View>
            </View>
            <Button label="Test CRUD" variant="secondary" onPress={testCRUD} />
            {dbTestStatus ? (
              <Card>
                <CardContent className="p-3">
                  <Text className="text-gray-900 dark:text-white font-mono text-sm">
                    {dbTestStatus}
                  </Text>
                </CardContent>
              </Card>
            ) : null}
          </View>

          <Separator />

          {/* Search Bar */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Search Bar</Text>
            <SearchBar
              placeholder="Rechercher un arrêt, une ligne..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </View>

          <Separator />

          {/* Transit Components */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Transit Components</Text>

            <LineCard
              lineNumber="1"
              lineName="Ligne 1"
              lineColor="#FFCD00"
              direction="La Défense"
              type="metro"
              onPress={() => console.log('Line pressed')}
            />

            <LineCard
              lineNumber="42"
              lineName="Bus 42"
              lineColor="#00AA55"
              direction="Gare du Nord"
              type="bus"
            />

            <StopCard
              stopName="Châtelet"
              stopCode="1234"
              lines={[
                { lineNumber: '1', lineColor: '#FFCD00', type: 'metro' },
                { lineNumber: '4', lineColor: '#A0006E', type: 'metro' },
                { lineNumber: '7', lineColor: '#FA9ABA', type: 'metro' },
                { lineNumber: '11', lineColor: '#704B1C', type: 'metro' },
                { lineNumber: '14', lineColor: '#62259D', type: 'metro' },
              ]}
              distance={150}
              onPress={() => console.log('Stop pressed')}
            />
          </View>

          <Separator />

          {/* Buttons */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Buttons</Text>
            <Button label="Primary Button" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Outline" variant="outline" />
            <Button label="Open Sheet" onPress={() => setSheetOpen(true)} />
          </View>

          <Separator />

          {/* Input */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Input</Text>
            <Input
              label="Nom de l'arrêt"
              placeholder="Ex: Châtelet"
            />
            <Input
              label="Code postal"
              placeholder="75001"
              error="Code postal invalide"
            />
          </View>

          <Separator />

          {/* Alerts */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Alerts</Text>
            <Alert
              variant="info"
              title="Information"
              description="Le trafic est normal sur toutes les lignes."
            />
            <Alert
              variant="warning"
              title="Perturbation"
              description="Trafic ralenti sur la ligne 1 en raison de travaux."
            />
            <Alert
              variant="destructive"
              title="Alerte"
              description="Trafic interrompu sur la ligne 13."
            />
          </View>

          <Separator />

          {/* Tabs */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Tabs</Text>
            <Tabs defaultValue="metro">
              <TabsList>
                <TabsTrigger value="metro" label="Métro" />
                <TabsTrigger value="bus" label="Bus" />
                <TabsTrigger value="tram" label="Tram" />
              </TabsList>
              <TabsContent value="metro">
                <Card>
                  <CardContent className="p-4">
                    <Text className="text-gray-900 dark:text-white">
                      Contenu Métro
                    </Text>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="bus">
                <Card>
                  <CardContent className="p-4">
                    <Text className="text-gray-900 dark:text-white">
                      Contenu Bus
                    </Text>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="tram">
                <Card>
                  <CardContent className="p-4">
                    <Text className="text-gray-900 dark:text-white">
                      Contenu Tram
                    </Text>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </View>

          <Separator />

          {/* Skeletons */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Skeletons (Loading)</Text>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
            <View className="flex-row gap-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 flex-1" />
            </View>
          </View>

          <Separator />

          {/* Badges */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Badges</Text>
            <View className="flex-row gap-2 flex-wrap">
              <Badge label="Default" />
              <Badge label="Secondary" variant="secondary" />
              <Badge label="Success" variant="success" />
              <Badge label="Destructive" variant="destructive" />
              <Badge label="Outline" variant="outline" />
            </View>
          </View>

          <Separator />

          {/* Palette de couleurs */}
          <View className="gap-3 mb-8">
            <Text className="text-xl font-semibold mb-2">Color Palette</Text>
            <View className="gap-2">
              <View className="p-4 bg-transit-primary rounded-lg">
                <Text className="text-white font-semibold">Primary (#0066CC)</Text>
              </View>
              <View className="p-4 bg-transit-metro rounded-lg">
                <Text className="text-white font-semibold">Métro (#003366)</Text>
              </View>
              <View className="p-4 bg-transit-bus rounded-lg">
                <Text className="text-white font-semibold">Bus (#00AA55)</Text>
              </View>
              <View className="p-4 bg-transit-tram rounded-lg">
                <Text className="text-white font-semibold">Tram (#CC0000)</Text>
              </View>
              <View className="p-4 bg-transit-rer rounded-lg">
                <Text className="text-white font-semibold">RER (#7B68EE)</Text>
              </View>
              <View className="p-4 bg-transit-alert rounded-lg">
                <Text className="text-white font-semibold">Alert (#FF6600)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sheet Demo */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetHeader>
          <SheetTitle>Détails de l'arrêt</SheetTitle>
          <SheetDescription>
            Informations sur l'arrêt Châtelet
          </SheetDescription>
        </SheetHeader>
        <SheetContent>
          <View className="gap-4">
            <Text className="text-gray-900 dark:text-white">
              Prochains passages :
            </Text>
            <Card>
              <CardContent className="p-3">
                <Text className="text-gray-900 dark:text-white font-semibold">
                  Ligne 1 - La Défense
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Dans 2 minutes
                </Text>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <Text className="text-gray-900 dark:text-white font-semibold">
                  Ligne 4 - Porte de Clignancourt
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Dans 5 minutes
                </Text>
              </CardContent>
            </Card>
          </View>
        </SheetContent>
      </Sheet>
    </View>
  );
}
