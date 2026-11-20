import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState } from '../components/ui';
import { TaskCard } from '../components/TaskCard';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { localDateKey } from '../utils/dateUtils';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/theme';

export function taskDateKey(value: string | null) {
  if (!value) return '';
  try {
    return localDateKey(new Date(value));
  } catch {
    return '';
  }
}

export function buildMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

const SWIPE_THRESHOLD = 50;

export default function CalendarScreen({ navigation }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(28);
  const { tasks, loadTasks } = useTasks();

  const today = useMemo(() => localDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // Animated offset for swipe gesture
  const panX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
    }, [loadTasks])
  );

  const days = useMemo(() => buildMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const taskDates = useMemo(() => new Set(tasks.map((task) => taskDateKey(task.due_date)).filter(Boolean)), [tasks]);
  const selectedTasks = useMemo(() => tasks.filter((task) => taskDateKey(task.due_date) === selectedDate), [selectedDate, tasks]);

  const goToPrevMonth = useCallback(() => {
    const prev = addMonths(viewYear, viewMonth, -1);
    setViewYear(prev.year);
    setViewMonth(prev.month);
  }, [viewYear, viewMonth]);

  const goToNextMonth = useCallback(() => {
    const next = addMonths(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }, [viewYear, viewMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(localDateKey(now));
  }, []);

  // PanResponder for horizontal swipe
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isSwiping.current) isSwiping.current = true;
        panX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        isSwiping.current = false;
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left -> next month
          Animated.timing(panX, { toValue: -300, duration: 150, useNativeDriver: true }).start(() => {
            goToNextMonth();
            panX.setValue(0);
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right -> prev month
          Animated.timing(panX, { toValue: 300, duration: 150, useNativeDriver: true }).start(() => {
            goToPrevMonth();
            panX.setValue(0);
          });
        } else {
          Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: theme.text }]}>Calendar</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Quick add task"
          onPress={() => navigation.navigate('AddTask')}
          style={[styles.addButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={goToPrevMonth}
          style={[styles.navArrow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.monthLabel}>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {getMonthLabel(viewYear, viewMonth)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goToNextMonth}
          style={[styles.navArrow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Calendar grid with swipe */}
      <Animated.View
        style={[
          styles.calendar,
          { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ translateX: panX }] },
        ]}
        {...panResponder.panHandlers}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={[styles.weekday, { color: theme.muted }]}>
            {day}
          </Text>
        ))}
        {days.map((day) => {
          const key = localDateKey(day);
          const selected = key === selectedDate;
          const isToday = key === today;
          const inMonth = day.getMonth() === viewMonth;
          const hasTask = taskDates.has(key);
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedDate(key)}
              style={[
                styles.dayCell,
                { backgroundColor: selected ? theme.primary : 'transparent' },
                isToday && !selected && { borderColor: theme.primary, borderWidth: 1.5 },
              ]}>
              <Text
                style={[
                  styles.dayText,
                  {
                    color: selected ? '#FFFFFF' : inMonth ? theme.text : theme.muted,
                    opacity: inMonth ? 1 : 0.45,
                  },
                  isToday && !selected && { color: theme.primary },
                ]}>
                {day.getDate()}
              </Text>
              {hasTask ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: selected ? '#FFFFFF' : theme.primary },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Selected date label */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
      </Text>

      {/* Tasks for selected date */}
      {selectedTasks.length ? (
        selectedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        ))
      ) : (
        <EmptyState
          title="No tasks on this date"
          message="Tasks with due dates will appear on the calendar."
          icon="calendar-outline"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    marginTop: -2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    padding: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendar: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  weekday: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    paddingVertical: 8,
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
  },
});
