/**
 * BottomSheet Component
 * Custom bottom sheet using React Native Modal and Animated API
 * Compatible with Expo Go (no external dependencies)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_TRANSLATE_Y = 0;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT;
const CLOSE_THRESHOLD = 100; // Distance to drag down to close

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: string[]; // e.g., ['25%', '50%', '90%']
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  snapPoints = ['50%', '90%'],
  children,
}: BottomSheetProps) {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const translateY = useRef(new Animated.Value(MAX_TRANSLATE_Y)).current;
  const lastGestureY = useRef(0);

  // Convert snap points from percentage to pixel values
  const snapPointsPixels = snapPoints.map((point) => {
    const percent = parseFloat(point.replace('%', '')) / 100;
    return SCREEN_HEIGHT * (1 - percent);
  });

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical gestures
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        lastGestureY.current = (translateY as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = lastGestureY.current + gestureState.dy;
        // Prevent dragging above the top snap point
        if (newY >= MIN_TRANSLATE_Y) {
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = (translateY as any)._value;

        // If dragged down significantly, close the sheet
        if (gestureState.dy > CLOSE_THRESHOLD) {
          closeSheet();
          return;
        }

        // Find nearest snap point
        let nearestSnapIndex = 0;
        let minDistance = Math.abs(currentY - snapPointsPixels[0]);

        snapPointsPixels.forEach((snapPoint, index) => {
          const distance = Math.abs(currentY - snapPoint);
          if (distance < minDistance) {
            minDistance = distance;
            nearestSnapIndex = index;
          }
        });

        // Snap to nearest point
        snapToIndex(nearestSnapIndex);
      },
    })
  ).current;

  const snapToIndex = (index: number) => {
    setCurrentSnapIndex(index);
    Animated.spring(translateY, {
      toValue: snapPointsPixels[index],
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const openSheet = () => {
    snapToIndex(0); // Open to first snap point
  };

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: MAX_TRANSLATE_Y,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Open/close animation when visible prop changes
  useEffect(() => {
    if (visible) {
      openSheet();
    } else {
      translateY.setValue(MAX_TRANSLATE_Y);
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={closeSheet}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>{children}</View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
  },
  contentContainer: {
    flex: 1,
  },
});
