BEGIN;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN organization_id uuid REFERENCES public.organizations ON DELETE CASCADE;

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX organization_members_user_idx ON public.organization_members (user_id, organization_id);

CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('manager', 'member')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_invitations_org_idx ON public.organization_invitations (organization_id, created_at DESC);

CREATE TABLE public.organization_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);

-- Workspace meetings have their own access model. Personal meetings keep their
-- existing storage and assistant workflow.
CREATE TABLE public.organization_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  project_id uuid,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '',
  agenda text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  participants uuid[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'team' CHECK (visibility IN ('team', 'participants')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  transcript text NOT NULL DEFAULT '',
  source_name text,
  analysis jsonb,
  analysis_version uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, project_id) REFERENCES public.organization_projects (organization_id, id)
);
CREATE INDEX organization_meetings_starts_idx ON public.organization_meetings (organization_id, starts_at DESC);

ALTER TABLE public.tasks
  ADD COLUMN organization_id uuid REFERENCES public.organizations ON DELETE RESTRICT,
  ADD COLUMN organization_project_id uuid,
  ADD COLUMN organization_meeting_id uuid,
  ADD COLUMN organization_action_key uuid,
  ADD COLUMN organization_stage text CHECK (organization_stage IN ('todo', 'in_progress', 'blocked', 'in_review', 'done')),
  ADD COLUMN completed_at timestamptz,
  ADD CONSTRAINT tasks_workspace_shape CHECK (
    (organization_id IS NULL AND organization_stage IS NULL AND organization_project_id IS NULL
      AND organization_meeting_id IS NULL AND organization_action_key IS NULL)
    OR (organization_id IS NOT NULL AND organization_stage IS NOT NULL)
  ),
  ADD FOREIGN KEY (organization_id, organization_project_id) REFERENCES public.organization_projects (organization_id, id),
  ADD FOREIGN KEY (organization_id, organization_meeting_id) REFERENCES public.organization_meetings (organization_id, id);
CREATE UNIQUE INDEX tasks_workspace_action_idx ON public.tasks (organization_meeting_id, organization_action_key);
CREATE INDEX tasks_workspace_assignee_idx ON public.tasks (organization_id, user_id, due_date);

CREATE TABLE public.organization_task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks ON DELETE CASCADE,
  author_id uuid REFERENCES public.users ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('comment', 'blocker', 'deadline_request')),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  requested_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_task_updates_task_idx ON public.organization_task_updates (task_id, created_at);

CREATE TABLE public.organization_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users ON DELETE SET NULL,
  meeting_id uuid REFERENCES public.organization_meetings ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organization_activity_recent_idx ON public.organization_activity (organization_id, created_at DESC);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_task_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activity ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.workspace_role(workspace uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = workspace AND user_id = auth.uid();
$$;

CREATE FUNCTION public.workspace_can_manage(workspace uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(public.workspace_role(workspace) IN ('admin', 'manager'), false);
$$;

CREATE FUNCTION public.workspace_can_see_meeting(workspace uuid, access text, attendees uuid[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.workspace_role(workspace) IS NOT NULL
    AND (access = 'team' OR auth.uid() = ANY(attendees) OR public.workspace_can_manage(workspace));
$$;

CREATE POLICY workspace_read ON public.organizations FOR SELECT TO authenticated USING (public.workspace_role(id) IS NOT NULL);
CREATE POLICY workspace_directory ON public.organization_members FOR SELECT TO authenticated USING (public.workspace_role(organization_id) IS NOT NULL);
CREATE POLICY workspace_projects_read ON public.organization_projects FOR SELECT TO authenticated USING (public.workspace_role(organization_id) IS NOT NULL);
CREATE POLICY workspace_meetings_read ON public.organization_meetings FOR SELECT TO authenticated
  USING (public.workspace_can_see_meeting(organization_id, visibility, participants));
CREATE POLICY workspace_task_updates_read ON public.organization_task_updates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id));
CREATE POLICY workspace_activity_read ON public.organization_activity FOR SELECT TO authenticated
  USING (public.workspace_role(organization_id) IS NOT NULL
    AND (meeting_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_meetings m WHERE m.id = meeting_id))
    AND (task_id IS NULL OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id)));

DROP POLICY IF EXISTS tasks_select_own ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_own ON public.tasks;
DROP POLICY IF EXISTS tasks_update_own ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_own ON public.tasks;
CREATE POLICY tasks_select_own ON public.tasks FOR SELECT TO authenticated
  USING ((organization_id IS NULL AND auth.uid() = user_id)
    OR (public.workspace_role(organization_id) IS NOT NULL
      AND (auth.uid() = user_id OR public.workspace_can_manage(organization_id))));
CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (organization_id IS NULL AND auth.uid() = user_id);
CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE TO authenticated
  USING (organization_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (organization_id IS NULL AND auth.uid() = user_id);
CREATE POLICY tasks_delete_own ON public.tasks FOR DELETE TO authenticated
  USING (organization_id IS NULL AND auth.uid() = user_id);

CREATE FUNCTION public.workspace_create(settings jsonb) RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE workspace public.organizations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE insufficient_privilege; END IF;
  INSERT INTO public.organizations (name, description, logo_url)
    VALUES (settings->>'name', coalesce(settings->>'description', ''), settings->>'logo_url') RETURNING * INTO workspace;
  INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (workspace.id, auth.uid(), 'admin');
  RETURN workspace;
END;
$$;

CREATE FUNCTION public.workspace_settings(workspace uuid, settings jsonb) RETURNS public.organizations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE updated public.organizations;
BEGIN
  IF public.workspace_role(workspace) IS DISTINCT FROM 'admin' THEN RAISE insufficient_privilege; END IF;
  UPDATE public.organizations SET name = settings->>'name', description = coalesce(settings->>'description', ''),
    logo_url = settings->>'logo_url' WHERE id = workspace RETURNING * INTO updated;
  RETURN updated;
END;
$$;

CREATE FUNCTION public.workspace_directory(workspace uuid)
RETURNS TABLE (user_id uuid, name text, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.user_id, u.name, u.email, m.role FROM public.organization_members m
  JOIN public.users u ON u.id = m.user_id
  WHERE m.organization_id = workspace AND public.workspace_role(workspace) IS NOT NULL
  ORDER BY u.name, u.email;
$$;

CREATE FUNCTION public.workspace_invite(workspace uuid, recipient text, invited_role text, digest text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE invitation uuid;
BEGIN
  IF public.workspace_role(workspace) IS DISTINCT FROM 'admin' THEN RAISE insufficient_privilege; END IF;
  PERFORM 1 FROM public.organizations WHERE id = workspace FOR UPDATE;
  UPDATE public.organization_invitations SET status = 'revoked'
    WHERE organization_id = workspace AND email = lower(btrim(recipient)) AND status = 'pending';
  INSERT INTO public.organization_invitations (organization_id, email, role, token_hash)
    VALUES (workspace, lower(btrim(recipient)), invited_role, digest) RETURNING id INTO invitation;
  RETURN invitation;
END;
$$;

CREATE FUNCTION public.workspace_inbox()
RETURNS TABLE (id uuid, organization_name text, role text, expires_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT i.id, o.name, i.role, i.expires_at
  FROM public.organization_invitations i JOIN public.organizations o ON o.id = i.organization_id
  JOIN auth.users u ON u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email) = i.email
  WHERE i.status = 'pending' AND i.expires_at > now() ORDER BY i.created_at DESC;
$$;

CREATE FUNCTION public.workspace_respond(invitation uuid, digest text, accept boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE selected public.organization_invitations;
BEGIN
  SELECT i.* INTO selected FROM public.organization_invitations i
    JOIN auth.users u ON u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email) = i.email
    WHERE ((invitation IS NOT NULL AND i.id = invitation) OR (digest IS NOT NULL AND i.token_hash = digest))
      AND i.expires_at > now() AND (i.status = 'pending' OR (accept AND i.status = 'accepted'))
    FOR UPDATE OF i;
  IF NOT FOUND THEN RAISE no_data_found USING MESSAGE = 'Invitation is unavailable for this account'; END IF;
  IF selected.status = 'pending' THEN
    IF accept THEN
      INSERT INTO public.organization_members (organization_id, user_id, role)
        VALUES (selected.organization_id, auth.uid(), selected.role) ON CONFLICT DO NOTHING;
      INSERT INTO public.organization_activity (organization_id, actor_id, kind)
        VALUES (selected.organization_id, auth.uid(), 'member_joined');
    END IF;
    UPDATE public.organization_invitations SET status = CASE WHEN accept THEN 'accepted' ELSE 'rejected' END
      WHERE id = selected.id;
  END IF;
  RETURN selected.organization_id;
END;
$$;

CREATE FUNCTION public.workspace_set_role(workspace uuid, member uuid, new_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.organizations WHERE id = workspace FOR UPDATE;
  IF public.workspace_role(workspace) IS DISTINCT FROM 'admin' THEN RAISE insufficient_privilege; END IF;
  IF member = auth.uid() THEN RAISE check_violation USING MESSAGE = 'An admin cannot change their own role'; END IF;
  UPDATE public.organization_members SET role = new_role WHERE organization_id = workspace AND user_id = member;
  IF NOT FOUND THEN RAISE no_data_found; END IF;
END;
$$;

CREATE FUNCTION public.workspace_save_project(workspace uuid, project uuid, input jsonb) RETURNS public.organization_projects
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.organization_projects;
BEGIN
  IF NOT public.workspace_can_manage(workspace) THEN RAISE insufficient_privilege; END IF;
  IF project IS NULL THEN
    INSERT INTO public.organization_projects (organization_id, name, description, status)
      VALUES (workspace, input->>'name', input->>'description', input->>'status') RETURNING * INTO result;
  ELSE
    UPDATE public.organization_projects SET name = input->>'name', description = input->>'description', status = input->>'status'
      WHERE organization_id = workspace AND id = project RETURNING * INTO result;
    IF NOT FOUND THEN RAISE no_data_found; END IF;
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.workspace_save_meeting(workspace uuid, meeting uuid, input jsonb) RETURNS public.organization_meetings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.organization_meetings;
DECLARE attendees uuid[] := ARRAY(SELECT value::uuid FROM jsonb_array_elements_text(input->'participants'));
BEGIN
  IF NOT public.workspace_can_manage(workspace) THEN RAISE insufficient_privilege; END IF;
  IF EXISTS (SELECT 1 FROM unnest(attendees) AS attendee
    WHERE NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = workspace AND user_id = attendee))
  THEN RAISE check_violation USING MESSAGE = 'Participants must belong to this workspace'; END IF;
  IF meeting IS NULL THEN
    INSERT INTO public.organization_meetings (organization_id, project_id, title, description, agenda, starts_at, timezone, participants, visibility, status)
      VALUES (workspace, (input->>'project_id')::uuid, input->>'title', input->>'description', input->>'agenda',
        (input->>'starts_at')::timestamptz, input->>'timezone', attendees, input->>'visibility', input->>'status')
      RETURNING * INTO result;
    INSERT INTO public.organization_activity (organization_id, actor_id, meeting_id, kind)
      VALUES (workspace, auth.uid(), result.id, 'meeting_created');
  ELSE
    IF input->>'visibility' = 'participants' AND EXISTS (
      SELECT 1 FROM public.tasks t JOIN public.organization_members m ON m.organization_id = workspace AND m.user_id = t.user_id
      WHERE t.organization_meeting_id = meeting AND m.role = 'member' AND NOT (t.user_id = ANY(attendees))
    ) THEN RAISE check_violation USING MESSAGE = 'Include assigned members before restricting meeting visibility'; END IF;
    UPDATE public.organization_meetings SET project_id = (input->>'project_id')::uuid, title = input->>'title',
      description = input->>'description', agenda = input->>'agenda', starts_at = (input->>'starts_at')::timestamptz,
      timezone = input->>'timezone', participants = attendees, visibility = input->>'visibility', status = input->>'status'
      WHERE organization_id = workspace AND id = meeting RETURNING * INTO result;
    IF NOT FOUND THEN RAISE no_data_found; END IF;
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.workspace_save_analysis(workspace uuid, meeting uuid, expected uuid, source text, filename text, result jsonb)
RETURNS public.organization_meetings LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_meeting public.organization_meetings;
BEGIN
  IF NOT public.workspace_can_manage(workspace) THEN RAISE insufficient_privilege; END IF;
  SELECT * INTO current_meeting FROM public.organization_meetings WHERE organization_id = workspace AND id = meeting FOR UPDATE;
  IF NOT FOUND THEN RAISE no_data_found; END IF;
  IF current_meeting.analysis_version IS DISTINCT FROM expected OR EXISTS
    (SELECT 1 FROM public.tasks WHERE organization_meeting_id = meeting AND organization_action_key IS NOT NULL)
  THEN RAISE unique_violation USING MESSAGE = 'The meeting analysis changed or already has approved items'; END IF;
  UPDATE public.organization_meetings SET transcript = source, source_name = filename, analysis = result,
    analysis_version = gen_random_uuid() WHERE id = meeting RETURNING * INTO current_meeting;
  IF result IS NOT NULL THEN
    INSERT INTO public.organization_activity (organization_id, actor_id, meeting_id, kind)
      VALUES (workspace, auth.uid(), meeting, 'summary_ready');
    INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
      SELECT m.user_id, 'organization_summary', meeting, 'Meeting summary available', workspace
      FROM public.organization_members m WHERE m.organization_id = workspace AND m.user_id <> auth.uid()
        AND (current_meeting.visibility = 'team' OR m.user_id = ANY(current_meeting.participants) OR m.role IN ('admin','manager'))
        AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.user_id = m.user_id AND n.type = 'organization_summary' AND n.reference_id = meeting);
  END IF;
  RETURN current_meeting;
END;
$$;

CREATE FUNCTION public.workspace_approve_tasks(workspace uuid, meeting uuid, version uuid, items jsonb)
RETURNS SETOF public.tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE source public.organization_meetings;
DECLARE item jsonb;
DECLARE target uuid;
DECLARE created public.tasks;
BEGIN
  IF NOT public.workspace_can_manage(workspace) THEN RAISE insufficient_privilege; END IF;
  SELECT * INTO source FROM public.organization_meetings WHERE organization_id = workspace AND id = meeting FOR UPDATE;
  IF NOT FOUND THEN RAISE no_data_found; END IF;
  IF version IS NULL OR source.analysis_version IS DISTINCT FROM version OR source.analysis IS NULL
  THEN RAISE unique_violation USING MESSAGE = 'Reload the latest analysis before approving items'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(items) LOOP
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(source.analysis->'action_items') draft WHERE draft->>'id' = item->>'id')
    THEN RAISE check_violation USING MESSAGE = 'Action item does not belong to this analysis'; END IF;
    SELECT * INTO created FROM public.tasks WHERE organization_meeting_id = meeting AND organization_action_key = (item->>'id')::uuid;
    IF FOUND THEN RETURN NEXT created; CONTINUE; END IF;
    target := (item->>'user_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = workspace AND user_id = target)
    THEN RAISE check_violation USING MESSAGE = 'Assignee must belong to this workspace'; END IF;
    IF source.visibility = 'participants' AND NOT (target = ANY(source.participants)) AND NOT EXISTS (
      SELECT 1 FROM public.organization_members WHERE organization_id = workspace AND user_id = target AND role IN ('admin','manager'))
    THEN RAISE check_violation USING MESSAGE = 'Assignee must have access to this meeting'; END IF;
    INSERT INTO public.tasks (user_id, title, description, due_date, priority, context, organization_id,
      organization_project_id, organization_meeting_id, organization_action_key, organization_stage)
    VALUES (target, item->>'title', item->>'description', (item->>'due_date')::timestamptz, item->>'priority', 'work', workspace,
      (item->>'project_id')::uuid, meeting, (item->>'id')::uuid, 'todo') RETURNING * INTO created;
    INSERT INTO public.organization_activity (organization_id, actor_id, meeting_id, task_id, kind)
      VALUES (workspace, auth.uid(), meeting, created.id, 'task_assigned');
    INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
      VALUES (target, 'task_assigned', created.id, 'You were assigned "' || created.title || '"', workspace);
    RETURN NEXT created;
  END LOOP;
END;
$$;

CREATE FUNCTION public.workspace_update_task(workspace uuid, task uuid, changes jsonb) RETURNS public.tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous public.tasks;
DECLARE updated public.tasks;
DECLARE stage text;
DECLARE target uuid;
DECLARE manager boolean := public.workspace_can_manage(workspace);
BEGIN
  IF public.workspace_role(workspace) IS NULL THEN RAISE insufficient_privilege; END IF;
  SELECT * INTO previous FROM public.tasks WHERE id = task AND organization_id = workspace FOR UPDATE;
  IF NOT FOUND OR (NOT manager AND previous.user_id <> auth.uid()) THEN RAISE no_data_found; END IF;
  IF NOT manager AND changes - 'stage' <> '{}'::jsonb THEN RAISE insufficient_privilege; END IF;
  target := coalesce((changes->>'user_id')::uuid, previous.user_id);
  IF target <> previous.user_id AND NOT EXISTS (SELECT 1 FROM public.organization_members m
    LEFT JOIN public.organization_meetings source ON source.id = previous.organization_meeting_id
    WHERE m.organization_id = workspace AND m.user_id = target AND
      (source.id IS NULL OR source.visibility = 'team' OR target = ANY(source.participants) OR m.role IN ('admin','manager')))
  THEN RAISE check_violation USING MESSAGE = 'Assignee must have access to the source meeting'; END IF;
  stage := coalesce(changes->>'stage', previous.organization_stage);
  UPDATE public.tasks SET organization_stage = stage, user_id = target,
    status = CASE WHEN stage IN ('todo','done') THEN stage ELSE 'in_progress' END,
    completed_at = CASE WHEN stage = 'done' THEN coalesce(previous.completed_at, now()) ELSE NULL END,
    due_date = CASE WHEN changes ? 'due_date' THEN (changes->>'due_date')::timestamptz ELSE previous.due_date END,
    updated_at = now() WHERE id = task RETURNING * INTO updated;
  IF previous.organization_stage IS DISTINCT FROM stage OR previous.user_id <> target OR previous.due_date IS DISTINCT FROM updated.due_date THEN
    INSERT INTO public.organization_activity (organization_id, actor_id, meeting_id, task_id, kind)
      VALUES (workspace, auth.uid(), updated.organization_meeting_id, task, CASE WHEN stage = 'done' THEN 'task_completed' ELSE 'task_updated' END);
  END IF;
  IF previous.user_id <> target OR previous.due_date IS DISTINCT FROM updated.due_date THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
      VALUES (target, CASE WHEN previous.user_id <> target THEN 'task_assigned' ELSE 'organization_deadline_changed' END,
        task, CASE WHEN previous.user_id <> target THEN 'You were assigned "' ELSE 'Deadline changed for "' END || updated.title || '"', workspace);
  END IF;
  IF stage = 'done' AND previous.organization_stage <> 'done' THEN
    INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
      SELECT m.user_id, 'organization_task_completed', task, 'Completed "' || updated.title || '"', workspace
      FROM public.organization_members m WHERE m.organization_id = workspace AND m.role IN ('admin','manager') AND m.user_id <> auth.uid();
  END IF;
  RETURN updated;
END;
$$;

CREATE FUNCTION public.workspace_create_task(workspace uuid, input jsonb) RETURNS public.tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.tasks;
DECLARE target uuid := (input->>'user_id')::uuid;
BEGIN
  IF NOT public.workspace_can_manage(workspace) THEN RAISE insufficient_privilege; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = workspace AND user_id = target)
  THEN RAISE check_violation USING MESSAGE = 'Assignee must belong to this workspace'; END IF;
  INSERT INTO public.tasks (user_id, title, description, due_date, priority, context, organization_id,
    organization_project_id, organization_stage)
  VALUES (target, input->>'title', input->>'description', (input->>'due_date')::timestamptz,
    input->>'priority', 'work', workspace, (input->>'project_id')::uuid, 'todo') RETURNING * INTO result;
  INSERT INTO public.organization_activity (organization_id, actor_id, task_id, kind)
    VALUES (workspace, auth.uid(), result.id, 'task_assigned');
  INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
    VALUES (target, 'task_assigned', result.id, 'You were assigned "' || result.title || '"', workspace);
  RETURN result;
END;
$$;

CREATE UNIQUE INDEX workspace_reminder_once ON public.notifications (user_id, type, reference_id)
  WHERE type IN ('organization_task_due','organization_task_overdue','organization_meeting_upcoming');

CREATE FUNCTION public.workspace_refresh_reminders() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE insufficient_privilege; END IF;
  INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
    SELECT auth.uid(), CASE WHEN due_date < now() THEN 'organization_task_overdue' ELSE 'organization_task_due' END, id,
      CASE WHEN due_date < now() THEN 'Overdue: ' ELSE 'Due within 24 hours: ' END || title, organization_id
    FROM public.tasks WHERE user_id = auth.uid() AND public.workspace_role(organization_id) IS NOT NULL
      AND organization_stage <> 'done' AND due_date <= now() + interval '24 hours'
    ON CONFLICT DO NOTHING;
  INSERT INTO public.notifications (user_id, type, reference_id, message, organization_id)
    SELECT auth.uid(), 'organization_meeting_upcoming', m.id, 'Upcoming meeting: ' || m.title, m.organization_id
    FROM public.organization_meetings m
    WHERE auth.uid() = ANY(m.participants) AND public.workspace_can_see_meeting(m.organization_id, m.visibility, m.participants)
      AND m.status = 'scheduled' AND m.starts_at BETWEEN now() AND now() + interval '24 hours'
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE FUNCTION public.workspace_add_task_update(workspace uuid, task uuid, input jsonb) RETURNS public.organization_task_updates
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result public.organization_task_updates;
BEGIN
  IF public.workspace_role(workspace) IS NULL THEN RAISE insufficient_privilege; END IF;
  PERFORM 1 FROM public.tasks WHERE id = task AND organization_id = workspace AND
    (user_id = auth.uid() OR public.workspace_can_manage(workspace)) FOR UPDATE;
  IF NOT FOUND THEN RAISE insufficient_privilege; END IF;
  IF (input->>'kind' = 'deadline_request' AND input->>'requested_due_at' IS NULL)
  THEN RAISE check_violation USING MESSAGE = 'A requested deadline is required'; END IF;
  INSERT INTO public.organization_task_updates (task_id, author_id, kind, body, requested_due_at)
    VALUES (task, auth.uid(), input->>'kind', input->>'body', (input->>'requested_due_at')::timestamptz) RETURNING * INTO result;
  IF result.kind = 'blocker' THEN PERFORM public.workspace_update_task(workspace, task, '{"stage":"blocked"}'); END IF;
  RETURN result;
END;
$$;

-- Revoke default function execution from anonymous clients. Functions that
-- mutate shared data validate auth.uid() and role within the transaction.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN SELECT oid::regprocedure AS signature FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'workspace\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
  END LOOP;
END;
$$;

GRANT SELECT ON public.organizations, public.organization_members, public.organization_projects,
  public.organization_meetings, public.organization_task_updates, public.organization_activity TO authenticated;

COMMIT;
