import { useState, useRef } from "react";
import {
	useUploadExcel,
	useListUploads,
	getListUploadsQueryKey,
	getListWeeksQueryKey,
	getGetDashboardQueryKey,
} from "@/api-client";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Upload,
	FileSpreadsheet,
	CheckCircle2,
	Loader2,
	AlertCircle,
	Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function UploadData() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isDragging, setIsDragging] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [uploadToDelete, setUploadToDelete] = useState<{
		id: number;
		filename: string;
	} | null>(null);
	const [deletingUploadId, setDeletingUploadId] = useState<number | null>(null);

	const { data: uploads, isLoading: isLoadingUploads } = useListUploads({
		query: { queryKey: getListUploadsQueryKey() },
	});

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const file = e.dataTransfer.files[0];
			if (file.name.endsWith(".xlsx")) {
				setSelectedFile(file);
			} else {
				toast({
					title: "File tidak valid",
					description: "Mohon upload file dengan ekstensi .xlsx",
					variant: "destructive",
				});
			}
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setSelectedFile(e.target.files[0]);
		}
	};

	const handleUpload = async () => {
		if (!selectedFile) return;

		setIsUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", selectedFile);

			const response = await fetch("/api/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error("Upload gagal");
			}

			const result = await response.json();

			toast({
				title: "Upload Berhasil",
				description: `Memproses ${result.rowsProcessed} baris. Ditemukan data untuk ${result.weeksFound.length} minggu.`,
			});

			setSelectedFile(null);
			if (fileInputRef.current) fileInputRef.current.value = "";

			queryClient.invalidateQueries({ queryKey: getListUploadsQueryKey() });
			queryClient.invalidateQueries({ queryKey: getListWeeksQueryKey() });
			queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
		} catch (error) {
			toast({
				title: "Upload Gagal",
				description: "Terjadi kesalahan saat mengupload file.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	const openDeleteDialog = (uploadId: number, filename: string) => {
		setUploadToDelete({
			id: uploadId,
			filename,
		});
		setDeleteDialogOpen(true);
	};

	const handleDeleteUpload = async () => {
		if (!uploadToDelete) return;

		const { id: uploadId, filename } = uploadToDelete;

		setDeletingUploadId(uploadId);

		try {
			const response = await fetch(`/api/uploads/${uploadId}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Gagal menghapus data upload");
			}

			toast({
				title: "Data Berhasil Dihapus",
				description: `Upload "${filename}" dan data terkait telah dihapus.`,
			});

			queryClient.invalidateQueries({
				queryKey: getListUploadsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getListWeeksQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getGetDashboardQueryKey(),
			});

			setDeleteDialogOpen(false);
			setUploadToDelete(null);
		} catch (error) {
			console.error("Delete upload error:", error);

			toast({
				title: "Gagal Menghapus",
				description:
					error instanceof Error
						? error.message
						: "Terjadi kesalahan saat menghapus data upload.",
				variant: "destructive",
			});
		} finally {
			setDeletingUploadId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Upload Data Excel</h1>
				<p className="text-muted-foreground mt-1">
					Upload file raw data SAP mingguan dari sistem BIB
				</p>
			</div>

			<Card>
				<CardContent className="p-8">
					<div
						className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => fileInputRef.current?.click()}
					>
						<input
							type="file"
							accept=".xlsx"
							className="hidden"
							ref={fileInputRef}
							onChange={handleFileChange}
						/>

						<div className="flex flex-col items-center justify-center space-y-4">
							<div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
								<FileSpreadsheet className="h-8 w-8 text-primary" />
							</div>

							{selectedFile ? (
								<div className="space-y-2">
									<p className="text-lg font-medium">{selectedFile.name}</p>
									<p className="text-sm text-muted-foreground">
										{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
							) : (
								<div className="space-y-2">
									<p className="text-lg font-medium">
										Klik untuk upload atau drag and drop
									</p>
									<p className="text-sm text-muted-foreground">
										Hanya mendukung format .xlsx
									</p>
								</div>
							)}
						</div>
					</div>

					<div className="mt-6 flex justify-end">
						<Button
							onClick={handleUpload}
							disabled={!selectedFile || isUploading}
							size="lg"
						>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Mengupload...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Riwayat Upload</CardTitle>
					<CardDescription>
						Daftar file Excel yang telah diupload sebelumnya
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoadingUploads ? (
						<div className="space-y-2">
							<div className="h-10 bg-muted/50 rounded animate-pulse" />
							<div className="h-10 bg-muted/50 rounded animate-pulse" />
							<div className="h-10 bg-muted/50 rounded animate-pulse" />
						</div>
					) : uploads && uploads.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nama File</TableHead>
									<TableHead>Tanggal Upload</TableHead>
									<TableHead>Minggu Ditemukan</TableHead>
									<TableHead className="text-right">Baris Diproses</TableHead>
									<TableHead className="w-[60px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{uploads.map((upload) => (
									<TableRow key={upload.id}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<FileSpreadsheet className="h-4 w-4 text-primary" />
												{upload.filename}
											</div>
										</TableCell>
										<TableCell>
											{format(
												new Date(upload.uploadedAt),
												"dd MMM yyyy, HH:mm",
											)}
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{upload.weeksFound.map((week) => (
													<span
														key={week}
														className="bg-muted px-2 py-0.5 rounded text-xs"
													>
														{week}
													</span>
												))}
											</div>
										</TableCell>
										<TableCell className="text-right">
											{upload.rowsProcessed.toLocaleString()}
										</TableCell>

										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												className="text-destructive hover:text-destructive hover:bg-destructive/10"
												disabled={deletingUploadId === upload.id}
												onClick={() =>
													openDeleteDialog(upload.id, upload.filename)
												}
												title="Hapus data upload"
											>
												{deletingUploadId === upload.id ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<Trash2 className="h-4 w-4" />
												)}
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-8 text-muted-foreground flex flex-col items-center">
							<AlertCircle className="h-8 w-8 mb-2 opacity-50" />
							<p>Belum ada riwayat upload.</p>
						</div>
					)}
				</CardContent>
			</Card>
			<AlertDialog
				open={deleteDialogOpen}
				onOpenChange={(open) => {
					if (deletingUploadId === null) {
						setDeleteDialogOpen(open);

						if (!open) {
							setUploadToDelete(null);
						}
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus data upload?</AlertDialogTitle>

						<AlertDialogDescription>
							Apakah Anda yakin ingin menghapus upload{" "}
							<strong className="text-foreground">
								{uploadToDelete?.filename}
							</strong>
							?
							<br />
							<br />
							Semua data SAP yang berasal dari upload ini juga akan dihapus dari
							dashboard.
							<br />
							<br />
							File asli di Google Drive tidak akan dihapus.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingUploadId !== null}>
							Batal
						</AlertDialogCancel>

						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeleteUpload();
							}}
							disabled={deletingUploadId !== null}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deletingUploadId !== null ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Menghapus...
								</>
							) : (
								<>
									<Trash2 className="mr-2 h-4 w-4" />
									Hapus Data
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
