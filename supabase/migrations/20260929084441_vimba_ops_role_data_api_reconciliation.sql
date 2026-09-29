-- Vimba Ops role/data API reconciliation for field and client workflows.
create or replace function private.is_guard() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select private.current_role())='guard',false)$$;
grant execute on function private.is_guard() to authenticated;

drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or client_id=(select private.current_client_id()) or exists(select 1 from public.employees e where e.id=(select private.current_employee_id()) and e.site_id=sites.id and e.tenant_id=sites.tenant_id)));

drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or id=(select private.current_employee_id())));

drop policy if exists compliance_items_select on public.compliance_items;
create policy compliance_items_select on public.compliance_items for select to authenticated using((select private.can_access_tenant(tenant_id)) and (select private.is_internal()));

drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or employee_id=(select private.current_employee_id()) or exists(select 1 from public.employees e join public.sites s on s.id=e.site_id where e.id=attendance.employee_id and s.client_id=(select private.current_client_id()))));

drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id()))));

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance for update to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id())))) with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id()))));

drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or reported_by=(select auth.uid()) or exists(select 1 from public.sites s where s.id=incidents.site_id and s.client_id=(select private.current_client_id()))));

drop policy if exists incidents_insert on public.incidents;
create policy incidents_insert on public.incidents for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and reported_by=(select auth.uid()))));

drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or employee_id=(select private.current_employee_id())));

drop policy if exists leave_requests_insert on public.leave_requests;
create policy leave_requests_insert on public.leave_requests for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id()))));

drop policy if exists patrol_routes_select on public.patrol_routes;
create policy patrol_routes_select on public.patrol_routes for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or exists(select 1 from public.sites s where s.id=patrol_routes.site_id and (s.client_id=(select private.current_client_id()) or exists(select 1 from public.employees e where e.id=(select private.current_employee_id()) and e.site_id=s.id)))));

drop policy if exists patrol_runs_select on public.patrol_runs;
create policy patrol_runs_select on public.patrol_runs for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or employee_id=(select private.current_employee_id()) or exists(select 1 from public.patrol_routes r join public.sites s on s.id=r.site_id where r.id=patrol_runs.route_id and s.client_id=(select private.current_client_id()))));

drop policy if exists patrol_runs_insert on public.patrol_runs;
create policy patrol_runs_insert on public.patrol_runs for insert to authenticated with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id()))));

drop policy if exists patrol_runs_update on public.patrol_runs;
create policy patrol_runs_update on public.patrol_runs for update to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id())))) with check((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or ((select private.is_guard()) and employee_id=(select private.current_employee_id()))));
