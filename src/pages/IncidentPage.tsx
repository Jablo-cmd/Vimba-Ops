import {useEffect,useState} from "react";
import {Plus,RefreshCw} from "lucide-react";
import {createIncident,listRows} from "../services/api";
import {Button,Card,Input,Select,Empty} from "../components/ui";
import ErrorState from "../components/ErrorState";

type Severity="low"|"medium"|"high"|"critical";

export default function IncidentPage(){
  const[rows,setRows]=useState<Record<string,unknown>[]>([]);
  const[title,setTitle]=useState("");
  const[severity,setSeverity]=useState<Severity>("medium");
  const[description,setDescription]=useState("");
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);

  async function load(){
    setError("");
    setLoading(true);
    try{setRows(await listRows("incidents"))}
    catch{setError("Unable to load incidents.")}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(busy)return;
    setError("");
    setBusy(true);
    try{
      await createIncident({title,description,severity});
      setTitle("");
      setDescription("");
      await load();
    }catch{setError("Unable to create incident. Please try again.")}
    finally{setBusy(false)}
  }

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-cyan-700">Field operations</p><h2 className="text-3xl font-bold">Incidents / Occurrence Book</h2></div>
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <Card className="p-5"><h3 className="font-bold">New occurrence</h3><form onSubmit={e=>void submit(e)} className="mt-5 space-y-4">
        <label className="block text-xs font-semibold">Title<Input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} className="mt-2"/></label>
        <label className="block text-xs font-semibold">Severity<Select value={severity} onChange={e=>setSeverity(e.target.value as Severity)} className="mt-2"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></Select></label>
        <label className="block text-xs font-semibold">Description<textarea required maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
        {error&&<ErrorState message={error} onRetry={()=>void load()}/>}<Button type="submit" disabled={busy} className="w-full"><Plus size={16}/>{busy?"Creating…":"Create incident"}</Button>
      </form></Card>
      <Card><div className="flex items-center justify-between border-b border-slate-100 p-5"><h3 className="font-bold">Recent incidents</h3><button type="button" aria-label="Refresh incidents" disabled={loading} onClick={()=>void load()} className="grid size-9 place-items-center rounded-lg border disabled:opacity-50"><RefreshCw size={15}/></button></div>
        {loading?<div className="p-8 text-sm text-slate-500">Loading incidents…</div>:rows.length===0?<Empty title="No incidents recorded" description="The occurrence book is ready for live entries."/>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr>{["title","severity","status","occurred_at"].map(x=><th key={x} className="px-5 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{rows.map(r=><tr key={String(r.id)}><td className="px-5 py-4 font-medium">{String(r.title)}</td><td className="px-5 py-4">{String(r.severity)}</td><td className="px-5 py-4">{String(r.status)}</td><td className="px-5 py-4">{String(r.occurred_at)}</td></tr>)}</tbody></table></div>}
      </Card>
    </div>
  </div>
}