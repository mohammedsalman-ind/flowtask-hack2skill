export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type UiTaskStatus = 'pending' | 'completed';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';

export type Task = {
  organization_id?: string | null;
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  due_date: string | null;
  reminder_minutes?: number | null;
  context?: 'work' | 'personal' | 'health' | 'study';
  recurrence?: RecurrenceType;
  recurrence_end_date?: string | null;
  parent_task_id?: string | null;
  assignee?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateTaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  due_date: string | null;
  reminder_minutes?: number | null;
  context?: TaskContext;
  parent_task_id?: string | null;
  assignee?: string | null;
  recurrence?: RecurrenceType;
  recurrence_end_date?: string | null;
};

export type TaskFilter = 'all' | 'pending' | 'completed' | 'high';
export type TaskSort = 'due_asc' | 'due_desc' | 'priority' | 'created_desc';
export type TaskContext = 'work' | 'personal' | 'health' | 'study';
export type UpdateTaskInput = Partial<CreateTaskInput>;

export type MeetingActionItem = {
  task: string;
  assignee?: string;
  due?: string | null;
  priority?: TaskPriority;
  added?: boolean;
};

export type MeetingKeyPoint = {
  point: string;
  category: 'decision' | 'discussion' | 'blocker' | 'information' | string;
};

export type MeetingSummary = {
  summary: string;
  key_notes: MeetingKeyPoint[];
  action_items: MeetingActionItem[];
  participants?: string[];
  risks?: string[];
  follow_ups?: string[];
  important_deadlines?: string[];
};

export type TaskAssignment = {
  id: string;
  task_id: string;
  sender_user_id: string;
  recipient_user_id: string | null;
  recipient_email: string;
  status: 'pending' | 'sent' | 'accepted' | 'completed' | 'cancelled';
  message: string | null;
  email_status: 'none' | 'sent' | 'failed';
  email_error: string | null;
  email_provider: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  // Joined fields
  tasks?: Task;
  sender?: { id: string; name: string; email: string };
};

export type AssignmentNotificationResult = {
  in_app: boolean;
  email_sent: boolean;
  email_provider: string;
};

export type MeetingRecord = {
  id: string;
  user_id: string;
  title: string;
  input_type: 'transcript' | 'recording';
  raw_transcript: string;
  summary: string | null;
  key_notes: MeetingKeyPoint[];
  action_items: MeetingActionItem[];
  participants: string[];
  tasks_created: string[];
  task_count: number;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
};
