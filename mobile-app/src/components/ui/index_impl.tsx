import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeBottomPadding } from '../../hooks/useSafeBottomPadding';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/theme';

export * from './app-text';
export * from './animated-ring';
export * from './button';
export * from './card';
export * from './chip';
export * from './divider';
export * from './dot-progress';
export * from './empty-state';
export * from './eyebrow';
export * from './field';
export * from './icon-button';
export * from './section-header';
export * from './sheet';
export * from './tab-bar';

/** Screen wrapper with safe area bottom padding */
export function Screen({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  const paddingBottom = useSafeBottomPadding(16);
  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom }, padded && styles.padded]}>
      {children}
    </View>
  );
}

/** StatPill used in dashboard metrics */
export function StatPill({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'blue';
}) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : tone === 'danger'
          ? colors.danger
          : tone === 'blue'
            ? colors.lavender
            : colors.accent;

  return (
    <View style={styles.statPill}>
      <View style={[styles.statIcon, { backgroundColor: colors.lavenderMist }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

/** Legacy ProgressRing compatibility wrapper */
export function ProgressRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.ringOuter}>
      <View style={[styles.ringInner, { transform: [{ rotate: `${safeValue * 1.8}deg` }] }]} />
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>{safeValue}%</Text>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    </View>
  );
}

/** Skeleton placeholder line */
export function SkeletonLine({ width = '100%' }: { width?: `${number}%` | number }) {
  return <Animated.View style={[styles.skeleton, { width, backgroundColor: colors.lavenderLight }]} />;
}

/** Error banner with optional retry */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
      <Text style={styles.bannerText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingTop: 24 },
  statPill: {
    width: '48%',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderTopWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderColor: colors.accent,
    opacity: 0.85,
  },
  ringCenter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  skeleton: {
    height: 14,
    borderRadius: 7,
    marginBottom: 10,
  },
  banner: {
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});
