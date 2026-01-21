import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({ title, showBack = false, onBack, rightElement }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-background border-b border-border"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between h-14 px-4">
        {/* Left - Back button */}
        <View className="w-10">
          {showBack && (
            <BackButton onPress={onBack} />
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
    <TouchableOpacity onPress={handlePress}>
      <Text className="text-2xl text-transit-primary">←</Text>
    </TouchableOpacity>
  );
}
