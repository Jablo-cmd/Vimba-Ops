import {requireSupabase} from "../lib/supabase";
import {todayISO} from "../lib/date";
import type {DashboardMetrics,Profile} from "../types";
import {isRole} from "../lib/roles";

const READ_COLUMNS = {
  clients:"id,name,status,account_number,created_at",
  sites:"id,name,status,city,operating_hours,created_at",
  employees:"id,employee_number,full_name,rank,employment_status,created_at",
  assets:"id,asset_number,name,category,status,created_at",
  compliance_items:"id,subject_name,document_type,status,expiry_date,created_at",
  saved_reports:"id,name,report_type,created_at",
  attendance:"id,employee_id,attendance_date,clock_in,clock_out,status,exception_reason,created_at",
  incidents:"id,title,severity,status,occurred_at,created_at",
  patrol_routes:"id,name,site_id,status,created_at",
  shifts:"id,site_id,post_id,starts_at,ends_at,status,required_staff,created_at",
  leave_requests:"id,employee_id,leave_type_id,start_date,end_date,status,created_at",
} as const;
type ReadTable = keyof typeof READ_COLUMNS;

const ORDER_COLUMNS:Record<ReadTable,string>={
  clients:"created_at",
  sites:"created_at",
  employees:"created_at",
  assets:"created_at",
  compliance_items:"created_at",
  saved_reports:"created_at",
  attendance:"attendance_date",
  incidents:"occurred_at",
  patrol_routes:"created_at",
  shifts:"starts_at",
  leave_requests:"start_date",
};

async function currentUser(){
  const{data,error}=await requireSupabase().auth.getUser();
  if(error||!data.user)throw new Error("Authenticated user required.");
  return data.user;
}

export async function getMyProfile():Promise<Profile|null>{
  const user=await currentUser();
  const{data,error}=await requireSupabase().from("profiles").select("id,user_id,tenant_id,client_id,full_name,role,status,employee_id").eq("user_id",user.id).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  if(typeof data.id!=="string"||typeof data.user_id!=="string"||data.user_id!==user.id||typeof data.full_name!=="string"||!isRole(data.role)||!["active","inactive","pending","suspended","archived"].includes(data.status)||!(data.tenant_id===null||typeof data.tenant_id==="string")||!(data.client_id===null||typeof data.client_id==="string")||!(data.employee_id===null||typeof data.employee_id==="string"))throw new Error("Invalid account profile.");
  return data as Profile;
}

export async function getCurrentUserId(){return (await currentUser()).id;}

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
    db.from("attendance").select("id",{count:"exact",head:true}).eq("status","on_duty").eq("attendance_date",todayISO()),
    db.from("incidents").select("id",{count:"exact",head:true}).in("status",["open","under_review","escalated"]),
    db.from("notifications").select("id",{count:"exact",head:true}).is("read_at",null),
    db.from("compliance_items").select("id",{count:"exact",head:true}).in("status",["expired","expiring"]),
  ]);
  const e=[sites,guards,onDuty,incidents,alerts,compliance].find(x=>x.error)?.error;
  if(e)throw e;
  return{sites:sites.count??0,guards:guards.count??0,onDuty:onDuty.count??0,openIncidents:incidents.count??0,unresolvedAlerts:alerts.count??0,complianceExceptions:compliance.count??0};
}

export async function listRows(table:ReadTable):Promise<Record<string,unknown>[]> {
  const columns=READ_COLUMNS[table];
  const{data,error}=await requireSupabase().from(table).select(columns as string).order(ORDER_COLUMNS[table],{ascending:false}).limit(100);
  if(error)throw error;
  return (data??[]) as Record<string,unknown>[];
}

const MAX_TITLE_LENGTH=200;
const MAX_DESCRIPTION_LENGTH=5000;
const MAX_LEAVE_TYPE_ID_LENGTH=100;

function boundedText(value:string,max:number,label:string){const trimmed=value.trim();if(!trimmed)throw new Error(label+" is required.");if(trimmed.length>max)throw new Error(label+" is too long.");return trimmed;}

function isISODate(value:string){if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return false;const date=new Date(value+"T00:00:00Z");return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;}

export async function clockIn(){
  const employee_id=await getCurrentEmployeeId();
  const{data:existing,error:existingError}=await requireSupabase().from("attendance").select("id").eq("employee_id",employee_id).eq("attendance_date",todayISO()).limit(1);
  if(existingError)throw existingError;
  if(existing?.length)throw new Error("Attendance already recorded for today.");
  const{data,error}=await requireSupabase().from("attendance").insert({
    employee_id,
    attendance_date:todayISO(),
    clock_in:new Date().toISOString(),
    status:"on_duty",
  }).select("id,employee_id,attendance_date,clock_in,status").single();
  if(error)throw error;
  return data;
}

export async function createIncident(input:{title:string;description:string;severity:"low"|"medium"|"high"|"critical"}){
  const title=boundedText(input.title,MAX_TITLE_LENGTH,"Incident title");
  const description=boundedText(input.description,MAX_DESCRIPTION_LENGTH,"Incident description");
  if(!["low","medium","high","critical"].includes(input.severity))throw new Error("Invalid incident severity.");
  const reported_by=await getCurrentUserId();
  const{data,error}=await requireSupabase().from("incidents").insert({
    reported_by,
    title,
    description,
    severity:input.severity,
    occurred_at:new Date().toISOString(),
    status:"open",
  }).select("id,title,description,severity,status,occurred_at").single();
  if(error)throw error;
  return data;
}

export async function submitLeaveRequest(input:{leaveTypeId:string;startDate:string;endDate:string}){
  const employee_id=await getCurrentEmployeeId();
  const leave_type_id=boundedText(input.leaveTypeId,MAX_LEAVE_TYPE_ID_LENGTH,"Leave type ID");
  if(!isISODate(input.startDate)||!isISODate(input.endDate)||input.startDate>input.endDate)throw new Error("Invalid leave date range.");
  const{data,error}=await requireSupabase().from("leave_requests").insert({
    employee_id,
    leave_type_id,
    start_date:input.startDate,
    end_date:input.endDate,
    status:"pending",
  }).select("id,employee_id,leave_type_id,start_date,end_date,status").single();
  if(error)throw error;
  return data;
}

export async function signOut(){
  const{error}=await requireSupabase().auth.signOut();
  if(error)throw error;
}
