import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/theme';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Section header — text or a custom element */
  title?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Reusable bottom sheet — scrim fade + spring slide-up, drag handle,
 * drag-down or scrim-tap to dismiss. Respects bottom safe inset.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(600);
  const scrim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scrim.value = withTiming(1, { duration: 200 });
      y.value = withSpring(0, { damping: 20, stiffness: 220 });
    } else {
      scrim.value = withTiming(0, { duration: 160 });
      y.value = withTiming(600, { duration: 180, easing: Easing.in(Easing.ease) });
    }
  }, [visible, scrim, y]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.xl },
            shadows.floating,
            sheetStyle,
          ]}>
          <View style={styles.handle} accessibilityLabel="Drag to dismiss" />
          {title ? (
            <View style={styles.titleRow}>
              {title}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  titleRow: {
    marginBottom: spacing.md,
  },
});
