import { useEffect, useMemo, useRef, useState } from "react";
import {
	useGetDashboard,
	useListWeeks,
	getGetDashboardQueryKey,
	getListWeeksQueryKey,
} from "@/api-client";
import type { MemberProgress } from "@/api-client";
import { toPng } from "html-to-image";
import {
	AlertTriangle,
	CalendarDays,
	CheckCircle2,
	CircleAlert,
	Download,
	Info,
	XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import logoMVM from "@/assets/LogoMVM2.png";
import logoCapture from "@/assets/capture.png";
import { color } from "html2canvas/dist/types/css/types/color";

type ComplianceItem = {
	actual: number;
	target: number;
	pct: number;
};

type SummaryMember = MemberProgress & {
	tta: ComplianceItem;
	hazard: ComplianceItem;
	inspeksi: ComplianceItem;
	observasi: ComplianceItem;
};

function statusFor(pct: number) {
	if (pct >= 100) {
		return {
			text: "text-emerald-700",
			bg: "bg-emerald-50",
			border: "border-emerald-200",
			bar: "bg-emerald-500",
		};
	}

	if (pct > 0) {
		return {
			text: "text-amber-700",
			bg: "bg-amber-50",
			border: "border-amber-200",
			bar: "bg-amber-500",
		};
	}

	return {
		text: "text-rose-700",
		bg: "bg-rose-50",
		border: "border-rose-200",
		bar: "bg-rose-500",
	};
}

function Metric({ label, item }: { label: string; item: ComplianceItem }) {
	if (!item || item.target === 0) {
		return (
			<div className="text-center">
				<div className="text-[9px] font-medium text-slate-400">{label}</div>
				<div className="mt-1 text-[13px] text-slate-400">—</div>
			</div>
		);
	}

	const status = statusFor(item.pct);

	return (
		<div className="min-w-0">
			<div className={`text-center text-[13px] font-bold ${status.text}`}>
				{item.pct}%
			</div>

			<div className="mt-0.5 text-center text-[9px] text-slate-500">
				{item.actual}/{item.target}
			</div>

			<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
				<div
					className={`h-full rounded-full ${status.bar}`}
					style={{
						width: `${Math.min(item.pct, 100)}%`,
					}}
				/>
			</div>
		</div>
	);
}

function InspectionTimeRow({ member }: { member: SummaryMember }) {
	const compliance = member.inspectionTimeCompliance;

	if (!compliance || compliance.total === 0 || compliance.pct === null) {
		return (
			<div className="flex items-center gap-1.5">
				<div className="w-[58px] truncate text-[8px] font-medium text-slate-600">
					{member.name}
				</div>

				<div className="flex-1 text-[8px] text-slate-400">Tidak ada data</div>
			</div>
		);
	}

	const pct = compliance.pct;

	const status =
		pct >= 100
			? {
					text: "text-emerald-700",
					bar: "bg-emerald-500",
				}
			: pct > 0
				? {
						text: "text-amber-700",
						bar: "bg-amber-500",
					}
				: {
						text: "text-rose-700",
						bar: "bg-rose-500",
					};

	return (
		<div className="flex items-center gap-1.5">
			<div
				className="w-[58px] truncate text-[8px] font-medium text-slate-600"
				title={member.name}
			>
				{member.name}
			</div>

			<div className="min-w-0 flex-1">
				<div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
					<div
						className={`h-full rounded-full ${status.bar}`}
						style={{
							width: `${Math.min(pct, 100)}%`,
						}}
					/>
				</div>
			</div>

			<div
				className={`w-[28px] text-right text-[8px] font-bold ${status.text}`}
			>
				{pct}%
			</div>

			<div className="w-[28px] text-right text-[7px] text-slate-400">
				{compliance.sesuai}/{compliance.total}
			</div>
		</div>
	);
}

function OpkBox({ label, item }: { label: string; item?: ComplianceItem }) {
	if (!item || item.target === 0) return null;

	const status = statusFor(item.pct);
	const achieved = item.pct >= 100;

	return (
		<div
			className={`rounded-md border px-2 py-1.5 ${status.bg} ${status.border}`}
		>
			<div className="flex items-center justify-between gap-1">
				<span className="truncate text-[9px] font-medium text-slate-600">
					{label}
				</span>

				{achieved ? (
					<CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
				) : item.pct > 0 ? (
					<AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
				) : (
					<XCircle className="h-3 w-3 shrink-0 text-rose-600" />
				)}
			</div>

			<div className="mt-0.5 flex items-end justify-between">
				<span className={`text-[11px] font-bold ${status.text}`}>
					{item.actual}/{item.target}
				</span>

				<span className={`text-[10px] font-bold ${status.text}`}>
					{item.pct}%
				</span>
			</div>
		</div>
	);
}

function getOpkItems(member: SummaryMember) {
	if (member.isPjo) return [];

	if (member.isHse) {
		return [
			{
				label: "Keberadaan",
				item: member.opkKeberadaanPengawas,
			},
			{
				label: "Fungsi",
				item: member.opkFungsiPengawas,
			},
			{
				label: "Pencahayaan",
				item: member.opkPencahayaan,
			},
		];
	}

	return [
		{
			label: "P2H",
			item: member.opkP2h,
		},
		{
			label: "Seatbelt",
			item: member.opkSeatbelt,
		},
		{
			label: "SIMPER",
			item: member.opkSimper,
		},
		{
			label: "Roster",
			item: member.opkRoster,
		},
		{
			label: "Fatigue",
			item: member.opkFatigue,
		},
		{
			label: "LOTOTO",
			item: member.opkLototo,
		},
	];
}

function getMissingItems(member: SummaryMember) {
	const items = [
		{
			label: "TTA",
			item: member.tta,
		},
		{
			label: "Hazard",
			item: member.hazard,
		},
		{
			label: "Inspeksi",
			item: member.inspeksi,
		},
		{
			label: "Observasi",
			item: member.observasi,
		},
		...getOpkItems(member),
	];

	return items.filter(({ item }) => item && item.target > 0 && item.pct < 100);
}

function MemberRow({
	member,
	index,
}: {
	member: SummaryMember;
	index: number;
}) {
	const opkItems = getOpkItems(member);
	const missing = getMissingItems(member);

	const overallStatus =
		member.overallPct >= 100
			? "SELESAI"
			: member.overallPct > 0
				? "SEBAGIAN"
				: "BELUM LAPOR";

	const status = statusFor(member.overallPct);

	return (
		<tr className="border-b border-slate-200 last:border-b-0">
			<td className="w-[28px] px-2 py-2 align-top text-center text-[9px] font-semibold text-slate-400">
				{index}
			</td>

			<td className="w-[185px] px-2 py-2 align-top">
				<div className="text-[11px] font-bold leading-tight text-slate-800">
					{member.name}
				</div>

				<div className="mt-0.5 text-[9px] leading-tight text-slate-500">
					{member.jabatan}
				</div>

				<div className="text-[9px] text-slate-400">{member.nik}</div>

				{member.isOnLeave && (
					<span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500">
						CUTI / TIDAK DIHITUNG
					</span>
				)}
			</td>

			<td className="w-[70px] px-2 py-2 align-top">
				<Metric label="TTA" item={member.tta} />
			</td>

			<td className="w-[70px] px-2 py-2 align-top">
				<Metric label="HAZARD" item={member.hazard} />
			</td>

			<td className="w-[70px] px-2 py-2 align-top">
				<Metric label="INSPEKSI" item={member.inspeksi} />
			</td>

			<td className="w-[70px] px-2 py-2 align-top">
				<Metric label="OBSERVASI" item={member.observasi} />
			</td>

			<td className="min-w-[380px] px-2 py-2 align-top">
				{member.isPjo ? (
					<div className="flex min-h-[60px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[9px] text-slate-500">
						<Info className="mr-1.5 h-3 w-3" />
						Tidak ada target OPK untuk posisi ini
					</div>
				) : (
					<div className="grid grid-cols-6 gap-1.5">
						{opkItems.map(({ label, item }) => (
							<OpkBox key={label} label={label} item={item} />
						))}
					</div>
				)}
			</td>

			<td className="w-[75px] px-2 py-2 align-top">
				<div className="text-center">
					<div className={`text-[16px] font-bold ${status.text}`}>
						{member.overallPct}%
					</div>

					<div className="mx-auto mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
						<div
							className={`h-full rounded-full ${status.bar}`}
							style={{
								width: `${Math.min(member.overallPct, 100)}%`,
							}}
						/>
					</div>
				</div>
			</td>

			<td className="w-[155px] px-2 py-2 align-top">
				<div
					className={`inline-flex rounded-md border px-1.5 py-0.5 text-[8px] font-bold ${status.bg} ${status.border} ${status.text}`}
				>
					{overallStatus}
				</div>

				{missing.length === 0 ? (
					<div className="mt-1 text-[8px] leading-tight text-emerald-700">
						Semua indikator & OPK sudah achieve.
					</div>
				) : (
					<div className="mt-1">
						<div className="mb-0.5 text-[8px] font-semibold text-slate-500">
							Belum achieve:
						</div>

						{missing.slice(0, 6).map(({ label, item }) => (
							<div
								key={label}
								className={`text-[8px] leading-tight ${statusFor(item.pct).text}`}
							>
								• {label} ({item.actual}/{item.target})
							</div>
						))}
					</div>
				)}
			</td>
		</tr>
	);
}

export default function Summary() {
	const captureRef = useRef<HTMLDivElement>(null);

	const { data: weeks, isLoading: loadingWeeks } = useListWeeks({
		query: {
			queryKey: getListWeeksQueryKey(),
		},
	});

	const [selectedWeek, setSelectedWeek] = useState("");

	useEffect(() => {
		if (weeks && weeks.length > 0 && !selectedWeek) {
			setSelectedWeek(weeks[weeks.length - 1].week);
		}
	}, [weeks, selectedWeek]);

	const selectedWeekData = weeks?.find((w) => w.week === selectedWeek);

	const { data: dashboard, isLoading: loadingDashboard } = useGetDashboard(
		{ week: selectedWeek },
		{
			query: {
				enabled: !!selectedWeek,
				queryKey: getGetDashboardQueryKey({
					week: selectedWeek,
				}),
			},
		},
	);

	const members = useMemo(
		() =>
			(dashboard?.members || []).filter((m) => !m.isOnLeave) as SummaryMember[],
		[dashboard],
	);

	const categorySummary = useMemo(() => {
		const categories = [
			{ key: "tta", label: "TTA" },
			{ key: "hazard", label: "HAZARD" },
			{ key: "inspeksi", label: "INSPEKSI" },
			{ key: "observasi", label: "OBSERVASI" },
		] as const;

		return categories.map(({ key, label }) => {
			const applicable = members.filter((m) => m[key].target > 0);

			const achieved = applicable.filter((m) => m[key].pct >= 100).length;

			return {
				label,
				achieved,
				total: members.length,
				pct:
					applicable.length > 0
						? Math.round((achieved / applicable.length) * 100)
						: 100,
			};
		});
	}, [members]);

	const missingOpkTotal = useMemo(() => {
		return members.reduce((total, member) => {
			return (
				total +
				getOpkItems(member).filter(
					({ item }) => item && item.target > 0 && item.pct < 100,
				).length
			);
		}, 0);
	}, [members]);

	const handleCapture = async () => {
		if (!captureRef.current) return;

		try {
			const dataUrl = await toPng(captureRef.current, {
				cacheBust: true,
				pixelRatio: 2,
				backgroundColor: "#ffffff",
			});

			const link = document.createElement("a");
			link.download = `SAP-Summary-${selectedWeek || "week"}.png`;
			link.href = dataUrl;
			link.click();
		} catch (error) {
			console.error("Summary capture error:", error);
		}
	};

	if (loadingWeeks) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-64" />
				<Skeleton className="h-[700px] w-full" />
			</div>
		);
	}

	if (!weeks || weeks.length === 0) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
				<CircleAlert className="mb-3 h-10 w-10 text-muted-foreground" />
				<h2 className="text-xl font-bold">Belum Ada Data SAP</h2>
				<p className="mt-1 max-w-md text-sm text-muted-foreground">
					Upload data Excel terlebih dahulu untuk membuat Summary SAP.
				</p>

				<Link href="/upload">
					<Button className="mt-4">Upload Data</Button>
				</Link>
			</div>
		);
	}

	if (loadingDashboard || !dashboard) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-[700px] w-full" />
			</div>
		);
	}

	const fullyCompliant = dashboard.summary.fullyCompliant;
	const partiallyCompliant = dashboard.summary.partiallyCompliant;
	const notReported = dashboard.summary.notReported;
	const overallPct = dashboard.summary.overallPct;

	return (
		<div className="space-y-4">
			{/* Control bar - tidak ikut capture */}
			<div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-bold tracking-tight">Summary SAP</h1>
					<p className="text-sm text-muted-foreground">
						Rekap kepatuhan SAP & detail OPK per anggota
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Select value={selectedWeek} onValueChange={setSelectedWeek}>
						<SelectTrigger className="w-[160px]">
							<SelectValue />
						</SelectTrigger>

						<SelectContent>
							{weeks.map((week) => (
								<SelectItem key={week.week} value={week.week}>
									{week.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Button
						onClick={handleCapture}
						className="h-9.5 w-11.5 p-0 flex items-center justify-center transition-all duration-200 ease-out
		        hover:-translate-y-0.5
		        hover:shadow-md
		        active:translate-y-0
		        active:scale-95"
					>
						<img
							src={logoCapture}
							alt="Capture"
							className="h-7.5 w-7.5 object-contain brightness-0 invert"
						/>
					</Button>
				</div>
			</div>

			{/* =========================================================
			    A4 LANDSCAPE CAPTURE
			========================================================= */}
			<div
				ref={captureRef}
				id="summary-capture"
				className="mx-auto w-full max-w-[1400px] bg-white p-5 text-slate-900"
			>
				{/* Header */}
				<div className="flex items-start justify-between border-b border-slate-300 pb-3">
					<div className="flex items-center gap-3">
						{/* Logo Minergo */}
						<img
							src={logoMVM}
							alt="Minergo"
							className="h-12 w-auto shrink-0 object-contain"
						/>

						{/* Judul Report */}
						<div className="min-w-0">
							<h1 className="text-2xl font-bold text-slate-900">
								SUMMARY SAFETY ACCOUNTABILITY PROGRAM (SAP) REPORT
							</h1>

							<p className="mt-1 text-sm text-slate-500">
								Monitoring TTA, Hazard, Inspeksi, Observasi & OPK per Anggota
							</p>
						</div>
					</div>

					<div className="text-right">
						<div className="text-[15px] font-bold text-slate-800">
							{selectedWeekData?.label || selectedWeek}
						</div>

						<div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500">
							<CalendarDays className="h-3 w-3" />
							Periode minggu aktif
						</div>
					</div>
				</div>

				{/* KPI */}
				<div className="mt-3 grid grid-cols-5 gap-2">
					<div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
						<div className="text-[8px] font-semibold uppercase text-slate-500">
							TOTAL ANGGOTA
						</div>
						<div className="mt-0.5 text-[22px] font-bold text-slate-900">
							{dashboard.summary.totalMembers}
						</div>
						<div className="text-[8px] text-slate-400">
							anggota aktif / onsite
						</div>
					</div>

					<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
						<div className="text-[8px] font-semibold uppercase text-emerald-700">
							SELESAI
						</div>
						<div className="mt-0.5 text-[22px] font-bold text-emerald-700">
							{fullyCompliant}
						</div>
						<div className="text-[8px] text-emerald-700/70">
							mencapai 100% target
						</div>
					</div>

					<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
						<div className="text-[8px] font-semibold uppercase text-amber-700">
							SEBAGIAN
						</div>
						<div className="mt-0.5 text-[22px] font-bold text-amber-700">
							{partiallyCompliant}
						</div>
						<div className="text-[8px] text-amber-700/70">
							masih ada target belum tercapai
						</div>
					</div>

					<div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
						<div className="text-[8px] font-semibold uppercase text-rose-700">
							BELUM LAPOR
						</div>
						<div className="mt-0.5 text-[22px] font-bold text-rose-700">
							{notReported}
						</div>
						<div className="text-[8px] text-rose-700/70">
							tidak ada laporan sama sekali
						</div>
					</div>

					<div
						className={`rounded-lg border px-3 py-2.5 ${statusFor(overallPct).bg} ${statusFor(overallPct).border}`}
					>
						<div
							className={`text-[8px] font-semibold uppercase ${statusFor(overallPct).text}`}
						>
							KEPATUHAN TOTAL
						</div>

						<div
							className={`mt-0.5 text-[22px] font-bold ${statusFor(overallPct).text}`}
						>
							{overallPct}%
						</div>

						<div
							className={`text-[8px] opacity-70 ${statusFor(overallPct).text}`}
						>
							rata-rata kepatuhan tim
						</div>
					</div>
				</div>

				{/* Rekap indikator */}
				<div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-2">
					<div className="rounded-lg border border-slate-200 px-3 py-2.5">
						<div className="mb-2 text-[10px] font-bold text-slate-700">
							REKAP INDIKATOR
						</div>

						<div className="grid grid-cols-4 gap-2">
							{categorySummary.map((item) => (
								<div
									key={item.label}
									className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2 text-center"
								>
									<div className="text-[8px] font-medium text-slate-500">
										{item.label}
									</div>

									<div className="mt-1 text-[13px] font-bold text-slate-800">
										{item.achieved}/{item.total}
									</div>

									<div
										className={`text-[8px] font-semibold ${
											item.pct >= 100 ? "text-emerald-600" : "text-amber-600"
										}`}
									>
										{item.pct}% achieve
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 px-3 py-2.5">
						<div className="text-[10px] font-bold text-slate-700">
							STATUS OPK
						</div>

						<div className="mt-2 flex items-center gap-3">
							<div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
								<AlertTriangle className="h-5 w-5 text-amber-500" />
							</div>

							<div>
								<div className="text-[17px] font-bold text-amber-700">
									{missingOpkTotal}
								</div>
								<div className="text-[8px] text-slate-500">
									OPK belum achieve
								</div>
							</div>
						</div>
					</div>

					<div className="rounded-lg border border-slate-200 px-3 py-2.5">
						<div className="text-[10px] font-bold text-slate-700">
							KESESUAIAN WAKTU PELAPORAN INSPEKSI
						</div>

						<div className="mt-1.5 grid grid-cols-3 gap-x-3 text-[7px] text-slate-600">
							<div className="flex items-center gap-1">
								<CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
								<span>Hijau = target tercapai</span>
							</div>

							<div className="flex items-center gap-1">
								<AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
								<span>Orange = belum 100%</span>
							</div>

							<div className="flex items-center gap-1">
								<XCircle className="h-2.5 w-2.5 text-rose-600" />
								<span>Merah = 0%</span>
							</div>
						</div>

						<div className="mt-2 border-t border-slate-100 pt-1.5">
							{/* <div className="mb-1 text-[8px] font-semibold text-slate-600">
								KESESUAIAN WAKTU PELAPORAN INSPEKSI
							</div> */}

							<div className="grid grid-cols-2 gap-x-4 gap-y-1">
								{members.map((member) => (
									<InspectionTimeRow key={member.nik} member={member} />
								))}
							</div>

							<div className="mt-1 text-right text-[7px] text-slate-400">
								Sesuai / Total Inspeksi
							</div>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="mt-3 overflow-hidden rounded-lg border border-slate-300">
					<div className="bg-slate-950 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white">
						DETAIL CAPAIAN SAP & OPK PER ANGGOTA
					</div>

					<table className="w-full border-collapse">
						<thead>
							<tr className="bg-slate-50">
								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									NO
								</th>

								<th className="px-2 py-2 text-left text-[8px] font-bold text-slate-600">
									NAMA & POSISI / NIK
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									TTA
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									HAZARD
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									INSPEKSI
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									OBSERVASI
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									DETAIL OPK (AKTUAL / TARGET)
								</th>

								<th className="px-2 py-2 text-center text-[8px] font-bold text-slate-600">
									OVERALL
								</th>

								<th className="px-2 py-2 text-left text-[8px] font-bold text-slate-600">
									STATUS & TINDAK LANJUT
								</th>
							</tr>
						</thead>

						<tbody>
							{members.map((member, index) => (
								<MemberRow key={member.nik} member={member} index={index + 1} />
							))}
						</tbody>
					</table>
				</div>

				{/* Footer */}
				<div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
					<span>
						Generated:{" "}
						{new Date().toLocaleString("id-ID", {
							day: "2-digit",
							month: "long",
							year: "numeric",
							hour: "2-digit",
							minute: "2-digit",
						})}{" "}
						WIB
					</span>

					<span className="font-medium text-slate-500">
						SAP Monitoring Dashboard - Provided by HSE Dept. MVM @ 2026
					</span>

					<span>Data berdasarkan minggu aktif ({selectedWeek})</span>
				</div>
			</div>
		</div>
	);
}
