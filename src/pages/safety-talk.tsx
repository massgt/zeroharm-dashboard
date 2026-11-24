import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	CalendarDays,
	CheckCircle2,
	AlertTriangle,
	PlaneTakeoff,
	RefreshCw,
	Search,
	Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Period = { year: number; month: number };

type SafetyTalkEmployee = {
	nik?: string;
	name: string;
	department?: string | null;
	jabatan?: string | null;
	employeeStatus?: string;
	eligibleForTarget?: boolean;
	target: number;
	totalCount: number;
	totalProgress: number;
	status: "Complete" | "Partial" | "Belum" | "Cuti";
};

type DashboardResponse = {
	success: boolean;
	period: Period;
	targetPerMonth: number;
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
		achievement: number;
		totalEvents: number;
		uniqueNiks: number;
	};
	employees: SafetyTalkEmployee[];
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

function getProgressColor(value: number) {
	if (value >= 100) {
		return {
			text: "text-emerald-600",
			bar: "bg-emerald-500",
		};
	}

	if (value > 0) {
		return {
			text: "text-amber-600",
			bar: "bg-amber-500",
		};
	}

	return {
		text: "text-rose-600",
		bar: "bg-rose-500",
	};
}

function ProgressMetric({
	value,
	count,
	target,
}: {
	value: number;
	count: number;
	target: number;
}) {
	const color = getProgressColor(value);

	return (
		<div className="min-w-[150px] space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground">
					{formatNumber(count)} dari {target} kali
				</span>
				<span className={`text-xs font-bold ${color.text}`}>
					{Math.round(value)}%
				</span>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all ${color.bar}`}
					style={{ width: `${Math.min(100, value)}%` }}
				/>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: SafetyTalkEmployee["status"] }) {
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

	return <Badge className="bg-rose-500 text-white hover:bg-rose-500">Belum</Badge>;
}

export default function SafetyTalk() {
	const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
	const [selectedPeriod, setSelectedPeriod] = useState("");
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [departmentFilter, setDepartmentFilter] = useState("all");

	const {
		data: periodsResponse,
		isLoading: isLoadingPeriods,
		error: periodsError,
	} = useQuery({
		queryKey: ["safety-talk-periods"],
		queryFn: async () => {
			const response = await fetch(`${apiUrl}/api/safety-talk/periods`);
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
		queryKey: ["safety-talk-dashboard", selectedYear, selectedMonth],
		queryFn: async () => {
			const response = await fetch(
				`${apiUrl}/api/safety-talk/dashboard?year=${selectedYear}&month=${selectedMonth}`,
			);
			if (!response.ok) {
				throw new Error("Gagal mengambil data dashboard Safety Talk.");
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
				(employee.nik ?? "").toLowerCase().includes(keyword);
			const matchesStatus =
				statusFilter === "all" || employee.status === statusFilter;
			const matchesDepartment =
				departmentFilter === "all" ||
				employee.department === departmentFilter;

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
				Gagal mengambil daftar periode Safety Talk. Pastikan backend berjalan
				dan endpoint /api/safety-talk/periods dapat diakses.
			</div>
		);
	}

	if (periods.length === 0) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
				<Activity className="mb-4 h-12 w-12 text-muted-foreground" />
				<h2 className="text-xl font-semibold">Belum Ada Data Safety Talk</h2>
				<p className="mt-2 max-w-md text-sm text-muted-foreground">
					Upload file Excel BIB yang memiliki sheet Attendance. Periode
				monitoring akan mengikuti data Attendance yang tersedia.
				</p>
			</div>
		);
	}

	const summary = dashboard?.summary;

	return (
		<main className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Monitoring Safety Talk
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Monitoring pencapaian keikutsertaan Safety Talk seluruh karyawan PT
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
					<div className="grid gap-4 md:grid-cols-3">
						{[1, 2, 3].map((item) => (
							<Skeleton key={item} className="h-32" />
						))}
					</div>
					<Skeleton className="h-96 w-full" />
				</div>
			) : dashboardError ? (
				<div className="rounded-xl border border-rose-300 bg-rose-50 p-6 text-sm text-rose-700">
					Gagal mengambil data dashboard Safety Talk. Periksa koneksi backend.
				</div>
			) : dashboard && summary ? (
				<>
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<Card>
							<CardContent className="p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Karyawan Aktif
									</p>
									<Users className="h-5 w-5 text-muted-foreground" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{formatNumber(summary.totalActive)}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									Termasuk personel cuti
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Memenuhi Target
									</p>
									<CheckCircle2 className="h-5 w-5 text-emerald-600" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{summary.complete} / {summary.eligibleEmployees}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									{summary.achievement}% dari personel onsite
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Total Keikutsertaan
									</p>
									<Activity className="h-5 w-5 text-primary" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{formatNumber(summary.totalEvents)}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									{formatNumber(summary.uniqueNiks)} personel tercatat
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-5">
								<div className="flex items-center justify-between">
									<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										Sedang Cuti
									</p>
									<PlaneTakeoff className="h-5 w-5 text-amber-600" />
								</div>
								<div className="mt-3 text-3xl font-bold">
									{formatNumber(summary.excludedOnLeave)}
								</div>
								<p className="mt-2 text-xs text-muted-foreground">
									Dikecualikan dari pencapaian tim
								</p>
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
						<CalendarDays className="h-4 w-4" />
						<span>
							Periode: {MONTHS[selectedMonth - 1]} {selectedYear}
						</span>
						<span>• Target: {dashboard.targetPerMonth} kali/personel/bulan</span>
						{dashboard.lastUpdate && (
							<span>
								• Update terakhir:{" "}
								{new Date(dashboard.lastUpdate.uploadedAt).toLocaleString(
									"id-ID",
									{ timeZone: "Asia/Jakarta" },
								)} WIB
							</span>
						)}
					</div>

					<Card>
						<CardContent className="space-y-4 p-4">
							<div className="grid gap-3 md:grid-cols-3">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<input
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Cari nama atau NIK..."
										className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
									/>
								</div>

								<Select
									value={statusFilter}
									onValueChange={setStatusFilter}
								>
									<SelectTrigger>
										<SelectValue placeholder="Status" />
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
										<SelectValue placeholder="Departemen" />
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
									Menampilkan {filteredEmployees.length} dari {employees.length}{" "}
									karyawan aktif.
								</span>
								<span>Target bulanan: 4 kali per personel.</span>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full min-w-[850px] border-collapse text-sm">
									<thead>
										<tr className="border-b bg-muted/40 text-left">
											<th className="px-4 py-3">Karyawan</th>
											<th className="px-4 py-3">Departemen</th>
											<th className="px-4 py-3 text-center">Target Bulanan</th>
											<th className="px-4 py-3">Realisasi & Progress</th>
											<th className="px-4 py-3 text-center">Status</th>
										</tr>
									</thead>
									<tbody>
										{filteredEmployees.map((employee) => (
											<tr
												key={employee.nik ?? employee.name}
												className={`border-b hover:bg-muted/20 ${
													employee.status === "Cuti"
														? "bg-rose-50/50 dark:bg-rose-950/10"
														: ""
												}`}
											>
												<td className="px-4 py-4">
													<div className="font-medium">{employee.name}</div>
													{employee.nik && (
														<div className="text-[11px] text-muted-foreground">
															{employee.nik} • {employee.jabatan}
														</div>
													)}
												</td>
												<td className="px-4 py-4 text-xs text-muted-foreground">
													{employee.department || "-"}
												</td>
												<td className="px-4 py-4 text-center font-medium">
													{employee.target} kali
												</td>
												<td className="px-4 py-4">
													<ProgressMetric
														value={employee.totalProgress}
														count={employee.totalCount}
														target={employee.target}
													/>
												</td>
												<td className="px-4 py-4 text-center">
													<StatusBadge status={employee.status} />
												</td>
											</tr>
										))}
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

					<div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
						<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
						<p>
							Progress dihitung dari total keikutsertaan Safety Talk pada bulan
							terpilih dibandingkan target 4 kali per personel. Setiap
							keikutsertaan setara 25%, dan pencapaian dibatasi maksimal 100%.
							Personel cuti tetap ditampilkan untuk Administrator, tetapi tidak
							dihitung dalam denominator pencapaian tim.
						</p>
					</div>
				</>
			) : null}
		</main>
	);
}
