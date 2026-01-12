import React from 'react';
import { View, Text, Pressable, PressableProps } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils';

export interface LineCardProps extends Omit<PressableProps, 'children'> {
  lineNumber: string;
  lineName: string;
  lineColor: string;
  direction?: string;
  type?: 'metro' | 'bus' | 'tram' | 'rer' | 'train';
  className?: string;
}

const typeColors = {
  metro: 'bg-transit-metro',
  bus: 'bg-transit-bus',
  tram: 'bg-transit-tram',
  rer: 'bg-transit-rer',
  train: 'bg-transit-primary',
};

const typeLabels = {
  metro: 'Métro',
  bus: 'Bus',
  tram: 'Tram',
  rer: 'RER',
  train: 'Train',
};

export function LineCard({
  lineNumber,
  lineName,
  lineColor,
  direction,
  type = 'bus',
  className,
  ...props
}: LineCardProps) {
  return (
    <Pressable {...props}>
      <Card className={cn('border-l-4', className)} style={{ borderLeftColor: lineColor }}>
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3 flex-1">
              {/* Line Number Badge */}
              <View
                className="w-12 h-12 rounded-lg items-center justify-center"
                style={{ backgroundColor: lineColor }}
              >
                <Text className="text-white font-bold text-lg">
                  {lineNumber}
                </Text>
              </View>

              {/* Line Info */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {lineName}
                </Text>
                {direction && (
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    → {direction}
                  </Text>
                )}
              </View>
            </View>

            {/* Type Badge */}
            <Badge
              label={typeLabels[type]}
              className={cn('ml-2', typeColors[type])}
            />
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}
