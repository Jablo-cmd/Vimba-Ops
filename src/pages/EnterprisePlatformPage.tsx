import {useCallback,useEffect,useState} from "react";
import {Activity ,AlertTriangle,BarChart3,BriefcaseBusiness,CheckCircle2,ClipboardCheck,CloudCog,Database,FileText,GitBranch,LockKeyhole,Network,RefreshCw,ShieldCheck,Users,Workflow} from "lucide-react";
import {Card,Button,Spinner} from "../components/ui";
import ErrorState from "../components/ErrorState";
import {derivePlatformSignals,moduleReadiness,platformSnapshot,PLATFORM_MODULES,type PlatformModule,type PlatformSnapshot} from "../services/enterprisePlatform";

const ICONS:Record<PlatformModule,typeof Activity>={
  "digital-twin":Network,"workforce-intelligence":Users,"intelligent-rostering":Workflow,
  "case-management":BriefcaseBusiness,"sop-workflows":GitBranch,"financial-intelligence":BarChart3,
  "audit-security":LockKeyhole,"automated-reporting":FileText,"integrations":CloudCog,
  "api-platform":Database,"marketplace":CloudCog,"benchmarking":Activity,
};

function ModuleView({module,snapshot}:{module:PlatformModule;snapshot:PlatformSnapshot}) {
  const signal=derivePlatformSignals(snapshot);
  const readiness=moduleReadiness(module,snapshot);
  const Icon=ICONS[module];
  const cards = module==="digital-twin"
    ? [["Active workforce",signal.activeEmployees],["Staffed sites",signal.staffedSites],["Open incidents",signal.openIncidents],["Compliance exceptions",signal.complianceExceptions],["Patrol routes",signal.patrolRoutes],["Operational pressure",signal.operationalPressure+"%"]]
    : module==="workforce-intelligence"
    ? [["Active employees",signal.activeEmployees],["Attendance exceptions",signal.attendanceExceptions],["Staffed sites",signal.staffedSites],["Unstaffed sites",signal.unstaffedSites]]
    : module==="intelligent-rostering"
    ? [["Active shifts",signal.activeShifts],["Uncovered shifts",signal.uncoveredShifts],["Active workforce",signal.activeEmployees],["Staffed sites",signal.staffedSites]]
    : [["Operational signals",readiness.signalCount],["Current data points",readiness.dataPoints],["Open incidents",signal.openIncidents],["Compliance exceptions",signal.complianceExceptions]];
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2 text-sm font-semibold text-cyan-700"><Icon size={18}/>{PLATFORM_MODULES[module].label}</div><h2 className="mt-1 text-3xl font-bold">{PLATFORM_MODULES[module].label}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{PLATFORM_MODULES[module].description}</p></div>
      <span className={"rounded-full px-3 py-1 text-xs font-bold "+(readiness.level==="live-code"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700")}>{readiness.level}</span>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value])=><Card key={String(label)} className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></Card>)}</div>
    <Card className="p-5"><h3 className="font-bold">Enterprise control plane</h3><p className="mt-2 text-sm leading-6 text-slate-600">This surface consumes authenticated tenant-scoped operational data and keeps consequential actions behind explicit workflows. Database persistence, RLS policies, device trust and external integrations are reconciled in the dedicated runtime phase rather than being simulated in the browser.</p><div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">Tenant boundary</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">Explainable signals</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">Human approval</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold">Audit-first</span></div></Card>
  </div>;
}

export default function EnterprisePlatformPage({module}:{module:PlatformModule}) {
  const[snapshot,setSnapshot]=useState<PlatformSnapshot|null>(null); const[loading,setLoading]=useState(true); const[error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{setSnapshot(await platformSnapshot())}catch(e){setError(e instanceof Error?e.message:"Unable to load enterprise module.")}finally{setLoading(false)}},[]);
  useEffect(()=>{void load()},[load]);
  if(loading)return <div className="grid min-h-64 place-items-center"><Spinner/></div>;
  if(error)return <ErrorState message={error} onRetry={()=>void load()}/>;
  return <div className="mx-auto max-w-[1600px]"><div className="mb-4 flex justify-end"><Button onClick={()=>void load()} className="bg-white !text-slate-700 border border-slate-200"><RefreshCw size={16}/>Refresh</Button></div><ModuleView module={module} snapshot={snapshot!}/></div>;
}
