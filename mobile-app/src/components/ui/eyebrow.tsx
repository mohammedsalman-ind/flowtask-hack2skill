import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/theme';

export type EyebrowProps = {
  text: string;
  tone?: 'lavender' | 'blush';
};

/** Micro-caps eyebrow chip ("PLAN", "ORGANIZE", "JERRY") — story section markers. */
export function Eyebrow({ text, tone = 'lavender' }: EyebrowProps) {
  return (
    <View style={[styles.base, tone === 'blush' ? styles.blush : styles.lavender]}>
      <AppText variant="micro" style={styles.label}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  lavender: {
    backgroundColor: colors.lavenderMist,
  },
  blush: {
    backgroundColor: colors.blushMist,
  },
  label: {
    color: colors.accentDeep,
    letterSpacing: 1.6,
  },
});
