-- Security and performance hardening for the Vimba Ops tenant model.
alter table public.audit_log enable row level security;

create index if not exists ai_analysis_runs_requested_by_idx on public.ai_analysis_runs(requested_by);
create index if not exists ai_insights_analysis_run_idx on public.ai_insights(analysis_run_id);
create index if not exists ai_insights_generated_by_idx on public.ai_insights(generated_by);
create index if not exists audit_log_actor_user_idx on public.audit_log(actor_user_id);
create index if not exists incidents_reported_by_idx on public.incidents(reported_by);
create index if not exists leave_requests_employee_idx on public.leave_requests(employee_id);
create index if not exists leave_requests_leave_type_idx on public.leave_requests(leave_type_id);
create index if not exists notifications_tenant_idx on public.notifications(tenant_id);
create index if not exists patrol_routes_site_idx on public.patrol_routes(site_id);
create index if not exists patrol_runs_route_idx on public.patrol_runs(route_id);
create index if not exists posts_site_idx on public.posts(site_id);
create index if not exists profiles_client_idx on public.profiles(client_id);
create index if not exists profiles_employee_idx on public.profiles(employee_id);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists saved_reports_tenant_idx on public.saved_reports(tenant_id);
create index if not exists shift_assignments_tenant_idx on public.shift_assignments(tenant_id);
create index if not exists shifts_post_idx on public.shifts(post_id);
create index if not exists shifts_site_idx on public.shifts(site_id);

drop policy if exists tenants_manage on public.tenants;
create policy tenants_insert on public.tenants for insert to authenticated with check((select private.has_role(array['platform_owner','super_administrator']::public.app_role[])));
create policy tenants_update on public.tenants for update to authenticated using((select private.has_role(array['platform_owner','super_administrator']::public.app_role[]))) with check((select private.has_role(array['platform_owner','super_administrator']::public.app_role[])));
create policy tenants_delete on public.tenants for delete to authenticated using((select private.has_role(array['platform_owner','super_administrator']::public.app_role[])));

drop policy if exists profiles_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using(user_id=(select auth.uid()) or ((select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[])) and (select private.can_access_tenant(tenant_id))))
with check(user_id=(select auth.uid()) or ((select private.has_role(array['platform_owner','super_administrator','administrator','hr']::public.app_role[])) and (select private.can_access_tenant(tenant_id))));

drop policy if exists clients_client_select on public.clients;
drop policy if exists sites_client_select on public.sites;
drop policy if exists incidents_client_select on public.incidents;
drop policy if exists patrol_routes_client_select on public.patrol_routes;
drop policy if exists patrol_runs_client_select on public.patrol_runs;
drop policy if exists attendance_client_select on public.attendance;
drop policy if exists notifications_self_select on public.notifications;
drop policy if exists notifications_self_update on public.notifications;

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or id=(select private.current_client_id())));
drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or client_id=(select private.current_client_id())));
drop policy if exists incidents_select on public.incidents;
create policy incidents_select on public.incidents for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or exists(select 1 from public.sites s where s.id=incidents.site_id and s.client_id=(select private.current_client_id()))));
drop policy if exists patrol_routes_select on public.patrol_routes;
create policy patrol_routes_select on public.patrol_routes for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or exists(select 1 from public.sites s where s.id=patrol_routes.site_id and s.client_id=(select private.current_client_id()))));
drop policy if exists patrol_runs_select on public.patrol_runs;
create policy patrol_runs_select on public.patrol_runs for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or exists(select 1 from public.patrol_routes r join public.sites s on s.id=r.site_id where r.id=patrol_runs.route_id and s.client_id=(select private.current_client_id()))));
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated using((select private.can_access_tenant(tenant_id)) and ((select private.is_internal()) or exists(select 1 from public.employees e join public.sites s on s.id=e.site_id where e.id=attendance.employee_id and s.client_id=(select private.current_client_id()))));
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using((select private.can_access_tenant(tenant_id)) and recipient_user_id=(select auth.uid()));
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using(recipient_user_id=(select auth.uid()) and tenant_id=(select private.current_tenant_id())) with check(recipient_user_id=(select auth.uid()) and tenant_id=(select private.current_tenant_id()));