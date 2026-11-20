import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/theme';

export type DividerProps = {
  /** Optional centered label (e.g. "OR") */
  label?: string;
};

export function Divider({ label }: DividerProps) {
  if (!label) {
    return <View style={styles.hairline} />;
  }
  return (
    <View style={styles.row}>
      <View style={styles.hairline} />
      <AppText variant="micro" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
  },
});
