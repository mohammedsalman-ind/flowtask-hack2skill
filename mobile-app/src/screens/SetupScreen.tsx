import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ParamListBase } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TasksContext';
import { supabase } from '../services/supabase';
import { scheduleMorningSummary, cancelExistingMorningSummary, initializeNotifications } from '../services/morningNotification';
import { cancelAllNotifications } from '../services/notificationScheduler';
import { scheduleNotificationsForTask } from '../services/scheduleTaskNotifications';
import Personalize from './setup/personalize';
import Goals from './setup/goals';
import Spaces from './setup/spaces';
import PlanningStyleStep from './setup/planning-style';
import Notifications from './setup/notifications';
import Complete from './setup/complete';

export type PlanningStyle = 'structured' | 'flexible' | 'both';

type Preferences = {
  name: string;
  purpose: string | null;
  wake: number;
  goals: string[];
  spaces: string[];
  planningStyle: PlanningStyle | null;
  notifications: { plan: boolean; reminders: boolean };
};

export type SetupStepProps = {
  preferences: Preferences;
  update: (changes: Partial<Preferences>) => void;
  onBack: () => void;
  onNext: () => void;
};

const steps = [Personalize, Goals, Spaces, PlanningStyleStep, Notifications];

export default function SetupScreen({ navigation }: NativeStackScreenProps<ParamListBase>) {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    name: user?.user_metadata?.name || '',
    purpose: null,
    wake: 7,
    goals: [],
    spaces: [],
    planningStyle: null,
    notifications: { plan: true, reminders: true },
    ...user?.user_metadata?.flowtask_setup,
  }));
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inFlight.current) return true;
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => listener.remove();
  }, [step]);

  const finish = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try {
      const setup = { ...preferences, name: preferences.name.trim() };
      const { error: saveError } = await supabase.auth.updateUser({
        data: { flowtask_setup: setup },
      });
      if (saveError) throw saveError;

      const { plan, reminders } = setup.notifications;
      const enabled = plan || reminders;
      await AsyncStorage.multiSet([
        ['flowtask-notifications-enabled', String(enabled)],
        ['flowtask-daily-reminders', String(plan)],
        ['flowtask-deadline-alerts', String(reminders)],
        ['flowtask-morning-hour', String(setup.wake)],
      ]);
      if (enabled) {
        const granted = await initializeNotifications();
        if (!granted) {
          Alert.alert('Notification permission', 'You can enable notifications in your device settings.');
        } else {
          if (plan) await scheduleMorningSummary(tasks, true);
          else await cancelExistingMorningSummary();
          for (const task of tasks) await scheduleNotificationsForTask(task).catch(() => {});
        }
      } else {
        await cancelAllNotifications();
      }
      navigation.popTo('MainTabs', { screen: 'Dashboard' });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not save your setup. Please try again.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const Step = steps[step];
  if (!Step) {
    return <Complete onFinish={() => void finish()} onBack={() => setStep(steps.length - 1)} saving={saving} error={error} />;
  }

  return (
    <Step
      preferences={preferences}
      update={(changes) => setPreferences((current) => ({ ...current, ...changes }))}
      onBack={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}
      onNext={() => setStep(step + 1)}
    />
  );
}
