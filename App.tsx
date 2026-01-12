import { StatusBar } from 'expo-status-bar';
import { Text, View, ScrollView } from 'react-native';
import { Button } from './src/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './src/components/ui/card';
import { Badge } from './src/components/ui/badge';
import { Separator } from './src/components/ui/separator';
import './global.css';

export default function App() {
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

          {/* Buttons */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Buttons</Text>
            <Button label="Primary Button" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Outline" variant="outline" />
            <Button label="Small Button" size="sm" />
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

          {/* Cards avec couleurs transport */}
          <View className="gap-3">
            <Text className="text-xl font-semibold mb-2">Transport Cards</Text>

            <Card className="border-l-4 border-l-transit-metro">
              <CardHeader>
                <CardTitle>Ligne Métro 1</CardTitle>
                <CardDescription>La Défense → Château de Vincennes</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge label="Métro" className="bg-transit-metro" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-transit-bus">
              <CardHeader>
                <CardTitle>Bus 42</CardTitle>
                <CardDescription>Gare du Nord → Porte de Versailles</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge label="Bus" className="bg-transit-bus" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-transit-tram">
              <CardHeader>
                <CardTitle>Tram T3</CardTitle>
                <CardDescription>Pont du Garigliano → Porte d'Ivry</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge label="Tramway" className="bg-transit-tram" />
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-transit-rer">
              <CardHeader>
                <CardTitle>RER A</CardTitle>
                <CardDescription>Saint-Germain-en-Laye → Marne-la-Vallée</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge label="RER" className="bg-transit-rer" />
              </CardContent>
            </Card>
          </View>

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
    </View>
  );
}
