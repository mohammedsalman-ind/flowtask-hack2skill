import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const note = z.object({ text: z.string(), evidence: z.string() });
const analysisSchema = z.object({
  overview: z.string().min(1),
  discussion: z.array(note),
  decisions: z.array(note),
  blockers: z.array(note),
  next_steps: z.array(note),
  action_items: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(3000),
    evidence: z.string().min(1),
    assignee_text: z.string().nullable(),
    deadline_text: z.string().nullable(),
    priority: z.enum(['low', 'medium', 'high']).nullable(),
    suggested_due_day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })).max(40),
});

export const answerSchema = z.object({ answer: z.string(), source_ids: z.array(z.string().uuid()) });
export type Member = { user_id: string; name: string; email: string; role: 'admin' | 'manager' | 'member' };

const normalized = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

export function matchWorkspaceMember(mention: string | null, members: Member[]) {
  if (!mention || !normalized(mention)) return { assignee_id: null, match: 'unspecified' as const };
  const name = normalized(mention);
  const exact = members.filter((member) => normalized(member.name) === name || normalized(member.email) === name);
  const candidates = exact.length ? exact : members.filter((member) => normalized(member.name).split(' ')[0] === name);
  if (candidates.length === 1) return { assignee_id: candidates[0].user_id, match: 'matched' as const };
  return { assignee_id: null, match: candidates.length ? 'ambiguous' as const : 'unmatched' as const };
}

export function prepareAnalysis(value: unknown, members: Member[], projectId: string | null) {
  const analysis = analysisSchema.parse(value);
  return {
    ...analysis,
    action_items: analysis.action_items.map((item) => ({
      ...item,
      ...matchWorkspaceMember(item.assignee_text, members),
      id: randomUUID(),
      suggested_project_id: projectId,
    })),
  };
}

export function meetingDay(startsAt: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(startsAt));
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
}
