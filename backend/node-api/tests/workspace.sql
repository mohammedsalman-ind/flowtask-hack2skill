-- Run after the application migrations in a disposable database as its owner.
BEGIN;
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('11111111-0000-4000-8000-000000000001', 'admin@example.test', now()),
  ('11111111-0000-4000-8000-000000000002', 'member@example.test', now()),
  ('11111111-0000-4000-8000-000000000003', 'other@example.test', now());
INSERT INTO public.users (id, email, name) VALUES
  ('11111111-0000-4000-8000-000000000001', 'admin@example.test', 'Admin'),
  ('11111111-0000-4000-8000-000000000002', 'member@example.test', 'Salman'),
  ('11111111-0000-4000-8000-000000000003', 'other@example.test', 'Other')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  admin uuid := '11111111-0000-4000-8000-000000000001';
  member uuid := '11111111-0000-4000-8000-000000000002';
  outsider uuid := '11111111-0000-4000-8000-000000000003';
  org uuid;
  other_org uuid;
  invite uuid;
  meeting uuid;
  version uuid;
  task uuid;
  item uuid := '22222222-0000-4000-8000-000000000001';
  body jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', admin::text, true);
  org := (public.workspace_create('{"name":"First workspace"}')).id;
  IF public.workspace_role(org) <> 'admin' THEN RAISE EXCEPTION 'Creator not made admin'; END IF;
  invite := public.workspace_invite(org, 'member@example.test', 'member', repeat('a', 64));
  PERFORM set_config('request.jwt.claim.sub', outsider::text, true);
  other_org := (public.workspace_create('{"name":"Other workspace"}')).id;
  BEGIN
    PERFORM public.workspace_respond(invite, NULL, true);
    RAISE EXCEPTION 'An unrelated account accepted the invitation';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = org) THEN
    RAISE EXCEPTION 'Cross-organization read succeeded';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', member::text, true);
  IF NOT EXISTS (SELECT 1 FROM public.workspace_inbox() WHERE id = invite) THEN RAISE EXCEPTION 'Invitation not visible'; END IF;
  PERFORM public.workspace_respond(invite, NULL, true);
  IF public.workspace_role(org) <> 'member' THEN RAISE EXCEPTION 'Invitation did not grant member access'; END IF;
  BEGIN
    PERFORM public.workspace_save_project(org, NULL, '{"name":"Forbidden","description":"","status":"active"}');
    RAISE EXCEPTION 'Member created a project';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub', admin::text, true);
  meeting := (public.workspace_save_meeting(org, NULL, jsonb_build_object(
    'title','Private planning','description','','agenda','Frontend','starts_at',now(),'timezone','UTC',
    'visibility','participants','status','completed','participants',jsonb_build_array(member)
  ))).id;
  version := (public.workspace_save_analysis(org, meeting, NULL, 'Salman will finish frontend by Friday.', NULL,
    jsonb_build_object('overview','Frontend follow-up','action_items',jsonb_build_array(jsonb_build_object('id',item))))).analysis_version;
  body := jsonb_build_array(jsonb_build_object('id',item,'user_id',member,'title','Finish frontend',
    'description','Review the frontend','priority','medium','due_date',now() - interval '5 minutes'));
  SELECT id INTO task FROM public.workspace_approve_tasks(org, meeting, version, body);
  PERFORM public.workspace_approve_tasks(org, meeting, version, body);
  IF (SELECT count(*) FROM public.tasks WHERE organization_meeting_id = meeting) <> 1 THEN RAISE EXCEPTION 'Approval was duplicated'; END IF;
  BEGIN
    PERFORM public.workspace_approve_tasks(other_org, meeting, version, body);
    RAISE EXCEPTION 'Cross-workspace approval succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM set_config('request.jwt.claim.sub', member::text, true);
  IF NOT EXISTS (SELECT 1 FROM public.organization_meetings WHERE id = meeting) THEN
    RAISE EXCEPTION 'Participant cannot see their meeting';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = task AND user_id = member AND due_date IS NOT NULL) THEN
    RAISE EXCEPTION 'Assigned task is missing from owner-scoped planner data';
  END IF;
  BEGIN
    PERFORM public.workspace_update_task(org, task, jsonb_build_object('user_id',outsider));
    RAISE EXCEPTION 'Member reassigned a task';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.workspace_refresh_reminders();
  PERFORM public.workspace_refresh_reminders();
  IF (SELECT count(*) FROM public.notifications WHERE reference_id = task AND type = 'organization_task_overdue') <> 1 THEN
    RAISE EXCEPTION 'Overdue reminder was missing or duplicated';
  END IF;
  PERFORM public.workspace_add_task_update(org, task, '{"kind":"blocker","body":"Waiting on feedback"}');
  IF (SELECT organization_stage FROM public.tasks WHERE id = task) <> 'blocked' THEN RAISE EXCEPTION 'Blocker did not update stage'; END IF;
  PERFORM public.workspace_update_task(org, task, '{"stage":"done"}');
  IF NOT EXISTS (SELECT 1 FROM public.tasks WHERE id = task AND status = 'done' AND completed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Completion did not synchronize with personal task status';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', outsider::text, true);
  IF EXISTS (SELECT 1 FROM public.organization_meetings WHERE id = meeting) THEN
    RAISE EXCEPTION 'Outsider could see a private meeting';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = task) OR EXISTS
    (SELECT 1 FROM public.organization_task_updates WHERE task_id = task) THEN
    RAISE EXCEPTION 'Outsider could see an assignment or blocker';
  END IF;
END;
$$;

ROLLBACK;
