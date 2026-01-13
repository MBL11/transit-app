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
import { parseGTFS } from './src/core/gtfs-parser';
import type { GTFSData } from './src/core/types/gtfs';
import './global.css';

// Sample GTFS data for testing
const sampleStopsCSV = `stop_id,stop_name,stop_lat,stop_lon,stop_code
CHAT,Châtelet,48.858370,2.347860,1234
CONC,Concorde,48.865720,2.321490,5678
ETOILE,Charles de Gaulle - Étoile,48.873790,2.295030,9012
DEFENSE,La Défense,48.892320,2.237980,3456`;

const sampleRoutesCSV = `route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
M1,1,La Défense - Château de Vincennes,1,FFCD00,000000
M4,4,Porte de Clignancourt - Mairie de Montrouge,1,A0006E,FFFFFF
BUS42,42,Gare du Nord - Porte de Versailles,3,00AA55,FFFFFF`;

const sampleTripsCSV = `trip_id,route_id,service_id,trip_headsign,direction_id
TRIP1,M1,WD,Château de Vincennes,0
TRIP2,M1,WD,La Défense,1`;

const sampleStopTimesCSV = `trip_id,stop_id,arrival_time,departure_time,stop_sequence
TRIP1,DEFENSE,08:00:00,08:00:30,1
TRIP1,ETOILE,08:05:00,08:05:30,2
TRIP1,CONC,08:08:00,08:08:30,3
TRIP1,CHAT,08:12:00,08:12:30,4`;

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gtfsData, setGtfsData] = useState<GTFSData | null>(null);

  const handleTestGTFS = () => {
    console.log('🧪 Testing GTFS Parser...');
    const result = parseGTFS({
      stops: sampleStopsCSV,
      routes: sampleRoutesCSV,
      trips: sampleTripsCSV,
      stopTimes: sampleStopTimesCSV,
    });
    setGtfsData(result.data);
    console.log('✅ GTFS Parser test complete!', result.data);
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

          {/* GTFS Parser Test */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Feature #3: GTFS Parser</Text>
            <Button
              label="🧪 Test GTFS Parser"
              onPress={handleTestGTFS}
              variant={gtfsData ? "secondary" : "default"}
            />
            {gtfsData && (
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle>Parser Results ✅</CardTitle>
                  <CardDescription>Successfully parsed GTFS data</CardDescription>
                </CardHeader>
                <CardContent className="gap-2">
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    📍 Stops: {gtfsData.stops.length} (Châtelet, Concorde, Étoile, La Défense)
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    🚇 Routes: {gtfsData.routes.length} (Métro 1, Métro 4, Bus 42)
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    🚌 Trips: {gtfsData.trips.length}
                  </Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    ⏰ Stop Times: {gtfsData.stopTimes.length}
                  </Text>
                  <View className="mt-2">
                    <Badge label="papaparse ✓" variant="success" />
                  </View>
                </CardContent>
              </Card>
            )}
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
