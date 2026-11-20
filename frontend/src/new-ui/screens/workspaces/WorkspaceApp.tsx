import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Invitation, Membership, Organization, WorkspaceAnswer, WorkspaceSnapshot } from '../../../../../shared/types/workspace';
import { workspaceRequest } from '../../../api/workspaces';
import { useAuthStore } from '../../../store/authStore';
import { useNotificationStore } from '../../../store/notificationStore';
import Auth from '../onboarding/auth';
import { MeetingDetailView, MeetingsPanel } from './WorkspaceMeetings';
import { ProjectsPanel, TasksPanel, InsightsPanel } from './WorkspaceTasks';
import { Empty, Feedback } from './WorkspaceFeedback';
import { dateLabel, jsonForm, memberName, messageFor, metricCounts, overdue, useAction, type WorkspaceProps } from './workspaceState';
import './workspace.css';

const pages = ['Overview', 'Meetings', 'Tasks', 'Projects', 'Members', 'Insights', 'Settings'] as const;
function OrganizationForm({ item, save, busy }: {
  item?: Organization;
  save: (values: Pick<Organization, 'name' | 'description' | 'logo_url'>) => void;
  busy: boolean;
}) {
  return <form className="ws-form" onSubmit={(event) => {
    event.preventDefault();
    const form = jsonForm(event);
    save({ name: String(form.name), description: String(form.description), logo_url: String(form.logo_url).trim() || null });
  }}>
    <label>Name<input name="name" maxLength={120} required defaultValue={item?.name} /></label>
    <label>Description<textarea name="description" maxLength={3000} defaultValue={item?.description} /></label>
    <label>Logo URL<input type="url" name="logo_url" placeholder="https://…" defaultValue={item?.logo_url ?? ''} /></label>
    <button disabled={busy}>{item ? 'Save settings' : 'Create workspace'}</button>
  </form>;
}

export function WorkspacePicker() {
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const action = useAction();
  const read = async () => {
    const [organizations, inbox] = await Promise.all([
      workspaceRequest<Membership[]>(), workspaceRequest<Invitation[]>('/invitations'),
    ]);
    setMemberships(organizations);
    setInvitations(inbox);
  };
  useEffect(() => { void read().catch((error) => setLoadError(messageFor(error))).finally(() => setLoading(false)); }, []);
  return <div className="ws-shell"><main className="ws-content ws-picker">
    <Link to="/today">← Personal workspace</Link>
    <h1>Workspaces</h1>
    <Feedback busy={loading || action.busy} error={loadError || action.error} />
    <div className="ws-grid">
      <section className="ws-card"><h2>Your organizations</h2>
        {!loading && !memberships.length && <Empty>Create an organization or accept an invitation to get started.</Empty>}
        <ul className="ws-list">{memberships.map(({ organization, role }) => <li key={organization.id}>
          <Link to={`/workspaces/${organization.id}`}>{organization.name}</Link><span className="ws-tag">{role}</span>
        </li>)}</ul>
        {!!invitations.length && <><h2>Invitations</h2><ul className="ws-list">{invitations.map((invite) => <li key={invite.id}>
          <span>{invite.organization_name} · {invite.role}</span><div className="ws-inline">
            {[true, false].map((accept) => <button key={String(accept)} disabled={action.busy} onClick={() => void action.run(async () => {
              const org = await workspaceRequest<string>('/invitations/respond', 'POST', { invitation: invite.id, accept });
              if (accept) navigate(`/workspaces/${org}`); else await read();
            }, accept ? 'Invitation accepted' : 'Invitation declined')}>{accept ? 'Accept' : 'Decline'}</button>)}
          </div>
        </li>)}</ul></>}
      </section>
      <section className="ws-card"><h2>Create an organization</h2>
        <OrganizationForm busy={action.busy} save={(values) => void action.run(async () => {
          const organization = await workspaceRequest<Organization>('', 'POST', values);
          navigate(`/workspaces/${organization.id}`);
        }, 'Workspace created')} />
      </section>
    </div>
  </main></div>;
}

export function JoinWorkspace() {
  const { token = '' } = useParams();
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const action = useAction();
  if (!/^[0-9a-f]{64}$/.test(token)) return <main className="ws-content"><h1>Invalid invitation</h1><Link to="/">Return to FlowTask</Link></main>;
  if (!authenticated) return <div className="flow-introduction"><div><p className="ws-join-note">Sign in with the email that received the invitation.</p><Auth initialMode="login" successHref={`/join/${token}`} /></div></div>;
  return <div className="ws-shell"><main className="ws-content ws-picker"><h1>Organization invitation</h1>
    <p>Accept to join the workspace with this account.</p>
    <Feedback {...action} />
    <div className="ws-inline">{[true, false].map((accept) => <button key={String(accept)} disabled={action.busy}
      onClick={() => void action.run(async () => {
        const id = await workspaceRequest<string>('/invitations/respond', 'POST', { token, accept });
        navigate(accept ? `/workspaces/${id}` : '/workspaces', { replace: true });
      })}>{accept ? 'Accept invitation' : 'Decline'}</button>)}</div>
    <Link to="/workspaces">Back to workspaces</Link>
  </main></div>;
}

export function WorkspaceApp() {
  const { org = '', section, meetingId } = useParams();
  const activeOrg = useRef(org);
  activeOrg.current = org;
  const [loaded, setLoaded] = useState<{ key: string; snapshot: WorkspaceSnapshot }>();
  const [loadError, setLoadError] = useState<{ key: string; message: string }>();
  const refresh = async () => {
    const snapshot = await workspaceRequest<WorkspaceSnapshot>(`/${org}`);
    if (activeOrg.current !== org) return;
    setLoaded({ key: org, snapshot });
    setLoadError(undefined);
  };
  useEffect(() => {
    let current = true;
    void workspaceRequest<WorkspaceSnapshot>(`/${org}`).then((snapshot) => {
      if (current) setLoaded({ key: org, snapshot });
    }).catch((error) => { if (current) setLoadError({ key: org, message: messageFor(error) }); });
    return () => { current = false; };
  }, [org]);
  const data = loaded?.key === org ? loaded.snapshot : undefined;
  const error = loadError?.key === org ? loadError.message : undefined;
  const page = pages.find((item) => item.toLowerCase() === section) ?? 'Overview';
  const base = `/workspaces/${org}`;
  return <div className="ws-shell">
    <aside className="ws-side">
      <Link to="/workspaces" className="ws-brand">FlowTask</Link>
      <div className="ws-org">{data?.organization.logo_url?.startsWith('https://') && <img alt="" referrerPolicy="no-referrer" src={data.organization.logo_url} />}
        <strong>{data?.organization.name ?? 'Organization'}</strong>
      </div>
      <nav aria-label="Organization">{pages.map((item) => <NavLink end={item === 'Overview'} key={item}
        to={item === 'Overview' ? base : `${base}/${item.toLowerCase()}`}>{item}</NavLink>)}</nav>
      <div className="ws-switch"><Link to="/workspaces">Switch workspace</Link><Link to="/today">Personal workspace</Link></div>
    </aside>
    <main className="ws-content">
      <header className="ws-page-head"><div><p>{data?.organization.name ?? 'Workspace'}</p><h1>{page}</h1></div>
        {data && <span className="ws-tag">{data.role}</span>}</header>
      {!data && <Feedback busy={!error} error={error} />}
      {data && <div key={org + page + (meetingId ?? '')}>
        {page === 'Overview' && <Overview data={data} />}
        {page === 'Meetings' && (meetingId
          ? <MeetingDetailView data={data} refresh={refresh} meetingId={meetingId} />
          : <MeetingsPanel data={data} refresh={refresh} />)}
        {page === 'Tasks' && <TasksPanel data={data} refresh={refresh} />}
        {page === 'Projects' && <ProjectsPanel data={data} refresh={refresh} />}
        {page === 'Members' && <MembersPanel data={data} refresh={refresh} />}
        {page === 'Insights' && <InsightsPanel data={data} />}
        {page === 'Settings' && <section className="ws-card"><h2>Organization settings</h2>
          {data.role === 'admin' ? <SettingsPanel data={data} refresh={refresh} /> : <p>{data.organization.description || 'No description added.'}</p>}
        </section>}
      </div>}
    </main>
  </div>;
}

function Overview({ data }: { data: WorkspaceSnapshot }) {
  const base = `/workspaces/${data.organization.id}`;
  const upcoming = data.meetings.filter((meeting) => meeting.status === 'scheduled' && Date.parse(meeting.starts_at) > Date.now()).reverse();
  const counts = metricCounts(data.tasks);
  const metrics = { Members: data.members.length, 'Active projects': data.projects.filter((project) => project.status === 'active').length,
    'Upcoming meetings': upcoming.length, Pending: counts.total - counts.complete, Completed: counts.complete, Overdue: counts.overdue };
  return <>
    <div className="ws-metrics">{Object.entries(metrics).map(([label, value]) => <div className="ws-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="ws-grid">
      <section className="ws-card"><h2>Upcoming meetings</h2>{!upcoming.length && <Empty>No meetings scheduled.</Empty>}
        <ul className="ws-list">{upcoming.slice(0, 5).map((meeting) => <li key={meeting.id}><Link to={`${base}/meetings/${meeting.id}`}>{meeting.title}</Link><time>{dateLabel(meeting.starts_at)}</time></li>)}</ul>
      </section>
      <section className="ws-card"><h2>Recent summaries</h2>
        {!data.meetings.some((meeting) => meeting.has_analysis) && <Empty>Jerry’s meeting summaries will appear here.</Empty>}
        <ul className="ws-list">{data.meetings.filter((meeting) => meeting.has_analysis).slice(0, 5).map((meeting) =>
          <li key={meeting.id}><Link to={`${base}/meetings/${meeting.id}`}>{meeting.title}</Link><time>{dateLabel(meeting.starts_at)}</time></li>)}</ul>
      </section>
      <section className="ws-card"><h2>Team activity</h2>
        {!data.activity.length && <Empty>No visible activity yet.</Empty>}
        <ul className="ws-list">{data.activity.slice(0, 6).map((item) => <li key={item.id}>
          <span>{memberName(data, item.actor_id)} · {item.kind.replaceAll('_', ' ')}</span><time>{dateLabel(item.created_at)}</time>
        </li>)}</ul>
      </section>
      <section className="ws-card"><h2>Overdue work</h2>
        {!counts.overdue && <Empty>No overdue tasks.</Empty>}
        <ul className="ws-list">{data.tasks.filter(overdue).slice(0, 5).map((task) => <li key={task.id}><Link to={base + '/tasks'}>{task.title}</Link><span>{memberName(data, task.user_id)}</span></li>)}</ul>
      </section>
    </div>
    <JerryPanel org={data.organization.id} />
    <WorkspaceNotifications workspaceId={data.organization.id} />
  </>;
}

function WorkspaceNotifications({ workspaceId }: { workspaceId: string }) {
  const { notifications, fetchNotifications, markAsRead } = useNotificationStore();
  const [shown, setShown] = useState(false);
  const [ready, setReady] = useState(false);
  return <section className="ws-card"><div className="ws-row"><h2>Notifications</h2>
    <button onClick={() => {
      setShown(!shown);
      if (!shown) { setReady(false); void fetchNotifications().finally(() => setReady(true)); }
    }}>{shown ? 'Hide notifications' : 'View notifications'}</button></div>
    {shown && (ready ? <ul className="ws-list">{notifications.filter((item) => item.organization_id === workspaceId)
      .slice(0, 12).map((item) => <li key={item.id}><div><p>{item.message}</p><time>{dateLabel(item.created_at)}</time></div>
        {!item.is_read && <button onClick={() => void markAsRead(item.id)}>Mark read</button>}</li>)}</ul> : <Feedback busy />)}
    <Link to={`/workspaces/${workspaceId}/tasks`}>See your workspace tasks</Link>
  </section>;
}

function JerryPanel({ org }: { org: string }) {
  const [answer, setAnswer] = useState<WorkspaceAnswer>();
  const action = useAction();
  return <section className="ws-card ws-jerry"><h2>Ask Jerry</h2>
    <form className="ws-form" onSubmit={(event) => {
      event.preventDefault(); const question = jsonForm(event).question;
      void action.run(async () => { setAnswer(await workspaceRequest<WorkspaceAnswer>(`/${org}/ask`, 'POST', { question })); });
    }}><label>Question<input name="question" maxLength={1000} required placeholder="Which tasks are still pending from the last meeting?" /></label>
      <button disabled={action.busy}>Ask Jerry</button></form>
    <Feedback {...action} />
    {answer && <div aria-live="polite"><p className="ws-pre">{answer.answer}</p>
      {!!answer.sources?.length && <p>Sources · {answer.sources.map((source) => source.title).join(' · ')}</p>}</div>}
  </section>;
}

function MembersPanel({ data, refresh }: WorkspaceProps) {
  const [link, setLink] = useState('');
  const action = useAction();
  const base = `/${data.organization.id}`;
  const currentUser = useAuthStore((state) => state.user?.id);
  return <div className="ws-grid"><section className="ws-card"><h2>Member directory</h2>
    <ul className="ws-list">{data.members.map((member) => <li key={member.user_id}>
      <span><strong>{member.name || member.email}</strong><br />{member.name && member.email}</span>
      {data.role === 'admin' && currentUser !== member.user_id
        ? <select aria-label={`Role for ${member.name || member.email}`} value={member.role} disabled={action.busy} onChange={(event) => {
          const role = event.target.value;
          void action.run(async () => { await workspaceRequest(base + '/members/' + member.user_id, 'PATCH', { role }); await refresh(); }, 'Role updated');
        }}><option>member</option><option>manager</option><option>admin</option></select>
        : <span className="ws-tag">{member.role}</span>}
    </li>)}</ul><Feedback {...action} /></section>
    {data.role === 'admin' && <section className="ws-card"><h2>Invite a member</h2>
      <form className="ws-form" onSubmit={(event) => {
        event.preventDefault();
        const values = jsonForm(event);
        void action.run(async () => {
          const invite = await workspaceRequest<{ link: string; emailed: boolean }>(base + '/invitations', 'POST', {
            email: values.email, role: values.role, send_email: values.send_email === 'on',
          });
          setLink(invite.link);
          toast.success(invite.emailed ? 'Invitation emailed' : 'Invitation link ready to share');
        });
      }}><label>Email<input name="email" type="email" required /></label><label>Role<select name="role"><option value="member">Member</option><option value="manager">Manager</option></select></label>
        <label className="ws-check"><input name="send_email" type="checkbox" /> Email the invitation</label><button disabled={action.busy}>Create invitation</button>
      </form>{link && <label className="ws-link-copy">Share this link<input aria-label="Invitation link" value={link} readOnly onFocus={(event) => event.currentTarget.select()} /></label>}</section>}
  </div>;
}

function SettingsPanel({ data, refresh }: WorkspaceProps) {
  const action = useAction();
  return <><OrganizationForm item={data.organization} busy={action.busy} save={(values) => void action.run(async () => {
    await workspaceRequest(`/${data.organization.id}`, 'PUT', values);
    await refresh();
  }, 'Settings saved')} /><Feedback {...action} /></>;
}
