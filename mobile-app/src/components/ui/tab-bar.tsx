import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { focused: IconName; idle: IconName }> = {
  Dashboard: { focused: 'today', idle: 'today-outline' },
  today: { focused: 'today', idle: 'today-outline' },
  Board: { focused: 'grid', idle: 'grid-outline' },
  tasks: { focused: 'albums', idle: 'albums-outline' },
  Tasks: { focused: 'albums', idle: 'albums-outline' },
  Calendar: { focused: 'calendar', idle: 'calendar-outline' },
  calendar: { focused: 'calendar', idle: 'calendar-outline' },
  Jerry: { focused: 'sparkles', idle: 'sparkles-outline' },
  jerry: { focused: 'sparkles', idle: 'sparkles-outline' },
  Meetings: { focused: 'people', idle: 'people-outline' },
  meetings: { focused: 'people', idle: 'people-outline' },
  Profile: { focused: 'person', idle: 'person-outline' },
  More: { focused: 'ellipsis-horizontal', idle: 'ellipsis-horizontal' },
  more: { focused: 'ellipsis-horizontal', idle: 'ellipsis-horizontal' },
};

/**
 * FlowTask bottom navigation bar. White surface, hairline top border, accent
 * tint for the focused tab. Supports both standard React Navigation and custom tabs.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const label =
          options.tabBarLabel !== undefined
            ? String(options.tabBarLabel)
            : options.title !== undefined
              ? options.title
              : route.name;

        const customIcon = options.tabBarIcon;
        const iconNames = TAB_ICONS[route.name];

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={`${label} tab`}
            onPress={onPress}
            style={styles.tab}>
            {customIcon ? (
              customIcon({
                focused,
                color: focused ? colors.accent : colors.textSecondary,
                size: 22,
              })
            ) : iconNames ? (
              <Ionicons
                name={focused ? iconNames.focused : iconNames.idle}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ) : (
              <Ionicons
                name={focused ? 'ellipse' : 'ellipse-outline'}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            )}
            <AppText
              variant="caption"
              style={focused ? styles.labelFocused : styles.labelIdle}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  labelFocused: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 11,
  },
  labelIdle: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
