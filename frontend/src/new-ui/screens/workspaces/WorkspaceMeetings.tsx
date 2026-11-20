import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ActionItem, FollowUp, MeetingDetail, WorkspaceMeeting, WorkspaceSnapshot } from '../../../../../shared/types/workspace';
import { workspaceRequest } from '../../../api/workspaces';
import { Empty, Feedback } from './WorkspaceFeedback';
import { dateLabel, jsonForm, localInput, messageFor, metricCounts, taskForm, toIso, useAction, type WorkspaceProps } from './workspaceState';
import { TaskFields } from './WorkspaceTasks';

function MeetingForm({ data, busy, meeting, save }: {
  data: WorkspaceSnapshot;
  busy: boolean;
  meeting?: WorkspaceMeeting;
  save: (input: unknown) => void;
}) {
  return <form className="ws-form" onSubmit={(event) => {
    event.preventDefault(); const values = jsonForm(event);
    const form = new FormData(event.currentTarget);
    const sameDate = meeting && values.starts_at === localInput(meeting.starts_at);
    save({
      ...values, project_id: values.project_id || null, starts_at: sameDate ? meeting.starts_at : toIso(form.get('starts_at')),
      timezone: sameDate ? meeting.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      participants: form.getAll('participants'),
    });
  }}>
    <label>Title<input name="title" required maxLength={200} defaultValue={meeting?.title} /></label>
    <label>Description<textarea name="description" maxLength={5000} defaultValue={meeting?.description} /></label>
    <label>Agenda<textarea name="agenda" maxLength={5000} defaultValue={meeting?.agenda} /></label>
    <div className="ws-fields">
      <label>Date and time<input name="starts_at" type="datetime-local" required defaultValue={localInput(meeting?.starts_at ?? null)} /></label>
      <label>Project<select name="project_id" defaultValue={meeting?.project_id ?? ''}><option value="">No project</option>
        {data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label>Visibility<select name="visibility" defaultValue={meeting?.visibility ?? 'team'}><option value="team">Entire organization</option>
        <option value="participants">Participants and managers</option></select></label>
      <label>Status<select name="status" defaultValue={meeting?.status ?? 'scheduled'}><option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
    </div>
    <fieldset><legend>Participants</legend><div className="ws-check-list">{data.members.map((member) =>
      <label className="ws-check" key={member.user_id}><input type="checkbox" name="participants" value={member.user_id}
        defaultChecked={meeting?.participants.includes(member.user_id)} />{member.name || member.email}</label>)}</div></fieldset>
    <button disabled={busy}>{meeting ? 'Save meeting' : 'Create meeting'}</button>
  </form>;
}

export function MeetingsPanel({ data, refresh }: WorkspaceProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const action = useAction();
  const org = data.organization.id;
  const base = `/workspaces/${org}/meetings`;
  const term = search.trim().toLowerCase();
  const meetings = data.meetings.filter((meeting) => [meeting.title, meeting.description, meeting.agenda].some((value) => value.toLowerCase().includes(term)));
  return <>
    <section className="ws-card"><div className="ws-row"><h2>Meeting history</h2>
      <input type="search" aria-label="Search meetings" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search meetings" />
    </div>
      {!meetings.length && <Empty>{term ? 'No meetings match your search.' : 'No meetings scheduled yet.'}</Empty>}
      <ul className="ws-list">{meetings.map((meeting) => <li key={meeting.id}>
        <div><Link to={`${base}/${meeting.id}`}>{meeting.title}</Link><p>{dateLabel(meeting.starts_at)}</p></div>
        <span className="ws-tag">{meeting.status}</span>
      </li>)}</ul>
    </section>
    {data.role !== 'member' && <details className="ws-card"><summary>Create a meeting</summary>
      <MeetingForm data={data} busy={action.busy} save={(input) => void action.run(async () => {
        const meeting = await workspaceRequest<WorkspaceMeeting>(`/${org}/meetings`, 'POST', input);
        await refresh(); navigate(`${base}/${meeting.id}`);
      }, 'Meeting created')} /><Feedback {...action} />
    </details>}
  </>;
}

export function MeetingDetailView({ data, refresh, meetingId }: WorkspaceProps & { meetingId: string }) {
  const [meeting, setMeeting] = useState<MeetingDetail>();
  const [error, setError] = useState('');
  const [followUp, setFollowUp] = useState<FollowUp>();
  const action = useAction();
  const base = `/${data.organization.id}/meetings/${meetingId}`;
  useEffect(() => {
    let current = true;
    void workspaceRequest<MeetingDetail>(base).then((value) => { if (current) setMeeting(value); })
      .catch((failure) => { if (current) setError(messageFor(failure)); });
    return () => { current = false; };
  }, [base]);
  if (!meeting) return <Feedback busy={!error} error={error} />;
  const canManage = data.role !== 'member';
  const project = data.projects.find((item) => item.id === meeting.project_id);
  const approved = new Set(data.tasks.filter((task) => task.organization_meeting_id === meetingId).map((task) => task.organization_action_key));
  const attendees = data.members.filter((member) => meeting.participants.includes(member.user_id));
  const updateMeeting = async (path: string, method: string, input?: unknown) => {
    setMeeting(await workspaceRequest<MeetingDetail>(base + path, method, input));
    await refresh();
  };
  const submitTranscript = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    const input = file instanceof File && file.size ? form : { transcript: form.get('transcript') };
    void action.run(() => updateMeeting('/transcript', 'POST', input), 'Meeting source saved');
  };
  return <>
    <Link to={`/workspaces/${data.organization.id}/meetings`}>← All meetings</Link>
    <section className="ws-card"><div className="ws-row"><h2>{meeting.title}</h2><span className="ws-tag">{meeting.status}</span></div>
      <p>{dateLabel(meeting.starts_at)} · {project?.name || 'No linked project'} · {meeting.visibility === 'team' ? 'Organization' : 'Participants and managers'}</p>
      {meeting.description && <p className="ws-pre">{meeting.description}</p>}
      <h3>Participants</h3><p>{attendees.map((member) => member.name || member.email).join(', ') || 'No participants selected.'}</p>
      <h3>Agenda</h3><p className="ws-pre">{meeting.agenda || 'No agenda added.'}</p>
      {canManage && <details><summary>Edit meeting details</summary>
        <MeetingForm data={data} meeting={meeting} busy={action.busy} save={(input) => void action.run(() => updateMeeting('', 'PUT', input), 'Meeting updated')} />
      </details>}
    </section>
    <Feedback {...action} />
    <section className="ws-card"><h2>Transcript or notes</h2>
      {meeting.source_name && <p>Source · {meeting.source_name}</p>}
      {meeting.transcript ? <details><summary>Read transcript</summary><p className="ws-pre ws-transcript">{meeting.transcript}</p></details> : <Empty>No transcript or notes saved.</Empty>}
      {canManage && approved.size === 0 && <>
        <form key={meeting.analysis_version ?? 'new'} className="ws-form" onSubmit={submitTranscript}>
          <label>Paste transcript or notes<textarea name="transcript" defaultValue={meeting.transcript} maxLength={80000} /></label>
          <label>Or upload a file<input name="file" type="file" accept=".txt,.md,.vtt,.srt,.mp3,.wav,.m4a,.aac,.ogg,.webm,.mp4" /></label>
          <button disabled={action.busy}>Save meeting source</button>
        </form>
        {meeting.transcript && <button className="ws-spaced" disabled={action.busy} onClick={() => {
          if (meeting.analysis && !window.confirm('Replace the current analysis and its unapproved action items?')) return;
          void action.run(() => updateMeeting('/analyze', 'POST'), 'Analysis ready for review');
        }}>{meeting.analysis ? 'Run analysis again' : 'Analyze with Jerry'}</button>}
      </>}
    </section>
    {meeting.analysis && <section className="ws-card"><h2>Jerry’s meeting summary</h2>
      <p className="ws-pre">{meeting.analysis.overview}</p>
      {([{ label: 'Discussion points', notes: meeting.analysis.discussion }, { label: 'Decisions', notes: meeting.analysis.decisions },
        { label: 'Blockers', notes: meeting.analysis.blockers }, { label: 'Next steps', notes: meeting.analysis.next_steps }]).map(({ label, notes }) =>
        <div key={label}><h3>{label}</h3>{notes.length
          ? <ul className="ws-notes">{notes.map((note, index) => <li key={index}>{note.text}<details><summary>Source quote</summary><blockquote>{note.evidence}</blockquote></details></li>)}</ul>
          : <Empty>None recorded.</Empty>}</div>)}
      <h3>Action items</h3>
      {!meeting.analysis.action_items.length && <Empty>Jerry found no supported action items.</Empty>}
      {meeting.analysis.action_items.map((item) => <ActionReview key={item.id} item={item} meeting={meeting} data={data}
        approved={approved.has(item.id)} busy={action.busy} approve={(values) => {
          void action.run(async () => { await workspaceRequest(base + '/approve', 'POST', { version: meeting.analysis_version, items: [values] }); await refresh(); }, 'Action item approved and assigned');
        }} />)}
    </section>}
    <section className="ws-card"><h2>Meeting follow-up</h2>
      <button disabled={action.busy} onClick={() => void action.run(async () => { setFollowUp(await workspaceRequest<FollowUp>(base + '/follow-up')); })}>Prepare follow-up</button>
      {followUp && <FollowUpView data={followUp} />}
    </section>
  </>;
}

function ActionReview({ item, meeting, data, approved, busy, approve }: {
  item: ActionItem; meeting: MeetingDetail; data: WorkspaceSnapshot; approved: boolean; busy: boolean;
  approve: (values: ReturnType<typeof taskForm> & { id: string }) => void;
}) {
  const members = data.members.filter((member) => meeting.visibility === 'team' || member.role !== 'member' || meeting.participants.includes(member.user_id));
  return <details className="ws-review"><summary>{item.title}{approved ? ' · Approved' : ''}</summary>
    <p>{item.description}</p>
    <blockquote>{item.evidence}</blockquote>
    <p>Assignee mention · {item.assignee_text ?? 'Unspecified'} · {item.match === 'matched' ? 'Member matched' : 'Review required'}</p>
    <p>Deadline mention · {item.deadline_text ?? 'Unspecified'}{item.suggested_due_day ? ` · Suggested date ${item.suggested_due_day}` : ' · Review required'}</p>
    {!approved && data.role !== 'member' && <form className="ws-form" onSubmit={(event) => {
      event.preventDefault();
      if (window.confirm('Create and assign this reviewed task?')) approve({ id: item.id, ...taskForm(event) });
    }}>
      <TaskFields members={members} projects={data.projects} defaults={{
        title: item.title, description: item.description, user_id: item.assignee_id ?? undefined,
        priority: item.priority ?? undefined, project_id: item.suggested_project_id,
      }} />
      <button disabled={busy}>Approve and assign</button>
    </form>}
  </details>;
}

function FollowUpView({ data }: { data: FollowUp }) {
  if (!data.previous) return <Empty>No earlier completed meeting is visible.</Empty>;
  const counts = metricCounts(data.tasks);
  return <div><h3>Previous meeting · {data.previous.title}</h3>
    {data.previous.analysis && <p>{data.previous.analysis.overview}</p>}
    <p>{counts.total} action items · {counts.complete} completed · {counts.total - counts.complete} open · {counts.overdue} overdue</p>
    {!!data.tasks.length && <ul>{data.tasks.map((task) => <li key={task.id}>{task.title} · {task.organization_stage.replaceAll('_', ' ')}</li>)}</ul>}
    {!!data.blockers.length && <><h3>Reported blockers</h3><ul>{data.blockers.map((blocker, index) => <li key={index}>{blocker.body}</li>)}</ul></>}
    {!!data.agenda.length && <><h3>Suggested agenda</h3><ul>{data.agenda.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
  </div>;
}
