import { useState } from "react";
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
				PJO
			</Badge>
		);
	if (member.isHse)
		return (
			<Badge
				variant="outline"
				className="text-[10px] py-0 px-1.5 border-blue-400 text-blue-600"
			>
				HSE
			</Badge>
		);
	return (
		<Badge
			variant="outline"
			className="text-[10px] py-0 px-1.5 border-emerald-400 text-emerald-600"
		>
			Pengawas
		</Badge>
	);
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function Members() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

	const { data: members, isLoading } = useListMembers({
		query: { queryKey: getListMembersQueryKey() },
	});
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
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Manajemen Tim</h1>
					<p className="text-muted-foreground mt-1">
						Kelola profil, target laporan, dan status cuti anggota tim
					</p>
				</div>
				<Button onClick={handleAddNew} className="gap-2">
					<Plus className="h-4 w-4" />
					Tambah Anggota
				</Button>
			</div>

			{/* Member Cards Grid */}
			{isLoading ? (
				<div className="max-w-6xl mx-auto space-y-4">
					{[...Array(6)].map((_, i) => (
						<Card key={i} className="h-40 animate-pulse bg-muted" />
					))}
				</div>
			) : (
				<div className="max-w-6xl mx-auto space-y-4">
					{members?.map((member) => (
						<Card
							key={member.nik}
							className={`transition-all ${member.isOnLeave ? "opacity-60 border-dashed" : ""}`}
						>
							{/* <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-semibold leading-tight">{member.name}</CardTitle>
                      <RoleBadge member={member} />
                      {member.isOnLeave && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-400 text-amber-600 gap-1">
                          <PlaneTakeoff className="h-2.5 w-2.5" />CUTI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{member.nik}</span>
                      <span>•</span>
                      <Building2 className="h-3 w-3" />
                      <span>{member.jabatan}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(member)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus {member.name}?</AlertDialogTitle>
                          <AlertDialogDescription>Data yang dihapus tidak dapat dikembalikan.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(member.nik)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader> */}
							<CardContent className="pt-5">
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="text-lg font-semibold">{member.name}</h3>

											<RoleBadge member={member} />

											{member.isOnLeave && (
												<Badge
													variant="outline"
													className="border-amber-400 text-amber-600 gap-1"
												>
													<PlaneTakeoff className="h-3 w-3" />
													CUTI
												</Badge>
											)}
										</div>

										<div className="text-sm text-muted-foreground mt-1">
											{member.nik} • {member.jabatan}
										</div>
									</div>

									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => handleEdit(member)}
										>
											<Edit2 className="h-4 w-4" />
										</Button>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="ghost" size="icon">
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</AlertDialogTrigger>

											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Hapus {member.name}?
													</AlertDialogTitle>

													<AlertDialogDescription>
														Data yang dihapus tidak dapat dikembalikan.
													</AlertDialogDescription>
												</AlertDialogHeader>

												<AlertDialogFooter>
													<AlertDialogCancel>Batal</AlertDialogCancel>

													<AlertDialogAction
														className="bg-destructive hover:bg-destructive/90"
														onClick={() => handleDelete(member.nik)}
													>
														Hapus
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</div>

								<Separator className="my-4" />
								{/* <Separator className="mb-3" /> */}
								{/* Target Summary */}
								{/* <div className="grid grid-cols-4 gap-1 mb-3"> */}
								<div className="flex items-center gap-8 mb-5">
									{[
										["TTA", member.targetTta],
										["Hazard", member.targetHazard],
										["Inspeksi", member.targetInspeksi],
										["Observasi", member.targetObservasi],
									].map(([label, value]) => (
										<div
											key={String(label)}
											className="flex flex-col items-center"
										>
											<span className="text-2xl font-bold">{value}</span>

											<span className="text-xs text-muted-foreground">
												{label}
											</span>
										</div>
									))}
								</div>

								{/* OPK Summary */}
								{!member.isPjo && (
									// <div className="bg-muted/30 rounded-md p-2 mb-3">
									<div className="mb-5">
										<div className="flex items-center gap-2 mb-3">
											<Target className="h-3 w-3 text-muted-foreground" />
											<span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
												Target OPK
											</span>
										</div>
										{member.isHse ? (
											<div className="flex gap-8">
												<div className="flex flex-col items-center">
													<span className="text-muted-foreground">
														Keberadaan Pengawas
													</span>
													<span className="font-bold">
														{member.targetOpkKeberadaanPengawas}
													</span>
												</div>
												<div className="flex flex-col items-center">
													<span className="text-muted-foreground">
														Fungsi Pengawas
													</span>
													<span className="font-bold">
														{member.targetOpkFungsiPengawas}
													</span>
												</div>
											</div>
										) : (
											// <div className="grid grid-cols-3 gap-1 text-[10px]">
											<div className="flex flex-wrap gap-8">
												{[
													["P2H", member.targetOpkP2h],
													["Seatbelt", member.targetOpkSeatbelt],
													["SIMPER", member.targetOpkSimper],
													["Roster", member.targetOpkRoster],
													["Fatigue", member.targetOpkFatigue],
													["Lototo", member.targetOpkLototo],
												].map(([l, v]) => (
													<div
														key={String(l)}
														className="flex flex-col items-center"
													>
														<span className="text-xl font-bold">{v}</span>
														<span className="text-xs text-muted-foreground">
															{l}
														</span>
													</div>
												))}
											</div>
										)}
									</div>
								)}

								{/* Leave toggle */}
								<Separator className="mb-4" />
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<PlaneTakeoff
											className={`h-3.5 w-3.5 ${member.isOnLeave ? "text-amber-500" : "text-muted-foreground"}`}
										/>
										<span className="text-sm text-muted-foreground">
											Status Cuti
										</span>
									</div>
									<Switch
										checked={member.isOnLeave}
										onCheckedChange={() => handleToggleLeave(member)}
										disabled={setLeave.isPending}
										className="data-[state=checked]:bg-amber-500 h-5 w-9"
									/>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Edit/Add Sheet Drawer */}
			<Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
					<DialogHeader className="mb-6">
						<DialogTitle className="flex items-center gap-2">
							{editingMember ? (
								<Edit2 className="h-4 w-4" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							{editingMember
								? `Edit — ${editingMember.name}`
								: "Tambah Anggota Baru"}
						</DialogTitle>
						<DialogDescription>
							{editingMember
								? "Perbarui profil, jabatan, dan target laporan anggota ini."
								: "Isi data profil dan target laporan mingguan anggota baru."}
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
							{/* Profile */}
							<div className="space-y-3">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Profil
								</h3>
								<div className="grid grid-cols-2 gap-3">
									<FormField
										control={form.control}
										name="nik"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-xs">NIK</FormLabel>
												<FormControl>
													<Input
														{...field}
														disabled={!!editingMember}
														placeholder="C-012345"
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
												<FormLabel className="text-xs">Nama Lengkap</FormLabel>
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
												<FormLabel className="text-xs">Departemen</FormLabel>
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
													<Input {...field} placeholder="Contoh: Team Leader" />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>

							<Separator />

							{/* Role */}
							<div className="space-y-3">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Peran & Preset Target
								</h3>
								<div className="grid grid-cols-3 gap-2">
									<Button
										type="button"
										size="sm"
										variant={watchPjo ? "default" : "outline"}
										className="text-xs h-8"
										onClick={() => applyPreset("pjo")}
									>
										PJO
									</Button>
									<Button
										type="button"
										size="sm"
										variant={watchHse && !watchPjo ? "default" : "outline"}
										className="text-xs h-8"
										onClick={() => applyPreset("hse")}
									>
										HSE
									</Button>
									<Button
										type="button"
										size="sm"
										variant={!watchPjo && !watchHse ? "default" : "outline"}
										className="text-xs h-8"
										onClick={() => applyPreset("pengawas")}
									>
										Pengawas
									</Button>
								</div>
								<p className="text-[10px] text-muted-foreground">
									Pilih preset untuk isi otomatis target standar, atau edit
									manual di bawah.
								</p>
							</div>

							<Separator />

							{/* Shared Targets */}
							<div className="space-y-3">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Target Laporan Mingguan
								</h3>
								<div className="grid grid-cols-4 gap-3">
									<TargetInput
										control={form.control}
										name="targetTta"
										label="TTA"
									/>
									<TargetInput
										control={form.control}
										name="targetHazard"
										label="Hazard"
									/>
									<TargetInput
										control={form.control}
										name="targetInspeksi"
										label="Inspeksi"
									/>
									<TargetInput
										control={form.control}
										name="targetObservasi"
										label="Observasi"
									/>
								</div>
							</div>

							{/* OPK targets — visible only when not PJO */}
							{!watchPjo && (
								<>
									<Separator />
									<div className="space-y-3">
										<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Target OPK — {watchHse ? "HSE" : "Pengawas"}
										</h3>
										{watchHse ? (
											<div className="grid grid-cols-2 gap-3">
												<TargetInput
													control={form.control}
													name="targetOpkKeberadaanPengawas"
													label="Keberadaan Pengawas"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkFungsiPengawas"
													label="Fungsi Pengawas"
												/>
											</div>
										) : (
											<div className="grid grid-cols-3 gap-3">
												<TargetInput
													control={form.control}
													name="targetOpkP2h"
													label="P2H"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkSeatbelt"
													label="Seatbelt"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkSimper"
													label="SIMPER"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkRoster"
													label="Roster"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkFatigue"
													label="Fatigue"
												/>
												<TargetInput
													control={form.control}
													name="targetOpkLototo"
													label="Lototo"
												/>
											</div>
										)}
									</div>
								</>
							)}

							<Separator />

							<div className="flex gap-3 pt-2">
								<Button
									type="button"
									variant="outline"
									className="flex-1"
									onClick={() => setSheetOpen(false)}
								>
									Batal
								</Button>
								<Button type="submit" className="flex-1" disabled={isPending}>
									{isPending ? "Menyimpan..." : "Simpan Perubahan"}
								</Button>
							</div>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
