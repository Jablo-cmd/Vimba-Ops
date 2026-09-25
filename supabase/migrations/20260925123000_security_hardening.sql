create or replace function private.is_platform() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select private.current_role()) in ('platform_owner','super_administrator'),false)$$;
create or replace function private.can_access_tenant(target uuid) returns boolean language sql stable security definer set search_path='' as $$select (select private.is_platform()) or target=(select private.current_tenant_id())$$;
create or replace function private.current_employee_id() returns uuid language sql stable security definer set search_path='' as $$select p.employee_id from public.profiles p where p.user_id=(select auth.uid()) and p.status='active' limit 1$$;
grant execute on function private.is_platform() to authenticated;grant execute on function private.can_access_tenant(uuid) to authenticated;grant execute on function private.current_employee_id() to authenticated;

drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(user_id=(select auth.uid()) or ((tenant_id=(select private.current_tenant_id())) and (select private.is_internal())) or (select private.is_platform()));

do $$declare t text;begin
 for t in select table_name from information_schema.columns where table_schema='public' and column_name='tenant_id' and table_name not in ('tenants','profiles','audit_log') loop
   execute format('drop policy if exists %I_select on public.%I',t,t);
   execute format('drop policy if exists %I_insert on public.%I',t,t);
   execute format('drop policy if exists %I_update on public.%I',t,t);
   execute format('drop policy if exists %I_delete on public.%I',t,t);
   execute format('create policy %I_select on public.%I for select to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.is_internal()))',t,t);
   execute format('create policy %I_insert on public.%I for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and (select private.is_internal()))',t,t);
   execute format('create policy %I_update on public.%I for update to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.is_internal())) with check((select private.can_access_tenant(tenant_id)) and (select private.is_internal()))',t,t);
   execute format('create policy %I_delete on public.%I for delete to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.has_role(array[''platform_owner'',''super_administrator'',''administrator'']::public.app_role[])))',t,t);
 end loop;
end$$;

create or replace function private.is_internal() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select private.current_role()) in ('platform_owner','super_administrator','administrator','operations_manager','area_manager','site_supervisor','hr','finance','compliance'),false)$$;

create table if not exists public.employee_sensitive_hr(
 id uuid primary key default gen_random_uuid(),tenant_id uuid not null references public.tenants(id) on delete restrict,employee_id uuid not null references public.employees(id) on delete cascade,
 medical_fitness_summary text,disciplinary_summary text,restricted_notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(employee_id)
);
alter table public.employee_sensitive_hr enable row level security;
create index if not exists employee_sensitive_hr_tenant_idx on public.employee_sensitive_hr(tenant_id);
grant select,insert,update,delete on public.employee_sensitive_hr to authenticated;
create policy employee_sensitive_hr_select on public.employee_sensitive_hr for select to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[])));
create policy employee_sensitive_hr_insert on public.employee_sensitive_hr for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and (select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[])));
create policy employee_sensitive_hr_update on public.employee_sensitive_hr for update to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[]))) with check((select private.can_access_tenant(tenant_id)) and (select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[])));
create policy employee_sensitive_hr_delete on public.employee_sensitive_hr for delete to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.has_role(array['platform_owner','super_administrator','administrator']::public.app_role[])));

revoke insert,update,delete on public.audit_log from authenticated;

create policy guard_attendance_select on public.attendance for select to authenticated using(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_attendance_insert on public.attendance for insert to authenticated with check(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_attendance_update on public.attendance for update to authenticated using(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id())) with check(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_leave_select on public.leave_requests for select to authenticated using(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_leave_insert on public.leave_requests for insert to authenticated with check(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_incident_select on public.incidents for select to authenticated using(tenant_id=(select private.current_tenant_id()) and reported_by=(select auth.uid()));
create policy guard_incident_insert on public.incidents for insert to authenticated with check(tenant_id=(select private.current_tenant_id()) and reported_by=(select auth.uid()));
create policy guard_patrol_run_select on public.patrol_runs for select to authenticated using(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
create policy guard_patrol_run_insert on public.patrol_runs for insert to authenticated with check(tenant_id=(select private.current_tenant_id()) and employee_id=(select private.current_employee_id()));
