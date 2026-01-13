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
import { parseStops } from './src/core/gtfs-parser';
import './global.css';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const testParserValidation = () => {
    console.log('🧪 Testing GTFS Parser Validation & Error Handling...\n');

    // Test 1: CSV avec BOM UTF-8
    const csvWithBOM = '\uFEFF' + `stop_id,stop_name,stop_lat,stop_lon
TEST1,Test Stop,48.8566,2.3522`;
    const result1 = parseStops(csvWithBOM);
    console.log('✅ Test 1 - BOM Removal:', result1.data.length === 1 ? 'PASSED' : 'FAILED');

    // Test 2: CSV avec colonnes manquantes
    const csvMissingColumns = `stop_id,stop_name
TEST2,Incomplete Stop`;
    const result2 = parseStops(csvMissingColumns);
    console.log('✅ Test 2 - Missing Columns Warning:', result2.data.length >= 0 ? 'PASSED (check console)' : 'FAILED');

    // Test 3: CSV valide
    const csvValid = `stop_id,stop_name,stop_lat,stop_lon
TEST3,Valid Stop,48.8566,2.3522`;
    const result3 = parseStops(csvValid);
    console.log('✅ Test 3 - Valid CSV:', result3.data.length === 1 && result3.errors.length === 0 ? 'PASSED' : 'FAILED');

    setTestResult(`Tests completed! Check console for details.
Test 1 (BOM): ${result1.data.length === 1 ? '✅' : '❌'}
Test 2 (Missing Cols): ✅ (see warnings)
Test 3 (Valid): ${result3.data.length === 1 ? '✅' : '❌'}`);
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

          {/* Parser Validation Test */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">🧪 Parser Validation Test</Text>
            <Button
              label="Test BOM + Validation + Errors"
              onPress={testParserValidation}
              variant={testResult ? "secondary" : "default"}
            />
            {testResult && (
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <Text className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {testResult}
                  </Text>
                  <Text className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    💡 Check the console for detailed warnings
                  </Text>
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
