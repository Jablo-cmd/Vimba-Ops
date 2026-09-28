-- Vimba Intelligence foundation
-- Provider-neutral AI orchestration, auditable insights, feedback and chat sessions.
create table if not exists public.ai_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  analysis_type text not null check (analysis_type in ('executive','workforce','incident','site','compliance','attendance','anomaly','assistant')),
  status text not null default 'completed' check (status in ('queued','running','completed','failed')),
  model_provider text,
  model_name text,
  input_scope jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  analysis_run_id uuid references public.ai_analysis_runs(id) on delete set null,
  insight_type text not null check (insight_type in ('anomaly','trend','risk','opportunity','recommendation','summary')),
  severity text not null default 'info' check (severity in ('info','low','medium','high','critical')),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 5000),
  rationale text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  evidence jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  source_period_start date,
  source_period_end date,
  status text not null default 'active' check (status in ('active','acknowledged','dismissed','resolved')),
  generated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  insight_id uuid references public.ai_insights(id) on delete cascade,
  run_id uuid references public.ai_analysis_runs(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  rating text not null check (rating in ('useful','not_useful','incorrect')),
  comment text check (comment is null or char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  check (insight_id is not null or run_id is not null)
);

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New intelligence session' check (char_length(title) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null check (char_length(content) between 1 and 20000),
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_analysis_runs_tenant_created_idx on public.ai_analysis_runs(tenant_id, created_at desc);
create index if not exists ai_insights_tenant_status_created_idx on public.ai_insights(tenant_id, status, created_at desc);
create index if not exists ai_insights_tenant_type_created_idx on public.ai_insights(tenant_id, insight_type, created_at desc);
create index if not exists ai_feedback_tenant_created_idx on public.ai_feedback(tenant_id, created_at desc);
create index if not exists ai_chat_sessions_user_updated_idx on public.ai_chat_sessions(user_id, updated_at desc);
create index if not exists ai_chat_messages_session_created_idx on public.ai_chat_messages(session_id, created_at);

alter table public.ai_analysis_runs enable row level security;
alter table public.ai_insights enable row level security;
alter table public.ai_feedback enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists ai_runs_select on public.ai_analysis_runs;
create policy ai_runs_select on public.ai_analysis_runs
for select to authenticated
using (
  tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('platform_owner','super_administrator','administrator','operations_manager','area_manager','site_supervisor','hr','finance','compliance','client_administrator','client_user')
  )
);

drop policy if exists ai_runs_insert on public.ai_analysis_runs;
create policy ai_runs_insert on public.ai_analysis_runs
for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
);

drop policy if exists ai_insights_select on public.ai_insights;
create policy ai_insights_select on public.ai_insights
for select to authenticated
using (
  tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('platform_owner','super_administrator','administrator','operations_manager','area_manager','site_supervisor','hr','finance','compliance','client_administrator','client_user')
  )
);

drop policy if exists ai_insights_insert on public.ai_insights;
create policy ai_insights_insert on public.ai_insights
for insert to authenticated
with check (
  generated_by = (select auth.uid())
  and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
);

drop policy if exists ai_insights_update on public.ai_insights;
create policy ai_insights_update on public.ai_insights
for update to authenticated
using (
  tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('platform_owner','super_administrator','administrator','operations_manager','area_manager','site_supervisor','hr','finance','compliance')
  )
)
with check (tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_feedback_select on public.ai_feedback;
create policy ai_feedback_select on public.ai_feedback
for select to authenticated
using (tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_feedback_insert on public.ai_feedback;
create policy ai_feedback_insert on public.ai_feedback
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1)
);

drop policy if exists ai_chat_sessions_select on public.ai_chat_sessions;
create policy ai_chat_sessions_select on public.ai_chat_sessions
for select to authenticated
using (user_id = (select auth.uid()) and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_chat_sessions_insert on public.ai_chat_sessions;
create policy ai_chat_sessions_insert on public.ai_chat_sessions
for insert to authenticated
with check (user_id = (select auth.uid()) and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_chat_sessions_update on public.ai_chat_sessions;
create policy ai_chat_sessions_update on public.ai_chat_sessions
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_chat_messages_select on public.ai_chat_messages;
create policy ai_chat_messages_select on public.ai_chat_messages
for select to authenticated
using (user_id = (select auth.uid()) and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

drop policy if exists ai_chat_messages_insert on public.ai_chat_messages;
create policy ai_chat_messages_insert on public.ai_chat_messages
for insert to authenticated
with check (user_id = (select auth.uid()) and tenant_id = (select p.tenant_id from public.profiles p where p.user_id = (select auth.uid()) limit 1));

revoke all on public.ai_analysis_runs from anon;
revoke all on public.ai_insights from anon;
revoke all on public.ai_feedback from anon;
revoke all on public.ai_chat_sessions from anon;
revoke all on public.ai_chat_messages from anon;
grant select, insert on public.ai_analysis_runs to authenticated;
grant select, insert, update on public.ai_insights to authenticated;
grant select, insert on public.ai_feedback to authenticated;
grant select, insert, update on public.ai_chat_sessions to authenticated;
grant select, insert on public.ai_chat_messages to authenticated;
