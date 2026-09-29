import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type AnalysisType = "executive" | "workforce" | "incident" | "site" | "compliance" | "attendance" | "anomaly";
const ANALYSIS_TYPES = new Set<AnalysisType>(["executive","workforce","incident","site","compliance","attendance","anomaly"]);
const INTERNAL_ROLES = new Set(["platform_owner","super_administrator","administrator","operations_manager","area_manager","site_supervisor","hr","finance","compliance"]);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function clamp(n: number) { return Math.max(0, Math.min(1, n)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return response({ error: "Authentication required" }, 401);

  const keysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "";
  let publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  try {
    if (!publishableKey && keysRaw) publishableKey = JSON.parse(keysRaw).default ?? "";
  } catch {
    return response({ error: "Supabase key configuration is invalid" }, 500);
  }
  if (!publishableKey) return response({ error: "Supabase function configuration is incomplete" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.slice(7));
  if (userError || !userData.user) return response({ error: "Authentication required" }, 401);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id,role,status")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.status !== "active" || !INTERNAL_ROLES.has(String(profile.role)) || !profile.tenant_id) {
    return response({ error: "An active internal tenant profile is required" }, 403);
  }

  let body: { analysisType?: AnalysisType } = {};
  try { body = await req.json(); } catch { /* use default below */ }
  const analysisType = body.analysisType ?? "executive";
  if (!ANALYSIS_TYPES.has(analysisType)) return response({ error: "Invalid analysis type" }, 400);

  const [sites, employees, attendance, incidents, compliance, shifts, patrols] = await Promise.all([
    supabase.from("sites").select("id,name,status,client_id").limit(500),
    supabase.from("employees").select("id,full_name,employment_status,site_id").limit(1000),
    supabase.from("attendance").select("id,employee_id,attendance_date,status").order("attendance_date",{ascending:false}).limit(2000),
    supabase.from("incidents").select("id,site_id,title,severity,status,occurred_at").order("occurred_at",{ascending:false}).limit(1000),
    supabase.from("compliance_items").select("id,subject_name,document_type,status,expiry_date").limit(1000),
    supabase.from("shifts").select("id,site_id,status,required_staff,starts_at,ends_at").limit(1000),
    supabase.from("patrol_runs").select("id,route_id,status,created_at").order("created_at",{ascending:false}).limit(1000),
  ]);

  const queryError = [sites, employees, attendance, incidents, compliance, shifts, patrols].find((x) => x.error)?.error;
  if (queryError) return response({ error: "Unable to collect operational data" }, 500);

  const siteRows = sites.data ?? [];
  const employeeRows = employees.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const incidentRows = incidents.data ?? [];
  const complianceRows = compliance.data ?? [];
  const shiftRows = shifts.data ?? [];
  const patrolRows = patrols.data ?? [];

  const activeEmployees = employeeRows.filter((x) => x.employment_status === "active");
  const staffedSiteIds = new Set(activeEmployees.filter((x) => x.site_id).map((x) => String(x.site_id)));
  const openIncidents = incidentRows.filter((x) => ["open","under_review","escalated"].includes(String(x.status)));
  const criticalIncidents = incidentRows.filter((x) => x.severity === "critical" && ["open","under_review","escalated"].includes(String(x.status)));
  const complianceExceptions = complianceRows.filter((x) => ["expired","expiring"].includes(String(x.status)));
  const attendanceExceptions = attendanceRows.filter((x) => ["absent","late"].includes(String(x.status)));
  const uncoveredShifts = shiftRows.filter((x) => Number(x.required_staff ?? 0) > 0 && !["active","filled","completed"].includes(String(x.status)));
  const unstaffedSites = siteRows.filter((x) => x.status === "active" && !staffedSiteIds.has(String(x.id)));

  const evidence = [
    { metric: "active_sites", value: siteRows.filter((x) => x.status === "active").length },
    { metric: "active_employees", value: activeEmployees.length },
    { metric: "open_incidents", value: openIncidents.length },
    { metric: "critical_open_incidents", value: criticalIncidents.length },
    { metric: "compliance_exceptions", value: complianceExceptions.length },
    { metric: "attendance_exceptions", value: attendanceExceptions.length },
    { metric: "unstaffed_sites", value: unstaffedSites.length },
    { metric: "uncovered_shifts", value: uncoveredShifts.length },
    { metric: "patrol_runs", value: patrolRows.length },
  ];

  const insights: Array<Record<string, unknown>> = [];
  const add = (insight_type: string, severity: string, title: string, summary: string, rationale: string, confidence: number, recommended_actions: string[], extraEvidence: unknown[] = []) => {
    insights.push({
      tenant_id: profile.tenant_id,
      insight_type, severity, title, summary, rationale,
      confidence: clamp(confidence),
      evidence: [...evidence, ...extraEvidence],
      recommended_actions,
      generated_by: userData.user.id,
      status: "active",
    });
  };

  if (analysisType === "executive" || analysisType === "anomaly") {
    const pressure = Math.min(100, openIncidents.length * 12 + complianceExceptions.length * 10 + attendanceExceptions.length * 5 + uncoveredShifts.length * 8);
    add("summary", pressure >= 60 ? "high" : pressure >= 30 ? "medium" : "info",
      "Operational posture summary",
      `Current tenant operations show ${openIncidents.length} open incidents, ${complianceExceptions.length} compliance exceptions, ${attendanceExceptions.length} attendance exceptions and ${unstaffedSites.length} unstaffed active sites.`,
      "The engine combines current operational exception counts into a bounded, explainable pressure signal.",
      0.98,
      ["Review high-severity incidents first", "Resolve expired or expiring compliance items", "Investigate staffing gaps before the next roster cycle"]);
    if (pressure >= 30) add("anomaly", pressure >= 60 ? "high" : "medium",
      "Exception pressure requires review",
      `Operational pressure is ${pressure}/100 based on current exception signals.`,
      "The pressure score is derived from incident, compliance, attendance and staffing exception counts.",
      0.96,
      ["Open the Command Centre", "Review Site Risk and Workforce Intelligence", "Assign owners to unresolved exceptions"]);
  }

  if (analysisType === "workforce" || analysisType === "executive") {
    if (unstaffedSites.length) {
      add("risk", "high", "Active sites without linked active workforce",
        `${unstaffedSites.length} active site(s) have no active employee linked in the current workforce data.`,
        "A site with no linked active workforce record may indicate a staffing or data-quality gap.",
        0.94,
        ["Validate the site roster", "Confirm workforce assignment", "Escalate genuine coverage gaps"]);
    } else {
      add("summary", "info", "Workforce coverage signal is clear",
        "Every active site currently has at least one active employee linked.",
        "No active site is missing a linked active employee in the current dataset.",
        0.95,
        ["Continue monitoring site coverage"]);
    }
  }

  if (analysisType === "incident" || analysisType === "site") {
    if (criticalIncidents.length) {
      add("risk", "critical", "Critical incidents remain open",
        `${criticalIncidents.length} critical incident(s) are still open or under review.`,
        "Critical severity combined with an unresolved status creates a high-priority operational review signal.",
        0.99,
        ["Open the incident queue", "Confirm incident ownership", "Record response and closure evidence"]);
    } else {
      add("summary", "info", "No unresolved critical incidents detected",
        "The current tenant data contains no critical incidents in an open, under-review or escalated state.",
        "Incident severity and status were evaluated from current tenant-scoped records.",
        0.97,
        ["Continue monitoring incident severity"]);
    }
  }

  if (analysisType === "compliance" || analysisType === "executive") {
    add(complianceExceptions.length ? "risk" : "summary",
      complianceExceptions.length >= 5 ? "high" : complianceExceptions.length ? "medium" : "info",
      complianceExceptions.length ? "Compliance exceptions detected" : "Compliance posture is clear",
      complianceExceptions.length ? `${complianceExceptions.length} compliance record(s) are expired or expiring.` : "No expired or expiring compliance records are present in the current tenant data.",
      "Compliance status is read directly from tenant-scoped compliance records.",
      complianceExceptions.length ? 0.98 : 0.96,
      complianceExceptions.length ? ["Review expiry dates", "Assign compliance owners", "Capture renewal evidence"] : ["Continue scheduled compliance monitoring"]);
  }

  if (analysisType === "attendance" || analysisType === "workforce") {
    add(attendanceExceptions.length ? "trend" : "summary",
      attendanceExceptions.length >= 10 ? "high" : attendanceExceptions.length ? "medium" : "info",
      attendanceExceptions.length ? "Attendance exceptions detected" : "Attendance exceptions are currently low",
      `${attendanceExceptions.length} attendance record(s) are marked late or absent in the current analysis window.`,
      "Attendance exceptions are counted from tenant-scoped attendance records.",
      attendanceExceptions.length ? 0.95 : 0.92,
      attendanceExceptions.length ? ["Review attendance exceptions", "Validate affected shifts", "Record corrective actions where appropriate"] : ["Continue monitoring attendance"]);
  }

  if (analysisType === "site" || analysisType === "anomaly") {
    const siteScores = siteRows.filter((s) => s.status === "active").map((site) => {
      const id = String(site.id);
      const score = Math.min(100,
        incidentRows.filter((i) => String(i.site_id) === id && ["open","under_review","escalated"].includes(String(i.status))).length * 10 +
        (staffedSiteIds.has(id) ? 0 : 20)
      );
      return { site_id: id, site_name: site.name, score };
    }).filter((x) => x.score >= 35).sort((a,b) => b.score-a.score).slice(0,10);
    if (siteScores.length) add("risk", siteScores[0].score >= 60 ? "high" : "medium",
      "Sites with elevated operational pressure",
      `${siteScores.length} active site(s) currently meet the explainable elevated-risk threshold.`,
      "Site scores combine unresolved incidents, compliance exceptions and workforce coverage signals.",
      0.93,
      ["Review the Site Risk board", "Validate each site's underlying evidence", "Assign an operational owner"],
      siteScores);
  }

  if (!insights.length) {
    add("summary", "info", "No additional insight generated",
      "The selected analysis scope did not identify an actionable exception in the current tenant data.",
      "All available rules completed without meeting an alert threshold.",
      0.9,
      ["Continue monitoring the operational data"]);
  }

  const { data: run, error: runError } = await supabase.from("ai_analysis_runs").insert({
    tenant_id: profile.tenant_id,
    requested_by: userData.user.id,
    analysis_type: analysisType,
    status: "running",
    input_scope: { counts: Object.fromEntries(evidence.map((x) => [x.metric, x.value])) },
    model_provider: "vimba",
    model_name: "vimba-intelligence-rules-v1",
  }).select("id").single();

  if (runError || !run) return response({ error: "Unable to create analysis run" }, 500);

  const rows = insights.map((x) => ({ ...x, analysis_run_id: run.id }));
  const { data: stored, error: insightError } = await supabase.from("ai_insights").insert(rows)
    .select("id,insight_type,severity,title,summary,rationale,confidence,evidence,recommended_actions,created_at");

  if (insightError) {
    await supabase.from("ai_analysis_runs").update({ status: "failed", error_code: "INSIGHT_WRITE_FAILED", completed_at: new Date().toISOString() }).eq("id", run.id);
    return response({ error: "Unable to store intelligence results" }, 500);
  }

  await supabase.from("ai_analysis_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    output_summary: { insight_count: stored?.length ?? 0, metrics: evidence },
  }).eq("id", run.id);

  return response({
    runId: run.id,
    provider: "vimba",
    model: "vimba-intelligence-rules-v1",
    insights: stored ?? [],
  });
});