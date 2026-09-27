import {requireSupabase} from "../lib/supabase";
import {todayISO} from "../lib/date";
import type {DashboardMetrics,Profile} from "../types";

const READ_COLUMNS = {
  clients:"id,name,status,account_number,created_at",
  sites:"id,name,status,city,operating_hours,created_at",
  employees:"id,employee_number,full_name,rank,employment_status,created_at",
  assets:"id,asset_number,name,category,status,created_at",
  compliance_items:"id,subject_name,document_type,status,expiry_date,created_at",
  saved_reports:"id,name,report_type,created_at",
  attendance:"id,employee_id,attendance_date,clock_in,clock_out,status,exception_reason",
  incidents:"id,title,severity,status,occurred_at",
  patrol_routes:"id,name,site_id,status,created_at",
  shifts:"id,site_id,post_id,starts_at,ends_at,status,required_staff",
  leave_requests:"id,employee_id,leave_type_id,start_date,end_date,status",
} as const;
type ReadTable = keyof typeof READ_COLUMNS;
const WRITE_TABLES = ["attendance","incidents","leave_requests"] as const;
type WriteTable = (typeof WRITE_TABLES)[number];

function assertReadTable(table:string):asserts table is ReadTable{if(!(table in READ_COLUMNS))throw new Error("Unsupported data workspace.");}
function assertWriteTable(table:string):asserts table is WriteTable{if(!WRITE_TABLES.includes(table as WriteTable))throw new Error("This operation is not available for the selected workspace.");}

export async function getMyProfile():Promise<Profile|null>{
  const userId=await getCurrentUserId();
  const{data,error}=await requireSupabase().from("profiles").select("id,user_id,tenant_id,client_id,full_name,role,status,employee_id").eq("user_id",userId).maybeSingle();
  if(error)throw error;
  return data as Profile|null;
}
export async function getCurrentUserId(){
  const{data,error}=await requireSupabase().auth.getUser();
  if(error||!data.user)throw new Error("Authenticated user required.");
  return data.user.id;
}
export async function getCurrentEmployeeId(){
  const profile=await getMyProfile();
  if(!profile?.employee_id)throw new Error("Your account is not linked to an employee record.");
  return profile.employee_id;
}
export async function dashboardMetrics():Promise<DashboardMetrics>{
  const db=requireSupabase();
  const [sites,guards,onDuty,incidents,alerts,compliance]=await Promise.all([
    db.from("sites").select("id",{count:"exact",head:true}).eq("status","active"),
    db.from("employees").select("id",{count:"exact",head:true}).eq("employment_status","active"),
    db.from("attendance").select("id",{count:"exact",head:true}).eq("status","on_duty").gte("attendance_date",todayISO()),
    db.from("incidents").select("id",{count:"exact",head:true}).in("status",["open","under_review","escalated"]),
    db.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null),
    db.from("compliance_items").select("id",{count:"exact",head:true}).in("status",["expired","expiring"])
  ]);
  const e=[sites,guards,onDuty,incidents,alerts,compliance].find(x=>x.error)?.error;
  if(e)throw e;
  return{sites:sites.count??0,guards:guards.count??0,onDuty:onDuty.count??0,openIncidents:incidents.count??0,unresolvedAlerts:alerts.count??0,complianceExceptions:compliance.count??0};
}
export async function listRows(table:ReadTable){
  assertReadTable(table);
  const{data,error}=await requireSupabase().from(table).select(READ_COLUMNS[table]).order("created_at",{ascending:false}).limit(100);
  if(error)throw error;
  return data??[];
}
export async function insertRow(table:string,payload:Record<string,unknown>){
  assertWriteTable(table);
  const{data,error}=await requireSupabase().from(table).insert(payload).select().single();
  if(error)throw error;
  return data;
}
export async function signOut(){const{error}=await requireSupabase().auth.signOut();if(error)throw error;}
