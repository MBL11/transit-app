import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  showLogo?: boolean;
}

export function ScreenHeader({ title, showBack = false, onBack, rightElement, showLogo = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-transit-primary border-b border-transit-primary"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between h-14 px-4">
        {/* Left - Back button or Logo */}
        <View className="w-16">
          {showBack ? (
            <BackButton onPress={onBack} />
          ) : showLogo ? (
            <View className="flex-row items-center">
              <View className="bg-white rounded-md px-1.5 py-0.5 mr-1">
                <Text className="text-transit-primary font-black text-xs">İZMİR</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Center - Title */}
        <Text className="text-lg font-bold text-white flex-1 text-center" numberOfLines={1}>
          {title}
        </Text>

        {/* Right - Custom element */}
        <View className="w-16 items-end">
          {rightElement}
        </View>
      </View>
    </View>
  );
}

// Separate component that uses navigation hook only when needed
function BackButton({ onPress }: { onPress?: () => void }) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} className="flex-row items-center">
      <Text className="text-2xl text-white">←</Text>
      <Text className="text-white ml-1 text-sm">Geri</Text>
    </TouchableOpacity>
  );
}
