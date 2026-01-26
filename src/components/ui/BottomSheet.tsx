/**
 * BottomSheet Component
 * Custom bottom sheet using React Native Modal and Animated API
 * Compatible with Expo Go (no external dependencies)
 * Improved UX: drag only on handle, better snap points
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
  TouchableOpacity,
  Text,
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_TRANSLATE_Y = 0;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT;
const CLOSE_THRESHOLD = 80; // Distance to drag down to close
const VELOCITY_THRESHOLD = 0.5; // Velocity to trigger close

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

  // Pan responder for drag gestures - only on handle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond to vertical gestures > 5px
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        lastGestureY.current = (translateY as any)._value;
      },
      onPanResponderMove: (_, gestureState) => {
        const newY = lastGestureY.current + gestureState.dy;
        // Prevent dragging above the top snap point (with some resistance)
        if (newY >= snapPointsPixels[snapPointsPixels.length - 1] - 20) {
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = (translateY as any)._value;

        // If dragged down fast or significantly, close the sheet
        if (gestureState.vy > VELOCITY_THRESHOLD || gestureState.dy > CLOSE_THRESHOLD) {
          closeSheet();
          return;
        }

        // If dragged up fast, expand to largest snap point
        if (gestureState.vy < -VELOCITY_THRESHOLD) {
          snapToIndex(snapPointsPixels.length - 1);
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
      tension: 65,
      friction: 10,
    }).start();
  };

  const openSheet = () => {
    snapToIndex(0); // Open to first snap point
  };

  const closeSheet = () => {
    Animated.timing(translateY, {
      toValue: MAX_TRANSLATE_Y,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Toggle between snap points on handle tap
  const handleTap = () => {
    const nextIndex = (currentSnapIndex + 1) % snapPointsPixels.length;
    snapToIndex(nextIndex);
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
      >
        {/* Drag Handle - only this area responds to gestures */}
        <View {...panResponder.panHandlers}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTap}
            style={styles.handleContainer}
          >
            <View style={styles.handle} />
            <Text style={styles.handleHint}>Glisser pour agrandir</Text>
          </TouchableOpacity>
        </View>

        {/* Content - doesn't interfere with scrolling */}
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 15,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CDCDCD',
  },
  handleHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#999',
  },
  contentContainer: {
    flex: 1,
  },
});
