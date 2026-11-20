import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { ActionItem, ApprovedTask, Invitation, Membership, MeetingDetail, Organization, Stage, WorkspaceAnswer, WorkspaceSnapshot } from '../../../shared/types/workspace';
import { AppText } from '../components/ui/app-text';
import { AppButton as Button } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Card } from '../components/ui/card';
import { IconButton } from '../components/ui/icon-button';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { api, getApiErrorMessage } from '../services/api';
import { spacing } from '../theme/theme';

type Section = 'Overview' | 'Meetings' | 'Tasks' | 'Members';
const sections: Section[] = ['Overview', 'Meetings', 'Tasks', 'Members'];
const stages: Record<Stage, string> = { todo: 'To do', in_progress: 'In progress', blocked: 'Blocked', in_review: 'In review', done: 'Completed' };

async function request<T>(path = '', method = 'GET', data?: unknown) {
  return (await api.request<{ data: T }>({ url: '/api/workspaces' + path, method, data, timeout: 80_000 })).data.data;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : 'No deadline';
}

export default function WorkspaceScreen({ navigation, route }: {
  navigation: { goBack: () => void };
  route?: { params?: { org?: string } };
}) {
  const { theme } = useTheme();
  const bottom = useSafeBottomPadding(36);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot>();
  const [section, setSection] = useState<Section>('Overview');
  const [editingTask, setEditingTask] = useState('');
  const [meeting, setMeeting] = useState<MeetingDetail>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [agenda, setAgenda] = useState('');
  const [transcript, setTranscript] = useState('');
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const org = workspace?.organization.id;
  const canManage = !!workspace && workspace.role !== 'member';

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await job(); }
    catch (failure) { setError(getApiErrorMessage(failure, 'Workspace request failed.')); }
    finally { setBusy(false); }
  };
  const loadPicker = async () => {
    const [items, inbox] = await Promise.all([request<Membership[]>(), request<Invitation[]>('/invitations')]);
    setMemberships(items);
    setInvitations(inbox);
  };
  const refresh = async (id: string) => { setWorkspace(await request<WorkspaceSnapshot>('/' + id)); };
  const select = async (id: string) => {
    await refresh(id); setSection('Overview'); setMeeting(undefined); setAnswer(''); setInviteLink(''); setEditingTask('');
  };
  const openMeeting = async (id: string) => {
    const selected = await request<MeetingDetail>(`/${org}/meetings/${id}`);
    setMeeting(selected); setTranscript(selected.transcript);
  };
  const meetingPath = meeting ? `/${org}/meetings/${meeting.id}` : '';
  useEffect(() => {
    const initialOrg = route?.params?.org;
    void run(initialOrg ? async () => { await select(initialOrg); setSection('Tasks'); } : loadPicker);
  }, [route?.params?.org]);

  return <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={[styles.content, { paddingBottom: bottom }]} keyboardShouldPersistTaps="handled">
    <View style={styles.row}>
      <IconButton icon="chevron-back" label="Back" tone="plain" disabled={busy} onPress={() => {
        if (meeting) setMeeting(undefined);
        else if (workspace) { setWorkspace(undefined); void run(loadPicker); }
        else navigation.goBack();
      }} />
      <AppText variant="display" style={{ flex: 1, color: theme.text }}>{workspace?.organization.name ?? 'Workspaces'}</AppText>
    </View>
    {busy && <AppText accessibilityRole="progressbar">Working…</AppText>}
    {!!error && <AppText accessibilityRole="alert" style={{ color: theme.danger }}>{error}</AppText>}
    {!workspace ? <>
      <Card><AppText variant="heading">Your organizations</AppText>
        {!busy && !memberships.length && <AppText variant="bodySecondary">Create an organization or accept an invitation.</AppText>}
        {memberships.map(({ organization, role }) => <Button key={organization.id} label={organization.name + ' · ' + role} disabled={busy}
          onPress={() => void run(() => select(organization.id))} />)}
      </Card>
      {invitations.map((invite) => <Card key={invite.id}>
        <AppText variant="heading">{invite.organization_name}</AppText>
        <AppText>Invited as {invite.role}</AppText>
        <View style={styles.row}>{[true, false].map((accept) => <Button key={String(accept)} label={accept ? 'Accept' : 'Decline'} disabled={busy}
          onPress={() => void run(async () => {
            const id = await request<string>('/invitations/respond', 'POST', { invitation: invite.id, accept });
            if (accept) await select(id); else await loadPicker();
          })} />)}</View>
      </Card>)}
      <Card><AppText variant="heading">Create an organization</AppText>
        <Field label="Name" value={name} onChangeText={setName} maxLength={120} />
        <Field label="Description" value={description} onChangeText={setDescription} maxLength={3000} multiline />
        <Button label="Create workspace" disabled={busy || !name.trim()} onPress={() => void run(async () => {
          const created = await request<Organization>('', 'POST', { name, description }); await select(created.id);
        })} />
      </Card>
    </> : <>
      <View style={styles.tabs}>{sections.map((tab) => <Pressable key={tab} accessibilityRole="tab"
        accessibilityState={{ selected: tab === section, disabled: busy }} disabled={busy}
        onPress={() => { setSection(tab); setMeeting(undefined); }}>
        <AppText variant="subtitle" style={{ color: tab === section ? theme.primary : theme.muted }}>{tab}</AppText>
      </Pressable>)}</View>
      {section === 'Overview' && <>
        <Card><AppText variant="heading">Overview</AppText>
          <AppText>{workspace.members.length} members · {workspace.projects.filter((project) => project.status === 'active').length} active projects</AppText>
          <AppText>{workspace.meetings.filter((item) => item.status === 'scheduled' && Date.parse(item.starts_at) > Date.now()).length} upcoming meetings</AppText>
          <AppText>{workspace.tasks.filter((item) => item.organization_stage !== 'done').length} open tasks · {workspace.tasks.filter((item) => item.organization_stage === 'done').length} completed</AppText>
        </Card>
        <Card><AppText variant="heading">Ask Jerry</AppText>
          <Field label="Question" value={question} onChangeText={setQuestion} maxLength={1000} />
          <Button label="Ask Jerry" disabled={busy || !question.trim()} onPress={() => void run(async () => {
            const result = await request<WorkspaceAnswer>(`/${org}/ask`, 'POST', { question });
            setAnswer(result.answer + (result.sources?.length ? '\n\nSources · ' + result.sources.map((item) => item.title).join(', ') : ''));
          })} />
          {!!answer && <AppText accessibilityLiveRegion="polite">{answer}</AppText>}
        </Card>
      </>}
      {section === 'Members' && <>
        <Card><AppText variant="heading">Members</AppText>
          {workspace.members.map((member) => <AppText key={member.user_id}>{member.name || member.email} · {member.role}</AppText>)}
        </Card>
        {workspace.role === 'admin' && <Card><AppText variant="heading">Invite a member</AppText>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button label="Create invitation link" disabled={busy || !email.trim()} onPress={() => void run(async () => {
            const result = await request<{ link: string }>(`/${org}/invitations`, 'POST', { email, role: 'member' });
            setInviteLink(result.link);
          })} />
          {!!inviteLink && <Button label="Copy invitation link" onPress={() => void Clipboard.setStringAsync(inviteLink)} />}
        </Card>}
      </>}
      {section === 'Meetings' && (meeting ? <>
        <Card><AppText variant="heading">{meeting.title}</AppText><AppText>{formatDate(meeting.starts_at)} · {meeting.status}</AppText>
          <AppText>{meeting.description || meeting.agenda || 'No agenda added.'}</AppText>
          <AppText variant="subtitle">Participants</AppText>
          <AppText>{workspace.members.filter((member) => meeting.participants.includes(member.user_id)).map((member) => member.name || member.email).join(', ') || 'No participants selected.'}</AppText>
        </Card>
        <Card><AppText variant="heading">Transcript or notes</AppText>
          {canManage ? <>
            <Field label="Meeting source" value={transcript} onChangeText={setTranscript} maxLength={80000} multiline />
            <Button label="Save notes" disabled={busy || !transcript.trim()} onPress={() => void run(async () => {
              setMeeting(await request<MeetingDetail>(meetingPath + '/transcript', 'POST', { transcript }));
            })} />
            <Button label="Analyze with Jerry" disabled={busy || !meeting.transcript || transcript !== meeting.transcript} onPress={() => void run(async () => {
              setMeeting(await request<MeetingDetail>(meetingPath + '/analyze', 'POST'));
            })} />
          </> : <AppText>{meeting.transcript || 'No transcript available.'}</AppText>}
        </Card>
        {meeting.analysis && <Card><AppText variant="heading">Meeting summary</AppText><AppText>{meeting.analysis.overview}</AppText>
          {meeting.analysis.decisions.map((note, index) => <AppText key={index}>Decision · {note.text}</AppText>)}
        </Card>}
        {meeting.analysis?.action_items.map((item) => {
          const approved = workspace.tasks.some((task) => task.organization_action_key === item.id);
          return <ActionReview key={item.id} item={item} meeting={meeting} workspace={workspace} busy={busy} approved={approved}
            approve={(values) => void run(async () => {
              await request(meetingPath + '/approve', 'POST', { version: meeting.analysis_version, items: [{ id: item.id, ...values }] });
              await refresh(workspace.organization.id);
            })} />;
        })}
      </> : <>
        {workspace.meetings.map((item) => <Card key={item.id}><AppText variant="heading">{item.title}</AppText><AppText>{formatDate(item.starts_at)}</AppText>
          <Button label="View meeting" disabled={busy} onPress={() => void run(() => openMeeting(item.id))} /></Card>)}
        {!workspace.meetings.length && <AppText variant="bodySecondary">No meetings scheduled yet.</AppText>}
        {canManage && <Card><AppText variant="heading">Create a meeting</AppText>
          <Field label="Meeting title" value={title} onChangeText={setTitle} maxLength={200} />
          <Field label="Date and time (YYYY-MM-DDTHH:mm)" value={date} onChangeText={setDate} autoCapitalize="none" />
          <Field label="Agenda" value={agenda} onChangeText={setAgenda} multiline maxLength={5000} />
          <Button label="Create meeting" disabled={busy || !title.trim() || !date.trim()} onPress={() => void run(async () => {
            const startsAt = new Date(date);
            if (Number.isNaN(startsAt.getTime())) throw new Error('Enter a valid date and time.');
            const created = await request<MeetingDetail>(`/${org}/meetings`, 'POST', {
              title, agenda, starts_at: startsAt.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            if (org) await refresh(org);
            setMeeting(created); setTranscript(''); setTitle(''); setDate(''); setAgenda('');
          })} />
        </Card>}
      </>)}
      {section === 'Tasks' && <>
        {!workspace.tasks.length && <AppText variant="bodySecondary">No assignments yet.</AppText>}
        {workspace.tasks.map((task) => <Card key={task.id}>
          <AppText variant="heading">{task.title}</AppText><AppText>{task.description}</AppText>
          <AppText variant="caption">{formatDate(task.due_date)} · {stages[task.organization_stage]}</AppText>
          <Button label={editingTask === task.id ? 'Close status choices' : 'Update status'} disabled={busy}
            onPress={() => setEditingTask(editingTask === task.id ? '' : task.id)} />
          {editingTask === task.id && <View style={styles.tabs}>{(Object.keys(stages) as Stage[]).map((stage) => <Button
            key={stage} label={stages[stage]} disabled={busy || stage === task.organization_stage}
            variant={stage === task.organization_stage ? 'primary' : 'secondary'} onPress={() => void run(async () => {
              await request(`/${org}/tasks/${task.id}`, 'PATCH', { stage }); await refresh(workspace.organization.id); setEditingTask('');
            })} />)}</View>}
        </Card>)}
      </>}
    </>}
  </ScrollView>;
}

function ActionReview({ item, meeting, workspace, busy, approved, approve }: {
  item: ActionItem; meeting: MeetingDetail; workspace: WorkspaceSnapshot; busy: boolean; approved: boolean;
  approve: (values: ApprovedTask) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [assignee, setAssignee] = useState(item.assignee_id ?? '');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<ApprovedTask['priority']>(item.priority ?? 'medium');
  const [project, setProject] = useState(item.suggested_project_id);
  const members = workspace.members.filter((member) => meeting.visibility === 'team' || member.role !== 'member' || meeting.participants.includes(member.user_id));
  const selected = members.find((member) => member.user_id === assignee);
  const due = deadline.trim() ? new Date(deadline) : null;
  const invalidDate = !!due && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(deadline) || Number.isNaN(due.getTime()));
  return <Card><AppText variant="heading">{item.title}</AppText>
    <AppText>{item.description}</AppText><AppText variant="caption">{item.evidence}</AppText>
    <AppText variant="caption">{item.assignee_text || 'No assignee stated'} · {item.match === 'matched' ? 'Member matched' : 'Review assignee'}</AppText>
    <AppText variant="caption">{item.suggested_due_day || item.deadline_text || 'No deadline stated'}</AppText>
    {approved ? <AppText>Approved</AppText> : workspace.role !== 'member' && (!editing
      ? <Button label="Review assignment" disabled={busy} onPress={() => setEditing(true)} />
      : <>
        <Field label="Title" value={title} onChangeText={setTitle} maxLength={255} />
        <Field label="Description" value={description} onChangeText={setDescription} maxLength={3000} multiline />
        <AppText variant="subtitle">Assignee</AppText>
        {members.map((member) => <Button label={member.name || member.email} key={member.user_id}
          variant={assignee === member.user_id ? 'primary' : 'secondary'} disabled={busy} onPress={() => setAssignee(member.user_id)} />)}
        <Field label="Deadline (YYYY-MM-DDTHH:mm)" value={deadline} onChangeText={setDeadline} autoCapitalize="none" />
        {invalidDate && <AppText accessibilityRole="alert">Enter a valid date and time.</AppText>}
        <AppText variant="subtitle">Priority</AppText>
        <View style={styles.tabs}>{(['low', 'medium', 'high'] as const).map((value) => <Button key={value} label={value}
          variant={value === priority ? 'primary' : 'secondary'} disabled={busy} onPress={() => setPriority(value)} />)}</View>
        <AppText variant="subtitle">Project</AppText>
        <Button label="No project" variant={project === null ? 'primary' : 'secondary'} disabled={busy} onPress={() => setProject(null)} />
        {workspace.projects.map((entry) => <Button key={entry.id} label={entry.name} variant={project === entry.id ? 'primary' : 'secondary'}
          disabled={busy} onPress={() => setProject(entry.id)} />)}
        <Button label="Approve and assign" disabled={busy || !title.trim() || !selected || invalidDate} onPress={() => {
          if (!selected || invalidDate) return;
          Alert.alert('Approve assignment?', `${title}\n${selected.name || selected.email}\n${formatDate(due?.toISOString() ?? null)}`, [
            { text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: () => approve({
              title, description, user_id: selected.user_id, priority, project_id: project, due_date: due?.toISOString() ?? null,
            }) },
          ]);
        }} />
      </>)}
  </Card>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingTop: 55, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingVertical: spacing.sm },
});
