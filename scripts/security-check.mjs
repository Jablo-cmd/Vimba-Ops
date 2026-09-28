import {readFile} from "node:fs/promises";

const migration=await readFile("supabase/migrations/20260928100000_sensitive_access_hardening.sql","utf8");
const aiMigration=await readFile("supabase/migrations/20260928110000_ai_intelligence_foundation.sql","utf8");
const aiFunction=await readFile("supabase/functions/ai-orchestrator/index.ts","utf8");

const required=["attendance_management_select","attendance_management_insert","attendance_management_update","attendance_management_delete","guard_attendance_select","guard_attendance_insert","guard_attendance_update","leave_management_select","leave_management_insert","leave_management_update","leave_management_delete","guard_leave_select","guard_leave_insert","incidents_management_select","incidents_management_insert","incidents_management_update","incidents_management_delete","guard_incident_select","guard_incident_insert","patrol_runs_management_select","patrol_runs_management_insert","patrol_runs_management_update","patrol_runs_management_delete","guard_patrol_run_select","guard_patrol_run_insert","attendance_employee_date_unique","set_incident_actor","validate_sensitive_tenant_links"];
for(const token of required)if(!migration.includes(token))throw new Error("Missing security invariant: "+token);

const forbidden=["create policy attendance_select on","create policy attendance_insert on","create policy attendance_update on","create policy attendance_delete on","create policy leave_requests_select on","create policy leave_requests_insert on","create policy leave_requests_update on","create policy leave_requests_delete on","create policy incidents_select on","create policy incidents_insert on","create policy incidents_update on","create policy incidents_delete on","create policy patrol_runs_select on","create policy patrol_runs_insert on","create policy patrol_runs_update on","create policy patrol_runs_delete on"];
for(const token of forbidden)if(migration.includes(token))throw new Error("Forbidden broad policy present: "+token);

const aiRequired=["ai_analysis_runs","ai_insights","ai_feedback","ai_chat_sessions","ai_chat_messages","enable row level security","ai_insights_id_tenant_unique","ai_feedback_insight_tenant_fk","ai_feedback_run_tenant_fk","grant select on public.ai_analysis_runs to authenticated","grant select, update on public.ai_insights to authenticated"];
for(const token of aiRequired)if(!aiMigration.includes(token))throw new Error("Missing AI security invariant: "+token);
for(const token of ["SUPABASE_SERVICE_ROLE_KEY","allowedRoles","Active tenant profile required","Your role does not have access to intelligence"])if(!aiFunction.includes(token))throw new Error("Missing AI runtime guard: "+token);

console.log("Security source invariants passed.");
