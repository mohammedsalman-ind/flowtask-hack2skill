export type WorkspaceRole = 'admin' | 'manager' | 'member';
export type Stage = 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Organization {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
}
export interface Membership { role: WorkspaceRole; organization: Organization }
export interface Invitation { id: string; organization_name: string; role: WorkspaceRole; expires_at: string }
export interface Member { user_id: string; name: string; email: string; role: WorkspaceRole }
export interface Project { id: string; name: string; description: string; status: 'active' | 'completed' | 'archived' }
export interface WorkspaceMeeting {
  id: string;
  title: string;
  description: string;
  agenda: string;
  starts_at: string;
  timezone: string;
  project_id: string | null;
  participants: string[];
  visibility: 'team' | 'participants';
  status: 'scheduled' | 'completed' | 'cancelled';
  analysis_version: string | null;
  has_analysis?: boolean;
}
export interface ApprovedTask {
  title: string;
  description: string;
  user_id: string;
  due_date: string | null;
  priority: Priority;
  project_id: string | null;
}
export interface WorkspaceTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: Priority;
  due_date: string | null;
  organization_stage: Stage;
  organization_project_id: string | null;
  organization_meeting_id: string | null;
  organization_action_key: string | null;
  created_at: string;
  completed_at: string | null;
}
export interface AnalysisNote { text: string; evidence: string }
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  evidence: string;
  assignee_text: string | null;
  deadline_text: string | null;
  suggested_due_day: string | null;
  priority: Priority | null;
  assignee_id: string | null;
  match: 'matched' | 'ambiguous' | 'unmatched' | 'unspecified';
  suggested_project_id: string | null;
}
export interface MeetingAnalysis {
  overview: string;
  discussion: AnalysisNote[];
  decisions: AnalysisNote[];
  blockers: AnalysisNote[];
  next_steps: AnalysisNote[];
  action_items: ActionItem[];
}
export interface MeetingDetail extends WorkspaceMeeting {
  transcript: string;
  source_name: string | null;
  analysis: MeetingAnalysis | null;
}
export interface TaskUpdate {
  id: string;
  author_id: string | null;
  kind: 'comment' | 'blocker' | 'deadline_request';
  body: string;
  requested_due_at: string | null;
  created_at: string;
}
export interface WorkspaceSnapshot {
  organization: Organization;
  role: WorkspaceRole;
  members: Member[];
  projects: Project[];
  meetings: WorkspaceMeeting[];
  tasks: WorkspaceTask[];
  activity: { id: string; actor_id: string | null; kind: string; meeting_id: string | null; task_id: string | null; created_at: string }[];
}
export interface FollowUp {
  previous: { id: string; title: string; starts_at: string; analysis: MeetingAnalysis | null } | null;
  tasks: WorkspaceTask[];
  blockers: { task_id: string; body: string; created_at: string }[];
  agenda: string[];
}
export interface WorkspaceAnswer { answer: string; source_ids: string[]; sources?: { id: string; title: string }[] }
