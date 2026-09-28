import {requireSupabase} from "../lib/supabase";

export type IntelligenceType="executive"|"workforce"|"incident"|"site"|"compliance"|"attendance"|"anomaly";
export type Insight={id:string;insight_type:"anomaly"|"trend"|"risk"|"opportunity"|"recommendation"|"summary";severity:"info"|"low"|"medium"|"high"|"critical";title:string;summary:string;rationale:string|null;confidence:number|null;evidence:unknown[];recommended_actions:unknown[];created_at:string};

const ALLOWED:Record<IntelligenceType,string>={executive:"Executive overview",workforce:"Workforce intelligence",incident:"Incident intelligence",site:"Site intelligence",compliance:"Compliance intelligence",attendance:"Attendance intelligence",anomaly:"Anomaly detection"};

export async function runIntelligence(analysisType:IntelligenceType){
  const db=requireSupabase();
  const{data,error}=await db.functions.invoke("ai-orchestrator",{body:{analysisType}});
  if(error)throw new Error("Intelligence analysis is temporarily unavailable.");
  if(!data||!Array.isArray(data.insights))throw new Error("The intelligence engine returned an invalid response.");
  return {runId:String(data.runId??""),provider:String(data.provider??"rules"),model:String(data.model??"vimba-rules-v1"),insights:data.insights as Insight[]};
}
export async function listInsights():Promise<Insight[]>{
  const{data,error}=await requireSupabase().from("ai_insights").select("id,insight_type,severity,title,summary,rationale,confidence,evidence,recommended_actions,created_at").eq("status","active").order("created_at",{ascending:false}).limit(50);
  if(error)throw new Error("Unable to load intelligence insights.");
  return (data??[]) as unknown as Insight[];
}
export function intelligenceLabel(type:IntelligenceType){return ALLOWED[type];}
