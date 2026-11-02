import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	BookOpen,
	ShieldCheck,
	Users,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	PlaneTakeoff,
	Search,
	CalendarDays,
	ChevronDown,
	ChevronRight,
	RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Period = {
	year: number;
	month: number;
};

type SosialisasiEmployee = {
	nik: string;
	name: string;
	department?: string | null;
	jabatan?: string | null;
	employeeStatus: string;
	eligibleForTarget: boolean;
	ibprCount: number;
	grCount: number;
	ibprDates: string[];
	grDates: string[];
	weeks: string[];
	ibprProgress: number;
	grProgress: number;
	totalProgress: number;
	status: "Complete" | "Partial" | "Belum" | "Cuti";
};

type DashboardResponse = {
	success: boolean;
	period: Period;
	lastUpdate: {
		uploadedAt: string;
		filename: string;
		sourceType: string;
	} | null;
	summary: {
		totalActive: number;
		eligibleEmployees: number;
		excludedOnLeave: number;
		complete: number;
		partial: number;
		belum: number;
		ibprComplete: number;
		grComplete: number;
		ibprAchievement: number;
		grAchievement: number;
		overallAchievement: number;
		totalEvents: number;
		uniqueNiks: number;
		ibprEvents: number;
		grEvents: number;
	};
	employees: SosialisasiEmployee[];
};

const MONTHS = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

const formatNumber = (value: number) =>
	new Intl.NumberFormat("id-ID").format(value ?? 0);

const formatDate = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};

function getProgressColor(value: number) {
	if (value >= 100) {
		return {
			text: "text-emerald-600",
			bar: "bg-emerald-500",
			border: "border-emerald-500/30",
		};
	}

	if (value > 0) {
		return {
			text: "text-amber-600",
			bar: "bg-amber-500",
			border: "border-amber-500/30",
		};
	}

	return {
		text: "text-rose-600",
		bar: "bg-rose-500",
		border: "border-rose-500/30",
	};
}

function ProgressMetric({
	label,
	value,
	count,
}: {
	label: string;
	value: number;
	count: number;
}) {
	const color = getProgressColor(value);

	return (
		<div className="min-w-[110px] space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground">{label}</span>
				<span className={`text-xs font-bold ${color.text}`}>{value}%</span>
			</div>

			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all ${color.bar}`}
					style={{ width: `${Math.min(100, value)}%` }}
				/>
			</div>

			<p className="text-[10px] text-muted-foreground">
				{count} kali keikutsertaan
			</p>
		</div>
	);
}

function AchievementCard({
	title,
	value,
	description,
	icon: Icon,
}: {
	title: string;
	value: number;
	description: string;
	icon: typeof ShieldCheck;
}) {
	const color = getProgressColor(value);

	return (
		<Card>
			<CardContent className="p-5">
				<div className="flex items-center justify-between">
					<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						{title}
					</p>
					<Icon className={`h-5 w-5 ${color.text}`} />
				</div>

				<div className={`mt-3 text-3xl font-bold ${color.text}`}>{value}%</div>

				<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
					<div
						className={`h-full rounded-full ${color.bar}`}
						style={{ width: `${Math.min(100, value)}%` }}
					/>
				</div>

				<p className="mt-2 text-xs text-muted-foreground">{description}</p>
			</CardContent>
		</Card>
	);
}

function StatusBadge({ status }: { status: string }) {
	if (status === "Complete") {
		return (
			<Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
				Lengkap
			</Badge>
		);
	}

	if (status === "Partial") {
		return (
			<Badge className="bg-amber-500 text-white hover:bg-amber-500">
				Sebagian
			</Badge>
		);
	}

	if (status === "Cuti") {
		return (
			<Badge className="border border-rose-300 bg-rose-200 text-rose-800 hover:bg-rose-200 dark:border-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
				Cuti
			</Badge>
		);
	}

	return (
		<Badge className="bg-rose-500 text-white hover:bg-rose-500">Belum</Badge>
	);
}

function AttendanceDetail({
	title,
	dates,
}: {
	title: string;
	dates: string[];
}) {
	return (
		<div className="rounded-lg border bg-background p-3">
			<p className="mb-2 text-xs font-semibold text-foreground">{title}</p>

			{dates.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{dates.map((date, index) => (
						<span
							key={`${date}-${index}`}
							className="rounded-md bg-muted px-2.5 py-1 text-xs"
						>
							<CalendarDays className="mr-1 inline h-3 w-3" />
							{formatDate(date)}
						</span>
					))}
				</div>
			) : (
				<p className="text-xs text-muted-foreground">
					Belum ada keikutsertaan.
				</p>
			)}
		</div>
	);
}

export default function Sosialisasi() {
	const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
	const [selectedPeriod, setSelectedPeriod] = useState("");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [departmentFilter, setDepartmentFilter] = useState("all");
	const [expandedNik, setExpandedNik] = useState<string | null>(null);

	const {
		data: periodsResponse,
		isLoading: isLoadingPeriods,
		error: periodsError,
	} = useQuery({
		queryKey: ["sosialisasi-periods"],
		queryFn: async () => {
			const response = await fetch(`${apiUrl}/api/sosialisasi/periods`);
			if (!response.ok) throw new Error("Gagal mengambil daftar periode.");
			return response.json();
		},
	});

	const periods: Period[] = periodsResponse?.periods ?? [];

	useEffect(() => {
		if (periods.length > 0 && !selectedPeriod) {
			setSelectedPeriod(`${periods[0].year}-${periods[0].month}`);
		}
	}, [periods, selectedPeriod]);

	const [selectedYear, selectedMonth] = selectedPeriod
		? selectedPeriod.split("-").map(Number)
		: [0, 0];

	const {
		data: dashboard,
		isLoading: isLoadingDashboard,
		error: dashboardError,
		refetch,
		isFetching,
	} = useQuery<DashboardResponse>({
		queryKey: ["sosialisasi-dashboard", selectedYear, selectedMonth],
		queryFn: async () => {
			const response = await fetch(
				`${apiUrl}/api/sosialisasi/dashboard?year=${selectedYear}&month=${selectedMonth}`,
			);

			if (!response.ok) {
				throw new Error("Gagal mengambil data dashboard sosialisasi.");
			}

			return response.json();
		},
		enabled: !!selectedYear && !!selectedMonth,
	});

	const employees = dashboard?.employees ?? [];

	const departments = useMemo(
		() =>
			Array.from(
				new Set(
					employees
						.map((employee) => employee.department)
						.filter((department): department is string => Boolean(department)),
				),
			).sort(),
		[employees],
	);

	const filteredEmployees = useMemo(() => {
		return employees.filter((employee) => {
			const keyword = search.toLowerCase();

			const matchesSearch =
				employee.name.toLowerCase().includes(keyword) ||
				employee.nik.toLowerCase().includes(keyword);

			const matchesStatus =
				statusFilter === "all" || employee.status === statusFilter;

			const matchesDepartment =
				departmentFilter === "all" || employee.department === departmentFilter;

			return matchesSearch && matchesStatus && matchesDepartment;
		});
	}, [employees, search, statusFilter, departmentFilter]);

	if (isLoadingPeriods) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-72" />
				<div className="grid gap-4 md:grid-cols-3">
					{[1, 2, 3].map((item) => (
						<Skeleton key={item} className="h-32" />
					))}
				</div>
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (periodsError) {
		return (
			<div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700">
				Gagal mengambil daftar periode sosialisasi. Pastikan backend berjalan
				dan endpoint /api/sosialisasi/periods dapat diakses.
			</div>
		);
	}

	if (periods.length === 0) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
				<BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
				<h2 className="text-xl font-semibold">Belum Ada Data Sosialisasi</h2>
				<p className="mt-2 max-w-md text-sm text-muted-foreground">
					Upload file Excel BIB yang memiliki sheet Attendance untuk mulai
					melakukan monitoring sosialisasi IBPR dan Golden Rules.
				</p>
			</div>
		);
	}

	const summary = dashboard?.summary;

	return (
		<main className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Monitoring Sosialisasi IBPR & Golden Rules
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Monitoring pencapaian keikutsertaan sosialisasi seluruh karyawan PT
						Minergo Visi Maxima.
					</p>
				</div>

				<div className="flex w-full items-center gap-2 sm:w-auto">
					<Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
						<SelectTrigger className="w-full sm:w-[190px]">
							<SelectValue placeholder="Pilih Periode" />
						</SelectTrigger>
						<SelectContent>
							{periods.map((period) => (
								<SelectItem
									key={`${period.year}-${period.month}`}
									value={`${period.year}-${period.month}`}
								>
									{MONTHS[period.month - 1]} {period.year}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<button
						type="button"
						onClick={() => refetch()}
						disabled={isFetching}
						className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
						title="Refresh data"
					>
						<RefreshCw
							className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
						/>
					</button>
				</div>
			</div>

			{isLoadingDashboard ? (
				<div className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
						{[1, 2, 3, 4, 5].map((item) => (
							<Skeleton key={item} className="h-28" />
						))}
					</div>
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-96 w-full" />
				</div>
			) : dashboardError ? (
				<div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700">
					Gagal mengambil data dashboard. Periksa koneksi backend dan endpoint
					sosialisasi.
				</div>
			) : dashboard && summary ? (
				<>
					{/* KPI Cards */}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
						<Card>
							<CardContent className="p-4 sm:p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase text-muted-foreground">
										Karyawan Aktif
									</p>
									<Users className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{summary.totalActive}
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									Termasuk karyawan cuti
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4 sm:p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase text-muted-foreground">
										Eligible
									</p>
									<Users className="h-4 w-4 text-primary" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{summary.eligibleEmployees}
								</div>
								<p className="mt-1 text-xs text-muted-foreground">
									Karyawan onsite yang dihitung
								</p>
							</CardContent>
						</Card>

						<Card className="border-emerald-500/30 bg-emerald-500/5">
							<CardContent className="p-4 sm:p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase text-emerald-600">
										Lengkap
									</p>
									<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								</div>
								<div className="mt-3 text-3xl font-bold text-emerald-600">
									{summary.complete}
								</div>
								<p className="mt-1 text-xs text-emerald-600/80">
									IBPR dan GR terpenuhi
								</p>
							</CardContent>
						</Card>

						<Card className="border-rose-500/30 bg-rose-500/5">
							<CardContent className="p-4 sm:p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase text-rose-600">
										Belum Lengkap
									</p>
									<XCircle className="h-4 w-4 text-rose-600" />
								</div>
								<div className="mt-3 text-3xl font-bold text-rose-600">
									{summary.belum + summary.partial}
								</div>
								<p className="mt-1 text-xs text-rose-600/80">
									Belum memenuhi kedua target
								</p>
							</CardContent>
						</Card>

						<Card className="border-amber-500/30 bg-amber-500/5 col-span-2 sm:col-span-1">
							<CardContent className="p-4 sm:p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase text-amber-600">
										Sedang Cuti
									</p>
									<PlaneTakeoff className="h-4 w-4 text-amber-600" />
								</div>
								<div className="mt-3 text-3xl font-bold text-amber-600">
									{summary.excludedOnLeave}
								</div>
								<p className="mt-1 text-xs text-amber-600/80">
									Tidak masuk perhitungan target
								</p>
							</CardContent>
						</Card>
					</div>

					{/* Last Update Data */}
					<div className="inline-flex max-w-fit flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs">
						<CalendarDays className="h-4 w-4 text-muted-foreground" />

						<span className="font-medium text-muted-foreground">
							Last Update Data:
						</span>

						{dashboard?.lastUpdate ? (
							<>
								<span className="font-semibold text-foreground">
									{new Date(dashboard.lastUpdate.uploadedAt).toLocaleString(
										"id-ID",
										{
											day: "2-digit",
											month: "long",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
											hour12: false,
											timeZone: "Asia/Jakarta",
										},
									)}{" "}
									WIB
								</span>

								<span className="text-muted-foreground">
									• {dashboard.lastUpdate.filename}
								</span>
							</>
						) : (
							<span className="text-muted-foreground">
								Belum ada data upload
							</span>
						)}
					</div>

					{/* Achievement */}
					<div>
						<div className="mb-3">
							<h2 className="text-base font-semibold">
								Pencapaian Target Sosialisasi
							</h2>
							<p className="text-xs text-muted-foreground">
								Target setiap karyawan onsite: 1 IBPR dan 1 Golden Rules per
								bulan.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<AchievementCard
								title="Sosialisasi IBPR"
								value={summary.ibprAchievement}
								description={`${summary.ibprComplete} dari ${summary.eligibleEmployees} karyawan memenuhi target`}
								icon={ShieldCheck}
							/>

							<AchievementCard
								title="Golden Rules"
								value={summary.grAchievement}
								description={`${summary.grComplete} dari ${summary.eligibleEmployees} karyawan memenuhi target`}
								icon={BookOpen}
							/>

							<AchievementCard
								title="Overall Achievement"
								value={summary.overallAchievement}
								description={`${summary.complete} dari ${summary.eligibleEmployees} karyawan memenuhi kedua target`}
								icon={CheckCircle2}
							/>
						</div>
					</div>

					{/* Event Summary */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-semibold">
								Rekapitulasi Kegiatan Sosialisasi
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
								<div>
									<p className="text-xs text-muted-foreground">Total Event</p>
									<p className="mt-1 text-2xl font-bold">
										{formatNumber(summary.totalEvents)}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Karyawan</p>
									<p className="mt-1 text-2xl font-bold">
										{formatNumber(summary.uniqueNiks)}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">Event IBPR</p>
									<p className="mt-1 text-2xl font-bold text-blue-600">
										{formatNumber(summary.ibprEvents)}
									</p>
								</div>
								<div>
									<p className="text-xs text-muted-foreground">
										Event Golden Rules
									</p>
									<p className="mt-1 text-2xl font-bold text-indigo-600">
										{formatNumber(summary.grEvents)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Employee Table */}
					<Card className="overflow-hidden">
						<CardHeader className="border-b">
							<div className="flex flex-col gap-3">
								<div>
									<CardTitle className="text-base">
										Detail Kepatuhan per Karyawan
									</CardTitle>
									<p className="mt-1 text-xs text-muted-foreground">
										Rincian pencapaian target IBPR dan Golden Rules setiap
										karyawan.
									</p>
								</div>

								<div className="grid gap-2 sm:grid-cols-3">
									<div className="relative">
										<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
										<input
											value={search}
											onChange={(event) => setSearch(event.target.value)}
											placeholder="Cari nama atau NIK..."
											className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
										/>
									</div>

									<Select value={statusFilter} onValueChange={setStatusFilter}>
										<SelectTrigger>
											<SelectValue placeholder="Filter Status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Semua Status</SelectItem>
											<SelectItem value="Complete">Lengkap</SelectItem>
											<SelectItem value="Partial">Sebagian</SelectItem>
											<SelectItem value="Belum">Belum</SelectItem>
											<SelectItem value="Cuti">Cuti</SelectItem>
										</SelectContent>
									</Select>

									<Select
										value={departmentFilter}
										onValueChange={setDepartmentFilter}
									>
										<SelectTrigger>
											<SelectValue placeholder="Filter Departemen" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Semua Departemen</SelectItem>
											{departments.map((department) => (
												<SelectItem key={department} value={department}>
													{department}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
									<span>
										Menampilkan {filteredEmployees.length} dari{" "}
										{employees.length} karyawan
									</span>
									<span>
										Periode: {MONTHS[selectedMonth - 1]} {selectedYear}
									</span>
								</div>
							</div>
						</CardHeader>

						<CardContent className="p-0">
							<div className="overflow-x-auto">
								<div className="border-b bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground md:hidden">
									Geser tabel ke samping untuk melihat seluruh data.
								</div>

								<table className="w-full min-w-[950px] border-collapse">
									<thead>
										<tr className="border-b bg-muted/40">
											<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
												Karyawan
											</th>
											<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
												Departemen
											</th>
											<th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
												Sosialisasi IBPR
											</th>
											<th className="min-w-[150px] px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
												Golden Rules
											</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
												Overall
											</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
												Status
											</th>
											<th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
												Detail
											</th>
										</tr>
									</thead>

									<tbody>
										{filteredEmployees.map((employee) => {
											const isExpanded = expandedNik === employee.nik;

											return (
												<>
													<tr
														key={employee.nik}
														className={`border-b transition-colors ${
															employee.status === "Cuti"
																? "bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-950/35"
																: "hover:bg-muted/20"
														}`}
													>
														<td className="px-4 py-4">
															<div className="text-sm font-semibold">
																{employee.name}
															</div>
															<div className="mt-1 text-[11px] text-muted-foreground">
																{employee.nik}
																{employee.jabatan
																	? ` • ${employee.jabatan}`
																	: ""}
															</div>
														</td>

														<td className="px-4 py-4 text-xs text-muted-foreground">
															{employee.department || "-"}
														</td>

														<td className="px-4 py-4">
															<ProgressMetric
																label="Target 1 kali"
																value={employee.ibprProgress}
																count={employee.ibprCount}
															/>
														</td>

														<td className="px-4 py-4">
															<ProgressMetric
																label="Target 1 kali"
																value={employee.grProgress}
																count={employee.grCount}
															/>
														</td>

														<td className="px-4 py-4 text-center">
															<span
																className={`text-lg font-bold ${
																	getProgressColor(employee.totalProgress).text
																}`}
															>
																{employee.totalProgress}%
															</span>
														</td>

														<td className="px-4 py-4 text-center">
															<StatusBadge status={employee.status} />
														</td>

														<td className="px-4 py-4 text-center">
															<button
																type="button"
																onClick={() =>
																	setExpandedNik(
																		isExpanded ? null : employee.nik,
																	)
																}
																className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
																title="Lihat detail keikutsertaan"
															>
																{isExpanded ? (
																	<ChevronDown className="h-4 w-4" />
																) : (
																	<ChevronRight className="h-4 w-4" />
																)}
															</button>
														</td>
													</tr>

													{isExpanded && (
														<tr
															key={`${employee.nik}-detail`}
															className="border-b bg-muted/20"
														>
															<td colSpan={7} className="px-4 py-4">
																<div className="grid gap-3 md:grid-cols-2">
																	<AttendanceDetail
																		title="Riwayat Sosialisasi IBPR"
																		dates={employee.ibprDates}
																	/>
																	<AttendanceDetail
																		title="Riwayat Sosialisasi Golden Rules"
																		dates={employee.grDates}
																	/>
																</div>

																<div className="mt-3 text-xs text-muted-foreground">
																	Minggu keikutsertaan:{" "}
																	{employee.weeks.length > 0
																		? employee.weeks.join(", ")
																		: "Belum ada data"}
																</div>
															</td>
														</tr>
													)}
												</>
											);
										})}
									</tbody>
								</table>

								{filteredEmployees.length === 0 && (
									<div className="px-6 py-12 text-center">
										<Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
										<p className="text-sm font-medium">
											Data karyawan tidak ditemukan
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Coba ubah kata kunci atau filter pencarian.
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Notes */}
					<div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<p>
							Karyawan dengan status cuti tetap ditampilkan, tetapi tidak
							dihitung dalam denominator pencapaian target. Satu kegiatan
							gabungan yang mencakup IBPR dan Golden Rules dihitung untuk kedua
							kategori. Pencapaian setiap kategori dibatasi maksimal 100%.
						</p>
					</div>
				</>
			) : null}
		</main>
	);
}
