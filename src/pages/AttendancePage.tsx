import {useEffect,useState} from "react";
import {CheckCircle2,Clock3} from "lucide-react";
import {insertRow,listRows,getCurrentEmployeeId} from "../services/api";
import {Button,Card,Empty} from "../components/ui";
import ErrorState from "../components/ErrorState";
import {todayISO} from "../lib/date";

export default function AttendancePage(){
  const[rows,setRows]=useState<Record<string,unknown>[]>([]);
  const[error,setError]=useState("");
  const[loading,setLoading]=useState(true);
  const[busy,setBusy]=useState(false);

  async function load(){
    setLoading(true);setError("");
    try{setRows(await listRows("attendance"))}
    catch{setError("Unable to load attendance records.")}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);

  async function clock(){
    if(busy)return;
    setBusy(true);setError("");
    try{
      const employee_id=await getCurrentEmployeeId();
      await insertRow("attendance",{employee_id,attendance_date:todayISO(),clock_in:new Date().toISOString(),status:"on_duty"});
      await load();
    }catch{setError("Unable to clock in. Please try again.")}
    finally{setBusy(false)}
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-cyan-700">Workforce control</p><h2 className="text-3xl font-bold">Attendance</h2></div>
      <Button onClick={clock} disabled={busy}><CheckCircle2 size={16}/>{busy?"Clocking in…":"Clock in"}</Button>
    </div>
    {error&&<ErrorState message={error} onRetry={load}/>}
    <Card>{loading?<div className="grid min-h-56 place-items-center">Loading attendance…</div>:rows.length===0?<Empty title="No attendance records" description="Clock-in records will appear here. GPS/QR/NFC verification metadata is structured separately."/>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase"><tr>{["date","employee","clock in","clock out","status","exception"].map(x=><th key={x} className="px-5 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{rows.map(r=><tr key={String(r.id)}><td className="px-5 py-4">{String(r.attendance_date)}</td><td className="px-5 py-4">{String(r.employee_id)}</td><td className="px-5 py-4">{r.clock_in?new Date(String(r.clock_in)).toLocaleTimeString():"—"}</td><td className="px-5 py-4">{r.clock_out?new Date(String(r.clock_out)).toLocaleTimeString():"—"}</td><td className="px-5 py-4">{String(r.status)}</td><td className="px-5 py-4">{String(r.exception_reason??"—")}</td></tr>)}</tbody></table></div>}</Card>
    <Card className="p-5"><div className="flex gap-3"><Clock3 className="text-cyan-700"/><div><h3 className="font-bold">Verification boundary</h3><p className="mt-1 text-sm text-slate-500">Location evidence is stored separately and must be validated by a trusted provider.</p></div></div></Card>
  </div>
}