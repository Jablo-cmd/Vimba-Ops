import {requireSupabase} from "../lib/supabase";

export type OperationalAnalytics={
  tenant_id:string;
  tenant_name:string;
  active_sites:number;
  active_employees:number;
  on_duty_today:number;
  open_incidents:number;
  compliance_exceptions:number;
  attendance_exceptions:number;
  patrols_completed_24h:number;
};

function isAnalytics(value:unknown):value is OperationalAnalytics{
  if(typeof value!=="object"||value===null)return false;
  const x=value as Record<string,unknown>;
  return typeof x.tenant_id==="string"&&typeof x.tenant_name==="string"&&
    ["active_sites","active_employees","on_duty_today","open_incidents","compliance_exceptions","attendance_exceptions","patrols_completed_24h"].every(k=>typeof x[k]==="number");
}

export async function getOperationalAnalytics():Promise<OperationalAnalytics[]>{
  const {data,error}=await requireSupabase().from("v_operational_analytics").select("*");
  if(error)throw error;
  return Array.isArray(data)?data.filter(isAnalytics):[];
}
