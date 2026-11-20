import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApprovedTask, Member, Project, Stage, TaskUpdate, WorkspaceSnapshot, WorkspaceTask } from '../../../../../shared/types/workspace';
import { workspaceRequest } from '../../../api/workspaces';
import { Empty, Feedback } from './WorkspaceFeedback';
import { dateLabel, jsonForm, localInput, memberName, metricCounts, overdue, taskForm, toIso, useAction, type WorkspaceProps } from './workspaceState';

const stages: Record<Stage, string> = {
  todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', in_review: 'In review', done: 'Completed',
};

export function TaskFields({ members, projects, defaults }: {
  members: Member[];
  projects: Project[];
  defaults?: Partial<ApprovedTask>;
}) {
  return <>
    <label>Title<input name="title" required maxLength={255} defaultValue={defaults?.title} /></label>
    <label>Description<textarea name="description" maxLength={3000} defaultValue={defaults?.description} /></label>
    <div className="ws-fields">
      <label>Assignee<select name="user_id" required defaultValue={defaults?.user_id ?? ''}>
        <option value="" disabled>Select a member</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.name || member.email} ({member.email})</option>)}
      </select></label>
      <label>Deadline<input type="datetime-local" name="due_date" defaultValue={localInput(defaults?.due_date ?? null)} /></label>
      <label>Priority<select name="priority" defaultValue={defaults?.priority ?? 'medium'}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
      <label>Project<select name="project_id" defaultValue={defaults?.project_id ?? ''}><option value="">No project</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select></label>
    </div>
  </>;
}

export function TasksPanel({ data, refresh }: WorkspaceProps) {
  const [view, setView] = useState<'list' | 'board'>('list');
  const [status, setStatus] = useState('');
  const [member, setMember] = useState('');
  const [project, setProject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selected, setSelected] = useState('');
  const action = useAction();
  const base = `/${data.organization.id}/tasks`;
  const canManage = data.role !== 'member';
  const filtered = data.tasks.filter((task) => (!status || status === task.organization_stage)
    && (!member || member === task.user_id) && (!project || project === task.organization_project_id)
    && (!deadline || (deadline === 'overdue' ? overdue(task) : !task.due_date)));
  const task = data.tasks.find((item) => item.id === selected);
  const taskButton = (item: WorkspaceTask) => <button key={item.id} className="ws-task" onClick={() => setSelected(item.id)}>
    <strong>{item.title}</strong><span>{memberName(data, item.user_id)} · {item.priority} priority</span>
    <span>{dateLabel(item.due_date)}{overdue(item) && ' · Overdue'}</span>
    <span className="ws-tag">{stages[item.organization_stage]}</span>
  </button>;
  return <>
    <section className="ws-card"><div className="ws-row"><h2>{canManage ? 'Team tasks' : 'Assigned to me'}</h2>
      <div className="ws-inline"><button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
        <button type="button" aria-pressed={view === 'board'} onClick={() => setView('board')}>Kanban</button></div></div>
      <div className="ws-fields ws-filters">
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Any status</option>{Object.entries(stages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Member<select value={member} onChange={(event) => setMember(event.target.value)}>
          <option value="">Any member</option>{data.members.map((entry) => <option key={entry.user_id} value={entry.user_id}>{entry.name || entry.email}</option>)}
        </select></label>
        <label>Project<select value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">Any project</option>{data.projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></label>
        <label>Deadline<select value={deadline} onChange={(event) => setDeadline(event.target.value)}>
          <option value="">Any deadline</option><option value="overdue">Overdue</option><option value="none">No deadline</option>
        </select></label>
      </div>
      {!filtered.length && <Empty>No tasks match your filters.</Empty>}
      {view === 'list' ? <div className="ws-task-list">{filtered.map(taskButton)}</div>
        : <div className="ws-board">{(Object.keys(stages) as Stage[]).map((stage) => <section key={stage}>
          <h3>{stages[stage]}</h3>{filtered.filter((item) => item.organization_stage === stage).map(taskButton)}
        </section>)}</div>}
    </section>
    {task && <TaskDetail key={task.id} task={task} data={data} refresh={refresh} close={() => setSelected('')} />}
    {canManage && <details className="ws-card"><summary>Assign a task</summary><form className="ws-form" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = taskForm(event);
      void action.run(async () => { await workspaceRequest(base, 'POST', values); form.reset(); await refresh(); }, 'Task assigned');
    }}><TaskFields members={data.members} projects={data.projects} /><button disabled={action.busy}>Assign task</button></form><Feedback {...action} /></details>}
  </>;
}

function TaskDetail({ task, data, refresh, close }: WorkspaceProps & { task: WorkspaceTask; close: () => void }) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([]);
  const [kind, setKind] = useState<TaskUpdate['kind']>('comment');
  const action = useAction();
  const { run } = action;
  const base = `/${data.organization.id}/tasks/${task.id}`;
  const canManage = data.role !== 'member';
  const project = data.projects.find((item) => item.id === task.organization_project_id);
  const meeting = data.meetings.find((item) => item.id === task.organization_meeting_id);
  useEffect(() => {
    let current = true;
    void workspaceRequest<TaskUpdate[]>(base + '/updates').then((items) => { if (current) setUpdates(items); })
      .catch((err) => { if (current) void run(async () => { throw err; }); });
    return () => { current = false; };
  }, [base, run]);
  return <section className="ws-card"><div className="ws-row"><h2>{task.title}</h2><button onClick={close}>Close details</button></div>
    <p>{task.description || 'No description.'}</p>
    <div className="ws-fields ws-meta">
      <div><strong>Assignee</strong><p>{memberName(data, task.user_id)}</p></div>
      <div><strong>Project</strong><p>{project?.name ?? 'No project'}</p></div>
      <div><strong>Source meeting</strong><p>{meeting ? <Link to={`/workspaces/${data.organization.id}/meetings/${meeting.id}`}>{meeting.title}</Link> : '—'}</p></div>
      <div><strong>Created</strong><p>{dateLabel(task.created_at)}</p></div>
      <div><strong>Completed</strong><p>{task.completed_at ? dateLabel(task.completed_at) : '—'}</p></div>
    </div>
    <form className="ws-form" key={task.organization_stage + task.user_id + task.due_date} onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      const values = { stage: form.get('stage'), ...(canManage ? { user_id: form.get('user_id'), due_date: toIso(form.get('due_date')) } : {}) };
      void action.run(async () => { await workspaceRequest(base, 'PATCH', values); await refresh(); }, 'Task updated');
    }}>
      <div className="ws-fields">
        <label>Status<select name="stage" defaultValue={task.organization_stage}>{Object.entries(stages).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {canManage && <><label>Assignee<select name="user_id" defaultValue={task.user_id}>
          {data.members.filter((member) => !meeting || meeting.visibility === 'team' || member.role !== 'member' || meeting.participants.includes(member.user_id))
            .map((member) => <option key={member.user_id} value={member.user_id}>{member.name || member.email}</option>)}
        </select></label><label>Deadline<input type="datetime-local" name="due_date" defaultValue={localInput(task.due_date)} /></label></>}
      </div>
      <button disabled={action.busy}>Save task</button>
    </form>
    <h3>Task updates</h3>
    {!updates.length && <Empty>No comments or requests yet.</Empty>}
    <ul className="ws-list">{updates.map((update) => <li key={update.id}><div>
      <strong>{memberName(data, update.author_id)} · {update.kind.replaceAll('_', ' ')}</strong><p>{update.body}</p>
      {update.requested_due_at && <p>Requested deadline · {dateLabel(update.requested_due_at)}</p>}
    </div><time>{dateLabel(update.created_at)}</time></li>)}</ul>
    <form className="ws-form" onSubmit={(event) => {
      event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
      const input = { kind, body: values.get('body'), requested_due_at: toIso(values.get('requested_due_at')) };
      void action.run(async () => {
        const saved = await workspaceRequest<TaskUpdate>(base + '/updates', 'POST', input);
        setUpdates((previous) => [...previous, saved]); form.reset(); await refresh();
      }, 'Update posted');
    }}><label>Update type<select value={kind} onChange={(event) => setKind(event.target.value as TaskUpdate['kind'])}>
      <option value="comment">Comment</option><option value="blocker">Report a blocker</option><option value="deadline_request">Request a deadline change</option>
    </select></label>
      {kind === 'deadline_request' && <label>Proposed deadline<input name="requested_due_at" type="datetime-local" required /></label>}
      <label>Message<textarea name="body" required maxLength={4000} /></label><button disabled={action.busy}>Post update</button>
    </form>
    <Feedback {...action} />
  </section>;
}

export function ProjectsPanel({ data, refresh }: WorkspaceProps) {
  const [editing, setEditing] = useState<Project>();
  const action = useAction();
  const canManage = data.role !== 'member';
  return <>
    <div className="ws-grid">{data.projects.map((project) => {
      const counts = metricCounts(data.tasks.filter((task) => task.organization_project_id === project.id));
      return <section className="ws-card" key={project.id}><div className="ws-row"><h2>{project.name}</h2><span className="ws-tag">{project.status}</span></div>
        <p>{project.description}</p><Progress label={`${counts.complete} of ${counts.total} tasks complete`} counts={counts} />
        {canManage && <button onClick={() => setEditing(project)}>Edit project</button>}
      </section>;
    })}</div>
    {!data.projects.length && <Empty>No projects created yet.</Empty>}
    {canManage && <section className="ws-card"><h2>{editing ? 'Edit project' : 'New project'}</h2>
      <form className="ws-form" key={editing?.id ?? 'new'} onSubmit={(event) => {
        event.preventDefault(); const values = jsonForm(event); const form = event.currentTarget;
        void action.run(async () => {
          await workspaceRequest(`/${data.organization.id}/projects${editing ? '/' + editing.id : ''}`, editing ? 'PUT' : 'POST', values);
          setEditing(undefined); form.reset(); await refresh();
        }, 'Project saved');
      }}><label>Name<input name="name" required maxLength={120} defaultValue={editing?.name} /></label>
        <label>Description<textarea name="description" maxLength={3000} defaultValue={editing?.description} /></label>
        <label>Status<select name="status" defaultValue={editing?.status ?? 'active'}>
          <option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>
        <div className="ws-inline"><button disabled={action.busy}>Save project</button>
          {editing && <button type="button" onClick={() => setEditing(undefined)}>Cancel editing</button>}</div>
      </form><Feedback {...action} />
    </section>}
  </>;
}

function Progress({ label, counts }: { label: string; counts: ReturnType<typeof metricCounts> }) {
  const completion = counts.total ? Math.round(counts.complete / counts.total * 100) : 0;
  return <div className="ws-progress"><div className="ws-row"><span>{label}</span><strong>{completion}%</strong></div>
    <progress aria-label={label} value={completion} max={100} /></div>;
}

export function InsightsPanel({ data }: { data: WorkspaceSnapshot }) {
  const counts = metricCounts(data.tasks);
  return <div className="ws-grid">
    <section className="ws-card"><h2>Task completion</h2><Progress label={`${counts.complete} completed of ${counts.total} assigned tasks`} counts={counts} />
      <p>{counts.overdue} overdue</p><ul className="ws-list">{Object.entries(stages).map(([stage, title]) =>
        <li key={stage}><span>{title}</span><strong>{data.tasks.filter((task) => task.organization_stage === stage).length}</strong></li>)}</ul></section>
    <section className="ws-card"><h2>Project progress</h2>{!data.projects.length && <Empty>No projects yet.</Empty>}
      {data.projects.map((project) => <Progress key={project.id} label={project.name} counts={metricCounts(data.tasks.filter((task) => task.organization_project_id === project.id))} />)}</section>
    <section className="ws-card"><h2>Meeting action items</h2>
      {!data.tasks.some((task) => task.organization_meeting_id) && <Empty>No approved action items yet.</Empty>}
      {data.meetings.map((meeting) => {
        const counts = metricCounts(data.tasks.filter((task) => task.organization_meeting_id === meeting.id));
        return counts.total > 0 && <Progress key={meeting.id} label={meeting.title} counts={counts} />;
      })}
    </section>
  </div>;
}
