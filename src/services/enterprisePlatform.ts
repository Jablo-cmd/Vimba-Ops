import {dashboardMetrics,listRows} from "./api";
import type {DashboardMetrics} from "../types";

export type PlatformModule =
  | "digital-twin"|"workforce-intelligence"|"intelligent-rostering"|"case-management"
  | "sop-workflows"|"financial-intelligence"|"audit-security"|"automated-reporting"
  | "integrations"|"api-platform"|"marketplace"|"benchmarking";

export type PlatformSnapshot = {
  metrics: DashboardMetrics;
  sites: Record<string,unknown>[];
  employees: Record<string,unknown>[];
  attendance: Record<string,unknown>[];
  incidents: Record<string,unknown>[];
  compliance: Record<string,unknown>[];
  shifts: Record<string,unknown>[];
  patrols: Record<string,unknown>[];
};

export const PLATFORM_MODULES: Record<PlatformModule,{label:string;description:string}> = {
  "digital-twin": {label:"Operational Digital Twin",description:"A live operational model linking workforce, sites, incidents, compliance, patrols and service pressure."},
  "workforce-intelligence": {label:"Workforce Intelligence",description:"Workforce utilisation, attendance exceptions, deployment coverage and compliance signals."},
  "intelligent-rostering": {label:"Intelligent Rostering",description:"Constraint-aware roster analysis and staffing-gap detection before manager approval."},
  "case-management": {label:"Evidence & Case Management",description:"Structured incident-to-case lifecycle with evidence, actions, approvals and auditability."},
  "sop-workflows": {label:"Digital SOP Engine",description:"Executable operational procedures with controlled steps, approvals and escalation paths."},
  "financial-intelligence": {label:"Financial & Margin Intelligence",description:"Operational cost and contract-margin architecture linking labour, sites, service delivery and contracts."},
  "audit-security": {label:"Enterprise Security & Audit",description:"Security posture, privileged actions, access boundaries and immutable operational audit design."},
  "automated-reporting": {label:"Automated Reporting",description:"Scheduled operational, compliance, SLA and executive reporting with evidence-linked outputs."},
  "integrations": {label:"Integration Platform",description:"Provider-neutral connectors, inbound events and outbound webhooks around a stable domain contract."},
  "api-platform": {label:"Vimba API Platform",description:"Versioned API resources, scopes, idempotency and service-account architecture."},
  "marketplace": {label:"Vimba Marketplace",description:"A governed extension model for integrations, reports, workflows and domain add-ons."},
  "benchmarking": {label:"Benchmarking & Trends",description:"Historical baseline and tenant-scoped performance comparisons without exposing cross-tenant data."},
};

export async function platformSnapshot(): Promise<PlatformSnapshot> {
  const [metrics,sites,employees,attendance,incidents,compliance,shifts,patrols] = await Promise.all([
    dashboardMetrics(), listRows("sites"), listRows("employees"), listRows("attendance"),
    listRows("incidents"), listRows("compliance_items"), listRows("shifts"), listRows("patrol_routes"),
  ]);
  return {metrics,sites,employees,attendance,incidents,compliance,shifts,patrols};
}

const active = (v: unknown) => v === "active" || v === "on_duty";
const openIncident = (v: unknown) => ["open","under_review","escalated"].includes(String(v));
const exception = (v: unknown) => ["expired","expiring","late","absent"].includes(String(v));

export function derivePlatformSignals(snapshot: PlatformSnapshot) {
  const activeEmployees = snapshot.employees.filter(x=>x.employment_status==="active").length;
  const staffedSites = new Set(snapshot.employees.filter(x=>x.employment_status==="active" && x.site_id).map(x=>String(x.site_id))).size;
  const openIncidents = snapshot.incidents.filter(x=>openIncident(x.status)).length;
  const exceptions = snapshot.compliance.filter(x=>exception(x.status)).length;
  const attendanceExceptions = snapshot.attendance.filter(x=>exception(x.status)).length;
  const activeShifts = snapshot.shifts.filter(x=>active(x.status)).length;
  const uncoveredShifts = snapshot.shifts.filter(x=>Number(x.required_staff??0)>0 && !active(x.status)).length;
  return {
    activeEmployees, staffedSites, unstaffedSites: Math.max(0,snapshot.sites.length-staffedSites),
    openIncidents, complianceExceptions: exceptions, attendanceExceptions,
    activeShifts, uncoveredShifts, patrolRoutes: snapshot.patrols.length,
    operationalPressure: Math.min(100,openIncidents*12+exceptions*10+attendanceExceptions*5+uncoveredShifts*8),
  };
}

export function moduleReadiness(module: PlatformModule, snapshot: PlatformSnapshot) {
  const s=derivePlatformSignals(snapshot);
  const liveModules = new Set<PlatformModule>([
    "digital-twin","workforce-intelligence","intelligent-rostering","audit-security","benchmarking",
  ]);
  const partial = new Set<PlatformModule>([
    "case-management","sop-workflows","automated-reporting","financial-intelligence",
    "integrations","api-platform","marketplace",
  ]);
  return {
    level: liveModules.has(module) ? "live-code" : partial.has(module) ? "contract-ready" : "planned",
    signalCount: Object.values(s).filter(v=>typeof v==="number").length,
    dataPoints: snapshot.sites.length+snapshot.employees.length+snapshot.attendance.length+snapshot.incidents.length,
  } as const;
}
