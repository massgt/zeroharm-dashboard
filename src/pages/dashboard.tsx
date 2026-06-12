import { useState, useEffect } from "react";
import {
	useListWeeks,
	useGetDashboard,
	getListWeeksQueryKey,
	getGetDashboardQueryKey,
} from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	AlertCircle,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	Users,
	Upload,
	PlaneTakeoff,
	CalendarClock,
	Clock,
} from "lucide-react";
import { Link } from "wouter";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	PieChart,
	Pie,
	Cell,
	Legend,
	ResponsiveContainer,
} from "recharts";
import type { MemberProgress } from "@/api-client";

// ── Date helpers ──────────────────────────────────────────────────────────────
function getWeekDueDate(weekStr: string, year: number): Date {
	const weekNum = parseInt(weekStr.replace("W", ""), 10);
	const jan4 = new Date(year, 0, 4);
	const dayOfWeek = jan4.getDay();
	const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
	const week1Monday = new Date(jan4);
	week1Monday.setDate(jan4.getDate() + daysToMonday);
	const targetMonday = new Date(week1Monday);
	targetMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
	const saturday = new Date(targetMonday);
	saturday.setDate(targetMonday.getDate() + 5);
	return saturday;
}

function formatDate(date: Date): string {
	return date.toLocaleDateString("id-ID", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function getDaysLabel(dueDate: Date): {
	label: string;
	urgent: boolean;
	past: boolean;
} {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);
	const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
	if (diff < 0)
		return {
			label: `Periode berakhir ${Math.abs(diff)} hari lalu`,
			urgent: false,
			past: true,
		};
	if (diff === 0)
		return { label: "Deadline hari ini!", urgent: true, past: false };
	if (diff === 1) return { label: "Deadline besok", urgent: true, past: false };
	return { label: `${diff} hari lagi`, urgent: diff <= 2, past: false };
}

// ── Progress helpers ───────────────────────────────────────────────────────────
const pctColor = (pct: number) =>
	pct >= 100
		? "text-emerald-600"
		: pct > 0
			? "text-amber-600"
			: "text-rose-600";
const barColor = (pct: number) =>
	pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-rose-500";

const PIE_COLORS = ["#10b981", "#f59e0b", "#f43f5e"];

type FilterMode = "semua" | "onsite";

// ── Progress cell ──────────────────────────────────────────────────────────────
function ProgressCell({
	actual,
	target,
	pct,
}: {
	actual: number;
	target: number;
	pct: number;
}) {
	if (target === 0)
		return (
			<td className="px-2 py-1.5 text-center text-xs text-muted-foreground">
				—
			</td>
		);
	return (
		<td className="px-2 py-1.5 text-center min-w-[72px]">
			<div className={`text-xs font-bold ${pctColor(pct)}`}>{pct}%</div>
			<div className="text-[10px] text-muted-foreground">
				{actual}/{target}
			</div>
			<div className="w-full bg-muted rounded-full h-1 mt-0.5 overflow-hidden">
				<div
					className={`h-full rounded-full ${barColor(pct)}`}
					style={{ width: `${Math.min(100, pct)}%` }}
				/>
			</div>
		</td>
	);
}

// ── OPK sub-type summary (in-cell for overview) ────────────────────────────────
function OpkSubtypeCell({ member }: { member: MemberProgress }) {
	if (member.isOnLeave)
		return (
			<td className="px-2 py-1.5 text-center text-muted-foreground/40">—</td>
		);
	if (member.isPjo)
		return (
			<td className="px-2 py-1.5 text-center text-xs text-muted-foreground">
				PJO
			</td>
		);

	const items = member.isHse
		? [
				{ label: "Keberadaan", ...member.opkKeberadaanPengawas },
				{ label: "Fungsi", ...member.opkFungsiPengawas },
			]
		: [
				{ label: "P2H", ...member.opkP2h },
				{ label: "Seatbelt", ...member.opkSeatbelt },
				{ label: "SIMPER", ...member.opkSimper },
				{ label: "Roster", ...member.opkRoster },
				{ label: "Fatigue", ...member.opkFatigue },
				{ label: "Lototo", ...member.opkLototo },
			];

	return (
		<td className="px-2 py-1.5">
			<div
				className={`grid ${member.isHse ? "grid-cols-2" : "grid-cols-3"} gap-x-3 gap-y-0.5`}
			>
				{items.map(({ label, actual, target, pct }) =>
					target === 0 ? null : (
						<div
							key={label}
							className="flex items-center justify-between gap-1 min-w-[80px]"
						>
							<span className="text-[10px] text-muted-foreground truncate">
								{label}
							</span>
							<span className={`text-[10px] font-bold ${pctColor(pct)}`}>
								{actual}/{target}
							</span>
						</div>
					),
				)}
			</div>
		</td>
	);
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
	const { data: weeks, isLoading: isLoadingWeeks } = useListWeeks({
		query: { queryKey: getListWeeksQueryKey() },
	});
	const [selectedWeek, setSelectedWeek] = useState<string>("");
	const [tableFilter, setTableFilter] = useState<FilterMode>("semua");

	useEffect(() => {
		if (weeks && weeks.length > 0 && !selectedWeek) {
			setSelectedWeek(weeks[weeks.length - 1].week);
		}
	}, [weeks, selectedWeek]);

	const selectedWeekData = weeks?.find((w) => w.week === selectedWeek);
	const { data: dashboard, isLoading: isLoadingDashboard } = useGetDashboard(
		{ week: selectedWeek },
		{
			query: {
				enabled: !!selectedWeek,
				queryKey: getGetDashboardQueryKey({ week: selectedWeek }),
			},
		},
	);

	if (isLoadingWeeks) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-[200px]" />
				<Skeleton className="h-[400px] w-full" />
			</div>
		);
	}

	if (!weeks || weeks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
				<div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center">
					<Upload className="h-10 w-10 text-muted-foreground" />
				</div>
				<div className="space-y-2 max-w-md">
					<h2 className="text-2xl font-bold tracking-tight">
						Belum Ada Data SAP
					</h2>
					<p className="text-muted-foreground">
						Upload file Excel dari BIB untuk melihat dashboard kepatuhan
						pelaporan SAP mingguan.
					</p>
				</div>
				<Link href="/upload">
					<Button size="lg" className="gap-2">
						<Upload className="h-4 w-4" />
						Upload Excel BIB
					</Button>
				</Link>
			</div>
		);
	}

	const dueDate = selectedWeekData
		? getWeekDueDate(selectedWeekData.week, selectedWeekData.year)
		: null;
	const daysInfo = dueDate ? getDaysLabel(dueDate) : null;

	const notReportedList =
		dashboard?.members.filter((m) => !m.isOnLeave && m.overallPct === 0) || [];
	const onLeaveList = dashboard?.members.filter((m) => m.isOnLeave) || [];
	const activeMembers = dashboard?.members.filter((m) => !m.isOnLeave) || [];

	const filteredTableMembers: MemberProgress[] = dashboard
		? tableFilter === "onsite"
			? dashboard.members.filter((m) => !m.isOnLeave)
			: dashboard.members
		: [];

	const barChartData = activeMembers.map((m) => ({
		name: m.name.split(" ")[0],
		fullName: m.name,
		overall: m.overallPct,
	}));

	const pieData = dashboard
		? [
				{ name: "Selesai (100%)", value: dashboard.summary.fullyCompliant },
				{
					name: "Sebagian (1–99%)",
					value: dashboard.summary.partiallyCompliant,
				},
				{ name: "Belum Lapor (0%)", value: dashboard.summary.notReported },
			].filter((d) => d.value > 0)
		: [];

	// Category summary data (all active members)
	const categorySummary =
		activeMembers.length > 0
			? (() => {
					const nonPjo = activeMembers.filter((m) => !m.isPjo);
					const hse = activeMembers.filter((m) => m.isHse);
					const pengawas = activeMembers.filter((m) => !m.isHse && !m.isPjo);

					function sum(
						arr: MemberProgress[],
						key: keyof MemberProgress,
						subKey: "actual" | "target",
					) {
						return arr.reduce((s, m) => {
							const v = m[key] as
								| { actual: number; target: number }
								| undefined;
							return s + (v?.[subKey] ?? 0);
						}, 0);
					}

					const cats = [
						{
							label: "TTA",
							actual: sum(activeMembers, "tta", "actual"),
							target: sum(activeMembers, "tta", "target"),
						},
						{
							label: "Hazard",
							actual: sum(activeMembers, "hazard", "actual"),
							target: sum(activeMembers, "hazard", "target"),
						},
						{
							label: "Inspeksi",
							actual: sum(activeMembers, "inspeksi", "actual"),
							target: sum(activeMembers, "inspeksi", "target"),
						},
						{
							label: "Observasi",
							actual: sum(activeMembers, "observasi", "actual"),
							target: sum(activeMembers, "observasi", "target"),
						},
					];

					if (hse.length > 0) {
						cats.push(
							{
								label: "OPK Keberadaan (HSE)",
								actual: sum(hse, "opkKeberadaanPengawas", "actual"),
								target: sum(hse, "opkKeberadaanPengawas", "target"),
							},
							{
								label: "OPK Fungsi (HSE)",
								actual: sum(hse, "opkFungsiPengawas", "actual"),
								target: sum(hse, "opkFungsiPengawas", "target"),
							},
						);
					}
					if (pengawas.length > 0) {
						cats.push(
							{
								label: "P2H",
								actual: sum(pengawas, "opkP2h", "actual"),
								target: sum(pengawas, "opkP2h", "target"),
							},
							{
								label: "Seatbelt",
								actual: sum(pengawas, "opkSeatbelt", "actual"),
								target: sum(pengawas, "opkSeatbelt", "target"),
							},
							{
								label: "SIMPER",
								actual: sum(pengawas, "opkSimper", "actual"),
								target: sum(pengawas, "opkSimper", "target"),
							},
							{
								label: "Roster",
								actual: sum(pengawas, "opkRoster", "actual"),
								target: sum(pengawas, "opkRoster", "target"),
							},
							{
								label: "Fatigue",
								actual: sum(pengawas, "opkFatigue", "actual"),
								target: sum(pengawas, "opkFatigue", "target"),
							},
							{
								label: "Lototo",
								actual: sum(pengawas, "opkLototo", "actual"),
								target: sum(pengawas, "opkLototo", "target"),
							},
						);
					}

					return cats
						.filter((c) => c.target > 0)
						.map((c) => ({
							...c,
							pct:
								c.target > 0
									? Math.min(100, Math.round((c.actual / c.target) * 100))
									: 100,
						}));
				})()
			: [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Dashboard Kepatuhan SAP
					</h1>
					<p className="text-muted-foreground mt-1">
						Monitoring TTA, Hazard, Inspeksi, Observasi & OPK per anggota
					</p>
				</div>
				<div className="flex flex-col items-end gap-2 shrink-0">
					<Select value={selectedWeek} onValueChange={setSelectedWeek}>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Pilih Minggu" />
						</SelectTrigger>
						<SelectContent>
							{weeks.map((w) => (
								<SelectItem key={w.week} value={w.week}>
									{w.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					{dueDate && daysInfo && (
						<div
							className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium
              ${daysInfo.past ? "border-muted text-muted-foreground" : daysInfo.urgent ? "border-rose-400 bg-rose-500/10 text-rose-600" : "border-emerald-400 bg-emerald-500/10 text-emerald-600"}`}
						>
							<CalendarClock className="h-3 w-3" />
							<span>Deadline: {formatDate(dueDate)}</span>
							<span className="opacity-60">•</span>
							<Clock className="h-3 w-3" />
							<span>{daysInfo.label}</span>
						</div>
					)}
				</div>
			</div>

			{isLoadingDashboard ? (
				<div className="space-y-4">
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className="h-28" />
						))}
					</div>
					<Skeleton className="h-[320px]" />
					<Skeleton className="h-[400px]" />
				</div>
			) : dashboard ? (
				<>
					{/* KPI Cards */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
						<Card>
							<CardContent className="p-5">
								<div className="flex items-center justify-between mb-3">
									<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
										Total Anggota
									</p>
									<Users className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="text-4xl font-bold">
									{dashboard.summary.totalMembers}
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									anggota aktif (onsite)
								</p>
							</CardContent>
						</Card>

						<Card className="border-emerald-500/40 bg-emerald-500/5">
							<CardContent className="p-5">
								<div className="flex items-center justify-between mb-3">
									<p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
										Selesai
									</p>
									<CheckCircle2 className="h-4 w-4 text-emerald-500" />
								</div>
								<div className="text-4xl font-bold text-emerald-600">
									{dashboard.summary.fullyCompliant}
								</div>
								<p className="text-xs text-emerald-600/70 mt-1">
									mencapai 100% target
								</p>
							</CardContent>
						</Card>

						<Card className="border-amber-500/40 bg-amber-500/5">
							<CardContent className="p-5">
								<div className="flex items-center justify-between mb-3">
									<p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
										Sebagian
									</p>
									<AlertTriangle className="h-4 w-4 text-amber-500" />
								</div>
								<div className="text-4xl font-bold text-amber-600">
									{dashboard.summary.partiallyCompliant}
								</div>
								<p className="text-xs text-amber-600/70 mt-1">
									laporan 1–99% target
								</p>
							</CardContent>
						</Card>

						<Card className="border-rose-500/40 bg-rose-500/5">
							<CardContent className="p-5">
								<div className="flex items-center justify-between mb-3">
									<p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
										Belum Lapor
									</p>
									<XCircle className="h-4 w-4 text-rose-500" />
								</div>
								<div className="text-4xl font-bold text-rose-600">
									{dashboard.summary.notReported}
								</div>
								<p className="text-xs text-rose-600/70 mt-1">
									tidak ada laporan sama sekali
								</p>
							</CardContent>
						</Card>

						<Card
							className={`col-span-2 md:col-span-1 ${dashboard.summary.overallPct >= 100 ? "border-emerald-500/40 bg-emerald-500/5" : dashboard.summary.overallPct > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-rose-500/40 bg-rose-500/5"}`}
						>
							<CardContent className="p-5">
								<div className="flex items-center justify-between mb-3">
									<p
										className={`text-xs font-semibold uppercase tracking-wide ${pctColor(dashboard.summary.overallPct)}`}
									>
										Kepatuhan Total
									</p>
									<AlertCircle
										className={`h-4 w-4 ${pctColor(dashboard.summary.overallPct)}`}
									/>
								</div>
								<div
									className={`text-4xl font-bold ${pctColor(dashboard.summary.overallPct)}`}
								>
									{dashboard.summary.overallPct}%
								</div>
								<p
									className={`text-xs mt-1 ${pctColor(dashboard.summary.overallPct)} opacity-70`}
								>
									rata-rata kepatuhan tim
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Belum Lapor + Cuti */}
					{(notReportedList.length > 0 || onLeaveList.length > 0) && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{notReportedList.length > 0 && (
								<Card className="border-rose-500/30 bg-rose-500/5">
									<CardHeader className="pb-3">
										<CardTitle className="text-sm font-semibold text-rose-600 flex items-center gap-2">
											<XCircle className="h-4 w-4" />
											Belum Melapor Sama Sekali
											<Badge className="ml-auto bg-rose-500 text-white text-xs">
												{notReportedList.length}
											</Badge>
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex flex-wrap gap-2">
											{notReportedList.map((m) => (
												<div
													key={m.nik}
													className="flex flex-col bg-background border border-rose-300/50 rounded-lg px-3 py-2 min-w-[140px]"
												>
													<span className="text-sm font-medium leading-tight">
														{m.name}
													</span>
													<span className="text-[11px] text-muted-foreground mt-0.5">
														{m.nik} • {m.jabatan}
													</span>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}
							{onLeaveList.length > 0 && (
								<Card className="border-amber-400/30 bg-amber-500/5">
									<CardHeader className="pb-3">
										<CardTitle className="text-sm font-semibold text-amber-600 flex items-center gap-2">
											<PlaneTakeoff className="h-4 w-4" />
											Sedang Cuti (Tidak Dihitung)
											<Badge className="ml-auto bg-amber-500 text-white text-xs">
												{onLeaveList.length}
											</Badge>
										</CardTitle>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex flex-wrap gap-2">
											{onLeaveList.map((m) => (
												<div
													key={m.nik}
													className="flex flex-col bg-background border border-amber-300/50 rounded-lg px-3 py-2 min-w-[140px]"
												>
													<span className="text-sm font-medium leading-tight">
														{m.name}
													</span>
													<span className="text-[11px] text-muted-foreground mt-0.5">
														{m.nik} • {m.jabatan}
													</span>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					)}

					{/* Charts */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<Card className="lg:col-span-2">
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-semibold">
									Tingkat Kepatuhan per Anggota
								</CardTitle>
								<p className="text-xs text-muted-foreground">
									Persentase overall tiap anggota onsite minggu ini
								</p>
							</CardHeader>
							<CardContent>
								{barChartData.length === 0 ? (
									<div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
										Tidak ada data anggota onsite
									</div>
								) : (
									<div className="h-[220px]">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={barChartData}
												layout="vertical"
												margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
											>
												<CartesianGrid
													strokeDasharray="3 3"
													horizontal={false}
													stroke="hsl(var(--border))"
												/>
												<XAxis
													type="number"
													domain={[0, 100]}
													tick={{
														fontSize: 11,
														fill: "hsl(var(--muted-foreground))",
													}}
													tickFormatter={(v) => `${v}%`}
												/>
												<YAxis
													type="category"
													dataKey="name"
													tick={{
														fontSize: 11,
														fill: "hsl(var(--muted-foreground))",
													}}
													width={60}
												/>
												<Tooltip
													formatter={(val: number, _name: string, props) => [
														`${val}%`,
														props.payload.fullName,
													]}
													contentStyle={{
														fontSize: 12,
														background: "hsl(var(--card))",
														border: "1px solid hsl(var(--border))",
														borderRadius: 6,
													}}
													labelStyle={{ display: "none" }}
												/>
												<Bar
													dataKey="overall"
													radius={[0, 4, 4, 0]}
													maxBarSize={20}
												>
													{barChartData.map((entry, i) => (
														<Cell
															key={i}
															fill={
																entry.overall >= 100
																	? "#10b981"
																	: entry.overall > 0
																		? "#f59e0b"
																		: "#f43f5e"
															}
														/>
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-semibold">
									Distribusi Status
								</CardTitle>
								<p className="text-xs text-muted-foreground">
									Proporsi kepatuhan anggota onsite
								</p>
							</CardHeader>
							<CardContent>
								{pieData.length === 0 ? (
									<div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
										Tidak ada data
									</div>
								) : (
									<div className="h-[220px]">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={pieData}
													cx="50%"
													cy="45%"
													innerRadius={55}
													outerRadius={80}
													paddingAngle={3}
													dataKey="value"
												>
													{pieData.map((_, i) => (
														<Cell
															key={i}
															fill={PIE_COLORS[i % PIE_COLORS.length]}
														/>
													))}
												</Pie>
												<Legend
													iconType="circle"
													iconSize={8}
													formatter={(v) => (
														<span
															style={{
																fontSize: 11,
																color: "hsl(var(--muted-foreground))",
															}}
														>
															{v}
														</span>
													)}
												/>
												<Tooltip
													formatter={(val: number, name: string) => [
														`${val} orang`,
														name,
													]}
													contentStyle={{
														fontSize: 12,
														background: "hsl(var(--card))",
														border: "1px solid hsl(var(--border))",
														borderRadius: 6,
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Category Summary */}
					{categorySummary.length > 0 && (
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-semibold">
									Rekapitulasi per Kategori
								</CardTitle>
								<p className="text-xs text-muted-foreground">
									Total laporan vs target semua anggota onsite
								</p>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
									{categorySummary.map(({ label, actual, target, pct }) => (
										<div key={label} className="space-y-1.5">
											<div className="flex items-center justify-between">
												<span
													className="text-xs font-medium truncate max-w-[100px]"
													title={label}
												>
													{label}
												</span>
												<span className={`text-xs font-bold ${pctColor(pct)}`}>
													{pct}%
												</span>
											</div>
											<div className="w-full bg-muted rounded-full h-2 overflow-hidden">
												<div
													className={`h-full rounded-full transition-all ${barColor(pct)}`}
													style={{ width: `${pct}%` }}
												/>
											</div>
											<p className="text-[10px] text-muted-foreground">
												{actual} / {target}
											</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Detail Table */}
					<Card className="overflow-hidden">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<CardTitle className="text-sm font-semibold">
									Detail Kepatuhan per Anggota
								</CardTitle>
								<Tabs
									value={tableFilter}
									onValueChange={(v) => setTableFilter(v as FilterMode)}
								>
									<TabsList className="h-8 text-xs">
										<TabsTrigger value="semua" className="text-xs px-3">
											Semua
											<Badge
												variant="secondary"
												className="ml-1.5 h-4 px-1 text-[10px]"
											>
												{dashboard.members.length}
											</Badge>
										</TabsTrigger>
										<TabsTrigger value="onsite" className="text-xs px-3">
											Onsite
											<Badge
												variant="secondary"
												className="ml-1.5 h-4 px-1 text-[10px]"
											>
												{activeMembers.length}
											</Badge>
										</TabsTrigger>
									</TabsList>
								</Tabs>
							</div>
						</CardHeader>
						<div className="overflow-x-auto">
							<table className="w-full text-sm border-collapse">
								<thead>
									<tr className="bg-muted/50 border-b border-border">
										<th className="px-3 py-2 text-left font-semibold text-xs text-muted-foreground w-[180px]">
											Nama & Jabatan
										</th>
										<th className="px-2 py-2 text-center font-semibold text-xs text-muted-foreground min-w-[72px]">
											TTA
										</th>
										<th className="px-2 py-2 text-center font-semibold text-xs text-muted-foreground min-w-[72px]">
											Hazard
										</th>
										<th className="px-2 py-2 text-center font-semibold text-xs text-muted-foreground min-w-[72px]">
											Inspeksi
										</th>
										<th className="px-2 py-2 text-center font-semibold text-xs text-muted-foreground min-w-[72px]">
											Observasi
										</th>
										<th className="px-2 py-2 text-left font-semibold text-xs text-muted-foreground">
											OPK Sub-type
										</th>
										<th className="px-3 py-2 text-center font-semibold text-xs text-muted-foreground w-[80px]">
											Overall
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredTableMembers.map((m) => {
										const isLeave = m.isOnLeave;
										const rowBg = isLeave
											? "opacity-50 bg-muted/20"
											: m.overallPct >= 100
												? "bg-emerald-500/5"
												: m.overallPct > 0
													? "bg-amber-500/5"
													: "bg-rose-500/5";

										return (
											<tr
												key={m.nik}
												className={`border-b border-border transition-colors ${rowBg}`}
											>
												{/* Name cell */}
												<td className="px-3 py-2">
													<div className="flex flex-col gap-0.5">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="font-medium text-sm leading-tight">
																{m.name}
															</span>
															{isLeave && (
																<Badge
																	variant="outline"
																	className="text-[9px] py-0 px-1 border-amber-400 text-amber-600 gap-0.5 h-4"
																>
																	<PlaneTakeoff className="h-2 w-2" />
																	CUTI
																</Badge>
															)}
															{m.isPjo && (
																<Badge
																	variant="outline"
																	className="text-[9px] py-0 px-1 h-4 border-primary/50 text-primary"
																>
																	PJO
																</Badge>
															)}
															{m.isHse && !m.isPjo && (
																<Badge
																	variant="outline"
																	className="text-[9px] py-0 px-1 h-4 border-blue-400 text-blue-600"
																>
																	HSE
																</Badge>
															)}
														</div>
														<span className="text-[10px] text-muted-foreground">
															{m.jabatan}
														</span>
													</div>
												</td>

												{isLeave ? (
													<>
														{[0, 1, 2, 3].map((i) => (
															<td
																key={i}
																className="px-2 py-1.5 text-center text-muted-foreground/30 text-xs"
															>
																—
															</td>
														))}
														<td className="px-2 py-1.5 text-center text-muted-foreground/30 text-xs">
															—
														</td>
														<td className="px-3 py-1.5 text-center text-muted-foreground/30 text-xs">
															—
														</td>
													</>
												) : (
													<>
														<ProgressCell {...m.tta} />
														<ProgressCell {...m.hazard} />
														<ProgressCell {...m.inspeksi} />
														<ProgressCell {...m.observasi} />
														<OpkSubtypeCell member={m} />
														<td className="px-3 py-1.5 text-center">
															<span
																className={`text-sm font-bold ${pctColor(m.overallPct)}`}
															>
																{m.overallPct}%
															</span>
														</td>
													</>
												)}
											</tr>
										);
									})}

									{filteredTableMembers.length === 0 && (
										<tr>
											<td
												colSpan={7}
												className="px-3 py-8 text-center text-muted-foreground text-sm"
											>
												Belum ada data untuk minggu ini
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</Card>
				</>
			) : (
				<div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
					Pilih minggu untuk melihat data
				</div>
			)}
		</div>
	);
}
