import type { ComponentType } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUp, Bell, BriefcaseBusiness, CalendarDays,
  Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FileText, Flashlight,
  Grid2X2, Heart, Home, ListTodo, LogOut, Mic, MoreHorizontal, PanelsTopLeft,
  Pencil, PieChart, Play, Plus, School, Sparkles, StopCircle, Sun, Trash2,
  Timer, UserRound, Users, X, type LucideProps,
} from 'lucide-react';

const icons: Record<string, ComponentType<LucideProps>> = {
  'sunny-outline': Sun, 'checkmark-circle-outline': CheckCircle2, 'calendar-outline': CalendarDays,
  'sparkles-outline': Sparkles, 'ellipsis-horizontal-circle-outline': MoreHorizontal,
  'school-outline': School, 'briefcase-outline': BriefcaseBusiness, 'home-outline': Home,
  'heart-outline': Heart, 'notifications-outline': Bell, 'people-outline': Users,
  'pencil-outline': Pencil, 'timer-outline': Timer, 'albums-outline': PanelsTopLeft,
  'document-outline': FileText, 'trail-sign-outline': ListTodo, 'grid-outline': Grid2X2,
  'person-outline': UserRound, flash: Flashlight, 'log-out-outline': LogOut,
  add: Plus, close: X, 'chevron-forward': ChevronRight, 'chevron-back': ChevronLeft,
  'arrow-up': ArrowUp, 'arrow-forward': ArrowRight, checkmark: Check,
  'checkmark-circle': CheckCircle2, 'time-outline': Clock3, stop: StopCircle,
  sparkles: Sparkles, play: Play, 'mic-outline': Mic, 'pie-chart-outline': PieChart,
  'arrow-down': ArrowDown,
  'trash-outline': Trash2,
};

export const Ionicons = Object.assign(function Icon({ name, size = 20, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon size={size} color={color} strokeWidth={1.8} aria-hidden="true" />;
}, { glyphMap: icons });
