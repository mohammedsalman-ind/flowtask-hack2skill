import { StyleSheet, View } from 'react-native';

import { spaceAccent } from '@/lib/store';

/**
 * The Space color dot — every task and board reference uses it so
 * Space context reads instantly without labels.
 */
export function SpaceDot({ spaceId, size = 8 }: { spaceId: string; size?: number }) {
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: spaceAccent(spaceId),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
