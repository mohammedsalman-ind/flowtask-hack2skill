import 'react-native-gesture-handler';
import React, { Suspense, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';

import WelcomeScreen from './src/screens/WelcomeScreen';
import IntroScreen from './src/screens/IntroScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TasksScreen from './src/screens/TasksScreen';
import BoardScreen from './src/screens/BoardScreen';
import JerryAssistantScreen from './src/screens/JerryAssistantScreen';
import MoreScreen from './src/screens/MoreScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WorkspaceScreen from './src/screens/WorkspaceScreen';
import SetupScreen from './src/screens/SetupScreen';
import AddTaskScreen from './src/screens/AddTaskScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import UpdatePasswordScreen from './src/screens/UpdatePasswordScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppButton } from './src/components/ui';
import { TabBar } from './src/components/ui/tab-bar';
import { CreateMenu, CreateType } from './src/components/feature/create-menu';
import { TasksProvider, useTasks } from './src/context/TasksContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { setNavigationRef, registerNotificationTapListener, processPendingNotification } from './src/services/notificationNavigation';
import { initializeNotifications } from './src/services/morningNotification';
import { checkApiConnectivity } from './src/services/api';
import { colors } from './src/theme/colors';
import { radii, shadows } from './src/theme/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CalendarScreen = React.lazy(() => import('./src/screens/CalendarScreen')) as React.ComponentType<any>;
const MeetingAssistantScreen = React.lazy(() => import('./src/screens/MeetingAssistantScreen')) as React.ComponentType<any>;
const MeetingDetailsScreen = React.lazy(() => import('./src/screens/MeetingDetailsScreen')) as React.ComponentType<any>;
const FocusModeScreen = React.lazy(() => import('./src/screens/FocusModeScreen')) as React.ComponentType<any>;
const ProfileScreen = React.lazy(() => import('./src/screens/ProfileScreen')) as React.ComponentType<any>;
const InsightsScreen = React.lazy(() => import('./src/screens/InsightsScreen')) as React.ComponentType<any>;

function LazyScreen({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.background }}><ActivityIndicator color={theme.primary} /></View>}>
      {children}
    </Suspense>
  );
}

function MainTabs({ navigation }: any) {
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreateSelect = (type: CreateType) => {
    if (type === 'task') {
      navigation.navigate('AddTask');
    } else if (type === 'reminder') {
      navigation.navigate('AddTask', { reminder: true });
    } else if (type === 'meeting') {
      navigation.navigate('MeetingAssistant');
    } else if (type === 'focus') {
      navigation.navigate('FocusMode');
    }
  };

  return (
    <View style={styles.tabRoot}>
      <Tab.Navigator
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Board"
          component={BoardScreen}
          options={{
            title: 'Board',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Jerry"
          component={JerryAssistantScreen}
          options={{
            title: 'Jerry',
            tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="Meetings"
          children={(props) => <LazyScreen><MeetingAssistantScreen {...props} /></LazyScreen>}
          options={{
            title: 'Meetings',
            tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreScreen}
          options={{
            title: 'More',
            tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>

      {/* Floating "+" creation action above the tab bar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create"
        onPress={() => setMenuOpen(true)}
        style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
      >
        <Ionicons name="add" size={26} color={colors.derived.onAccent} />
      </Pressable>

      <CreateMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={handleCreateSelect}
      />
    </View>
  );
}

function BiometricLockScreen() {
  const { theme } = useTheme();
  const { unlock, signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleUnlock = async () => {
    setBusy(true); setError('');
    const ok = await unlock();
    if (!ok) setError('Biometric verification was not completed. Try again or use your password.');
    setBusy(false);
  };

  const handleUsePassword = async () => {
    try {
      await AsyncStorage.setItem('flowtask-biometric-enabled', 'false');
      await signOut();
    } catch { /* signOut may fail if session is stale, that's OK */ }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: theme.background }}>
      <Ionicons name="finger-print-outline" size={58} color={theme.primary} />
      <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', marginTop: 16 }}>FlowTask is locked</Text>
      <Text style={{ color: theme.muted, textAlign: 'center', marginTop: 8, marginBottom: 22 }}>Use your fingerprint, face unlock, or device authentication to continue.</Text>
      <View style={{ width: '100%' }}><AppButton label="Unlock FlowTask" icon="lock-open-outline" onPress={handleUnlock} loading={busy} disabled={busy} /></View>
      {error ? <Text style={{ color: theme.danger, marginTop: 12, fontWeight: '700', textAlign: 'center' }}>{error}</Text> : null}
      <Text
        onPress={handleUsePassword}
        style={{ color: theme.muted, marginTop: 18, fontWeight: '700', fontSize: 14 }}
      >
        Use password instead
      </Text>
    </View>
  );
}

function AppNavigatorInner() {
  const { user, initializing, locked, recovering } = useAuth();
  const { theme, mode } = useTheme();
  const { clearTasks } = useTasks();
  const navContainerRef = React.useRef<any>(null);
  const prevUserRef = React.useRef(user);

  // Clear tasks when user logs out to prevent data leak to next user
  React.useEffect(() => {
    if (prevUserRef.current && !user) {
      clearTasks();
    }
    prevUserRef.current = user;
  }, [user, clearTasks]);

  // Register notification tap listener, set navigation ref, initialize notification permissions,
  // and check API connectivity on first render
  React.useEffect(() => {
    setNavigationRef(navContainerRef);
    const cleanup = registerNotificationTapListener();
    initializeNotifications();
    checkApiConnectivity();
    return cleanup;
  }, []);

  // Process pending notification and register push token when user becomes authenticated
  React.useEffect(() => {
    if (user && !initializing && !locked) {
      processPendingNotification();
      import('./src/services/pushTokenService').then(({ registerPushToken }) => {
        registerPushToken().catch((err) => {
          console.log('[App] Push token registration skipped:', err?.message || err);
        });
      }).catch(() => {});
    }
  }, [user, initializing, locked]);

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={{ color: theme.muted, marginTop: 12, fontWeight: '700' }}>Loading FlowTask</Text>
      </View>
    );
  }

  if (user && locked) return <BiometricLockScreen />;

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      border: theme.border,
      text: theme.text,
      primary: theme.primary,
    },
  };

  if (recovering) {
    return (
      <>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </>
    );
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navContainerRef} theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Tasks" component={TasksScreen} />
              <Stack.Screen name="Calendar" children={(props) => <LazyScreen><CalendarScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="Board" component={BoardScreen} />
              <Stack.Screen name="AddTask" component={AddTaskScreen} />
              <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
              <Stack.Screen name="MeetingAssistant" children={(props) => <LazyScreen><MeetingAssistantScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="MeetingDetails" children={(props) => <LazyScreen><MeetingDetailsScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="FocusMode" children={(props) => <LazyScreen><FocusModeScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="Insights" children={(props) => <LazyScreen><InsightsScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="Profile" children={(props) => <LazyScreen><ProfileScreen {...props} /></LazyScreen>} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Workspaces" component={WorkspaceScreen} />
              <Stack.Screen name="Setup" component={SetupScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Intro" component={IntroScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

function AppNavigator() {
  return (
    <TasksProvider>
      <AppNavigatorInner />
    </TasksProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabRoot: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
});

