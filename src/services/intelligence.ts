import {requireSupabase} from "../lib/supabase";

export type IntelligenceType="executive"|"workforce"|"incident"|"site"|"compliance"|"attendance"|"anomaly";
export type Insight={id:string;insight_type:"anomaly"|"trend"|"risk"|"opportunity"|"recommendation"|"summary";severity:"info"|"low"|"medium"|"high"|"critical";title:string;summary:string;rationale:string|null;confidence:number|null;evidence:unknown[];recommended_actions:unknown[];created_at:string};

const ALLOWED:Record<IntelligenceType,string>={executive:"Executive overview",workforce:"Workforce intelligence",incident:"Incident intelligence",site:"Site intelligence",compliance:"Compliance intelligence",attendance:"Attendance intelligence",anomaly:"Anomaly detection"};
const INSIGHT_TYPES=new Set<Insight["insight_type"]>(["anomaly","trend","risk","opportunity","recommendation","summary"]);
const SEVERITIES=new Set<Insight["severity"]>(["info","low","medium","high","critical"]);

function isInsight(value:unknown):value is Insight{
  if(typeof value!=="object"||value===null)return false;
  const item=value as Record<string,unknown>;
  return typeof item.id==="string"&&typeof item.title==="string"&&typeof item.summary==="string"&&typeof item.created_at==="string"&&typeof item.insight_type==="string"&&INSIGHT_TYPES.has(item.insight_type as Insight["insight_type"])&&typeof item.severity==="string"&&SEVERITIES.has(item.severity as Insight["severity"]);
}
function parseRun(value:unknown):{runId:string;provider:string;model:string;insights:Insight[]}|null{
  if(typeof value!=="object"||value===null)return null;
  const item=value as Record<string,unknown>;
  if(typeof item.runId!=="string"||!Array.isArray(item.insights))return null;
  return {runId:item.runId,provider:typeof item.provider==="string"?item.provider:"rules",model:typeof item.model==="string"?item.model:"vimba-rules-v1",insights:item.insights.filter(isInsight)};
}

export async function runIntelligence(analysisType:IntelligenceType){
  const response=await requireSupabase().functions.invoke("ai-orchestrator",{body:{analysisType}});
  const error=response.error;
  if(error)throw new Error("Intelligence analysis is temporarily unavailable.");
  const parsed=parseRun(response.data as unknown);
  if(!parsed)throw new Error("The intelligence engine returned an invalid response.");
  return parsed;
}
export async function listInsights():Promise<Insight[]>{
  const response=await requireSupabase().from("ai_insights").select("id,insight_type,severity,title,summary,rationale,confidence,evidence,recommended_actions,created_at").eq("status","active").order("created_at",{ascending:false}).limit(50);
  if(response.error)throw new Error("Unable to load intelligence insights.");
  const rows:unknown=response.data;
  return Array.isArray(rows)?rows.filter(isInsight):[];
}
export function intelligenceLabel(type:IntelligenceType){return ALLOWED[type];}
