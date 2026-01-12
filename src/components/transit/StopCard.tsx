import React from 'react';
import { View, Text, Pressable, PressableProps } from 'react-native';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils';

export interface StopLine {
  lineNumber: string;
  lineColor: string;
  type: 'metro' | 'bus' | 'tram' | 'rer' | 'train';
}

export interface StopCardProps extends Omit<PressableProps, 'children'> {
  stopName: string;
  stopCode?: string;
  lines: StopLine[];
  distance?: number;
  className?: string;
}

const typeColors = {
  metro: 'bg-transit-metro',
  bus: 'bg-transit-bus',
  tram: 'bg-transit-tram',
  rer: 'bg-transit-rer',
  train: 'bg-transit-primary',
};

export function StopCard({
  stopName,
  stopCode,
  lines,
  distance,
  className,
  ...props
}: StopCardProps) {
  return (
    <Pressable {...props}>
      <Card className={className}>
        <CardHeader className="pb-3">
          <View className="flex-row items-center justify-between">
            <CardTitle className="flex-1">{stopName}</CardTitle>
            {distance !== undefined && (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {distance < 1000
                  ? `${Math.round(distance)}m`
                  : `${(distance / 1000).toFixed(1)}km`}
              </Text>
            )}
          </View>
          {stopCode && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Code: {stopCode}
            </Text>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <View className="flex-row flex-wrap gap-2">
            {lines.map((line, index) => (
              <View
                key={index}
                className={cn(
                  'px-2 py-1 rounded items-center justify-center min-w-[32px]',
                  typeColors[line.type]
                )}
                style={{ backgroundColor: line.lineColor }}
              >
                <Text className="text-white font-bold text-xs">
                  {line.lineNumber}
                </Text>
              </View>
            ))}
          </View>
        </CardContent>
      </Card>
    </Pressable>
  );
}
