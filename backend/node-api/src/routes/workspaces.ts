import { createHash, randomBytes } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { createUserClient } from '../db/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { answerSchema, meetingDay, prepareAnalysis, type Member } from '../services/workspaceAnalysis.js';
import { sendWorkspaceInvite } from '../services/emailService.js';

const router = Router();
router.use(authMiddleware);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } });
const uuid = z.string().uuid();
const role = z.enum(['admin', 'manager', 'member']);
const stage = z.enum(['todo', 'in_progress', 'blocked', 'in_review', 'done']);
const title = (max: number) => z.string().trim().min(1).max(max);
const datetime = z.string().datetime({ offset: true });
const settings = z.object({
  name: title(120), description: z.string().max(3000).default(''),
  logo_url: z.string().url().max(2000).refine((url) => url.startsWith('https://')).nullable().default(null),
});
const project = settings.pick({ name: true, description: true }).extend({
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});
const meetingInput = z.object({
  title: title(200), description: z.string().max(5000).default(''), agenda: z.string().max(5000).default(''),
  starts_at: datetime, timezone: z.string().max(80).default('UTC').refine((zone) => {
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; }
  }),
  project_id: uuid.nullable().default(null), participants: z.array(uuid).max(150).default([]),
  visibility: z.enum(['team', 'participants']).default('team'),
  status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
});
const reviewedTask = z.object({
  id: uuid, title: title(255), description: z.string().max(3000).default(''), user_id: uuid,
  due_date: datetime.nullable().default(null), priority: z.enum(['low', 'medium', 'high']).default('medium'),
  project_id: uuid.nullable().default(null),
});
const taskFields = 'id,user_id,title,description,due_date,priority,status,organization_stage,organization_project_id,organization_meeting_id,organization_action_key,created_at,completed_at';
const meetingFields = 'id,organization_id,title,description,agenda,starts_at,timezone,created_at,project_id,participants,status,visibility';
const mlUrl = () => (process.env.ML_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function unwrap<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (!result.error) return result.data;
  const { code, message } = result.error;
  if (code === '42501') throw new HttpError(403, 'You do not have permission for this workspace action.');
  if (code === 'P0002' || code === 'PGRST116') throw new HttpError(404, 'This workspace item is unavailable.');
  if (code === '23505') throw new HttpError(409, message);
  if (['23503', '23514', '23502', '22P02'].includes(code ?? '')) throw new HttpError(400, message);
  console.error('Workspace database request failed', code, message);
  throw new HttpError(500, 'Workspace request failed. Check the workspace database migration.');
}

function row(result: Parameters<typeof unwrap>[0]) {
  const data = unwrap(result);
  const value = Array.isArray(data) ? data[0] : data;
  if (value == null) throw new HttpError(404, 'This workspace item is unavailable.');
  return value;
}

async function readWorkspaceRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>,
): Promise<T[]> {
  const size = 200;
  const all: T[] = [];
  for (let offset = 0; ; offset += size) {
    const items = unwrap(await page(offset, offset + size - 1)) ?? [];
    all.push(...items);
    if (items.length < size) return all;
  }
}

function endpoint(handler: (req: Request, client: ReturnType<typeof createUserClient>) => Promise<unknown>, status = 200) {
  return async (req: Request, res: Response) => {
    try {
      if (!process.env.SUPABASE_ANON_KEY) throw new HttpError(503, 'Workspace access requires SUPABASE_ANON_KEY on the Node API.');
      const data = await handler(req, createUserClient(req.accessToken!));
      res.status(status).json({ data, error: null, status });
    } catch (error) {
      const httpError = error instanceof HttpError ? error
        : error instanceof z.ZodError ? new HttpError(400, error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' · '))
          : new HttpError(500, 'Workspace request failed.');
      if (!(error instanceof HttpError || error instanceof z.ZodError)) console.error('Workspace request failed', error);
      res.status(httpError.status).json({ data: null, error: httpError.message, status: httpError.status });
    }
  };
}

type Client = ReturnType<typeof createUserClient>;
const organizationId = (req: Request) => uuid.parse(req.params.org);
const itemId = (req: Request) => uuid.parse(req.params.id);
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const getRole = async (client: Client, org: string) => {
  const memberRole = unwrap(await client.rpc('workspace_role', { workspace: org }));
  if (!memberRole) throw new HttpError(404, 'Workspace not found.');
  return role.parse(memberRole);
};
const requireManager = async (client: Client, org: string) => {
  if (await getRole(client, org) === 'member') throw new HttpError(403, 'A manager or admin is required.');
};
const directory = async (client: Client, org: string): Promise<Member[]> =>
  readWorkspaceRows<Member>((from, to) => client.rpc('workspace_directory', { workspace: org }).range(from, to));
const getMeeting = async (client: Client, org: string, meeting: string) =>
  unwrap(await client.from('organization_meetings').select('*').eq('organization_id', org).eq('id', meeting).single());

async function callAI(path: string, payload: unknown) {
  const secret = process.env.ORG_AI_SHARED_SECRET;
  if (!secret) throw new HttpError(503, 'Organization AI is unavailable until ORG_AI_SHARED_SECRET is configured.');
  try {
    const response = await fetch(`${mlUrl()}/api/ml/workspace/${path}`, {
      method: 'POST', signal: AbortSignal.timeout(70_000),
      headers: { 'Content-Type': 'application/json', 'X-FlowTask-Workspace-Secret': secret },
      body: JSON.stringify(payload),
    });
    const value = await response.json();
    if (!response.ok) {
      const status = [429, 503].includes(response.status) ? response.status : 502;
      throw new HttpError(status, typeof value.detail === 'string' ? value.detail : 'Jerry could not complete the request.');
    }
    return value;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'Jerry is temporarily unavailable. Try again.');
  }
}

router.get('/', endpoint(async (req, client) => unwrap(await client.from('organization_members')
  .select('role, organization:organizations(id,name,description,logo_url)').eq('user_id', req.user!.id))));

router.post('/', endpoint(async (req, client) => row(await client.rpc('workspace_create', {
  settings: settings.parse(req.body),
})), 201));

router.get('/invitations', endpoint(async (_req, client) => unwrap(await client.rpc('workspace_inbox'))));
router.post('/invitations/respond', endpoint(async (req, client) => {
  const input = z.object({ invitation: uuid.optional(), token: z.string().regex(/^[0-9a-f]{64}$/).optional(), accept: z.boolean() })
    .refine((value) => !!value.invitation !== !!value.token).parse(req.body);
  return unwrap(await client.rpc('workspace_respond', {
    invitation: input.invitation ?? null, digest: input.token ? digest(input.token) : null, accept: input.accept,
  }));
}));

router.get('/:org', endpoint(async (req, client) => {
  const org = organizationId(req);
  const memberRole = await getRole(client, org);
  const [organization, members, projects, meetings, tasks, activity] = await Promise.all([
    client.from('organizations').select('*').eq('id', org).single(),
    directory(client, org),
    readWorkspaceRows((from, to) => client.from('organization_projects').select('*').eq('organization_id', org)
      .order('created_at', { ascending: false }).order('id').range(from, to)),
    readWorkspaceRows((from, to) => client.from('organization_meetings')
      .select(`${meetingFields},analysis_version,overview:analysis->>overview` as const).eq('organization_id', org)
      .order('starts_at', { ascending: false }).order('id').range(from, to)),
    readWorkspaceRows((from, to) => client.from('tasks').select(taskFields).eq('organization_id', org)
      .order('created_at', { ascending: false }).order('id').range(from, to)),
    client.from('organization_activity').select('*').eq('organization_id', org).order('created_at', { ascending: false }).limit(15),
  ]);
  return { organization: unwrap(organization), role: memberRole, members,
    projects, meetings: meetings.map(({ overview, ...meeting }) => ({ ...meeting, has_analysis: !!overview })),
    tasks, activity: unwrap(activity) };
}));

router.put('/:org', endpoint(async (req, client) => row(await client.rpc('workspace_settings', {
  workspace: organizationId(req), settings: settings.parse(req.body),
}))));

router.post('/:org/invitations', endpoint(async (req, client) => {
  const org = organizationId(req);
  const input = z.object({ email: z.string().trim().email().max(254), role: z.enum(['member', 'manager']), send_email: z.boolean().default(false) }).parse(req.body);
  const token = randomBytes(32).toString('hex');
  const invite = unwrap(await client.rpc('workspace_invite', {
    workspace: org, recipient: input.email.toLowerCase(), invited_role: input.role, digest: digest(token),
  }));
  const link = new URL('/join/' + token, process.env.FRONTEND_URL || 'http://localhost:5173').href;
  let emailed = false;
  if (input.send_email) {
    const organization = unwrap(await client.from('organizations').select('name').eq('id', org).single());
    if (organization) emailed = (await sendWorkspaceInvite(input.email, organization.name, link)).success;
  }
  return { id: invite, link, emailed };
}, 201));

router.patch('/:org/members/:id', endpoint(async (req, client) => unwrap(await client.rpc('workspace_set_role', {
  workspace: organizationId(req), member: itemId(req), new_role: role.parse(req.body.role),
}))));

router.post('/:org/projects', endpoint(async (req, client) => row(await client.rpc('workspace_save_project', {
  workspace: organizationId(req), project: null, input: project.parse(req.body),
})), 201));
router.put('/:org/projects/:id', endpoint(async (req, client) => row(await client.rpc('workspace_save_project', {
  workspace: organizationId(req), project: itemId(req), input: project.parse(req.body),
}))));

router.get('/:org/meetings/:id', endpoint(async (req, client) => getMeeting(client, organizationId(req), itemId(req))));
router.post('/:org/meetings', endpoint(async (req, client) => row(await client.rpc('workspace_save_meeting', {
  workspace: organizationId(req), meeting: null, input: meetingInput.parse(req.body),
})), 201));
router.put('/:org/meetings/:id', endpoint(async (req, client) => row(await client.rpc('workspace_save_meeting', {
  workspace: organizationId(req), meeting: itemId(req), input: meetingInput.parse(req.body),
}))));

const authorizeUpload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!process.env.SUPABASE_ANON_KEY) throw new HttpError(503, 'Workspace access requires SUPABASE_ANON_KEY on the Node API.');
    await requireManager(createUserClient(req.accessToken!), organizationId(req));
    next();
  } catch (failure) {
    const status = failure instanceof HttpError ? failure.status : 400;
    res.status(status).json({ data: null, error: failure instanceof HttpError ? failure.message : 'Invalid workspace ID.', status });
  }
};

router.post('/:org/meetings/:id/transcript', authorizeUpload, upload.single('file'), endpoint(async (req, client) => {
  const org = organizationId(req);
  const meeting = itemId(req);
  await requireManager(client, org);
  const current = await getMeeting(client, org, meeting);
  const prior = unwrap(await client.from('tasks').select('id').eq('organization_meeting_id', meeting).limit(1));
  if (prior?.length) throw new HttpError(409, 'Approved items already exist for this meeting.');
  let transcript = req.body.transcript ?? '';
  const filename = req.file ? req.file.originalname.slice(0, 255) : null;
  if (req.file && /\.(txt|md|vtt|srt)$/i.test(req.file.originalname)) {
    try { transcript = new TextDecoder('utf-8', { fatal: true }).decode(req.file.buffer); }
    catch { throw new HttpError(400, 'Upload a UTF-8 text file.'); }
  } else if (req.file) {
    if (!/\.(mp3|wav|m4a|aac|ogg|webm|mp4)$/i.test(req.file.originalname)) {
      throw new HttpError(400, 'Use TXT, Markdown, VTT, SRT, or a supported audio file.');
    }
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }), req.file.originalname);
    try {
      const response = await fetch(`${mlUrl()}/api/ml/transcribe`, { method: 'POST', body: form, signal: AbortSignal.timeout(110_000) });
      const value = await response.json();
      if (!response.ok || typeof value.text !== 'string' || !value.text.trim()) {
        throw new HttpError(response.status === 400 ? 400 : 502, value.error || value.detail || 'Audio transcription failed.');
      }
      transcript = value.text;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'The transcription service is unavailable.');
    }
  }
  return row(await client.rpc('workspace_save_analysis', {
    workspace: org, meeting, expected: current.analysis_version, source: title(80_000).parse(transcript), filename, result: null,
  }));
}));

router.post('/:org/meetings/:id/analyze', endpoint(async (req, client) => {
  const org = organizationId(req);
  const meeting = itemId(req);
  await requireManager(client, org);
  const current = await getMeeting(client, org, meeting);
  const assigned = unwrap(await client.from('tasks').select('id').eq('organization_meeting_id', meeting).limit(1));
  if (assigned?.length) return current;
  if (!current.transcript.trim()) throw new HttpError(400, 'Save a transcript or notes before asking Jerry to analyze the meeting.');
  const members = await directory(client, org);
  const accessible = members.filter((member) => current.visibility === 'team' || member.role !== 'member'
    || current.participants.includes(member.user_id));
  const generated = await callAI('analyze', { title: current.title, transcript: current.transcript, meeting_date: meetingDay(current.starts_at, current.timezone) });
  let analysis;
  try { analysis = prepareAnalysis(generated, accessible, current.project_id); }
  catch { throw new HttpError(502, 'Jerry returned an invalid meeting analysis. Try again.'); }
  return row(await client.rpc('workspace_save_analysis', {
    workspace: org, meeting, expected: current.analysis_version, source: current.transcript, filename: current.source_name, result: analysis,
  }));
}));

router.post('/:org/meetings/:id/approve', endpoint(async (req, client) => {
  const input = z.object({ version: uuid, items: z.array(reviewedTask).min(1).max(40) }).parse(req.body);
  return unwrap(await client.rpc('workspace_approve_tasks', { workspace: organizationId(req), meeting: itemId(req), ...input }));
}, 201));

router.post('/:org/tasks', endpoint(async (req, client) => row(await client.rpc('workspace_create_task', {
  workspace: organizationId(req), input: reviewedTask.omit({ id: true }).parse(req.body),
})), 201));
router.patch('/:org/tasks/:id', endpoint(async (req, client) => row(await client.rpc('workspace_update_task', {
  workspace: organizationId(req), task: itemId(req),
  changes: z.object({ stage: stage.optional(), user_id: uuid.optional(), due_date: datetime.nullable().optional() }).strict().parse(req.body),
}))));

router.get('/:org/tasks/:id/updates', endpoint(async (req, client) => {
  const task = itemId(req);
  unwrap(await client.from('tasks').select('id').eq('organization_id', organizationId(req)).eq('id', task).single());
  return unwrap(await client.from('organization_task_updates').select('*').eq('task_id', task).order('created_at'));
}));
router.post('/:org/tasks/:id/updates', endpoint(async (req, client) => row(await client.rpc('workspace_add_task_update', {
  workspace: organizationId(req), task: itemId(req),
  input: z.object({ kind: z.enum(['comment', 'blocker', 'deadline_request']), body: title(4000), requested_due_at: datetime.nullable().default(null) }).parse(req.body),
})), 201));

router.get('/:org/meetings/:id/follow-up', endpoint(async (req, client) => {
  const org = organizationId(req);
  const meeting = await getMeeting(client, org, itemId(req));
  let query = client.from('organization_meetings').select('id,title,analysis,starts_at').eq('organization_id', org)
    .eq('status', 'completed').lt('starts_at', meeting.starts_at).order('starts_at', { ascending: false }).limit(1);
  if (meeting.project_id) query = query.eq('project_id', meeting.project_id);
  const previous = unwrap(await query.maybeSingle());
  const tasks = previous ? unwrap(await client.from('tasks').select(taskFields).eq('organization_meeting_id', previous.id)) ?? [] : [];
  const ids = tasks.map((task) => task.id);
  const blockers = ids.length ? unwrap(await client.from('organization_task_updates').select('task_id,body,created_at').in('task_id', ids).eq('kind', 'blocker')) : [];
  return { previous, tasks, blockers, agenda: tasks.filter((task) => task.organization_stage !== 'done').map((task) => `Review ${task.title}`) };
}));

router.post('/:org/ask', endpoint(async (req, client) => {
  const org = organizationId(req);
  const question = title(1000).parse(req.body.question);
  await getRole(client, org);
  const [meetings, tasks, members] = await Promise.all([
    client.from('organization_meetings').select('id,title,starts_at,status,analysis').eq('organization_id', org).order('starts_at', { ascending: false }).limit(20),
    client.from('tasks').select(taskFields).eq('organization_id', org).order('updated_at', { ascending: false }).limit(70),
    directory(client, org),
  ]);
  const names = new Map(members.map((member) => [member.user_id, member.name || member.email]));
  const now = new Date().toISOString();
  const identity = names.get(req.user!.id) ?? 'the signed-in member';
  const records = [
    ...(unwrap(meetings) ?? []).map((meeting) => ({
      id: meeting.id, title: meeting.title, starts_at: meeting.starts_at, status: meeting.status,
      overview: meeting.analysis?.overview, decisions: meeting.analysis?.decisions?.map((note: { text: string }) => note.text),
    })),
    ...(unwrap(tasks) ?? []).map((task) => ({
      id: task.id, title: task.title, assignee: names.get(task.user_id), status: task.organization_stage,
      due_date: task.due_date, meeting_id: task.organization_meeting_id,
      overdue: task.organization_stage !== 'done' && !!task.due_date && task.due_date < now,
    })),
  ];
  if (!records.length) return { answer: 'There are no visible meetings or tasks in this workspace yet.', source_ids: [] };
  const value = await callAI('ask', { question: `Current date and time: ${now}. Signed-in member: ${identity}. Question: ${question}`.slice(0, 1000), records });
  const validated = answerSchema.safeParse(value);
  if (!validated.success || validated.data.source_ids.some((id) => !records.some((record) => record.id === id))) {
    throw new HttpError(502, 'Jerry could not verify the answer against workspace records.');
  }
  return { ...validated.data, sources: records.filter((record) => validated.data.source_ids.includes(record.id)).map(({ id, title }) => ({ id, title })) };
}));

router.use((failure: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (!(failure instanceof multer.MulterError)) { next(failure); return; }
  const status = failure.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  res.status(status).json({ data: null, error: status === 413 ? 'Upload a file of 15 MB or less.' : 'Upload one valid meeting file.', status });
});

export default router;
