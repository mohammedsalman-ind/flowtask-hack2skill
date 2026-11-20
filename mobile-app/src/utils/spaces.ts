import { colors } from '../theme/colors';
import { TaskContext } from '../types';

export type SpaceInfo = {
  id: TaskContext | string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

export const SPACES: SpaceInfo[] = [
  { id: 'work', name: 'Work', icon: 'briefcase-outline', color: colors.lavender, description: 'Projects, deadlines and professional work.' },
  { id: 'personal', name: 'Personal', icon: 'home-outline', color: colors.accent, description: 'Life admin, errands and personal goals.' },
  { id: 'health', name: 'Health', icon: 'fitness-outline', color: colors.success, description: 'Health, habits and wellbeing tasks.' },
  { id: 'study', name: 'Study', icon: 'book-outline', color: colors.mauve, description: 'Learning, assignments and exam prep.' },
];

export const spaceAccents: Record<string, string> = {
  work: colors.lavender,
  personal: colors.accent,
  health: colors.success,
  study: colors.mauve,
  college: colors.mauve,
  projects: colors.accentDeep,
};

export function spaceAccent(id?: string | null): string {
  if (!id) return colors.mauve;
  return spaceAccents[id.toLowerCase()] || colors.mauve;
}

export function spaceName(id?: string | null): string {
  if (!id) return 'General';
  const match = SPACES.find((s) => s.id === id.toLowerCase());
  if (match) return match.name;
  return id.charAt(0).toUpperCase() + id.slice(1);
}
