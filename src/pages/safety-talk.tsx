import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarDays, CheckCircle2, PlaneTakeoff, RefreshCw, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Period = { year: number; month: number };
type Weekly = { week: string; count: number; dates: string[]; progress: number };
type Employee = {
  nik: string; name: string; department: string; jabatan: string;
  employeeStatus: string; eligibleForTarget: boolean; target: number;
  weekly: Weekly[]; totalCount: number; totalProgress: number;
  status: "Complete" | "Partial" | "Belum" | "Cuti";
};
type Response = {
  period: Period; targetPerMonth: number; weeks: string[];
  lastUpdate: { uploadedAt: string; filename: string } | null;
  summary: { totalActive: number; eligibleEmployees: number; excludedOnLeave: number; complete: number; partial: number; belum: number; achievement: number; totalEvents: number; uniqueNiks: number };
  employees: Employee[];
};
const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const pct = (n: number) => Math.round(n);
export default function SafetyTalk() {
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const { data: periodsData, isLoading: loadingPeriods, error: periodsError } = useQuery({
    queryKey: ["safety-talk-periods"],
    queryFn: async () => { const r = await fetch(`${apiUrl}/api/safety-talk/periods`); if (!r.ok) throw new Error("Gagal mengambil periode."); return r.json(); },
  });
  const periods: Period[] = periodsData?.periods ?? [];
  useEffect(() => { if (periods.length && !period) setPeriod(`${periods[0].year}-${periods[0].month}`); }, [periods, period]);
  const [year, month] = period ? period.split("-").map(Number) : [0,0];
  const { data, isLoading, error, refetch, isFetching } = useQuery<Response>({
    queryKey: ["safety-talk-dashboard", year, month],
    queryFn: async () => { const r = await fetch(`${apiUrl}/api/safety-talk/dashboard?year=${year}&month=${month}`); if (!r.ok) throw new Error("Gagal mengambil dashboard."); return r.json(); },
    enabled: !!year && !!month,
  });
  const departments = useMemo(() => [...new Set((data?.employees ?? []).map(e => e.department).filter(Boolean))].sort(), [data]);
  const employees = (data?.employees ?? []).filter(e =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.nik.toLowerCase().includes(search.toLowerCase())) &&
    (department === "all" || e.department === department)
  );
  if (loadingPeriods) return <div className="space-y-4"><Skeleton className="h-10 w-72"/><Skeleton className="h-96 w-full"/></div>;
  if (periodsError) return <div className="rounded-xl border p-6 text-sm text-destructive">Gagal mengambil periode Safety Talk.</div>;
  if (!periods.length) return <div className="flex min-h-[45vh] flex-col items-center justify-center text-center"><Activity className="mb-3 h-10 w-10 text-muted-foreground"/><h2 className="text-xl font-semibold">Belum Ada Data Safety Talk</h2><p className="mt-2 text-sm text-muted-foreground">Upload data mingguan yang memiliki event Safety Talk pada sheet Attendance.</p></div>;
  const s = data?.summary;
  return <main className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Monitoring Safety Talk</h1><p className="mt-1 text-sm text-muted-foreground">Monitoring pencapaian keikutsertaan Safety Talk seluruh karyawan PT Minergo Visi Maxima.</p></div>
      <div className="flex gap-2"><Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Pilih periode"/></SelectTrigger><SelectContent>{periods.map(p=><SelectItem key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>{MONTHS[p.month-1]} {p.year}</SelectItem>)}</SelectContent></Select><button onClick={()=>refetch()} disabled={isFetching} className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-muted"><RefreshCw className={`h-4 w-4 ${isFetching?"animate-spin":""}`}/></button></div>
    </div>
    {isLoading ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-28"/>)}</div><Skeleton className="h-96 w-full"/></div> : error ? <div className="rounded-xl border p-6 text-sm text-destructive">Gagal mengambil dashboard Safety Talk. Periksa koneksi backend.</div> : data && s && <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><Users className="h-4 w-4 text-muted-foreground"/><p className="mt-2 text-xs text-muted-foreground">Karyawan Aktif</p><p className="text-2xl font-bold">{s.totalActive}</p></CardContent></Card>
        <Card><CardContent className="p-4"><CheckCircle2 className="h-4 w-4 text-emerald-600"/><p className="mt-2 text-xs text-muted-foreground">Memenuhi Target</p><p className="text-2xl font-bold">{s.complete} / {s.eligibleEmployees}</p><p className="text-xs text-muted-foreground">{s.achievement}% dari karyawan onsite</p></CardContent></Card>
        <Card><CardContent className="p-4"><Activity className="h-4 w-4 text-primary"/><p className="mt-2 text-xs text-muted-foreground">Total Keikutsertaan</p><p className="text-2xl font-bold">{s.totalEvents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><PlaneTakeoff className="h-4 w-4 text-amber-600"/><p className="mt-2 text-xs text-muted-foreground">Sedang Cuti</p><p className="text-2xl font-bold">{s.excludedOnLeave}</p></CardContent></Card>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs"><CalendarDays className="h-4 w-4"/><span>Periode: {MONTHS[month-1]} {year}</span><span>• Target: 4 kali/karyawan/bulan</span>{data.lastUpdate && <span>• Update: {new Date(data.lastUpdate.uploadedAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB</span>}</div>
      <Card className="overflow-hidden"><CardContent className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau NIK..." className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"/></div><Select value={department} onValueChange={setDepartment}><SelectTrigger><SelectValue placeholder="Departemen"/></SelectTrigger><SelectContent><SelectItem value="all">Semua Departemen</SelectItem>{departments.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
        <p className="text-xs text-muted-foreground">Menampilkan {employees.length} dari {data.employees.length} karyawan aktif. Capaian mingguan dihitung terhadap target bulanan 4 kali.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="border-b bg-muted/40 text-left"><th className="px-3 py-3">Karyawan</th><th className="px-3 py-3">Departemen</th><th className="px-3 py-3 text-center">Target</th>{data.weeks.map(w=><th key={w} className="px-3 py-3 text-center">{w}</th>)}<th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Status</th></tr></thead><tbody>{employees.map(e=><tr key={e.nik} className={`border-b hover:bg-muted/20 ${e.status==="Cuti"?"bg-amber-50/50 dark:bg-amber-950/10":""}`}><td className="px-3 py-3"><div className="font-medium">{e.name}</div><div className="text-[11px] text-muted-foreground">{e.nik} • {e.jabatan}</div></td><td className="px-3 py-3 text-xs">{e.department}</td><td className="px-3 py-3 text-center">{e.target}</td>{data.weeks.map(w=>{const item=e.weekly.find(x=>x.week===w);return <td key={w} className="px-3 py-3 text-center"><div className="font-semibold">{item?pct(item.progress):0}%</div><div className="text-[10px] text-muted-foreground">{item?.count??0} kali</div></td>})}<td className="px-3 py-3 text-center"><span className="font-bold">{pct(e.totalProgress)}%</span><div className="text-[10px] text-muted-foreground">{e.totalCount}/4 kali</div></td><td className="px-3 py-3 text-center"><Badge variant={e.status==="Complete"?"default":e.status==="Cuti"?"secondary":"outline"}>{e.status==="Complete"?"Lengkap":e.status==="Cuti"?"Cuti":e.status==="Partial"?"Sebagian":"Belum"}</Badge></td></tr>)}</tbody></table>{employees.length===0&&<div className="p-8 text-center text-sm text-muted-foreground">Karyawan tidak ditemukan.</div>}</div>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">Sumber: Attendance. Jenis kegiatan yang dihitung: SAFETY TALK dan Safety Talk, Sosialisasi IBPR, dan Sosialisasi Golden Rules. Karyawan cuti tetap ditampilkan dan dikecualikan dari perhitungan capaian tim.</p>
    </>}
  </main>;
}
