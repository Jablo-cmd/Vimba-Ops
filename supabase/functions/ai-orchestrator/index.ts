import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

type AnalysisType = "executive"|"workforce"|"incident"|"site"|"compliance"|"attendance"|"anomaly";
type Insight = {type:"anomaly"|"trend"|"risk"|"opportunity"|"recommendation"|"summary";severity:"info"|"low"|"medium"|"high"|"critical";title:string;summary:string;rationale?:string;confidence?:number;evidence?:unknown[];recommended_actions?:unknown[]};

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...cors}});

function clampText(value:string,max:number){return value.length>max?value.slice(0,max):value;}
function isAnalysisType(value:unknown):value is AnalysisType{return ["executive","workforce","incident","site","compliance","attendance","anomaly"].includes(String(value));}

async function main(req:Request){
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);

  const supabaseUrl=Deno.env.get("SUPABASE_URL")??"";
  const anonKey=Deno.env.get("SUPABASE_ANON_KEY")??"";
  const auth=req.headers.get("Authorization");
  if(!supabaseUrl||!anonKey||!auth)return json({error:"Service configuration or authentication missing."},401);

  const supabase=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)return json({error:"Authenticated user required."},401);

  const {data:profile,error:profileError}=await supabase.from("profiles").select("id,tenant_id,full_name,role,status").eq("user_id",user.id).maybeSingle();
  if(profileError||!profile||profile.status!=="active"||!profile.tenant_id)return json({error:"Active tenant profile required."},403);

  const body=await req.json().catch(()=>({}));
  const type=isAnalysisType(body?.analysisType)?body.analysisType:"executive";

  const db=supabase;
  const [sites,employees,attendance,incidents,compliance,patrols,recentIncidents]=await Promise.all([
    db.from("sites").select("id",{count:"exact",head:true}).eq("status","active"),
    db.from("employees").select("id",{count:"exact",head:true}).eq("employment_status","active"),
    db.from("attendance").select("id",{count:"exact",head:true}).eq("status","on_duty"),
    db.from("incidents").select("id",{count:"exact",head:true}).in("status",["open","under_review","escalated"]),
    db.from("compliance_items").select("id",{count:"exact",head:true}).in("status",["expired","expiring"]),
    db.from("patrol_runs").select("id",{count:"exact",head:true}),
    db.from("incidents").select("id,title,severity,status,occurred_at").order("occurred_at",{ascending:false}).limit(20),
  ]);
  const errors=[sites,employees,attendance,incidents,compliance,patrols,recentIncidents].filter(x=>x.error);
  if(errors.length)return json({error:"Operational data is temporarily unavailable."},502);

  const context={
    analysis_type:type,
    generated_at:new Date().toISOString(),
    active_sites:sites.count??0,
    active_employees:employees.count??0,
    on_duty:attendance.count??0,
    open_incidents:incidents.count??0,
    compliance_exceptions:compliance.count??0,
    patrol_runs:patrols.count??0,
    recent_incidents:(recentIncidents.data??[]).map((x)=>({title:clampText(String(x.title??""),160),severity:x.severity,status:x.status,occurred_at:x.occurred_at})),
  };

  const {data:run,error:runError}=await db.from("ai_analysis_runs").insert({
    tenant_id:profile.tenant_id,requested_by:user.id,analysis_type:type,status:"running",
    input_scope:{analysis_type:type,data_window:"current_snapshot_plus_recent_incidents"},
  }).select("id").single();
  if(runError||!run)return json({error:"Unable to start intelligence analysis."},500);

  const apiKey=Deno.env.get("AI_API_KEY")??"";
  const baseUrl=(Deno.env.get("AI_BASE_URL")??"https://api.openai.com/v1").replace(/\/$/,"");
  const model=Deno.env.get("AI_MODEL")??"gpt-4.1-mini";

  let insights:Insight[]=[];
  let provider:string|null=null;
  let modelName:string|null=null;

  if(apiKey){
    provider=Deno.env.get("AI_PROVIDER")??"openai";
    modelName=model;
    const prompt=`You are Vimba Intelligence, an enterprise security-operations analytics engine. Analyze ONLY the supplied tenant-scoped operational snapshot. Do not invent facts, people, causes, or statistics. Produce concise actionable intelligence. Return JSON only in the shape {"insights":[{"type":"anomaly|trend|risk|opportunity|recommendation|summary","severity":"info|low|medium|high|critical","title":"...","summary":"...","rationale":"...","confidence":0.0,"evidence":[],"recommended_actions":[]}]}. Confidence must reflect evidence strength. Never recommend punitive action against a person. Focus on operational controls, staffing, compliance, site risk, incident patterns, and follow-up.

Snapshot:\n${JSON.stringify(context)}`;
    const response=await fetch(baseUrl+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization:"Bearer "+apiKey},body:JSON.stringify({model,temperature:0.1,response_format:{type:"json_object"},messages:[{role:"system",content:"You are Vimba Intelligence."},{role:"user",content:prompt}]})});
    if(response.ok){
      const payload=await response.json();
      const content=payload?.choices?.[0]?.message?.content;
      try{const parsed=JSON.parse(content);if(Array.isArray(parsed?.insights))insights=parsed.insights.slice(0,12)}catch{/* deterministic fallback below */}
    }
  }

  if(!insights.length){
    provider="rules";
    modelName="vimba-rules-v1";
    const generated:Insight[]=[];
    if((context.open_incidents??0)>0)generated.push({type:"risk",severity:context.open_incidents>=10?"high":"medium",title:"Open incidents require operational review",summary:`${context.open_incidents} incident(s) are currently open, under review, or escalated.`,rationale:"Current incident status data indicates unresolved operational workload.",confidence:0.99,evidence:[{metric:"open_incidents",value:context.open_incidents}],recommended_actions:["Review open incidents by site and severity.","Confirm ownership and next-action dates."]});
    if((context.compliance_exceptions??0)>0)generated.push({type:"risk",severity:context.compliance_exceptions>=10?"high":"medium",title:"Compliance exceptions detected",summary:`${context.compliance_exceptions} compliance item(s) are expired or expiring.`,rationale:"Compliance status data contains records requiring attention.",confidence:0.99,evidence:[{metric:"compliance_exceptions",value:context.compliance_exceptions}],recommended_actions:["Prioritize expired records.","Assign owners to expiring records before their due dates."]});
    if((context.active_sites??0)>0&&context.active_employees===0)generated.push({type:"anomaly",severity:"high",title:"Active sites have no active workforce records",summary:"The current snapshot shows active sites but no active employees.",rationale:"This may indicate incomplete workforce data or an operational configuration issue.",confidence:0.97,evidence:[{metric:"active_sites",value:context.active_sites},{metric:"active_employees",value:context.active_employees}],recommended_actions:["Verify workforce records and tenant onboarding completeness."]});
    if(!generated.length)generated.push({type:"summary",severity:"info",title:"No immediate high-signal exception detected",summary:"The current operational snapshot contains no rule-based exception meeting the initial intelligence thresholds.",rationale:"The baseline engine found no configured high-signal anomaly in the supplied metrics.",confidence:0.9,evidence:[],recommended_actions:["Continue monitoring operational metrics."]});
    insights=generated;
  }

  const cleaned=insights.map((x)=>({
    type:x.type,severity:x.severity,title:clampText(String(x.title??"Intelligence insight"),200),
    summary:clampText(String(x.summary??""),5000),rationale:clampText(String(x.rationale??""),5000),
    confidence:typeof x.confidence==="number"?Math.max(0,Math.min(1,x.confidence)):null,
    evidence:Array.isArray(x.evidence)?x.evidence.slice(0,20):[],
    recommended_actions:Array.isArray(x.recommended_actions)?x.recommended_actions.slice(0,10):[],
    tenant_id:profile.tenant_id,analysis_run_id:run.id,generated_by:user.id,
  }));
  const {data:saved,error:saveError}=await db.from("ai_insights").insert(cleaned).select("id,insight_type,severity,title,summary,rationale,confidence,evidence,recommended_actions,created_at");
  if(saveError){await db.from("ai_analysis_runs").update({status:"failed",error_code:"INSIGHT_SAVE_FAILED",completed_at:new Date().toISOString()}).eq("id",run.id);return json({error:"Intelligence results could not be stored."},500)}
  await db.from("ai_analysis_runs").update({status:"completed",model_provider:provider,model_name:modelName,output_summary:{insight_count:saved?.length??0},completed_at:new Date().toISOString()}).eq("id",run.id);
  return json({runId:run.id,provider,model:modelName,insights:saved??[]});
}

Deno.serve(main);