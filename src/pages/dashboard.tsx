import { useState, useEffect, useRef } from "react";
import {
	useListWeeks,
	useGetDashboard,
	getListWeeksQueryKey,
	getGetDashboardQueryKey,
	useSafetyCampaigns,
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
	Megaphone,
	ChevronLeft,
	ChevronRight,
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
	Rectangle,
} from "recharts";
import type { MemberProgress } from "@/api-client";
import html2canvas from "html2canvas";
import { toPng } from "html-to-image";

// ── Detail Kepatuhan Helpers ──────────────────────────────────────────────────────────────
type ComplianceItem = {
	actual: number;
	target: number;
	pct: number;
};

type ComplianceMember = {
	nik: string;
	name: string;
	department?: string;
	jabatan: string;
	isPjo: boolean;
	isHse: boolean;
	isPengawas: boolean;
	isOnLeave: boolean;

	tta: ComplianceItem;
	hazard: ComplianceItem;
	inspeksi: ComplianceItem;
	observasi: ComplianceItem;

	opkKeberadaanPengawas: ComplianceItem;
	opkFungsiPengawas: ComplianceItem;
	opkPencahayaan: ComplianceItem;

	opkP2h: ComplianceItem;
	opkSeatbelt: ComplianceItem;
	opkSimper: ComplianceItem;
	opkRoster: ComplianceItem;
	opkFatigue: ComplianceItem;
	opkLototo: ComplianceItem;

	overallPct: number;
};

function getStatusClass(pct: number) {
	if (pct >= 100) {
		return {
			text: "text-emerald-600",
			bar: "bg-emerald-500",
			bg: "bg-emerald-50",
		};
	}

	if (pct > 0) {
		return {
			text: "text-amber-600",
			bar: "bg-amber-500",
			bg: "bg-amber-50",
		};
	}

	return {
		text: "text-rose-600",
		bar: "bg-rose-500",
		bg: "bg-rose-50",
	};
}

function ComplianceMetric({
	label,
	item,
}: {
	label: string;
	item: ComplianceItem;
}) {
	if (item.target === 0) {
		return (
			<div className="min-w-0">
				<div className="text-[11px] font-medium text-muted-foreground truncate">
					{label}
				</div>
				<div className="mt-1 text-sm text-muted-foreground">—</div>
			</div>
		);
	}

	const status = getStatusClass(item.pct);

	return (
		<div className="min-w-0">
			<div className="flex items-center justify-between gap-2">
				<span className="text-[11px] font-medium text-muted-foreground truncate">
					{label}
				</span>

				<span className={`text-xs font-bold ${status.text}`}>{item.pct}%</span>
			</div>

			<div className="mt-1 flex items-center gap-2">
				<div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
					<div
						className={`h-full rounded-full ${status.bar}`}
						style={{ width: `${Math.min(item.pct, 100)}%` }}
					/>
				</div>

				<span className="text-[10px] text-muted-foreground whitespace-nowrap">
					{item.actual}/{item.target}
				</span>
			</div>
		</div>
	);
}

function OpkItem({ label, item }: { label: string; item?: ComplianceItem }) {
	if (!item || item.target === 0) return null;

	const status = getStatusClass(item.pct);

	return (
		<div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-muted/30">
			<span className="text-[11px] text-muted-foreground truncate">
				{label}
			</span>

			<div className="flex items-center gap-1.5 shrink-0">
				<span className={`text-[11px] font-semibold ${status.text}`}>
					{item.actual}/{item.target}
				</span>

				<span className={`text-[10px] font-bold ${status.text}`}>
					{item.pct}%
				</span>
			</div>
		</div>
	);
}

function OpkGrid({ member }: { member: ComplianceMember }) {
	if (member.isPjo) {
		return (
			<div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground italic">
				-
			</div>
		);
	}

	if (member.isHse) {
		return (
			<div className="grid grid-cols-2 gap-2 min-w-[300px]">
				<OpkItem label="Keberadaan" item={member.opkKeberadaanPengawas} />
				<OpkItem label="Fungsi" item={member.opkFungsiPengawas} />
				<OpkItem label="Pencahayaan" item={member.opkPencahayaan} />
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-2 min-w-[300px]">
			<OpkItem label="P2H" item={member.opkP2h} />
			<OpkItem label="Seatbelt" item={member.opkSeatbelt} />
			<OpkItem label="Simper" item={member.opkSimper} />
			<OpkItem label="Roster" item={member.opkRoster} />
			<OpkItem label="Fatigue" item={member.opkFatigue} />
			<OpkItem label="LOTOTO" item={member.opkLototo} />
		</div>
	);
}

function OverallStatus({ pct }: { pct: number }) {
	const status = getStatusClass(pct);

	return (
		<div className="flex flex-col items-center justify-center min-w-[80px]">
			<div className={`text-xl font-bold ${status.text}`}>{pct}%</div>

			<div className="mt-2 h-1.5 w-16 rounded-full bg-muted overflow-hidden">
				<div
					className={`h-full rounded-full ${status.bar}`}
					style={{ width: `${Math.min(pct, 100)}%` }}
				/>
			</div>
		</div>
	);
}

// --- Table Component Detail Kepatuhan -----------------------------------------
function ComplianceMemberTable({ members }: { members: ComplianceMember[] }) {
	const [view, setView] = useState<"all" | "onsite">("onsite");

	const onsiteMembers = members.filter((m) => !m.isOnLeave);
	const displayedMembers = view === "onsite" ? onsiteMembers : members;

	return (
		<div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between gap-4 px-6 py-5 border-b">
				<div>
					<h2 className="text-lg font-semibold tracking-tight">
						Detail Kepatuhan per Anggota
					</h2>

					<p className="text-sm text-muted-foreground mt-1">
						Rincian pencapaian target SAP dan OPK setiap anggota
					</p>
				</div>

				<div className="flex items-center rounded-xl bg-muted p-1 shrink-0">
					<button
						type="button"
						onClick={() => setView("all")}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
							view === "all"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Semua <span className="ml-1 font-bold">{members.length}</span>
					</button>

					<button
						type="button"
						onClick={() => setView("onsite")}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
							view === "onsite"
								? "bg-background shadow-sm text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						Onsite{" "}
						<span className="ml-1 font-bold">{onsiteMembers.length}</span>
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr className="bg-muted/40 border-b">
							<th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
								Nama & Jabatan
							</th>

							<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
								TTA
							</th>

							<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
								Hazard
							</th>

							<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
								Inspeksi
							</th>

							<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
								Observasi
							</th>

							<th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[330px]">
								OPK
							</th>

							<th className="px-5 py-3 text-center text-xs font-semibold text-muted-foreground">
								Overall
							</th>
						</tr>
					</thead>

					<tbody>
						{displayedMembers.map((member) => (
							<tr
								key={member.nik}
								className={`border-b last:border-b-0 transition-colors hover:bg-muted/20 ${
									member.isOnLeave ? "opacity-60" : ""
								}`}
							>
								{/* Nama */}
								<td className="px-5 py-4 align-top min-w-[220px]">
									<div className="font-semibold text-sm text-foreground">
										{member.name}
									</div>
									<div className="mt-1 flex items-center gap-2 whitespace-nowrap">
										<span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
											{member.jabatan}
										</span>

										<span className="text-[10px] text-muted-foreground">•</span>

										<span className="text-[10px] text-muted-foreground">
											{member.nik}
										</span>
									</div>
									{member.isOnLeave && (
										<span className="inline-flex mt-2 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
											Cuti / Tidak dihitung
										</span>
									)}
								</td>

								{/* TTA */}
								<td className="px-4 py-4 align-top">
									<ComplianceMetric label="" item={member.tta} />
								</td>

								{/* Hazard */}
								<td className="px-4 py-4 align-top">
									<ComplianceMetric label="" item={member.hazard} />
								</td>

								{/* Inspeksi */}
								<td className="px-4 py-4 align-top">
									<ComplianceMetric label="" item={member.inspeksi} />
								</td>

								{/* Observasi */}
								<td className="px-4 py-4 align-top">
									<ComplianceMetric label="" item={member.observasi} />
								</td>

								{/* OPK */}
								<td className="px-4 py-4 align-top">
									<OpkGrid member={member} />
								</td>

								{/* Overall */}
								<td className="px-5 py-4 align-top">
									<OverallStatus pct={member.overallPct} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{displayedMembers.length === 0 && (
				<div className="px-6 py-12 text-center text-sm text-muted-foreground">
					Tidak ada data anggota.
				</div>
			)}
		</div>
	);
}

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

function InspectionTimeTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: any[];
}) {
	if (!active || !payload || payload.length === 0) return null;

	const item = payload[0]?.payload;

	if (!item) return null;

	return (
		<div className="rounded-lg border bg-card px-4 py-3 shadow-md min-w-[220px]">
			<div className="font-semibold text-sm text-foreground">
				{item.fullName}
			</div>

			<div className="text-xs text-muted-foreground mt-0.5">{item.jabatan}</div>

			<div className="border-t my-2" />

			<div className="flex items-center justify-between gap-6 text-xs">
				<span className="text-muted-foreground">Kesesuaian Waktu</span>
				<span
					className={`font-bold ${
						item.pct === null
							? "text-muted-foreground"
							: item.pct >= 100
								? "text-emerald-600"
								: "text-amber-600"
					}`}
				>
					{item.pct === null ? "—" : `${item.pct}%`}
				</span>
			</div>

			<div className="flex items-center justify-between gap-6 text-xs mt-1.5">
				<span className="text-muted-foreground">Sesuai</span>
				<span className="font-semibold text-emerald-600">{item.sesuai}</span>
			</div>

			<div className="flex items-center justify-between gap-6 text-xs mt-1.5">
				<span className="text-muted-foreground">Tidak Sesuai</span>
				<span className="font-semibold text-rose-600">{item.tidakSesuai}</span>
			</div>

			<div className="flex items-center justify-between gap-6 text-xs mt-1.5">
				<span className="text-muted-foreground">Total Inspeksi</span>
				<span className="font-semibold text-foreground">{item.total}</span>
			</div>
		</div>
	);
}

function InspectionTimeBarShape(props: any) {
	const { x, y, width, height, fill, payload } = props;

	// Tidak ada inspeksi sama sekali
	if (payload.total === 0) {
		return (
			<Rectangle
				x={x}
				y={y}
				width={Math.max(width, 0)}
				height={height}
				fill="#d1d5db"
				radius={4}
			/>
		);
	}

	// Ada inspeksi tetapi 0% sesuai:
	// tampilkan marker orange kecil di titik 0%
	if (payload.pct === 0) {
		return (
			<Rectangle
				x={x}
				y={y}
				width={6}
				height={height}
				fill="#f59e0b"
				radius={4}
			/>
		);
	}

	// Normal
	return (
		<Rectangle
			x={x}
			y={y}
			width={width}
			height={height}
			fill={fill}
			radius={[0, 4, 4, 0]}
		/>
	);
}

// ── Safety Campaign Dashboard Carousel ────────────────────────────────────────
function SafetyCampaignDashboard({
	week,
	year,
}: {
	week: string;
	year: number;
}) {
	const { data: response, isLoading } = useSafetyCampaigns();

	const campaigns = response?.data ?? [];

	const campaign = campaigns.find(
		(item) => item.week === Number(week.replace("W", "")) && item.year === year,
	);

	const images = campaign?.images ?? [];

	const [currentIndex, setCurrentIndex] = useState(0);

	// Reset ke poster pertama ketika campaign/week berubah
	useEffect(() => {
		setCurrentIndex(0);
	}, [campaign?.id]);

	// Carousel otomatis setiap 5 detik
	useEffect(() => {
		if (images.length <= 1) return;

		const interval = window.setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % images.length);
		}, 5000);

		return () => window.clearInterval(interval);
	}, [images.length]);

	if (isLoading) {
		return <Skeleton className="h-[420px] w-full rounded-2xl" />;
	}

	if (!campaign) {
		return (
			<Card className="overflow-hidden border-dashed">
				<CardContent className="flex min-h-[220px] items-center justify-center">
					<div className="text-center">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Megaphone className="h-6 w-6 text-muted-foreground" />
						</div>

						<h3 className="font-semibold text-foreground">
							Belum Ada Safety Campaign
						</h3>

						<p className="mt-1 text-sm text-muted-foreground">
							Belum ada campaign untuk WEEK {week.replace("W", "")} • {year}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (images.length === 0) {
		return (
			<Card className="overflow-hidden">
				<CardHeader className="border-b">
					<div className="flex items-center gap-2">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<Megaphone className="h-4 w-4 text-primary" />
						</div>

						<div>
							<CardTitle className="text-sm font-semibold">
								Safety Campaign
							</CardTitle>

							<p className="text-xs text-muted-foreground">
								WEEK {campaign.week} • {campaign.year}
							</p>
						</div>
					</div>
				</CardHeader>

				<CardContent className="flex min-h-[220px] items-center justify-center">
					<p className="text-sm text-muted-foreground">
						Campaign belum memiliki poster.
					</p>
				</CardContent>
			</Card>
		);
	}

	const currentImage = images[currentIndex];

	const goPrevious = () => {
		setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
	};

	const goNext = () => {
		setCurrentIndex((prev) => (prev + 1) % images.length);
	};

	return (
		<Card className="overflow-hidden">
			{/* Header */}
			<CardHeader className="border-b pb-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-start gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
							<Megaphone className="h-5 w-5 text-primary" />
						</div>

						<div>
							<div className="flex flex-wrap items-center gap-2">
								<CardTitle className="text-base font-semibold">
									Safety Campaign
								</CardTitle>

								<Badge variant="outline">
									WEEK {campaign.week} • {campaign.year}
								</Badge>

								{campaign.isActive && (
									<Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
										AKTIF
									</Badge>
								)}
							</div>

							<p className="mt-1 text-sm font-semibold text-foreground">
								{campaign.title}
							</p>

							{campaign.highlight && (
								<p className="mt-1 text-xs text-muted-foreground">
									{campaign.highlight}
								</p>
							)}
						</div>
					</div>

					<div className="shrink-0 text-xs text-muted-foreground">
						{currentIndex + 1} / {images.length} poster
					</div>
				</div>
			</CardHeader>

			{/* Poster */}
			{/* Poster */}
			<CardContent className="p-4 sm:p-6">
				<div className="relative overflow-hidden rounded-xl bg-muted/30">
					{/* Carousel Track */}
					<div
						className="flex transition-transform duration-700 ease-in-out"
						style={{
							transform: `translateX(-${currentIndex * 100}%)`,
						}}
					>
						{images.map((image, index) => (
							<div
								key={image.id}
								className="flex w-full shrink-0 items-center justify-center"
							>
								<img
									src={image.filePath}
									alt={`${campaign.title} - Poster ${index + 1}`}
									className="max-h-[620px] w-auto max-w-full rounded-xl object-contain"
								/>
							</div>
						))}
					</div>

					{/* Previous */}
					{images.length > 1 && (
						<Button
							type="button"
							variant="secondary"
							size="icon"
							onClick={goPrevious}
							className="
					absolute left-3 top-1/2
					h-9 w-9
					-translate-y-1/2
					rounded-full
					bg-background/90
					shadow-md
					backdrop-blur
					transition-all duration-200
					hover:scale-105
					hover:bg-background
				"
							aria-label="Poster sebelumnya"
						>
							<ChevronLeft className="h-5 w-5" />
						</Button>
					)}

					{/* Next */}
					{images.length > 1 && (
						<Button
							type="button"
							variant="secondary"
							size="icon"
							onClick={goNext}
							className="
					absolute right-3 top-1/2
					h-9 w-9
					-translate-y-1/2
					rounded-full
					bg-background/90
					shadow-md
					backdrop-blur
					transition-all duration-200
					hover:scale-105
					hover:bg-background
				"
							aria-label="Poster berikutnya"
						>
							<ChevronRight className="h-5 w-5" />
						</Button>
					)}
				</div>

				{/* Indicator */}
				{images.length > 1 && (
					<div className="mt-4 flex items-center justify-center gap-1.5">
						{images.map((image, index) => (
							<button
								key={image.id}
								type="button"
								onClick={() => setCurrentIndex(index)}
								className={`h-2 rounded-full transition-all duration-300 ${
									index === currentIndex
										? "w-6 bg-primary"
										: "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
								}`}
								aria-label={`Tampilkan poster ${index + 1}`}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
	const dashboardRef = useRef<HTMLDivElement>(null);
	const handleCapture = async () => {
		if (!dashboardRef.current) return;

		const dataUrl = await toPng(dashboardRef.current, {
			cacheBust: true,
			pixelRatio: 2,
		});

		const link = document.createElement("a");
		link.download = `dashboard-${selectedWeek}.png`;
		link.href = dataUrl;
		link.click();
	};
	const { data: weeks, isLoading: isLoadingWeeks } = useListWeeks({
		query: { queryKey: getListWeeksQueryKey() },
	});
	const [selectedWeek, setSelectedWeek] = useState<string>("");

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

	const barChartData = activeMembers.map((m) => ({
		name: m.name.split(" ")[0],
		fullName: m.name,
		overall: m.overallPct,
	}));

	const inspectionTimeChartData = activeMembers.map((m) => {
		const compliance = m.inspectionTimeCompliance;

		const total = compliance?.total ?? 0;
		const sesuai = compliance?.sesuai ?? 0;
		const tidakSesuai = compliance?.tidakSesuai ?? 0;

		// Jika ada inspeksi, hitung persentase dari data aktual
		// Jika belum ada inspeksi, null = tidak ada data
		const pct = total > 0 ? Math.round((sesuai / total) * 100) : null;

		return {
			name: m.name.split(" ")[0],
			fullName: m.name,
			jabatan: m.jabatan,
			pct,
			total,
			sesuai,
			tidakSesuai,
		};
	});

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
							{
								label: "OPK Pencahayaan (HSE)",
								actual: sum(hse, "opkPencahayaan", "actual"),
								target: sum(hse, "opkPencahayaan", "target"),
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
		<main id="dashboard-capture">
			<div className="space-y-6" ref={dashboardRef}>
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

						{/* Safety Campaign */}
						<SafetyCampaignDashboard
							week={selectedWeek}
							year={selectedWeekData?.year ?? new Date().getFullYear()}
						/>

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

						{/* Kesesuaian Waktu Pelaporan Inspeksi */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-semibold">
									Kesesuaian Waktu Pelaporan Inspeksi
								</CardTitle>

								<p className="text-xs text-muted-foreground">
									Persentase laporan inspeksi yang dilaporkan pada waktu yang
									sesuai ketentuan per anggota onsite
								</p>
							</CardHeader>

							<CardContent>
								{inspectionTimeChartData.length === 0 ? (
									<div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
										Belum ada data kesesuaian waktu pelaporan
									</div>
								) : (
									<div
										className="w-full"
										style={{
											height: Math.max(
												220,
												inspectionTimeChartData.length * 42,
											),
										}}
									>
										<ResponsiveContainer width="100%" height="100%">
											<BarChart
												data={inspectionTimeChartData}
												layout="vertical"
												margin={{
													top: 0,
													right: 50,
													left: 0,
													bottom: 0,
												}}
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
													width={70}
												/>

												<Tooltip content={<InspectionTimeTooltip />} />

												<Bar
													dataKey="pct"
													maxBarSize={24}
													shape={<InspectionTimeBarShape />}
													isAnimationActive={false}
												>
													{inspectionTimeChartData.map((entry, i) => (
														<Cell
															key={i}
															fill={
																entry.pct === null
																	? "#d1d5db"
																	: entry.pct >= 100
																		? "#10b981"
																		: "#f59e0b"
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
													<span
														className={`text-xs font-bold ${pctColor(pct)}`}
													>
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

						{/* Detail Kepatuhan per Anggota */}
						<ComplianceMemberTable
							members={dashboard.members as ComplianceMember[]}
						/>
					</>
				) : (
					<div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
						Pilih minggu untuk melihat data
					</div>
				)}
			</div>
		</main>
	);
}
