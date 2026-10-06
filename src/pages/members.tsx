import { useMemo, useState } from "react";
import {
	useListMembers,
	useUpsertMember,
	useUpdateMember,
	useDeleteMember,
	useSetMemberLeave,
	getListMembersQueryKey,
} from "@/api-client";
import type { TeamMember } from "@/api-client/generated/api.schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
	Plus,
	Edit2,
	Trash2,
	ShieldAlert,
	PlaneTakeoff,
	Building2,
	Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const memberFormSchema = z.object({
	nik: z.string().min(1, "NIK wajib diisi"),
	name: z.string().min(1, "Nama wajib diisi"),
	department: z.string().min(1, "Departemen wajib diisi"),
	jabatan: z.string().min(1, "Jabatan wajib diisi"),
	isPjo: z.boolean().default(false),
	isHse: z.boolean().default(false),
	isPengawas: z.boolean().default(false),
	// Shared targets
	targetTta: z.coerce.number().min(0).default(0),
	targetHazard: z.coerce.number().min(0).default(7),
	targetInspeksi: z.coerce.number().min(0).default(7),
	targetObservasi: z.coerce.number().min(0).default(4),
	// HSE OPK
	targetOpkKeberadaanPengawas: z.coerce.number().min(0).default(0),
	targetOpkFungsiPengawas: z.coerce.number().min(0).default(0),
	// Pengawas OPK
	targetOpkP2h: z.coerce.number().min(0).default(0),
	targetOpkSeatbelt: z.coerce.number().min(0).default(0),
	targetOpkSimper: z.coerce.number().min(0).default(0),
	targetOpkRoster: z.coerce.number().min(0).default(0),
	targetOpkFatigue: z.coerce.number().min(0).default(0),
	targetOpkLototo: z.coerce.number().min(0).default(0),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

// ── Default target presets by role ─────────────────────────────────────────────
const defaultTargets = {
	pjo: {
		targetTta: 0,
		targetHazard: 1,
		targetInspeksi: 1,
		targetObservasi: 1,
		targetOpkKeberadaanPengawas: 0,
		targetOpkFungsiPengawas: 0,
		targetOpkP2h: 0,
		targetOpkSeatbelt: 0,
		targetOpkSimper: 0,
		targetOpkRoster: 0,
		targetOpkFatigue: 0,
		targetOpkLototo: 0,
	},
	hse: {
		targetTta: 0,
		targetHazard: 7,
		targetInspeksi: 7,
		targetObservasi: 4,
		targetOpkKeberadaanPengawas: 10,
		targetOpkFungsiPengawas: 10,
		targetOpkP2h: 0,
		targetOpkSeatbelt: 0,
		targetOpkSimper: 0,
		targetOpkRoster: 0,
		targetOpkFatigue: 0,
		targetOpkLototo: 0,
	},
	pengawas: {
		targetTta: 0,
		targetHazard: 7,
		targetInspeksi: 7,
		targetObservasi: 4,
		targetOpkKeberadaanPengawas: 0,
		targetOpkFungsiPengawas: 0,
		targetOpkP2h: 5,
		targetOpkSeatbelt: 5,
		targetOpkSimper: 10,
		targetOpkRoster: 10,
		targetOpkFatigue: 10,
		targetOpkLototo: 1,
	},
};

// ── Target input helper ─────────────────────────────────────────────────────────
function TargetInput({
	control,
	name,
	label,
}: {
	control: ReturnType<typeof useForm<MemberFormValues>>["control"];
	name: keyof MemberFormValues;
	label: string;
}) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel className="text-xs text-muted-foreground">
						{label}
					</FormLabel>
					<FormControl>
						<Input
							type="number"
							min={0}
							className="h-8 text-sm"
							{...field}
							value={field.value as number}
						/>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}

// ── Role badge ──────────────────────────────────────────────────────────────────
function RoleBadge({ member }: { member: TeamMember }) {
	if (member.isPjo)
		return (
			<Badge
				variant="outline"
				className="text-[10px] py-0 px-1.5 border-primary/50 text-primary gap-1"
			>
				<ShieldAlert className="h-2.5 w-2.5" />
				{member.department}
			</Badge>
		);
	if (member.isHse)
		return (
			<Badge
				variant="outline"
				className="text-[10px] py-0 px-1.5 border-blue-400 text-blue-600"
			>
				{member.department}
			</Badge>
		);

	return (
		<Badge
			variant="outline"
			className="text-[10px] py-0 px-1.5 border-emerald-400 text-emerald-600"
		>
			{member.department}
		</Badge>
	);
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function Members() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<
		"all" | "pjo" | "hse" | "pengawas"
	>("all");
	const [statusFilter, setStatusFilter] = useState<"all" | "active" | "leave">(
		"all",
	);

	const { data: members, isLoading } = useListMembers({
		query: { queryKey: getListMembersQueryKey() },
	});
	const filteredMembers = useMemo(() => {
		if (!members) return [];

		const query = searchQuery.trim().toLowerCase();

		return members.filter((member) => {
			const matchesSearch =
				!query ||
				member.name.toLowerCase().includes(query) ||
				member.nik.toLowerCase().includes(query) ||
				member.jabatan.toLowerCase().includes(query) ||
				member.department.toLowerCase().includes(query);

			const matchesRole =
				roleFilter === "all" ||
				(roleFilter === "pjo" && member.isPjo) ||
				(roleFilter === "hse" && member.isHse) ||
				(roleFilter === "pengawas" && !member.isPjo && !member.isHse);

			const matchesStatus =
				statusFilter === "all" ||
				(statusFilter === "active" && !member.isOnLeave) ||
				(statusFilter === "leave" && member.isOnLeave);

			return matchesSearch && matchesRole && matchesStatus;
		});
	}, [members, searchQuery, roleFilter, statusFilter]);
	const upsertMember = useUpsertMember();
	const updateMember = useUpdateMember();
	const deleteMember = useDeleteMember();
	const setLeave = useSetMemberLeave();

	const form = useForm<MemberFormValues>({
		resolver: zodResolver(memberFormSchema),
		defaultValues: {
			nik: "",
			name: "",
			department: "Operation",
			jabatan: "",
			isPjo: false,
			isHse: false,
			...defaultTargets.pengawas,
		},
	});

	const watchPjo = form.watch("isPjo");
	const watchHse = form.watch("isHse");

	const applyPreset = (role: "pjo" | "hse" | "pengawas") => {
		form.setValue("isPjo", role === "pjo");
		form.setValue("isHse", role === "hse");
		Object.entries(defaultTargets[role]).forEach(([k, v]) =>
			form.setValue(k as keyof MemberFormValues, v as number),
		);
	};

	const onSubmit = (data: MemberFormValues) => {
		if (editingMember) {
			updateMember.mutate(
				{ nik: editingMember.nik, data },
				{
					onSuccess: () => {
						toast({ title: "Profil anggota diperbarui" });
						setSheetOpen(false);
						invalidate();
					},
					onError: () =>
						toast({ title: "Gagal menyimpan", variant: "destructive" }),
				},
			);
		} else {
			upsertMember.mutate(
				{ data },
				{
					onSuccess: () => {
						toast({ title: "Anggota berhasil ditambahkan" });
						setSheetOpen(false);
						invalidate();
					},
					onError: () =>
						toast({ title: "Gagal menyimpan", variant: "destructive" }),
				},
			);
		}
	};

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });

	const handleEdit = (member: TeamMember) => {
		setEditingMember(member);
		form.reset({
			nik: member.nik,
			name: member.name,
			department: member.department,
			jabatan: member.jabatan,
			isPjo: member.isPjo,
			isHse: member.isHse,
			targetTta: member.targetTta,
			targetHazard: member.targetHazard,
			targetInspeksi: member.targetInspeksi,
			targetObservasi: member.targetObservasi,
			targetOpkKeberadaanPengawas: member.targetOpkKeberadaanPengawas,
			targetOpkFungsiPengawas: member.targetOpkFungsiPengawas,
			targetOpkP2h: member.targetOpkP2h,
			targetOpkSeatbelt: member.targetOpkSeatbelt,
			targetOpkSimper: member.targetOpkSimper,
			targetOpkRoster: member.targetOpkRoster,
			targetOpkFatigue: member.targetOpkFatigue,
			targetOpkLototo: member.targetOpkLototo,
		});
		setSheetOpen(true);
	};

	const handleAddNew = () => {
		setEditingMember(null);
		form.reset({
			nik: "",
			name: "",
			department: "Operation",
			jabatan: "",
			isPjo: false,
			isHse: false,
			...defaultTargets.pengawas,
		});
		setSheetOpen(true);
	};

	const handleDelete = (nik: string) => {
		deleteMember.mutate(
			{ nik },
			{
				onSuccess: () => {
					toast({ title: "Anggota dihapus" });
					invalidate();
				},
				onError: () =>
					toast({ title: "Gagal menghapus", variant: "destructive" }),
			},
		);
	};

	const handleToggleLeave = (member: TeamMember) => {
		const next = !member.isOnLeave;
		setLeave.mutate(
			{ nik: member.nik, data: { isOnLeave: next } },
			{
				onSuccess: () => {
					toast({
						title: next
							? `${member.name} ditandai CUTI`
							: `${member.name} kembali aktif`,
					});
					invalidate();
				},
				onError: () =>
					toast({
						title: "Gagal mengubah status cuti",
						variant: "destructive",
					}),
			},
		);
	};

	const isPending = upsertMember.isPending || updateMember.isPending;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0">
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
						Manajemen Tim
					</h1>
					<p className="mt-1 text-sm sm:text-base text-muted-foreground">
						Kelola profil, target laporan, dan status cuti anggota tim
					</p>
				</div>

				<Button
					onClick={handleAddNew}
					className="w-full gap-2 sm:w-auto shrink-0"
				>
					<Plus className="h-4 w-4" />
					Tambah Anggota
				</Button>
			</div>

			{/* Toolbar */}
			<div className="w-full rounded-xl border bg-background shadow-sm p-4">
				<div className="flex flex-col gap-4">
					{/* SEARCH + ROLE */}
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<div className="flex-1">
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Cari nama, NIK, jabatan, atau departemen..."
								className="h-10"
							/>
						</div>

						<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
							<Button
								variant={roleFilter === "all" ? "default" : "outline"}
								onClick={() => setRoleFilter("all")}
								className="h-10 w-full sm:w-auto"
							>
								Semua Role
							</Button>

							<Button
								variant={roleFilter === "pjo" ? "default" : "outline"}
								onClick={() => setRoleFilter("pjo")}
								className="h-10 w-full sm:w-auto"
							>
								PJO
							</Button>

							<Button
								variant={roleFilter === "hse" ? "default" : "outline"}
								onClick={() => setRoleFilter("hse")}
								className="h-10 w-full sm:w-auto"
							>
								HSE
							</Button>

							<Button
								variant={roleFilter === "pengawas" ? "default" : "outline"}
								onClick={() => setRoleFilter("pengawas")}
								className="h-10 w-full sm:w-auto"
							>
								Pengawas
							</Button>
						</div>
					</div>

					{/* STATUS + RESULT */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium text-muted-foreground">
								Status:
							</span>

							<Button
								variant={statusFilter === "all" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setStatusFilter("all")}
							>
								Semua
							</Button>

							<Button
								variant={statusFilter === "active" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setStatusFilter("active")}
							>
								Aktif
							</Button>

							<Button
								variant={statusFilter === "leave" ? "secondary" : "ghost"}
								size="sm"
								onClick={() => setStatusFilter("leave")}
							>
								Cuti
							</Button>
						</div>

						<div className="flex items-center justify-between gap-4">
							<span className="text-xs text-muted-foreground">
								Menampilkan{" "}
								<span className="font-semibold text-foreground">
									{filteredMembers.length}
								</span>{" "}
								dari{" "}
								<span className="font-semibold text-foreground">
									{members?.length ?? 0}
								</span>{" "}
								anggota
							</span>

							<Button
								variant="link"
								size="sm"
								className="h-auto p-0 text-xs"
								onClick={() => {
									setSearchQuery("");
									setRoleFilter("all");
									setStatusFilter("all");
								}}
							>
								Reset Filter
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Member Cards Grid */}
			{isLoading ? (
				<div className="w-full max-w-[1400px] mx-auto space-y-4">
					{[...Array(6)].map((_, i) => (
						<Card key={i} className="h-40 animate-pulse bg-muted" />
					))}
				</div>
			) : (
				<div className="w-full">
					<div className="rounded-xl border bg-background shadow-sm overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[1180px] text-sm">
								<thead className="border-b bg-muted/50">
									<tr className="text-left">
										<th
											className="
	sticky left-0 z-20
	w-[90px] min-w-[90px]
	bg-background
	px-3 py-3
  text-center
	font-semibold
	whitespace-nowrap
	border-r
	md:static md:w-auto md:min-w-0
"
										>
											Action
										</th>
										<th className="px-4 py-3 text-center font-semibold whitespace-nowrap">
											Status
										</th>
										<th className="px-4 py-3 text-center font-semibold whitespace-nowrap">
											NIK
										</th>
										<th className="px-4 py-3 font-semibold whitespace-nowrap">
											Employee
										</th>
										<th className="px-4 py-3 font-semibold whitespace-nowrap">
											Jabatan
										</th>
										<th className="px-4 py-3 text-center font-semibold whitespace-nowrap">
											Role
										</th>
										<th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
											TTA
										</th>
										<th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
											Hazard
										</th>
										<th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
											Inspeksi
										</th>
										<th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
											Observasi
										</th>
										<th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
											OPK
										</th>
									</tr>
								</thead>

								<tbody className="divide-y">
									{filteredMembers.map((member) => (
										<tr
											key={member.nik}
											className={`transition-colors hover:bg-muted/30 ${
												member.isOnLeave
													? "bg-amber-50/40 dark:bg-amber-950/10"
													: ""
											}`}
										>
											{/* ACTION */}
											<td
												className="
	sticky left-0 z-10
	w-[90px] min-w-[90px]
	bg-background
	px-3 py-2.5
	border-r
	md:static md:w-auto md:min-w-0
"
											>
												<div className="flex items-center justify-center gap-2">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={() => handleEdit(member)}
														title="Edit anggota"
													>
														<Edit2 className="h-4 w-4" />
													</Button>

													<AlertDialog>
														<AlertDialogTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 text-destructive hover:text-destructive"
																title="Hapus anggota"
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</AlertDialogTrigger>

														<AlertDialogContent>
															<AlertDialogHeader>
																<AlertDialogTitle>
																	Hapus Anggota?
																</AlertDialogTitle>
																<AlertDialogDescription>
																	Apakah Anda yakin ingin menghapus{" "}
																	<strong>{member.name}</strong> dari daftar
																	tim? Tindakan ini tidak dapat dibatalkan.
																</AlertDialogDescription>
															</AlertDialogHeader>

															<AlertDialogFooter>
																<AlertDialogCancel>Batal</AlertDialogCancel>
																<AlertDialogAction
																	onClick={() => handleDelete(member.nik)}
																	className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
																>
																	Hapus
																</AlertDialogAction>
															</AlertDialogFooter>
														</AlertDialogContent>
													</AlertDialog>
												</div>
											</td>

											{/* STATUS */}
											<td className="px-4 py-2.5">
												<div className="flex items-center justify-center gap-2">
													<Switch
														checked={member.isOnLeave}
														onCheckedChange={() => handleToggleLeave(member)}
														className="data-[state=checked]:bg-amber-500"
													/>

													<Badge
														variant={member.isOnLeave ? "secondary" : "default"}
														className={
															member.isOnLeave
																? "bg-amber-100 text-amber-700 hover:bg-amber-100"
																: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
														}
													>
														{member.isOnLeave ? "CUTI" : "ONSITE"}
													</Badge>
												</div>
											</td>

											{/* NIK */}
											<td className="px-4 py-2.5 text-center font-mono text-xs whitespace-nowrap">
												{member.nik}
											</td>

											{/* EMPLOYEE */}
											<td className="px-4 py-2.5">
												<div className="min-w-[190px]">
													<div className="font-semibold whitespace-nowrap">
														{member.name}
													</div>
													<div className="text-xs text-muted-foreground">
														{member.department}
													</div>
												</div>
											</td>

											{/* JABATAN */}
											<td className="px-4 py-3 whitespace-nowrap min-w-[190px]">
												{member.jabatan}
											</td>

											{/* ROLE */}
											<td className="px-4 py-2.5 text-center">
												<RoleBadge member={member} />
											</td>

											{/* TTA */}
											<td className="px-4 py-3 text-center">
												<span className="inline-flex min-w-[36px] justify-center rounded-md bg-muted px-2 py-1 font-semibold">
													{member.targetTta ?? 0}
												</span>
											</td>

											{/* HAZARD */}
											<td className="px-4 py-3 text-center">
												<span className="inline-flex min-w-[36px] justify-center rounded-md bg-red-50 px-2 py-1 font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
													{member.targetHazard ?? 0}
												</span>
											</td>

											{/* INSPEKSI */}
											<td className="px-4 py-3 text-center">
												<span className="inline-flex min-w-[36px] justify-center rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
													{member.targetInspeksi ?? 0}
												</span>
											</td>

											{/* OBSERVASI */}
											<td className="px-4 py-3 text-center">
												<span className="inline-flex min-w-[36px] justify-center rounded-md bg-green-50 px-2 py-1 font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-400">
													{member.targetObservasi ?? 0}
												</span>
											</td>

											{/* OPK */}
											<td className="px-4 py-2">
												<div className="flex flex-wrap gap-1 max-w-[340px]">
													{member.isPjo ? (
														<span className="text-xs text-muted-foreground">
															-
														</span>
													) : member.isHse ? (
														<>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																Pengawas:{" "}
																{member.targetOpkKeberadaanPengawas ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																Fungsi: {member.targetOpkFungsiPengawas ?? 0}
															</Badge>
														</>
													) : (
														<>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																P2H: {member.targetOpkP2h ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																SB: {member.targetOpkSeatbelt ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																SIMPER: {member.targetOpkSimper ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																Roster: {member.targetOpkRoster ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																Fatigue: {member.targetOpkFatigue ?? 0}
															</Badge>
															<Badge
																variant="outline"
																className="text-[10px] px-2 py-0.5"
															>
																Lototo: {member.targetOpkLototo ?? 0}
															</Badge>
														</>
													)}
												</div>
											</td>
										</tr>
									))}

									{filteredMembers.length === 0 && (
										<tr>
											<td
												colSpan={11}
												className="px-4 py-12 text-center text-muted-foreground"
											>
												Tidak ada anggota yang sesuai dengan filter.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			{/* Edit/Add Sheet Drawer */}
			<Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
				<DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] overflow-hidden p-0">
					<div className="border-b px-6 py-4">
						<DialogHeader>
							<DialogTitle className="text-xl">
								{editingMember ? "Edit Anggota" : "Tambah Anggota"}
							</DialogTitle>

							<DialogDescription>
								{editingMember
									? "Perbarui profil, role, dan target pelaporan anggota."
									: "Lengkapi profil, role, dan target pelaporan anggota."}
							</DialogDescription>
						</DialogHeader>
					</div>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex max-h-[calc(90vh-140px)] flex-col"
						>
							<div className="flex-1 overflow-y-auto px-6 py-6">
								<div className="space-y-6">
									{/* Profile */}
									<div className="space-y-4">
										<div>
											<h3 className="text-sm font-semibold">Profil Anggota</h3>

											<p className="mt-1 text-xs text-muted-foreground">
												Informasi dasar anggota tim.
											</p>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name="nik"
												render={({ field }) => (
													<FormItem className="space-y-2">
														<FormLabel className="text-sm font-medium">
															NIK
														</FormLabel>
														<FormControl>
															<Input
																{...field}
																disabled={!!editingMember}
																placeholder="C-012345"
																className="h-10"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="name"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-xs">
															Nama Lengkap
														</FormLabel>
														<FormControl>
															<Input {...field} placeholder="Nama lengkap" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="department"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-xs">
															Departemen
														</FormLabel>
														<FormControl>
															<Input {...field} placeholder="Operation" />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
											<FormField
												control={form.control}
												name="jabatan"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-xs">Jabatan</FormLabel>
														<FormControl>
															<Input
																{...field}
																placeholder="Contoh: Team Leader"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</div>

									<Separator />

									{/* Role */}

									<div className="space-y-4">
										<div>
											<h3 className="text-sm font-semibold">
												Role & Responsibility
											</h3>

											<p className="mt-1 text-xs text-muted-foreground">
												Pilih role untuk menerapkan preset target standar.
											</p>
										</div>
										<div className="grid grid-cols-3 gap-2">
											<Button
												type="button"
												size="sm"
												variant={watchPjo ? "default" : "outline"}
												className={`h-12 ${
													watchPjo
														? "border-primary bg-primary text-primary-foreground"
														: ""
												}`}
												onClick={() => applyPreset("pjo")}
											>
												PJO
											</Button>
											<Button
												type="button"
												size="sm"
												variant={watchHse && !watchPjo ? "default" : "outline"}
												className={`h-12 ${
													watchHse
														? "border-primary bg-primary text-primary-foreground"
														: ""
												}`}
												onClick={() => applyPreset("hse")}
											>
												HSE
											</Button>
											<Button
												type="button"
												size="sm"
												variant={!watchPjo && !watchHse ? "default" : "outline"}
												className={`h-12 ${
													!watchPjo && !watchHse
														? "border-primary bg-primary text-primary-foreground"
														: ""
												}`}
												onClick={() => applyPreset("pengawas")}
											>
												Pengawas
											</Button>
										</div>
										<p className="text-xs text-muted-foreground">
											Preset akan mengisi target standar secara otomatis. Target
											masih dapat disesuaikan secara manual.
										</p>
									</div>

									<Separator />

									{/* Shared Targets */}
									<div className="space-y-4">
										<div>
											<h3 className="text-sm font-semibold">Target SAP</h3>

											<p className="mt-1 text-xs text-muted-foreground">
												Target laporan keselamatan mingguan anggota.
											</p>
										</div>
										<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
											<div className="rounded-lg border bg-muted/20 p-3">
												<TargetInput
													control={form.control}
													name="targetTta"
													label="TTA"
												/>
											</div>
											<div className="rounded-lg border bg-muted/20 p-3">
												<TargetInput
													control={form.control}
													name="targetHazard"
													label="Hazard"
												/>
											</div>
											<div className="rounded-lg border bg-muted/20 p-3">
												<TargetInput
													control={form.control}
													name="targetInspeksi"
													label="Inspeksi"
												/>
											</div>
											<div className="rounded-lg border bg-muted/20 p-3">
												<TargetInput
													control={form.control}
													name="targetObservasi"
													label="Observasi"
												/>
											</div>
										</div>
									</div>

									{/* OPK targets — visible only when not PJO */}
									{!watchPjo && (
										<>
											<Separator />

											<div className="space-y-4">
												<div>
													<h3 className="text-sm font-semibold">
														Target OPK — {watchHse ? "HSE" : "Pengawas"}
													</h3>

													<p className="mt-1 text-xs text-muted-foreground">
														Target OPK disesuaikan dengan tanggung jawab role
														anggota.
													</p>
												</div>
												{watchHse ? (
													<div className="grid grid-cols-2 gap-4">
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkKeberadaanPengawas"
																label="Keberadaan Pengawas"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkFungsiPengawas"
																label="Fungsi Pengawas"
															/>
														</div>
													</div>
												) : (
													<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkP2h"
																label="P2H"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkSeatbelt"
																label="Seatbelt"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkSimper"
																label="SIMPER"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkRoster"
																label="Roster"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkFatigue"
																label="Fatigue"
															/>
														</div>
														<div className="rounded-lg border bg-muted/20 p-3">
															<TargetInput
																control={form.control}
																name="targetOpkLototo"
																label="Lototo"
															/>
														</div>
													</div>
												)}
											</div>
										</>
									)}
								</div>
							</div>

							<div className="shrink-0 border-t bg-background px-6 py-4">
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										onClick={() => setSheetOpen(false)}
									>
										Batal
									</Button>

									<Button type="submit" disabled={isPending}>
										{isPending
											? "Menyimpan..."
											: editingMember
												? "Simpan Perubahan"
												: "Tambah Anggota"}
									</Button>
								</div>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
