-- Vimba Ops AI, profile authorization and analytics hardening
alter table public.ai_insights
  add column if not exists status text not null default 'active'
    check (status = any (array['active','dismissed','archived']));

create index if not exists ai_insights_tenant_status_created_idx
  on public.ai_insights (tenant_id, status, created_at desc);

create index if not exists ai_analysis_runs_tenant_status_created_idx
  on public.ai_analysis_runs (tenant_id, status, created_at desc);

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.user_id
     and not (select private.has_role(array[
       'platform_owner','super_administrator','administrator','hr'
     ]::public.app_role[]))
  then
    if new.role is distinct from old.role
       or new.tenant_id is distinct from old.tenant_id
       or new.client_id is distinct from old.client_id
       or new.employee_id is distinct from old.employee_id
       or new.status is distinct from old.status
    then
      raise exception 'Profile authorization fields cannot be changed by the account holder';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_profile_privilege_escalation() from public;
revoke all on function public.prevent_profile_privilege_escalation() from anon;
revoke all on function public.prevent_profile_privilege_escalation() from authenticated;

drop trigger if exists profiles_privilege_guard on public.profiles;
create trigger profiles_privilege_guard
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

create or replace view public.v_operational_analytics
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  (select count(*) from public.sites s where s.tenant_id=t.id and s.status='active')::bigint as active_sites,
  (select count(*) from public.employees e where e.tenant_id=t.id and e.employment_status='active')::bigint as active_employees,
  (select count(*) from public.attendance a where a.tenant_id=t.id and a.attendance_date=current_date and a.status='on_duty')::bigint as on_duty_today,
  (select count(*) from public.incidents i where i.tenant_id=t.id and i.status in ('open','under_review','escalated'))::bigint as open_incidents,
  (select count(*) from public.compliance_items c where c.tenant_id=t.id and c.status in ('expired','expiring'))::bigint as compliance_exceptions,
  (select count(*) from public.attendance a where a.tenant_id=t.id and a.attendance_date=current_date and a.status in ('absent','late'))::bigint as attendance_exceptions,
  (select count(*) from public.patrol_runs p where p.tenant_id=t.id and p.status='completed' and p.created_at >= now()-interval '24 hours')::bigint as patrols_completed_24h
from public.tenants t
where t.id=(select private.current_tenant_id())
   or (select private.has_role(array['platform_owner','super_administrator']::public.app_role[]));

revoke all on public.v_operational_analytics from anon;
grant select on public.v_operational_analytics to authenticated;
