import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { supabaseAdmin } from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const getMlApiUrl = () => (process.env.ML_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

router.use(authMiddleware);

// ---- Conversation context (lightweight, per-user, in-memory) ----
interface ConversationContext {
  lastCreatedTask: any;
  lastQueryResult: { matched: any[]; label: string } | null;
  lastIntent: string;
  lastTimestamp: number;
  recentTasks: any[];
  pendingAssignment?: {
    taskId: string;
    taskTitle: string;
    recipientName: string;
    recipientEmail: string | null;
    awaitingEmail: boolean;
    awaitingConfirmation: boolean;
  } | null;
  // Follow-up context for task mutations ("make it 5 PM" → refers to last task)
  lastMutationTask?: {
    id: string;
    title: string;
  } | null;
  awaitingMutationUpdate?: boolean;
  // Meeting context: stores last queried meeting ID for follow-up questions
  lastMeetingId?: string | null;
}
const conversationStore = new Map<string, ConversationContext>();
const CONTEXT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getConversationContext(userId: string): ConversationContext | null {
  const ctx = conversationStore.get(userId);
  if (!ctx) return null;
  if (Date.now() - ctx.lastTimestamp > CONTEXT_TTL_MS) {
    conversationStore.delete(userId);
    return null;
  }
  return ctx;
}

function setConversationContext(userId: string, patch: Partial<ConversationContext>) {
  const existing = conversationStore.get(userId);
  conversationStore.set(userId, {
    lastCreatedTask: patch.lastCreatedTask ?? existing?.lastCreatedTask ?? null,
    lastQueryResult: patch.lastQueryResult ?? existing?.lastQueryResult ?? null,
    lastIntent: patch.lastIntent ?? existing?.lastIntent ?? '',
    lastTimestamp: Date.now(),
    recentTasks: patch.recentTasks ?? existing?.recentTasks ?? [],
    pendingAssignment: patch.pendingAssignment !== undefined ? patch.pendingAssignment : existing?.pendingAssignment ?? null,
    lastMutationTask: patch.lastMutationTask !== undefined ? patch.lastMutationTask : existing?.lastMutationTask ?? null,
    awaitingMutationUpdate: patch.awaitingMutationUpdate !== undefined ? patch.awaitingMutationUpdate : existing?.awaitingMutationUpdate ?? false,
    lastMeetingId: patch.lastMeetingId !== undefined ? patch.lastMeetingId : existing?.lastMeetingId ?? null,
  });
}

// ---- Helpers ----

async function forwardJson(path: string, body: unknown, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${getMlApiUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function relay(response: globalThis.Response, res: Response) {
  const text = await response.text();
  let payload: unknown = null;
  try { payload = JSON.parse(text); } catch { payload = { detail: text || 'AI service returned an invalid response.' }; }
  res.status(response.status).json(payload);
}

// ---- Task resolution helpers ----

function normalizeString(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/**
 * Resolve task(s) from user's tasks by matching title words.
 * Returns { task } for a unique match, { candidates } for ambiguous matches, or null.
 */
async function resolveTask(userId: string, text: string) {
  // Extract meaningful words (3+ chars) from the text, skip common stop words
  const stopWords = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'was', 'are', 'you', 'your', 'its', 'his', 'her']);
  const words = (text.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !stopWords.has(w));
  if (words.length === 0) return { task: null, candidates: [] };

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('organization_id', null)
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!tasks || tasks.length === 0) return { task: null, candidates: [] };

  // Score each task by how many words match
  const scored = tasks.map((task) => {
    const titleLower = task.title.toLowerCase();
    const descLower = (task.description || '').toLowerCase();
    let score = 0;
    for (const word of words) {
      if (titleLower.includes(word)) score += 2;
      if (descLower.includes(word)) score += 1;
    }
    return { task, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { task: null, candidates: [] };

  // Unique match: top score is significantly higher than second
  const topScore = scored[0].score;
  const secondScore = scored.length > 1 ? scored[1].score : 0;
  if (topScore > secondScore || scored.length === 1) {
    return { task: scored[0].task, candidates: [] };
  }

  // Ambiguous: multiple tasks with the same top score
  const topTasks = scored.filter((s) => s.score === topScore).map((s) => s.task);
  return { task: topTasks[0], candidates: topTasks };
}

/** Resolve date from text using dateparser-style logic. */
function resolveDateFromText(text: string): string | null {
  const now = new Date();
  const lower = text.toLowerCase();

  // Extract time: "at 5 pm", "5:00 PM", "at 9 AM"
  let hour = 9;
  let minute = 0;
  const timeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b/i)
    || text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2] || '0');
    const meridiem = (timeMatch[3] || '').toLowerCase().replace('.', '');
    if (meridiem === 'pm' && hour < 12) hour += 12;
    else if (meridiem === 'am' && hour === 12) hour = 0;
    else if (!meridiem && hour < 8) hour += 12;
  }

  // Resolve date
  if (/\b(tomorrow|kal)\b/i.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    d.setHours(hour, minute, 0, 0); return d.toISOString();
  }
  if (/\b(today|aaj)\b/i.test(lower)) {
    const d = new Date(now); d.setHours(hour, minute, 0, 0); return d.toISOString();
  }
  if (/\b(tonight|this evening|aaj raat)\b/i.test(lower)) {
    const d = new Date(now); d.setHours(20, 0, 0, 0); return d.toISOString();
  }
  if (/\bfriday|shukravar\b/i.test(lower)) {
    const d = new Date(now); const delta = (4 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta); d.setHours(hour, minute, 0, 0); return d.toISOString();
  }
  if (/\bmonday|somvar\b/i.test(lower)) {
    const d = new Date(now); const delta = (0 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta); d.setHours(hour, minute, 0, 0); return d.toISOString();
  }
  if (/\b(next week|agle hafte)\b/i.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 7);
    d.setHours(hour, minute, 0, 0); return d.toISOString();
  }
  return null;
}

// ---- Contextual follow-up helpers ----

/** Detect if text contains a contextual pronoun reference (it/this/that/isko/isme/etc.) */
function hasContextualReference(text: string): boolean {
  return /\b(it|this|that|isko|isme|usko|usay|ye|yeh|woh|ise|usse)\b/i.test(text);
}

/** Detect contextual delete: "Delete it", "Isko delete kar do", etc. */
function isContextualDelete(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // English: "delete it" / "delete this" / "delete that"
  if (/\b(delete|remove|cancel)\b/.test(lower) && hasContextualReference(lower)) return true;
  // Hindi: "isko delete kar do" / "isko hata do" / "ye delete kar do"
  if (/\b(delete|hata|hata do|hata de|hatado)\b/.test(lower) && hasContextualReference(lower)) return true;
  // Hindi pronoun + verb: "isko delete" / "ye remove"
  if (hasContextualReference(lower) && /\b(delete|remove|cancel|hata|hatao)\b/.test(lower)) return true;
  return false;
}

/** Detect contextual complete: "Mark it complete", "Isko done kar do", etc. */
function isContextualComplete(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // English: "mark it complete" / "complete it" / "mark it done"
  if (/\b(mark|complete|finish|done)\b/.test(lower) && hasContextualReference(lower)) return true;
  // Hindi: "isko complete kar do" / "isko done kar do"
  if (/\b(complete|done|finish|pura)\b/.test(lower) && hasContextualReference(lower)) return true;
  return false;
}

/** Detect if text looks like a general mutation with contextual reference.
 *  Covers: "Move it", "Change it", "isko kal kar do", etc.
 */
function isContextualMutation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!hasContextualReference(lower)) return false;
  // Mutation verbs
  return /\b(move|change|set|update|make|shift|rename|modify|kar|karo|kar do|kara do|badal|badal do)\b/i.test(lower);
}

/** Parse Hindi time from text: "5 baje", "shaam 7 baje", "subah 8 baje", "raat 9 baje".
 *  Returns { hour, minute } or null.
 */
function parseHindiTime(text: string): { hour: number; minute: number } | null {
  const lower = text.toLowerCase();
  // Match: "5 baje", "7:30 baje", "paanch baje"
  const bajeMatch = lower.match(/(\d{1,2})(?::(\d{1,2}))?\s*baje/);
  if (!bajeMatch) return null;

  let hour = parseInt(bajeMatch[1]);
  const minute = parseInt(bajeMatch[2] || '0');

  // Determine AM/PM from context words
  if (/\b(shaam|evening|raat|night|pm)\b/.test(lower)) {
    if (hour < 12) hour += 12; // PM
  } else if (/\b(subah|morning|am)\b/.test(lower)) {
    if (hour === 12) hour = 0;
  } else {
    // No explicit period: use Hindi convention
    // "5 baje" without shaam/subah → assume PM for most contexts (evening/task time)
    if (hour >= 1 && hour <= 7) hour += 12;
  }

  return { hour, minute };
}

/** Parse relative time from text: "30 minutes", "in 30 minutes", "30 minute baad".
 *  Returns ISO string of (now + offset) or null.
 */
function parseRelativeTime(text: string): string | null {
  const lower = text.toLowerCase();
  const match = lower.match(/(\d{1,3})\s*(?:minutes?|mins?|minute\s+baad|min\s+baad)/);
  if (!match) return null;
  const minutes = parseInt(match[1]);
  if (minutes <= 0 || minutes > 1440) return null; // max 24 hours
  const future = new Date(Date.now() + minutes * 60 * 1000);
  return future.toISOString();
}

/** Create a task from a Jerry action. */
async function executeCreateTask(userId: string, action: any, originalText: string) {
  let title = normalizeString(action.title);
  if (!title) return null;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  const dueDate = action.due_date || resolveDateFromText(originalText);
  const priority = ['high', 'medium', 'low'].includes(action.priority) ? action.priority : 'medium';
  const context = ['work', 'personal', 'health', 'study'].includes(action.context) ? action.context : 'personal';

  // Duplicate prevention: check if a task with the same title exists
  const { data: existing } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .is('organization_id', null)
    .ilike('title', title)
    .neq('status', 'done')
    .limit(1);

  if (existing && existing.length > 0) {
    return { duplicate: true, existingTask: existing[0] };
  }

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      user_id: userId,
      title,
      description: `Created by Jerry: ${originalText}`,
      status: 'todo',
      priority,
      context,
      tags: ['jerry'],
      due_date: dueDate,
      recurrence: action.recurrence || 'none',
    })
    .select()
    .single();

  if (error) throw error;
  return { task };
}

function buildNodeFallbackReply(ctx: any, lang: string): string {
  const intent = ctx?.intent;
  const isHi = lang === 'hi';

  if (ctx?.error) {
    if (intent === 'task_create') {
      return isHi ? 'Main task nahi bana saka. Kripya dubara koshish karein.' : "I couldn't create that task due to an error. Please try again.";
    }
    if (intent === 'task_query') {
      return isHi ? 'Tasks laane mein pareshani hui. Kripya dubara koshish karein.' : "I couldn't fetch your tasks right now. Please try again.";
    }
    return isHi ? 'Koshish mein kuch gadbad hui. Kripya dubara koshish karein.' : "I ran into an error processing your request. Please try again.";
  }

  if (intent === 'task_create') {
    if (ctx?.duplicate) {
      return isHi ? 'Yeh task pehle se aapki list mein hai.' : 'That task already exists in your list.';
    }
    if (ctx?.created_task?.title) {
      let t = String(ctx.created_task.title).trim();
      t = t.charAt(0).toUpperCase() + t.slice(1);
      return isHi ? `Done! Maine '${t}' aapke tasks mein add kar diya.` : `Done! I've added '${t}' to your tasks.`;
    }
    return isHi ? 'Done! Task create ho gaya.' : "Done! I've added that task.";
  }

  if (intent === 'task_query') {
    const matched = Array.isArray(ctx?.matched_tasks) ? ctx.matched_tasks : [];
    const count = matched.length;
    const label = ctx?.label || ctx?.query || 'pending';

    if (count === 0) {
      if (label.includes('today') || ctx?.query === 'today') {
        return isHi ? 'Aaj ke liye koi pending task nahi hai.' : 'You have no tasks due today.';
      }
      if (label.includes('tomorrow') || ctx?.query === 'tomorrow') {
        return isHi ? 'Kal ke liye koi task nahi hai.' : 'You have no tasks due tomorrow.';
      }
      if (label.includes('overdue') || ctx?.query === 'overdue') {
        return isHi ? 'Koi overdue task nahi hai.' : 'You have no overdue tasks.';
      }
      return isHi ? `Koi ${label} task nahi hai.` : `You have no ${label} tasks.`;
    }

    if (count === 1) {
      const t = matched[0]?.title || 'task';
      return isHi ? `Aapka 1 ${label} task hai: ${t}.` : `You have 1 ${label} task: ${t}.`;
    }

    const preview = matched.slice(0, 3).map((t: any) => t?.title || 'task').join(', ');
    const remaining = count > 3 ? (isHi ? ` aur ${count - 3} aur` : ` and ${count - 3} more`) : '';
    return isHi ? `Aapke ${count} ${label} tasks hain: ${preview}${remaining}.` : `You have ${count} ${label} tasks: ${preview}${remaining}.`;
  }

  if (intent === 'task_complete') {
    if (ctx?.not_found) return isHi ? 'Mujhe match karta hua task nahi mila.' : "I couldn't find a task matching that description.";
    if (ctx?.created_task?.title) return isHi ? `Done! '${ctx.created_task.title}' ko complete mark kar diya.` : `Done! Marked '${ctx.created_task.title}' as complete.`;
    return isHi ? 'Done! Task complete ho gaya.' : 'Done! Marked the task as complete.';
  }

  if (intent === 'task_delete') {
    if (ctx?.not_found) return isHi ? 'Mujhe match karta hua task nahi mila.' : "I couldn't find a task matching that description.";
    if (ctx?.created_task?.title) return isHi ? `Done! '${ctx.created_task.title}' delete kar diya.` : `Done! Deleted '${ctx.created_task.title}'.`;
    return isHi ? 'Done! Task delete ho gaya.' : 'Done! Deleted the task.';
  }

  if (intent === 'task_update') {
    if (ctx?.not_found) return isHi ? 'Mujhe match karta hua task nahi mila.' : "I couldn't find a task matching that description.";
    if (ctx?.created_task?.title) return isHi ? `Done! '${ctx.created_task.title}' update kar diya.` : `Done! Updated '${ctx.created_task.title}'.`;
    return isHi ? 'Done! Task update ho gaya.' : 'Done! Updated the task.';
  }

  if (intent === 'meeting_query' || intent === 'meeting_action_item_query') {
    if (ctx?.meeting?.title) return `Here is the summary for "${ctx.meeting.title}".`;
    return "You don't have any recorded meetings yet.";
  }

  return isHi ? 'Maine aapki request process kar di.' : 'I have processed your request.';
}

/** Execute a task query and format a natural response. */
async function executeTaskQuery(userId: string, queryType: string) {
  const { data: allTasks } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .is('organization_id', null)
    .order('created_at', { ascending: false })
    .limit(200);

  const tasks = allTasks || [];
  const openTasks = tasks.filter((t: any) => t.status !== 'done');
  const now = new Date();

  const isToday = (d: string | null) => {
    if (!d) return false;
    return new Date(d).toDateString() === now.toDateString();
  };
  const isOverdue = (t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'done';
  const isThisWeek = (d: string | null) => {
    if (!d) return false;
    const dd = new Date(d);
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    return dd >= now && dd <= weekEnd;
  };

  let matched: any[] = [];
  let label = '';

  switch (queryType) {
    case 'today': matched = tasks.filter((t: any) => isToday(t.due_date) && t.status !== 'done'); label = 'due today'; break;
    case 'tomorrow': {
      const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
      matched = tasks.filter((t: any) => t.due_date && new Date(t.due_date).toDateString() === tmrw.toDateString() && t.status !== 'done');
      label = 'due tomorrow';
      break;
    }
    case 'overdue': matched = tasks.filter(isOverdue); label = 'overdue'; break;
    case 'pending': matched = openTasks; label = 'open/pending'; break;
    case 'this_week': matched = openTasks.filter((t: any) => isThisWeek(t.due_date)); label = 'due this week'; break;
    case 'urgent': matched = openTasks.filter((t: any) => t.priority === 'high'); label = 'urgent/high-priority'; break;
    case 'completed': matched = tasks.filter((t: any) => t.status === 'done'); label = 'completed'; break;
    case 'upcoming': matched = openTasks.filter((t: any) => t.due_date && new Date(t.due_date) >= now); label = 'upcoming'; break;
    case 'assigned': matched = openTasks.filter((t: any) => t.assignee && t.assignee !== 'Unassigned'); label = 'assigned to you'; break;
    default: matched = openTasks; label = 'open'; break;
  }

  return { matched, label, total: tasks.length, openCount: openTasks.length };
}

/** Execute a task assignment. Uses the existing POST /api/assignments logic. */
async function executeAssignment(userId: string, taskId: string, recipientEmail: string) {
  // 1. Verify the sender owns the task
  const { data: task, error: taskError } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .is('organization_id', null)
    .single();

  if (taskError || !task) {
    return { success: false, reason: 'task_not_found' };
  }

  // 2. Cannot assign to yourself
  const { data: senderProfile } = await supabaseAdmin
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .single();

  const normalizedEmail = recipientEmail.toLowerCase().trim();
  if (senderProfile?.email?.toLowerCase() === normalizedEmail) {
    return { success: false, reason: 'self_assign' };
  }

  // 3. Check for existing active assignment (duplicate prevention)
  const { data: existing } = await supabaseAdmin
    .from('task_assignments')
    .select('id, status')
    .eq('task_id', taskId)
    .eq('recipient_email', normalizedEmail)
    .not('status', 'eq', 'cancelled')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, reason: 'already_assigned', existingStatus: existing[0].status };
  }

  // 4. Look up if recipient is an existing FlowTask user
  const { data: recipientUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1);

  const recipientUserId = recipientUsers?.[0]?.id || null;

  // 5. Create the assignment
  const { data: assignment, error: assignError } = await supabaseAdmin
    .from('task_assignments')
    .insert({
      task_id: taskId,
      sender_user_id: userId,
      recipient_user_id: recipientUserId,
      recipient_email: normalizedEmail,
      status: 'sent',
    })
    .select()
    .single();

  if (assignError) {
    console.error('[Jerry] Assignment creation error:', assignError);
    return { success: false, reason: 'db_error' };
  }

  // 6. Create in-app notification for recipient (if existing user)
  if (recipientUserId) {
    const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'Someone';
    const { error: notifError } = await supabaseAdmin.from('notifications').insert({
      user_id: recipientUserId,
      message: `${senderName} assigned you the task "${task.title}".`,
      type: 'task_assigned',
      reference_id: taskId,
      is_read: false,
    });
    if (notifError) console.warn('[Jerry] Notification insert failed:', notifError.message);
  }

  // 7. Send email notification (non-blocking)
  const { notifyAssignment } = await import('../services/assignmentNotificationService.js');
  const senderName = senderProfile?.name || senderProfile?.email?.split('@')[0] || 'Someone';
  const senderEmailAddr = senderProfile?.email || '';

  // Fire and forget — email failure does not block assignment
  notifyAssignment({
    assignmentId: assignment.id,
    taskId: task.id,
    taskTitle: task.title,
    taskDueDate: task.due_date || null,
    senderUserId: userId,
    senderName,
    senderEmail: senderEmailAddr,
    recipientUserId,
    recipientEmail: normalizedEmail,
  }).catch((err: any) => console.warn('[Jerry] Notification dispatch failed:', err));

  return { success: true, assignment, task, recipientIsUser: !!recipientUserId };
}

// ---- Main Jerry endpoint ----

router.post('/parse', async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.text !== 'string' || !req.body.text.trim()) {
      res.status(400).json({ intent: 'unknown', reply: 'Please type something for me to help with.', action: null, result: null });
      return;
    }

    const text = req.body.text.trim();
    const inputMode = req.body.input_mode === 'voice' ? 'voice' : 'text';
    const userId = req.user!.id;
    const convCtx = getConversationContext(userId);

    // 0. Handle follow-up for pending assignments BEFORE calling ML API
    // This prevents emails/confirmations from being sent to Gemini.
    if (convCtx?.pendingAssignment) {
      const pa = convCtx.pendingAssignment;
      const lowerText = text.toLowerCase().trim();
      const lang = convCtx.lastIntent === 'task_assign' ? 'en' : 'en'; // will be overwritten by ML if needed

      // Check for confirmation (yes/no/cancel)
      if (pa.awaitingConfirmation) {
        if (/^(yes|yep|yeah|haan|bilkul|confirm|ok|do it|send it|kar do|haan karo)$/i.test(lowerText)) {
          try {
            const assignResult = await executeAssignment(userId, pa.taskId, pa.recipientEmail!);
            if (assignResult.success) {
              const reply = `Done — I've assigned '${pa.taskTitle}' to ${pa.recipientEmail}.`;
              setConversationContext(userId, { pendingAssignment: null });
              res.status(200).json({ intent: 'task_assign', language: 'en', reply, action: null, result: { success: true } });
              return;
            } else {
              const reason = assignResult.reason;
              let reply: string;
              if (reason === 'already_assigned') reply = `This task is already assigned to ${pa.recipientEmail}.`;
              else if (reason === 'self_assign') reply = 'You cannot assign a task to yourself.';
              else reply = 'Could not assign the task. Please try again.';
              setConversationContext(userId, { pendingAssignment: null });
              res.status(200).json({ intent: 'task_assign', language: 'en', reply, action: null, result: null });
              return;
            }
          } catch (err) {
            console.error('[Jerry] Assignment execution failed:', err);
            setConversationContext(userId, { pendingAssignment: null });
            res.status(200).json({ intent: 'task_assign', language: 'en', reply: 'Could not assign the task. Please try again.', action: null, result: null });
            return;
          }
        }

        if (/^(no|nope|cancel|nahi|radd|mat karo|don't|stop)$/i.test(lowerText)) {
          setConversationContext(userId, { pendingAssignment: null });
          res.status(200).json({ intent: 'task_assign', language: 'en', reply: 'OK, assignment cancelled.', action: null, result: null });
          return;
        }
      }

      // Check for email input
      if (pa.awaitingEmail) {
        const emailMatch = text.match(/([^\s<>"']+@[^\s<>"']+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1].toLowerCase().trim();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255) {
            pa.recipientEmail = email;
            pa.awaitingEmail = false;
            pa.awaitingConfirmation = true;
            setConversationContext(userId, { pendingAssignment: pa });
            res.status(200).json({
              intent: 'task_assign',
              language: 'en',
              reply: `Send '${pa.taskTitle}' to ${email}? (yes/no)`,
              action: null,
              result: null,
            });
            return;
          }
        }
        res.status(200).json({
          intent: 'task_assign',
          language: 'en',
          reply: 'That doesn\'t look like a valid email. Please enter a valid email address.',
          action: null,
          result: null,
        });
        return;
      }
    }

    // 0b. Handle follow-up for task mutations ("make it 5 PM" → update last task)
    // This handles: update (date/time/priority), delete, and complete — all via contextual reference.
    if (convCtx?.awaitingMutationUpdate && convCtx?.lastMutationTask) {
      const lowerText = text.toLowerCase().trim();
      const task = convCtx.lastMutationTask;

      const isConfirmation = /^(yes|yep|yeah|haan|bilkul|ok|do it|confirm|kar do|haan karo)$/i.test(lowerText);
      const isCancel = /^(no|nope|cancel|nahi|radd|mat karo|don't|stop|never)$/i.test(lowerText);

      // --- Contextual DELETE ---
      if (isContextualDelete(lowerText)) {
        // Verify the task still exists and belongs to user
        const { data: existingTask } = await supabaseAdmin
          .from('tasks').select('id, title').eq('id', task.id).eq('user_id', userId).single();
        if (!existingTask) {
          setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null });
          res.status(200).json({ intent: 'conversation', language: 'en', reply: 'That task no longer exists.', action: null, result: null });
          return;
        }
        try {
          await supabaseAdmin.from('tasks').delete().eq('id', task.id).eq('user_id', userId).is('organization_id', null);
          setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null, lastCreatedTask: null });
          res.status(200).json({ intent: 'task_delete', language: 'en', reply: `Done — deleted "${task.title}".`, action: null, result: { success: true, task: { id: task.id, title: task.title } } });
          return;
        } catch (err) {
          console.error('[Jerry] Follow-up task delete failed:', err);
          res.status(200).json({ intent: 'task_delete', language: 'en', reply: 'Could not delete the task. Please try again.', action: null, result: null });
          return;
        }
      }

      // --- Contextual COMPLETE ---
      if (isContextualComplete(lowerText)) {
        const { data: existingTask } = await supabaseAdmin
          .from('tasks').select('id, title, status').eq('id', task.id).eq('user_id', userId).single();
        if (!existingTask) {
          setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null });
          res.status(200).json({ intent: 'conversation', language: 'en', reply: 'That task no longer exists.', action: null, result: null });
          return;
        }
        if (existingTask.status === 'done') {
          setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null });
          res.status(200).json({ intent: 'task_complete', language: 'en', reply: `"${task.title}" is already marked as complete.`, action: null, result: { success: true, task: { ...existingTask, status: 'done' } } });
          return;
        }
        try {
          await supabaseAdmin.from('tasks').update({ status: 'done' }).eq('id', task.id).eq('user_id', userId).is('organization_id', null);
          setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null, lastCreatedTask: null });
          res.status(200).json({ intent: 'task_complete', language: 'en', reply: `Done — marked "${task.title}" as complete.`, action: null, result: { success: true, task: { ...existingTask, status: 'done' } } });
          return;
        } catch (err) {
          console.error('[Jerry] Follow-up task complete failed:', err);
          res.status(200).json({ intent: 'task_complete', language: 'en', reply: 'Could not complete the task. Please try again.', action: null, result: null });
          return;
        }
      }

      // --- Confirmation / Cancel ---
      if (isConfirmation) {
        setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null });
        // Fall through to normal ML processing
      } else if (isCancel) {
        setConversationContext(userId, { awaitingMutationUpdate: false, lastMutationTask: null });
        res.status(200).json({ intent: 'conversation', language: 'en', reply: 'OK, no changes made.', action: null, result: null });
        return;
      } else if (hasContextualReference(lowerText) || isContextualMutation(lowerText)) {
        // --- Contextual UPDATE (time/priority/date) ---
        const updates: any = {};

        // 1. Try Hindi time: "5 baje", "shaam 7 baje", "subah 8 baje"
        const hindiTime = parseHindiTime(text);
        if (hindiTime) {
          const taskDate = new Date();
          taskDate.setHours(hindiTime.hour, hindiTime.minute, 0, 0);
          updates.due_date = taskDate.toISOString();
        }

        // 2. Try English time: "7 PM", "5:30 AM"
        if (!updates.due_date) {
          const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i);
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            const minute = parseInt(timeMatch[2] || '0');
            const meridiem = (timeMatch[3] || '').toLowerCase().replace('.', '');
            if (meridiem === 'pm' && hour < 12) hour += 12;
            else if (meridiem === 'am' && hour === 12) hour = 0;
            const taskDate = new Date();
            taskDate.setHours(hour, minute, 0, 0);
            updates.due_date = taskDate.toISOString();
          }
        }

        // 3. Try relative time: "30 minutes", "30 minute baad"
        if (!updates.due_date) {
          const relativeTime = parseRelativeTime(text);
          if (relativeTime) updates.due_date = relativeTime;
        }

        // 4. Try full date resolution: "kal", "aaj", "Friday", "next week", "agle hafte"
        if (!updates.due_date) {
          const newDate = resolveDateFromText(text);
          if (newDate) updates.due_date = newDate;
        }

        // 5. Extract priority
        if (/\bhigh\b/i.test(lowerText)) updates.priority = 'high';
        else if (/\blow\b/i.test(lowerText)) updates.priority = 'low';
        else if (/\bmedium\b/i.test(lowerText)) updates.priority = 'medium';

        if (Object.keys(updates).length > 0) {
          try {
            await supabaseAdmin.from('tasks').update(updates).eq('id', task.id).eq('user_id', userId).is('organization_id', null);
            const updatedTask = { ...task, ...updates };
            setConversationContext(userId, { lastCreatedTask: updatedTask, lastIntent: 'task_update', awaitingMutationUpdate: false, lastMutationTask: null });
            const responseContext = { intent: 'task_update', created_task: updatedTask };
            try {
              const genPayload = { text, input_mode: inputMode, response_context: responseContext };
              const genResponse = await forwardJson('/api/ml/parse', genPayload, 60000);
              const genText = await genResponse.text();
              let genData: any;
              try { genData = JSON.parse(genText); } catch { genData = {}; }
              const reply = genData.response || genData.reply || `Done — updated '${task.title}'.`;
              res.status(200).json({ intent: 'task_update', language: 'en', reply, action: null, result: { success: true, task: updatedTask } });
              return;
            } catch {
              res.status(200).json({ intent: 'task_update', language: 'en', reply: `Done — updated '${task.title}'.`, action: null, result: { success: true, task: updatedTask } });
              return;
            }
          } catch (err) {
            console.error('[Jerry] Follow-up task update failed:', err);
            res.status(200).json({ intent: 'task_update', language: 'en', reply: 'Could not update the task. Please try again.', action: null, result: null });
            return;
          }
        }
      }
    }

    // 1. Call ML API for intent classification
    const mlPayload: Record<string, unknown> = { text, input_mode: inputMode };
    let mlResponse: any;
    try {
      const response = await forwardJson('/api/ml/parse', mlPayload, 120000);
      const respText = await response.text();
      try { mlResponse = JSON.parse(respText); } catch { mlResponse = { intent: 'unknown', reply: 'I had trouble understanding that.' }; }
    } catch (err: any) {
      console.error('[Jerry] ML API call failed:', err?.message || err);
      res.status(200).json({
        intent: 'unknown',
        reply: 'Jerry is temporarily unavailable. The AI service is currently unreachable. Please ensure the ML backend service is running.',
        action: null,
        result: null,
      });
      return;
    }

    let intent = mlResponse.intent || 'unknown';
    const language = mlResponse.language || 'en';
    let reply = mlResponse.reply || null;
    let result: any = null;
    let responseContext: any = null;

    // 2. Execute action based on intent
    switch (intent) {
      case 'task_create': {
        let actionTitle = mlResponse.title ? normalizeString(mlResponse.title) : '';
        if (actionTitle) {
          actionTitle = actionTitle.charAt(0).toUpperCase() + actionTitle.slice(1);
        }
        const action = actionTitle ? {
          type: 'create_task',
          title: actionTitle,
          due_date: mlResponse.due_date || null,
          priority: mlResponse.priority || 'medium',
          context: mlResponse.context || 'personal',
          recurrence: mlResponse.recurrence || 'none',
        } : null;

        if (action && action.title) {
          try {
            const execResult = await executeCreateTask(userId, action, text);
            if (execResult?.duplicate) {
              result = { success: false, reason: 'duplicate', taskId: execResult.existingTask.id };
              responseContext = { intent, created_task: null, duplicate: true };
            } else if (execResult?.task) {
              result = { success: true, task: execResult.task };
              setConversationContext(userId, { lastCreatedTask: execResult.task, lastIntent: intent });
              responseContext = { intent, created_task: execResult.task };
            } else {
              result = { success: false, reason: 'error' };
              responseContext = { intent, error: true };
            }
          } catch (err) {
            console.error('[Jerry] Task creation failed:', err);
            result = { success: false, reason: 'error' };
            responseContext = { intent, error: true };
          }
        } else {
          result = { success: false, reason: 'missing_title' };
          responseContext = { intent, error: true };
        }
        // Set follow-up context: if user created a task, allow follow-up mutations
        if (result?.success && result.task) {
          setConversationContext(userId, {
            lastMutationTask: { id: result.task.id, title: result.task.title },
            awaitingMutationUpdate: true,
          });
        }
        break;
      }

      case 'task_query': {
        const queryType = mlResponse.query || 'pending';
        try {
          const queryResult = await executeTaskQuery(userId, queryType);
          result = queryResult;
          setConversationContext(userId, { lastQueryResult: { matched: queryResult.matched, label: queryResult.label }, lastIntent: intent, recentTasks: queryResult.matched });
          responseContext = { intent, query: queryType, matched_tasks: queryResult.matched, label: queryResult.label };
        } catch (err) {
          console.error('[Jerry] Task query failed:', err);
          result = { matched: [], label: queryType, error: true };
          responseContext = { intent, query: queryType, matched_tasks: [], label: queryType, error: true };
        }
        break;
      }

      case 'task_complete': {
        // Prefer Gemini's extracted task_match over raw user text
        const matchText = mlResponse.task_match || text;
        const { task, candidates } = await resolveTask(userId, matchText);
        if (candidates && candidates.length > 1) {
          result = { success: false, reason: 'ambiguous', candidates: candidates.map((t: any) => ({ id: t.id, title: t.title })) };
          responseContext = { intent, not_found: false, matched_tasks: candidates };
        } else if (task) {
          try {
            await supabaseAdmin.from('tasks').update({ status: 'done' }).eq('id', task.id).eq('user_id', userId).is('organization_id', null);
            result = { success: true, task: { ...task, status: 'done' } };
            setConversationContext(userId, { lastCreatedTask: null, lastIntent: intent });
          responseContext = { intent, created_task: { ...task, status: 'done' } };
          setConversationContext(userId, { lastMutationTask: null, awaitingMutationUpdate: false });
        } catch (err) {
          console.error('[Jerry] Task complete failed:', err);
          result = { success: false };
          responseContext = { intent, error: true };
        }
      } else {
        result = { success: false, reason: 'not_found' };
        responseContext = { intent, not_found: true };
      }
      break;
    }

      case 'task_delete': {
        const matchText = mlResponse.task_match || text;
        const { task, candidates } = await resolveTask(userId, matchText);
        if (candidates && candidates.length > 1) {
          result = { success: false, reason: 'ambiguous', candidates: candidates.map((t: any) => ({ id: t.id, title: t.title })) };
          responseContext = { intent, not_found: false, matched_tasks: candidates };
        } else if (task) {
          try {
            await supabaseAdmin.from('tasks').delete().eq('id', task.id).eq('user_id', userId).is('organization_id', null);
            result = { success: true, task };
            setConversationContext(userId, { lastCreatedTask: null, lastIntent: intent });
            responseContext = { intent, created_task: task };
          } catch (err) {
            console.error('[Jerry] Task delete failed:', err);
            result = { success: false };
            responseContext = { intent, error: true };
          }
        } else {
          result = { success: false, reason: 'not_found' };
          responseContext = { intent, not_found: true };
        }
        break;
      }

      case 'task_update': {
        const matchText = mlResponse.task_match || text;
        const { task, candidates } = await resolveTask(userId, matchText);
        if (candidates && candidates.length > 1) {
          result = { success: false, reason: 'ambiguous', candidates: candidates.map((t: any) => ({ id: t.id, title: t.title })) };
          responseContext = { intent, not_found: false, matched_tasks: candidates };
        } else if (task) {
          const updates: any = {};
          const geminiUpdates = mlResponse.updates || {};
          if (geminiUpdates.title) updates.title = geminiUpdates.title;
          if (geminiUpdates.due_date) updates.due_date = geminiUpdates.due_date;
          if (geminiUpdates.priority && ['high', 'medium', 'low'].includes(geminiUpdates.priority)) {
            updates.priority = geminiUpdates.priority;
          }
          if (geminiUpdates.status && ['todo', 'in_progress', 'done'].includes(geminiUpdates.status)) {
            updates.status = geminiUpdates.status;
          }
          if (Object.keys(updates).length === 0) {
            if (/\bhigh priority\b/i.test(text)) updates.priority = 'high';
            if (/\blow priority\b/i.test(text)) updates.priority = 'low';
            const dayMatch = text.match(/\b(friday|monday)\b/i);
            if (dayMatch) {
              const target = dayMatch[1].toLowerCase() === 'friday' ? 5 : 1;
              const d = new Date(); const delta = (target - d.getDay() + 7) % 7 || 7;
              d.setDate(d.getDate() + delta); d.setHours(9, 0, 0, 0);
              updates.due_date = d.toISOString();
            }
            const newDate = resolveDateFromText(text);
            if (newDate && !updates.due_date) updates.due_date = newDate;
          }
          if (Object.keys(updates).length > 0) {
            try {
              await supabaseAdmin.from('tasks').update(updates).eq('id', task.id).eq('user_id', userId).is('organization_id', null);
              const updatedTask = { ...task, ...updates };
              result = { success: true, task: updatedTask };
              setConversationContext(userId, { lastCreatedTask: updatedTask, lastIntent: intent, lastMutationTask: { id: task.id, title: task.title }, awaitingMutationUpdate: true });
              responseContext = { intent, created_task: updatedTask };
            } catch (err) {
              console.error('[Jerry] Task update failed:', err);
              result = { success: false };
              responseContext = { intent, error: true };
            }
          } else {
            result = { success: false, reason: 'no_updates' };
            responseContext = { intent, not_found: true };
          }
        } else {
          result = { success: false, reason: 'not_found' };
          responseContext = { intent, not_found: true };
        }
        break;
      }

      case 'task_assign': {
        const taskMatch = mlResponse.task_match || text;
        const recipientName = mlResponse.recipient_name || null;
        const recipientEmail = mlResponse.recipient_email || null;

        // Try to resolve the task
        const { task: matchedTask, candidates } = await resolveTask(userId, taskMatch);

        if (!matchedTask && (!candidates || candidates.length === 0)) {
          reply = language === 'hi'
            ? 'Mujhe woh task nahi mila. Kaunsa task assign karna hai?'
            : 'I couldn\'t find that task. Which task would you like to assign?';
          setConversationContext(userId, { pendingAssignment: null });
          break;
        }

        if (candidates && candidates.length > 1) {
          const names = candidates.map((t: any) => t.title).join(', ');
          reply = language === 'hi'
            ? `Kayi tasks mil gaye: ${names}. Kaunsa wala?`
            : `Multiple tasks found: ${names}. Which one do you mean?`;
          setConversationContext(userId, { pendingAssignment: null });
          break;
        }

        const taskId = matchedTask.id;
        const taskTitle = matchedTask.title;

        // If email was provided directly, go to confirmation
        if (recipientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
          setConversationContext(userId, {
            pendingAssignment: {
              taskId,
              taskTitle,
              recipientName: recipientName || recipientEmail.split('@')[0],
              recipientEmail,
              awaitingEmail: false,
              awaitingConfirmation: true,
            },
          });
          reply = language === 'hi'
            ? `Kya main '${taskTitle}' ko ${recipientEmail} ko assign kar du? (haan/na)`
            : `Send '${taskTitle}' to ${recipientEmail}? (yes/no)`;
          break;
        }

        // No email — ask for it
        const nameStr = recipientName ? ` ${recipientName}` : '';
        setConversationContext(userId, {
          pendingAssignment: {
            taskId,
            taskTitle,
            recipientName: recipientName || '',
            recipientEmail: null,
            awaitingEmail: true,
            awaitingConfirmation: false,
          },
        });
        reply = language === 'hi'
          ? `${recipientName ? recipientName + ' ka' : 'Recipient ka'} email address kya hai?`
          : `What${nameStr ? ' is' + nameStr + '\'s' : ''} email address?`;
        break;
      }

      case 'meeting_query':
      case 'meeting_action_item_query': {
        try {
          // If we have a stored meeting context, use it for follow-up queries
          const hasMeetingContext = convCtx?.lastMeetingId;
          let meetings: any[] = [];

          if (hasMeetingContext) {
            // Fetch the specific stored meeting
            const { data: storedMeeting } = await supabaseAdmin
              .from('meetings')
              .select('*')
              .eq('id', convCtx.lastMeetingId!)
              .eq('user_id', userId)
              .single();
            if (storedMeeting) meetings = [storedMeeting];
          }

          // Fallback: if no stored context or stored meeting was deleted, fetch latest
          if (meetings.length === 0) {
            const { data: latestMeetings } = await supabaseAdmin
              .from('meetings')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1);
            meetings = latestMeetings || [];
          }

          const meeting = meetings[0] || null;
          result = { meeting };
          responseContext = { intent, meeting };

          // Store meeting ID in context for follow-up queries
          if (meeting) {
            setConversationContext(userId, { lastMeetingId: meeting.id, lastIntent: intent });
          }
        } catch (err) {
          console.error('[Jerry] Meeting query failed:', err);
          result = { meeting: null };
          responseContext = { intent, meeting: null };
        }
        break;
      }

      // greeting, conversation, flowtask_help, out_of_scope, unclear — no DB action needed
      default:
        setConversationContext(userId, { lastIntent: intent });
        break;
    }

    // 3. Generate natural response via Gemini if we have response context
    if (responseContext) {
      try {
        const genPayload = {
          text,
          input_mode: inputMode,
          response_context: {
            ...responseContext,
            last_created_task: convCtx?.lastCreatedTask || null,
          },
        };
        const genResponse = await forwardJson('/api/ml/parse', genPayload, 60000);
        const genText = await genResponse.text();
        let genData: any;
        try { genData = JSON.parse(genText); } catch { genData = {}; }
        if (genData.response || genData.reply) {
          reply = genData.response || genData.reply;
        }
      } catch (err) {
        console.error('[Jerry] Response generation failed:', err);
      }

      // If reply is missing, unclear, or out-of-scope despite valid execution context,
      // override with authoritative deterministic response.
      if (!reply || reply.includes("couldn't understand that as a FlowTask request") || reply.includes("not sure how to help with that")) {
        reply = buildNodeFallbackReply(responseContext, language);
      }
    }

    // 4. Return unified response
    const actionTitle = result?.task?.title || mlResponse.title;
    res.status(200).json({
      intent,
      language,
      reply,
      action: actionTitle ? {
        type: intent,
        title: actionTitle,
        due_date: result?.task?.due_date || mlResponse.due_date,
        priority: result?.task?.priority || mlResponse.priority,
        context: result?.task?.context || mlResponse.context,
      } : null,
      result,
    });

  } catch (err) {
    console.error('[Jerry] Unexpected error:', err);
    res.status(200).json({ intent: 'unknown', reply: 'Something went wrong. Please try again.', action: null, result: null });
  }
});

// ---- Meeting endpoints (unchanged) ----

router.post('/analyze-meeting', async (req: Request, res: Response) => {
  try {
    const response = await forwardJson('/api/ml/analyze-meeting', req.body, 90000);
    await relay(response, res);
  } catch (error) {
    console.error('AI meeting proxy error:', error);
    res.status(502).json({ detail: 'Meeting analysis is temporarily unavailable. Please try again.' });
  }
});

router.post('/analyze-transcript', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ detail: 'No transcript file provided.' });
      return;
    }
    const form = new FormData();
    form.append('meeting_title', String(req.body.meeting_title || req.file.originalname));
    form.append('file', new Blob([req.file.buffer as unknown as BlobPart], { type: req.file.mimetype }), req.file.originalname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    let response: globalThis.Response;
    try {
      response = await fetch(`${getMlApiUrl()}/api/ml/analyze-transcript`, { method: 'POST', body: form, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    await relay(response, res);
  } catch (error) {
    console.error('AI transcript proxy error:', error);
    res.status(502).json({ detail: 'Transcript analysis is temporarily unavailable. Please try again.' });
  }
});

/**
 * POST /api/ai/transcribe — Transcribe meeting audio via ML API (Whisper)
 */
router.post('/transcribe', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ detail: 'No audio file provided.' });
      return;
    }

    // Validate audio file type
    const allowedExts = ['.m4a', '.mp4', '.wav', '.webm', '.ogg', '.mp3', '.aac'];
    const ext = req.file.originalname.toLowerCase().split('.').pop();
    if (!ext || !allowedExts.includes(`.${ext}`)) {
      res.status(400).json({ detail: 'Unsupported audio format. Use M4A, WAV, WebM, OGG, or MP3.' });
      return;
    }

    const form = new FormData();
    form.append('file', new Blob([req.file.buffer as unknown as BlobPart], { type: req.file.mimetype }), req.file.originalname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    let response: globalThis.Response;
    try {
      response = await fetch(`${getMlApiUrl()}/api/ml/transcribe`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    await relay(response, res);
  } catch (error: any) {
    console.error('Transcription proxy error:', error);
    if (error?.name === 'AbortError') {
      res.status(504).json({ detail: 'Transcription timed out. Try a shorter recording.' });
    } else {
      res.status(502).json({ detail: 'Transcription service is temporarily unavailable. Please try again.' });
    }
  }
});

export default router;
