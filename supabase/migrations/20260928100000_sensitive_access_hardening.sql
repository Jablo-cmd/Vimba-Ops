-- Defense-in-depth authorization and concurrency hardening.
-- Replaces broad tenant policies for sensitive workforce/incident records so guards
-- cannot inherit management-wide access through permissive policy OR semantics.

create unique index if not exists attendance_employee_date_unique
  on public.attendance(employee_id,attendance_date);

do $$
declare
  t text;
begin
  foreach t in array array['attendance','leave_requests','incidents','patrol_runs'] loop
    execute format('drop policy if exists %I_select on public.%I',t,t);
    execute format('drop policy if exists %I_insert on public.%I',t,t);
    execute format('drop policy if exists %I_update on public.%I',t,t);
    execute format('drop policy if exists %I_delete on public.%I',t,t);
  end loop;
end $$;

create policy attendance_management_select on public.attendance
  for select to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy attendance_management_insert on public.attendance
  for insert to authenticated
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy attendance_management_update on public.attendance
  for update to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  )
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy attendance_management_delete on public.attendance
  for delete to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator'
    ]::public.app_role[]))
  );

create policy leave_management_select on public.leave_requests
  for select to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr'
    ]::public.app_role[]))
  );

create policy leave_management_insert on public.leave_requests
  for insert to authenticated
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr'
    ]::public.app_role[]))
  );

create policy leave_management_update on public.leave_requests
  for update to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr'
    ]::public.app_role[]))
  )
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr'
    ]::public.app_role[]))
  );

create policy leave_management_delete on public.leave_requests
  for delete to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator'
    ]::public.app_role[]))
  );

create policy incidents_management_select on public.incidents
  for select to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy incidents_management_insert on public.incidents
  for insert to authenticated
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy incidents_management_update on public.incidents
  for update to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  )
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy incidents_management_delete on public.incidents
  for delete to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator'
    ]::public.app_role[]))
  );

create policy patrol_runs_management_select on public.patrol_runs
  for select to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy patrol_runs_management_insert on public.patrol_runs
  for insert to authenticated
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy patrol_runs_management_update on public.patrol_runs
  for update to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  )
  with check (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator',
      'operations_manager','area_manager','site_supervisor','hr','finance','compliance'
    ]::public.app_role[]))
  );

create policy patrol_runs_management_delete on public.patrol_runs
  for delete to authenticated
  using (
    (select private.can_access_tenant(tenant_id))
    and (select private.has_role(array[
      'platform_owner','super_administrator','administrator'
    ]::public.app_role[]))
  );

create or replace function public.set_incident_actor()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  new.reported_by := (select auth.uid());
  new.occurred_at := coalesce(new.occurred_at, now());
  return new;
end
$$;

revoke execute on function public.set_incident_actor() from public, anon;
grant execute on function public.set_incident_actor() to authenticated;

drop trigger if exists incidents_set_actor on public.incidents;
create trigger incidents_set_actor
before insert on public.incidents
for each row execute function public.set_incident_actor();

-- Ensure guard self-service policies remain explicit after the broad tenant policies
-- are removed above.
drop policy if exists guard_attendance_select on public.attendance;
drop policy if exists guard_attendance_insert on public.attendance;
drop policy if exists guard_attendance_update on public.attendance;
drop policy if exists guard_leave_select on public.leave_requests;
drop policy if exists guard_leave_insert on public.leave_requests;
drop policy if exists guard_incident_select on public.incidents;
drop policy if exists guard_incident_insert on public.incidents;
drop policy if exists guard_patrol_run_select on public.patrol_runs;
drop policy if exists guard_patrol_run_insert on public.patrol_runs;

create policy guard_attendance_select on public.attendance
  for select to authenticated
  using (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_attendance_insert on public.attendance
  for insert to authenticated
  with check (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_attendance_update on public.attendance
  for update to authenticated
  using (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  )
  with check (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_leave_select on public.leave_requests
  for select to authenticated
  using (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_leave_insert on public.leave_requests
  for insert to authenticated
  with check (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_incident_select on public.incidents
  for select to authenticated
  using (
    tenant_id=(select private.current_tenant_id())
    and reported_by=(select auth.uid())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_incident_insert on public.incidents
  for insert to authenticated
  with check (
    tenant_id=(select private.current_tenant_id())
    and reported_by=(select auth.uid())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_patrol_run_select on public.patrol_runs
  for select to authenticated
  using (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );

create policy guard_patrol_run_insert on public.patrol_runs
  for insert to authenticated
  with check (
    tenant_id=(select private.current_tenant_id())
    and employee_id=(select private.current_employee_id())
    and (select private.has_role(array['guard']::public.app_role[]))
  );
