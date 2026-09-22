import { useEffect, useState } from "react";

import {
	useSafetyCampaigns,
	useCreateSafetyCampaign,
	useUploadSafetyCampaignImages,
	useUpdateSafetyCampaign,
	useDeleteSafetyCampaignImage,
	useDeleteSafetyCampaign,
} from "@/api-client";

import type { SafetyCampaign } from "@/api-client/safety-campaign";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import {
	CalendarDays,
	Image as ImageIcon,
	Megaphone,
	Plus,
	Trash2,
	Upload,
	Pencil,
	X,
	MoreVertical,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { useToast } from "@/hooks/use-toast";

export default function SafetyCampaign() {
	const { toast } = useToast();
	const { data: response, isLoading, isError } = useSafetyCampaigns();

	const campaigns = response?.data ?? [];

	const [showCreateDialog, setShowCreateDialog] = useState(false);

	const [editingCampaign, setEditingCampaign] = useState<SafetyCampaign | null>(
		null,
	);

	const [managingCampaign, setManagingCampaign] =
		useState<SafetyCampaign | null>(null);

	const [deletingCampaign, setDeletingCampaign] =
		useState<SafetyCampaign | null>(null);

	const deleteCampaign = useDeleteSafetyCampaign();
	const handleDeleteCampaign = async () => {
		if (!deletingCampaign) {
			return;
		}

		try {
			await deleteCampaign.mutateAsync({
				id: deletingCampaign.id,
			});

			toast({
				title: "Campaign berhasil dihapus",
				description: `${deletingCampaign.title} telah dihapus.`,
			});

			setDeletingCampaign(null);
		} catch (error) {
			console.error("Delete safety campaign error:", error);

			toast({
				title: "Gagal menghapus campaign",
				description:
					error instanceof Error
						? error.message
						: "Terjadi kesalahan saat menghapus campaign.",
				variant: "destructive",
			});
		}
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<PageHeader onAdd={() => setShowCreateDialog(true)} />

				<Card>
					<CardContent className="py-12 text-center text-muted-foreground">
						Memuat data Safety Campaign...
					</CardContent>
				</Card>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="space-y-6">
				<PageHeader onAdd={() => setShowCreateDialog(true)} />

				<Card>
					<CardContent className="py-12 text-center text-destructive">
						Gagal mengambil data Safety Campaign.
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader onAdd={() => setShowCreateDialog(true)} />

			{/* Empty state */}
			{campaigns.length === 0 && (
				<Card>
					<CardContent className="py-16 text-center">
						<Megaphone className="h-12 w-12 mx-auto text-muted-foreground/40" />

						<h2 className="mt-4 text-lg font-semibold">
							Belum ada Safety Campaign
						</h2>

						<p className="mt-1 text-sm text-muted-foreground">
							Tambahkan campaign keselamatan untuk mulai menampilkan poster.
						</p>

						<Button className="mt-5" onClick={() => setShowCreateDialog(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Tambah Campaign
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Campaign list */}
			<div className="grid gap-6">
				{campaigns.map((campaign) => (
					<CampaignCard
						key={campaign.id}
						campaign={campaign}
						onEdit={setEditingCampaign}
						onManagePosters={setManagingCampaign}
						onDelete={setDeletingCampaign}
					/>
				))}
			</div>
			<EditCampaignDialog
				campaign={editingCampaign}
				open={editingCampaign !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditingCampaign(null);
					}
				}}
			/>

			<ManageCampaignImagesDialog
				campaign={managingCampaign}
				open={!!managingCampaign}
				onOpenChange={(open) => {
					if (!open) setManagingCampaign(null);
				}}
			/>

			<DeleteCampaignDialog
				campaign={deletingCampaign}
				open={deletingCampaign !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeletingCampaign(null);
					}
				}}
				onConfirm={handleDeleteCampaign}
				isDeleting={deleteCampaign.isPending}
			/>

			<CreateCampaignDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>
		</div>
	);
}

function PageHeader({ onAdd }: { onAdd: () => void }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<div className="flex items-center gap-2">
					<Megaphone className="h-7 w-7" />

					<h1 className="text-3xl font-bold tracking-tight">Safety Campaign</h1>
				</div>

				<p className="text-muted-foreground mt-1">
					Kelola campaign keselamatan mingguan.
				</p>
			</div>

			<Button onClick={onAdd}>
				<Plus className="mr-2 h-4 w-4" />
				Tambah Campaign
			</Button>
		</div>
	);
}

function CampaignCard({
	campaign,
	onEdit,
	onManagePosters,
	onDelete,
}: {
	campaign: SafetyCampaign;
	onEdit: (campaign: SafetyCampaign) => void;
	onManagePosters: (campaign: SafetyCampaign) => void;
	onDelete: (campaign: SafetyCampaign) => void;
}) {
	const [activeImage, setActiveImage] = useState(0);

	const images = campaign.images ?? [];

	const currentImage = images[activeImage];

	useEffect(() => {
		if (activeImage >= images.length) {
			setActiveImage(Math.max(0, images.length - 1));
		}
	}, [activeImage, images.length]);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<Badge variant="outline">
								WEEK {campaign.week} • {campaign.year}
							</Badge>

							{campaign.isActive ? (
								<Badge className="bg-emerald-600 hover:bg-emerald-600">
									AKTIF
								</Badge>
							) : (
								<Badge variant="secondary">NONAKTIF</Badge>
							)}
						</div>

						<CardTitle className="mt-3 text-2xl">{campaign.title}</CardTitle>

						{campaign.highlight && (
							<p className="mt-2 max-w-3xl text-sm text-muted-foreground">
								{campaign.highlight}
							</p>
						)}

						{(campaign.startDate || campaign.endDate) && (
							<div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
								<CalendarDays className="h-4 w-4" />

								<span>
									{campaign.startDate ?? "-"} → {campaign.endDate ?? "-"}
								</span>
							</div>
						)}
					</div>
					<div className="flex flex-wrap items-center justify-between gap-9">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<ImageIcon className="h-4 w-4" />
							{images.length} poster
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10"
									aria-label="Campaign actions"
								>
									<MoreVertical className="h-5 w-5" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuItem onClick={() => onEdit(campaign)}>
									<Pencil className="mr-2 h-4 w-4" />
									Edit Campaign
								</DropdownMenuItem>

								<DropdownMenuItem onClick={() => onManagePosters(campaign)}>
									<ImageIcon className="mr-2 h-4 w-4" />
									Kelola Poster
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem
									className="text-destructive focus:text-destructive"
									onClick={() => onDelete(campaign)}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Hapus Campaign
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{images.length === 0 ? (
					<div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
						Belum ada poster untuk campaign ini.
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex justify-center rounded-xl bg-muted/30 p-4">
							<img
								src={currentImage.filePath}
								alt={`${campaign.title} poster`}
								className="max-h-[620px] w-auto max-w-full rounded-lg object-contain shadow-sm"
							/>
						</div>

						{images.length > 1 && (
							<div className="flex justify-center gap-2">
								{images.map((image, index) => (
									<button
										key={image.id}
										type="button"
										onClick={() => setActiveImage(index)}
										className={`h-16 w-12 overflow-hidden rounded-md border-2 transition ${
											index === activeImage
												? "border-primary"
												: "border-transparent opacity-60 hover:opacity-100"
										}`}
									>
										<img
											src={image.filePath}
											alt={`Poster ${index + 1}`}
											className="h-full w-full object-cover"
										/>
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ManageCampaignImagesDialog({
	campaign,
	open,
	onOpenChange,
}: {
	campaign: SafetyCampaign | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { toast } = useToast();

	const uploadImages = useUploadSafetyCampaignImages();
	const deleteImage = useDeleteSafetyCampaignImage();

	const [files, setFiles] = useState<File[]>([]);

	const images = campaign?.images ?? [];
	const remainingSlots = Math.max(0, 10 - images.length);

	const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(event.target.files ?? []);

		if (!selectedFiles.length) return;

		const allowedFiles = selectedFiles.filter((file) =>
			["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(
				file.type,
			),
		);

		if (allowedFiles.length !== selectedFiles.length) {
			toast({
				title: "File tidak valid",
				description: "Hanya PNG, JPG, JPEG, dan WEBP yang diperbolehkan.",
				variant: "destructive",
			});
		}

		if (allowedFiles.length > remainingSlots) {
			toast({
				title: "Maksimal 10 poster",
				description: `Campaign ini masih dapat menambahkan ${remainingSlots} poster.`,
				variant: "destructive",
			});

			setFiles(allowedFiles.slice(0, remainingSlots));
			return;
		}

		setFiles(allowedFiles);
	};

	const handleUpload = async () => {
		if (!campaign || files.length === 0) return;

		try {
			await uploadImages.mutateAsync({
				campaignId: campaign.id,
				files,
			});

			toast({
				title: "Poster berhasil ditambahkan",
				description: `${files.length} poster berhasil diupload.`,
			});

			setFiles([]);
		} catch (error) {
			console.error(error);

			toast({
				title: "Gagal upload poster",
				description: "Poster tidak berhasil ditambahkan.",
				variant: "destructive",
			});
		}
	};

	const handleDelete = async (imageId: number) => {
		if (!campaign) return;

		const confirmed = window.confirm(
			"Hapus poster ini? Poster akan dihapus secara permanen.",
		);

		if (!confirmed) return;

		try {
			await deleteImage.mutateAsync({
				campaignId: campaign.id,
				imageId,
			});

			toast({
				title: "Poster dihapus",
				description: "Poster berhasil dihapus.",
			});
		} catch (error) {
			console.error(error);

			toast({
				title: "Gagal menghapus poster",
				description: "Poster tidak berhasil dihapus.",
				variant: "destructive",
			});
		}
	};

	const handleClose = () => {
		setFiles([]);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl">
				<DialogHeader>
					<DialogTitle>Kelola Poster</DialogTitle>

					<DialogDescription>
						Kelola poster untuk campaign{" "}
						<span className="font-semibold text-foreground">
							{campaign?.title}
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Existing Posters */}
					<div>
						<div className="mb-3 flex items-center justify-between">
							<div>
								<h3 className="font-semibold">Poster Campaign</h3>
								<p className="text-sm text-muted-foreground">
									{images.length} dari 10 poster
								</p>
							</div>

							<Badge
								variant={images.length >= 10 ? "destructive" : "secondary"}
							>
								{images.length}/10
							</Badge>
						</div>

						{images.length === 0 ? (
							<div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed">
								<div className="text-center">
									<ImageIcon className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
									<p className="font-medium">Belum ada poster</p>
									<p className="text-sm text-muted-foreground">
										Tambahkan poster menggunakan form di bawah.
									</p>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
								{images.map((image, index) => (
									<div
										key={image.id}
										className="group relative overflow-hidden rounded-lg border bg-muted"
									>
										<img
											src={image.filePath}
											alt={`Poster ${index + 1}`}
											className="aspect-[3/4] w-full object-cover"
										/>

										<div className="absolute left-2 top-2">
											<Badge variant="secondary">Poster {index + 1}</Badge>
										</div>

										<button
											type="button"
											onClick={() => handleDelete(image.id)}
											disabled={deleteImage.isPending}
											className="
                        absolute right-2 top-2
                        flex h-8 w-8 items-center justify-center
                        rounded-full
                        bg-destructive text-destructive-foreground
                        opacity-0
                        shadow-md
                        transition-opacity
                        group-hover:opacity-100
                        disabled:pointer-events-none
                        disabled:opacity-50
                      "
											title="Hapus poster"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Upload */}
					{remainingSlots > 0 && (
						<div className="rounded-lg border p-4">
							<div className="mb-3">
								<h3 className="font-semibold">Tambah Poster</h3>
								<p className="text-sm text-muted-foreground">
									Tambahkan hingga {remainingSlots} poster lagi.
								</p>
							</div>

							<Input
								type="file"
								accept="image/png,image/jpeg,image/webp"
								multiple
								onChange={handleFilesChange}
							/>

							{files.length > 0 && (
								<div className="mt-3 space-y-2">
									<p className="text-sm font-medium">
										{files.length} file dipilih
									</p>

									<div className="space-y-1">
										{files.map((file) => (
											<div
												key={`${file.name}-${file.size}`}
												className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
											>
												<span className="truncate">{file.name}</span>

												<span className="ml-3 shrink-0 text-muted-foreground">
													{(file.size / 1024 / 1024).toFixed(1)} MB
												</span>
											</div>
										))}
									</div>

									<Button
										type="button"
										onClick={handleUpload}
										disabled={uploadImages.isPending}
										className="mt-2"
									>
										<Upload className="mr-2 h-4 w-4" />
										{uploadImages.isPending
											? "Mengupload..."
											: `Upload ${files.length} Poster`}
									</Button>
								</div>
							)}
						</div>
					)}

					{remainingSlots === 0 && (
						<div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
							Maksimal 10 poster telah tercapai. Hapus poster terlebih dahulu
							jika ingin menambahkan poster baru.
						</div>
					)}
				</div>

				<DialogFooter>
					<Button type="button" onClick={handleClose}>
						Selesai
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CreateCampaignDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { toast } = useToast();

	const createCampaign = useCreateSafetyCampaign();
	const uploadImages = useUploadSafetyCampaignImages();

	const currentYear = new Date().getFullYear();

	const [week, setWeek] = useState("");
	const [year, setYear] = useState(String(currentYear));
	const [title, setTitle] = useState("");
	const [highlight, setHighlight] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [isActive, setIsActive] = useState(true);

	const [files, setFiles] = useState<File[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);

	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		const urls = files.map((file) => URL.createObjectURL(file));

		setPreviews(urls);

		return () => {
			urls.forEach((url) => URL.revokeObjectURL(url));
		};
	}, [files]);

	const resetForm = () => {
		setWeek("");
		setYear(String(currentYear));
		setTitle("");
		setHighlight("");
		setStartDate("");
		setEndDate("");
		setIsActive(true);
		setFiles([]);
		setPreviews([]);
		setIsSubmitting(false);
	};

	const handleOpenChange = (value: boolean) => {
		if (isSubmitting) return;

		if (!value) {
			resetForm();
		}

		onOpenChange(value);
	};

	const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = Array.from(event.target.files ?? []);

		if (selectedFiles.length === 0) return;

		const availableSlots = 10 - files.length;

		if (availableSlots <= 0) {
			toast({
				title: "Maksimal 10 poster",
				description: "Campaign hanya dapat memiliki maksimal 10 poster.",
				variant: "destructive",
			});

			event.target.value = "";
			return;
		}

		const acceptedFiles: File[] = [];

		for (const file of selectedFiles.slice(0, availableSlots)) {
			const validType = ["image/png", "image/jpeg", "image/webp"].includes(
				file.type,
			);

			if (!validType) {
				toast({
					title: "Format file tidak valid",
					description: `${file.name} bukan PNG, JPG, JPEG, atau WEBP.`,
					variant: "destructive",
				});

				continue;
			}

			if (file.size > 10 * 1024 * 1024) {
				toast({
					title: "File terlalu besar",
					description: `${file.name} melebihi batas 10 MB.`,
					variant: "destructive",
				});

				continue;
			}

			acceptedFiles.push(file);
		}

		if (acceptedFiles.length > 0) {
			setFiles((previous) => [...previous, ...acceptedFiles]);
		}

		event.target.value = "";
	};

	const removeFile = (index: number) => {
		setFiles((previous) =>
			previous.filter((_, fileIndex) => fileIndex !== index),
		);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const weekNumber = Number(week);
		const yearNumber = Number(year);

		if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
			toast({
				title: "Week tidak valid",
				description: "Week harus berada antara 1 sampai 53.",
				variant: "destructive",
			});
			return;
		}

		if (
			!Number.isInteger(yearNumber) ||
			yearNumber < 2000 ||
			yearNumber > 2100
		) {
			toast({
				title: "Year tidak valid",
				description: "Masukkan tahun yang valid.",
				variant: "destructive",
			});
			return;
		}

		if (!title.trim()) {
			toast({
				title: "Judul wajib diisi",
				description: "Masukkan judul Safety Campaign.",
				variant: "destructive",
			});
			return;
		}

		if (startDate && endDate && startDate > endDate) {
			toast({
				title: "Tanggal tidak valid",
				description: "Tanggal mulai tidak boleh setelah tanggal selesai.",
				variant: "destructive",
			});
			return;
		}

		if (files.length === 0) {
			toast({
				title: "Poster belum dipilih",
				description: "Pilih minimal 1 poster untuk campaign.",
				variant: "destructive",
			});
			return;
		}

		try {
			setIsSubmitting(true);

			const campaign = await createCampaign.mutateAsync({
				week: weekNumber,
				year: yearNumber,
				title: title.trim(),
				highlight: highlight.trim() || null,
				startDate: startDate || null,
				endDate: endDate || null,
				isActive,
			});

			await uploadImages.mutateAsync({
				campaignId: campaign.id,
				files,
			});

			toast({
				title: "Safety Campaign berhasil dibuat",
				description: `${campaign.title} berhasil disimpan bersama ${files.length} poster.`,
			});

			onOpenChange(false);
			resetForm();
		} catch (error) {
			console.error("Create safety campaign error:", error);

			toast({
				title: "Gagal menyimpan campaign",
				description:
					error instanceof Error
						? error.message
						: "Terjadi kesalahan saat menyimpan Safety Campaign.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Tambah Safety Campaign</DialogTitle>

					<DialogDescription>
						Tambahkan campaign keselamatan mingguan beserta poster yang akan
						ditampilkan di dashboard.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-5">
					{/* Week & Year */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label htmlFor="campaign-week" className="text-sm font-medium">
								Week
							</label>

							<Input
								id="campaign-week"
								type="number"
								min={1}
								max={53}
								placeholder="36"
								value={week}
								onChange={(event) => setWeek(event.target.value)}
								required
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="campaign-year" className="text-sm font-medium">
								Year
							</label>

							<Input
								id="campaign-year"
								type="number"
								min={2000}
								max={2100}
								value={year}
								onChange={(event) => setYear(event.target.value)}
								required
							/>
						</div>
					</div>

					{/* Title */}
					<div className="space-y-2">
						<label htmlFor="campaign-title" className="text-sm font-medium">
							Judul / Headline
						</label>

						<Input
							id="campaign-title"
							placeholder="Contoh: SAFETY DRIVING"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							required
						/>
					</div>

					{/* Highlight */}
					<div className="space-y-2">
						<label htmlFor="campaign-highlight" className="text-sm font-medium">
							Highlight
						</label>

						<textarea
							id="campaign-highlight"
							placeholder="Pesan utama Safety Campaign..."
							value={highlight}
							onChange={(event) => setHighlight(event.target.value)}
							rows={3}
							className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>

					{/* Dates */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label
								htmlFor="campaign-start-date"
								className="text-sm font-medium"
							>
								Tanggal Mulai
							</label>

							<Input
								id="campaign-start-date"
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="campaign-end-date"
								className="text-sm font-medium"
							>
								Tanggal Selesai
							</label>

							<Input
								id="campaign-end-date"
								type="date"
								value={endDate}
								onChange={(event) => setEndDate(event.target.value)}
							/>
						</div>
					</div>

					{/* Active */}
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="text-sm font-medium">Status Campaign</p>

							<p className="text-xs text-muted-foreground mt-1">
								Campaign aktif dapat ditampilkan di dashboard.
							</p>
						</div>

						<Switch checked={isActive} onCheckedChange={setIsActive} />
					</div>

					{/* Poster upload */}
					<div className="space-y-3">
						<div>
							<label className="text-sm font-medium">Poster Campaign</label>

							<p className="text-xs text-muted-foreground mt-1">
								Maksimal 10 poster. PNG, JPG, JPEG, atau WEBP. Maksimal 10 MB
								per file.
							</p>
						</div>

						<label
							htmlFor="campaign-images"
							className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition hover:bg-muted/50"
						>
							<Upload className="h-8 w-8 text-muted-foreground mb-3" />

							<span className="text-sm font-medium">Pilih Poster</span>

							<span className="mt-1 text-xs text-muted-foreground">
								Bisa memilih beberapa file sekaligus
							</span>

							<input
								id="campaign-images"
								type="file"
								accept="image/png,image/jpeg,image/webp"
								multiple
								className="hidden"
								onChange={handleFiles}
								disabled={files.length >= 10}
							/>
						</label>

						{files.length > 0 && (
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
								{files.map((file, index) => (
									<div
										key={`${file.name}-${index}`}
										className="group relative overflow-hidden rounded-lg border bg-muted/20"
									>
										<img
											src={previews[index]}
											alt={file.name}
											className="aspect-[3/4] w-full object-cover"
										/>

										<button
											type="button"
											onClick={() => removeFile(index)}
											className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
											aria-label={`Hapus ${file.name}`}
										>
											<X className="h-4 w-4" />
										</button>

										<div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1.5 text-[11px] text-white truncate">
											{file.name}
										</div>
									</div>
								))}
							</div>
						)}

						{files.length > 0 && (
							<div className="text-xs text-muted-foreground">
								{files.length}/10 poster dipilih
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>

						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? (
								"Memproses..."
							) : (
								<>
									<Plus className="mr-2 h-4 w-4" />
									Simpan Campaign
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function EditCampaignDialog({
	campaign,
	open,
	onOpenChange,
}: {
	campaign: SafetyCampaign | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const updateCampaign = useUpdateSafetyCampaign();
	const uploadImages = useUploadSafetyCampaignImages();
	const deleteImage = useDeleteSafetyCampaignImage();
	const { toast } = useToast();

	const [week, setWeek] = useState("");
	const [year, setYear] = useState("");
	const [title, setTitle] = useState("");
	const [highlight, setHighlight] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [files, setFiles] = useState<File[]>([]);

	useEffect(() => {
		if (!campaign) return;

		setWeek(String(campaign.week));
		setYear(String(campaign.year));
		setTitle(campaign.title);
		setHighlight(campaign.highlight ?? "");
		setStartDate(campaign.startDate ?? "");
		setEndDate(campaign.endDate ?? "");
		setIsActive(campaign.isActive);
		setFiles([]);
	}, [campaign]);

	const handleSave = async () => {
		try {
			if (!title.trim()) {
				toast({
					title: "Judul wajib diisi",
					description: "Silakan isi judul Safety Campaign.",
					variant: "destructive",
				});
				return;
			}

			const weekNumber = Number(week);
			const yearNumber = Number(year);

			if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) {
				toast({
					title: "Week tidak valid",
					description: "Week harus berada antara 1 sampai 53.",
					variant: "destructive",
				});
				return;
			}

			if (!Number.isInteger(yearNumber) || yearNumber < 2000) {
				toast({
					title: "Year tidak valid",
					description: "Masukkan tahun yang valid.",
					variant: "destructive",
				});
				return;
			}

			await updateCampaign.mutateAsync({
				id: campaign.id,
				data: {
					week: weekNumber,
					year: yearNumber,
					title: title.trim(),
					highlight: highlight.trim() || null,
					startDate: startDate || null,
					endDate: endDate || null,
					isActive,
				},
			});

			if (files.length > 0) {
				await uploadImages.mutateAsync({
					campaignId: campaign.id,
					files,
				});
			}

			toast({
				title: "Berhasil",
				description: "Safety Campaign berhasil diperbarui.",
			});

			setFiles([]);
			onOpenChange(false);
		} catch (error) {
			console.error(error);

			toast({
				title: "Gagal",
				description:
					error instanceof Error
						? error.message
						: "Gagal memperbarui Safety Campaign.",
				variant: "destructive",
			});
		}
	};

	const handleDeleteImage = async (imageId: number) => {
		const confirmed = window.confirm(
			"Apakah kamu yakin ingin menghapus poster ini?",
		);

		if (!confirmed) {
			return;
		}

		try {
			await deleteImage.mutateAsync({
				campaignId: campaign.id,
				imageId,
			});

			toast({
				title: "Poster dihapus",
				description: "Poster berhasil dihapus dari campaign.",
			});
		} catch (error) {
			console.error(error);

			toast({
				title: "Gagal",
				description:
					error instanceof Error ? error.message : "Gagal menghapus poster.",
				variant: "destructive",
			});
		}
	};

	if (!campaign) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Edit Safety Campaign</DialogTitle>

					<DialogDescription>
						Ubah informasi Safety Campaign dan kelola poster.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-5">
					{/* WEEK & YEAR */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="edit-week">Week</Label>

							<Input
								id="edit-week"
								type="number"
								min={1}
								max={53}
								value={week}
								onChange={(e) => setWeek(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-year">Year</Label>

							<Input
								id="edit-year"
								type="number"
								value={year}
								onChange={(e) => setYear(e.target.value)}
							/>
						</div>
					</div>

					{/* TITLE */}
					<div className="space-y-2">
						<Label htmlFor="edit-title">Judul Campaign</Label>

						<Input
							id="edit-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Contoh: SAFETY DRIVING"
						/>
					</div>

					{/* HIGHLIGHT */}
					<div className="space-y-2">
						<Label htmlFor="edit-highlight">Highlight / Pesan Utama</Label>

						<Textarea
							id="edit-highlight"
							value={highlight}
							onChange={(e) => setHighlight(e.target.value)}
							placeholder="Tulis pesan utama Safety Campaign..."
							rows={4}
						/>
					</div>

					{/* DATE */}
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="edit-start-date">Tanggal Mulai</Label>

							<Input
								id="edit-start-date"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="edit-end-date">Tanggal Selesai</Label>

							<Input
								id="edit-end-date"
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
					</div>

					{/* ACTIVE */}
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<p className="font-medium">Campaign Aktif</p>

							<p className="text-sm text-muted-foreground">
								Campaign aktif dapat ditampilkan pada Dashboard.
							</p>
						</div>

						<Switch checked={isActive} onCheckedChange={setIsActive} />
					</div>

					{/* EXISTING POSTERS */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label>Poster Saat Ini</Label>

								<p className="text-sm text-muted-foreground">
									Poster yang sudah tersimpan pada campaign ini.
								</p>
							</div>

							<Badge variant="secondary">{campaign.images.length} poster</Badge>
						</div>

						{campaign.images.length === 0 ? (
							<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
								Belum ada poster.
							</div>
						) : (
							<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
								{campaign.images.map((image) => (
									<div
										key={image.id}
										className="group relative overflow-hidden rounded-lg border bg-muted"
									>
										<img
											src={image.filePath}
											alt={image.filename}
											className="aspect-[3/4] w-full object-cover"
										/>

										<Button
											type="button"
											size="icon"
											variant="destructive"
											className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
											onClick={() => handleDeleteImage(image.id)}
											disabled={deleteImage.isPending}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* ADD NEW POSTERS */}
					<div className="space-y-3">
						<div>
							<Label htmlFor="edit-images">Tambah Poster</Label>

							<p className="text-sm text-muted-foreground">
								Pilih satu atau beberapa poster baru.
							</p>
						</div>

						<Input
							id="edit-images"
							type="file"
							accept="image/png,image/jpeg,image/webp"
							multiple
							onChange={(e) => {
								const selected = Array.from(e.target.files ?? []);

								setFiles(selected.slice(0, 10));
							}}
						/>

						{files.length > 0 && (
							<div className="rounded-lg border bg-muted/30 p-3">
								<p className="mb-2 text-sm font-medium">
									Poster baru: {files.length}
								</p>

								<div className="space-y-1">
									{files.map((file, index) => (
										<div
											key={`${file.name}-${index}`}
											className="flex items-center justify-between text-sm"
										>
											<span className="truncate">{file.name}</span>

											<span className="ml-3 shrink-0 text-muted-foreground">
												{(file.size / 1024 / 1024).toFixed(1)} MB
											</span>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Batal
					</Button>

					<Button
						type="button"
						onClick={handleSave}
						disabled={
							updateCampaign.isPending ||
							uploadImages.isPending ||
							deleteImage.isPending
						}
					>
						{updateCampaign.isPending || uploadImages.isPending
							? "Menyimpan..."
							: "Simpan Perubahan"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteCampaignDialog({
	campaign,
	open,
	onOpenChange,
	onConfirm,
	isDeleting,
}: {
	campaign: SafetyCampaign | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isDeleting: boolean;
}) {
	if (!campaign) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Hapus Safety Campaign?</DialogTitle>

					<DialogDescription>
						Campaign ini akan dihapus secara permanen.
					</DialogDescription>
				</DialogHeader>

				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
					<p className="font-semibold">{campaign.title}</p>

					<p className="mt-1 text-sm text-muted-foreground">
						WEEK {campaign.week} • {campaign.year}
					</p>

					<p className="mt-3 text-sm text-destructive">
						⚠ Semua poster yang terkait dengan campaign ini juga akan dihapus
						secara permanen.
					</p>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isDeleting}
					>
						Batal
					</Button>

					<Button
						type="button"
						variant="destructive"
						onClick={onConfirm}
						disabled={isDeleting}
					>
						{isDeleting ? "Menghapus..." : "Hapus Campaign"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
