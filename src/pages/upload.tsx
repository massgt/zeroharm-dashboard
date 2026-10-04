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
	Link2,
	CloudDownload,
	ChevronLeft,
	ChevronRight,
	Cloud,
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
	const [googleSheetUrl, setGoogleSheetUrl] = useState("");
	const [isImportingGoogle, setIsImportingGoogle] = useState(false);
	const [successDialogOpen, setSuccessDialogOpen] = useState(false);
	const [successTitle, setSuccessTitle] = useState("");
	const [successDescription, setSuccessDescription] = useState("");

	const [currentPage, setCurrentPage] = useState(1);

	const ITEMS_PER_PAGE = 10;
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [uploadToDelete, setUploadToDelete] = useState<{
		id: number;
		filename: string;
	} | null>(null);
	const [deletingUploadId, setDeletingUploadId] = useState<number | null>(null);

	const { data: uploads, isLoading: isLoadingUploads } = useListUploads({
		query: { queryKey: getListUploadsQueryKey() },
	});

	type UploadHistoryItem = NonNullable<typeof uploads>[number] & {
		sourceType?: "manual" | "google_sheet";
	};

	const uploadsWithSource = (uploads ?? []) as UploadHistoryItem[];

	const sortedUploads = [...uploadsWithSource].sort(
		(a, b) =>
			new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
	);

	const totalPages = Math.max(
		1,
		Math.ceil(sortedUploads.length / ITEMS_PER_PAGE),
	);

	const paginatedUploads = sortedUploads.slice(
		(currentPage - 1) * ITEMS_PER_PAGE,
		currentPage * ITEMS_PER_PAGE,
	);

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

		const CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB
		const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
		const sessionId = crypto.randomUUID();
		const apiUrl = import.meta.env.VITE_API_URL || "";

		setIsUploading(true);

		try {
			for (let index = 0; index < totalChunks; index++) {
				const start = index * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
				const chunk = selectedFile.slice(start, end);

				const urlResponse = await fetch(
					`${apiUrl}/api/upload/excel-chunk-url`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							sessionId,
							chunkIndex: index,
						}),
					},
				);

				if (!urlResponse.ok) {
					throw new Error(
						`Gagal mendapatkan upload URL untuk chunk ${index + 1}`,
					);
				}

				const urlResult = await urlResponse.json();

				// 2. Upload chunk langsung ke Supabase Storage
				const uploadResponse = await fetch(urlResult.signedUrl, {
					method: "PUT",
					headers: {
						"Content-Type":
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					},
					body: chunk,
				});

				if (!uploadResponse.ok) {
					throw new Error(
						`Gagal mengupload chunk ${index + 1} dari ${totalChunks}`,
					);
				}
			}

			// 3. Kirim daftar chunk ke backend untuk diproses
			const processResponse = await fetch(
				`${apiUrl}/api/upload/excel-chunked`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						filename: selectedFile.name,
						sessionId,
						totalChunks,
					}),
				},
			);

			if (!processResponse.ok) {
				const errorText = await processResponse.text();
				throw new Error(errorText || "Gagal memproses file Excel");
			}

			const result = await processResponse.json();

			setSuccessTitle("Upload Berhasil");
			setSuccessDescription(
				`Data Excel berhasil diproses. ${result.rowsProcessed.toLocaleString()} baris diproses dan ditemukan data untuk ${result.weeksFound.length} minggu.`,
			);

			setSuccessDialogOpen(true);
			setCurrentPage(1);
			setSelectedFile(null);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			queryClient.invalidateQueries({
				queryKey: getListUploadsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getListWeeksQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getGetDashboardQueryKey(),
			});
		} catch (error) {
			console.error("Upload Excel gagal:", error);

			toast({
				title: "Upload Gagal",
				description:
					error instanceof Error
						? error.message
						: "Terjadi kesalahan saat mengupload file.",
				variant: "destructive",
			});
		} finally {
			setIsUploading(false);
		}
	};

	const handleGoogleImport = async () => {
		if (!googleSheetUrl.trim()) {
			toast({
				title: "URL belum diisi",
				description: "Masukkan URL Google Spreadsheet terlebih dahulu.",
				variant: "destructive",
			});
			return;
		}

		setIsImportingGoogle(true);

		try {
			const apiUrl = import.meta.env.VITE_API_URL || "";

			const response = await fetch(`${apiUrl}/api/upload/google-sheet`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: googleSheetUrl.trim(),
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Import Google Sheet gagal");
			}

			setSuccessTitle("Import Google Sheet Berhasil");
			setSuccessDescription(
				`Data berhasil diimport dari Google Sheet. ${result.rowsProcessed.toLocaleString()} baris diproses dan ${result.minergoRows.toLocaleString()} data SAP ditemukan.`,
			);
			setSuccessDialogOpen(true);
			setCurrentPage(1);

			setGoogleSheetUrl("");

			queryClient.invalidateQueries({
				queryKey: getListUploadsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getListWeeksQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getGetDashboardQueryKey(),
			});
		} catch (error) {
			console.error("Google Sheet import error:", error);

			toast({
				title: "Import Google Sheet Gagal",
				description:
					error instanceof Error
						? error.message
						: "Terjadi kesalahan saat mengimport Google Sheet.",
				variant: "destructive",
			});
		} finally {
			setIsImportingGoogle(false);
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
			setCurrentPage(1);
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
			<div className="min-w-0">
				<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
					Upload Raw Data Zero Harm 2.0
				</h1>

				<p className="mt-1 text-sm sm:text-base text-muted-foreground">
					Import data Safety Accountability Program dari BIB
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* =========================
	    UPLOAD EXCEL
	========================= */}
				<Card className="border-slate-200 shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3 min-w-0">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
								<FileSpreadsheet className="h-5 w-5 text-emerald-600" />
							</div>

							<div className="min-w-0">
								<CardTitle className="text-base">Upload File Excel</CardTitle>
								<CardDescription className="mt-0.5 text-xs">
									Upload raw data SAP dari BIB
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<div
							className={`cursor-pointer rounded-lg border-2 border-dashed p-5 sm:p-8 text-center transition-colors ${
								isDragging
									? "border-primary bg-primary/5"
									: "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30"
							}`}
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

							<div className="flex flex-col items-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
									<FileSpreadsheet className="h-6 w-6 text-emerald-600" />
								</div>

								{selectedFile ? (
									<>
										<p
											className="mt-3 w-full max-w-full truncate px-2 sm:px-4 text-sm font-semibold"
											title={selectedFile.name}
										>
											{selectedFile.name}
										</p>

										<p className="mt-1 text-xs text-muted-foreground">
											{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</>
								) : (
									<>
										<p className="mt-3 text-sm font-semibold">
											Pilih file atau drag & drop
										</p>

										<p className="mt-1 text-xs text-muted-foreground">
											Format yang didukung: .xlsx
										</p>
									</>
								)}
							</div>
						</div>

						<Button
							onClick={handleUpload}
							disabled={!selectedFile || isUploading}
							className="mt-4 w-full"
						>
							{isUploading ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Mengupload & memproses...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload File Excel
								</>
							)}
						</Button>

						<div className="mt-3 rounded-md bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
							<span className="font-medium text-slate-700">Catatan:</span>{" "}
							Gunakan metode Google Sheet untuk file berukuran besar.
						</div>
					</CardContent>
				</Card>

				{/* =========================
	    GOOGLE SHEET
	========================= */}
				<Card className="border-slate-200 shadow-sm">
					<CardHeader className="pb-3">
						<div className="flex items-center gap-3 min-w-0">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
								<CloudDownload className="h-5 w-5 text-blue-600" />
							</div>

							<div className="min-w-0">
								<CardTitle className="text-base">Import Google Sheet</CardTitle>
								<CardDescription className="mt-0.5 text-xs truncate">
									Import langsung dari Google Drive
								</CardDescription>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-4 sm:p-6">
							<div className="flex flex-col items-center text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
									<Link2 className="h-6 w-6 text-blue-600" />
								</div>

								<p className="mt-3 text-sm font-semibold">
									Masukkan URL Google Spreadsheet
								</p>

								<p className="mt-1 max-w-sm px-2 text-xs text-muted-foreground">
									Data akan dibaca langsung dari Google Drive dan diproses oleh
									server.
								</p>
							</div>

							<div className="mt-5">
								<input
									type="url"
									value={googleSheetUrl}
									onChange={(e) => setGoogleSheetUrl(e.target.value)}
									placeholder="https://docs.google.com/spreadsheets/d/..."
									className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
									disabled={isImportingGoogle}
								/>
							</div>

							<Button
								onClick={handleGoogleImport}
								disabled={!googleSheetUrl.trim() || isImportingGoogle}
								className="mt-3 w-full"
								variant="default"
							>
								{isImportingGoogle ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Mengimport & memproses...
									</>
								) : (
									<>
										<CloudDownload className="mr-2 h-4 w-4" />
										Import Google Sheet
									</>
								)}
							</Button>
						</div>

						<div className="mt-3 rounded-md bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-700">
							<span className="font-semibold">File besar?</span> Gunakan Google
							Sheet. File tidak perlu diupload melalui browser sehingga ukuran
							file besar tetap dapat diproses.
						</div>
					</CardContent>
				</Card>
			</div>

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
						<div>
							<div className="md:hidden mb-3 rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
								← swipe tabel ke kanan →
							</div>

							<div className="w-full min-w-0">
								<div className="w-full overflow-x-auto rounded-md border">
									<Table className="min-w-[760px]">
										<TableHeader>
											<TableRow>
												<TableHead className="w-[60px]">No.</TableHead>
												<TableHead>Nama File</TableHead>
												<TableHead>Tanggal Upload</TableHead>
												<TableHead>Minggu Ditemukan</TableHead>
												<TableHead className="text-right">
													Baris Diproses
												</TableHead>
												<TableHead className="w-[60px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paginatedUploads.map((upload, index) => (
												<TableRow key={upload.id}>
													<TableCell className="text-muted-foreground">
														{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
													</TableCell>

													<TableCell className="font-medium">
														<div className="flex items-center gap-2">
															{upload.sourceType === "google_sheet" ? (
																<Cloud className="h-4 w-4 text-blue-600" />
															) : (
																<FileSpreadsheet className="h-4 w-4 text-emerald-600" />
															)}

															<span className="truncate">
																{upload.sourceType === "google_sheet"
																	? "Google Sheet"
																	: upload.filename}
															</span>
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
								</div>
							</div>
							{totalPages > 1 && (
								<div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
									<div className="text-center text-xs text-muted-foreground sm:text-left">
										Menampilkan{" "}
										<span className="font-medium text-foreground">
											{(currentPage - 1) * ITEMS_PER_PAGE + 1}
										</span>
										{" - "}
										<span className="font-medium text-foreground">
											{Math.min(
												currentPage * ITEMS_PER_PAGE,
												sortedUploads.length,
											)}
										</span>{" "}
										dari{" "}
										<span className="font-medium text-foreground">
											{sortedUploads.length}
										</span>{" "}
										riwayat
									</div>

									<div className="flex w-full items-center justify-center gap-1 overflow-x-auto sm:w-auto">
										<Button
											variant="outline"
											size="sm"
											disabled={currentPage === 1}
											onClick={() =>
												setCurrentPage((page) => Math.max(1, page - 1))
											}
										>
											<ChevronLeft className="h-4 w-4 sm:mr-1" />
											<span className="hidden sm:inline">Sebelumnya</span>
										</Button>

										{Array.from({ length: totalPages }, (_, index) => index + 1)
											.filter((page) => {
												if (totalPages <= 5) return true;

												return (
													page === 1 ||
													page === totalPages ||
													Math.abs(page - currentPage) <= 1
												);
											})
											.map((page, index, pages) => {
												const previousPage = pages[index - 1];

												return (
													<div key={page} className="flex items-center">
														{previousPage && page - previousPage > 1 && (
															<span className="px-2 text-xs text-muted-foreground">
																...
															</span>
														)}

														<Button
															variant={
																currentPage === page ? "default" : "outline"
															}
															size="sm"
															className="h-8 min-w-8 px-2"
															onClick={() => setCurrentPage(page)}
														>
															{page}
														</Button>
													</div>
												);
											})}

										<Button
											variant="outline"
											size="sm"
											disabled={currentPage === totalPages}
											onClick={() =>
												setCurrentPage((page) => Math.min(totalPages, page + 1))
											}
										>
											<span className="hidden sm:inline">Berikutnya</span>
											<ChevronRight className="h-4 w-4 sm:ml-1" />
										</Button>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className="text-center py-8 text-muted-foreground flex flex-col items-center">
							<AlertCircle className="h-8 w-8 mb-2 opacity-50" />
							<p>Belum ada riwayat upload.</p>
						</div>
					)}
				</CardContent>
			</Card>
			{/* =========================================================
    SUCCESS DIALOG
========================================================= */}
			<AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
				<AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
					<AlertDialogHeader>
						<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
							<CheckCircle2 className="h-7 w-7 text-emerald-600" />
						</div>

						<AlertDialogTitle className="text-center">
							{successTitle}
						</AlertDialogTitle>

						<AlertDialogDescription className="text-center">
							{successDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogAction
							onClick={() => setSuccessDialogOpen(false)}
							className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
						>
							Selesai
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* =========================================================
    DELETE DIALOG
========================================================= */}
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
				<AlertDialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
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
