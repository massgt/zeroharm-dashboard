import { useMemo, useState, useRef } from "react";
import { useListMembers, getListMembersQueryKey } from "@/api-client";
import type { TeamMember } from "@/api-client/generated/api.schemas";
import { uploadEmployees } from "@/api-client/employee-import";
import type { EmployeeImportResult } from "@/api-client/employee-import";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useSetMemberActive } from "@/api-client";
import ExcelJS from "exceljs";
import { useDeleteMemberPermanent } from "@/api-client";

import {
	Search,
	Users,
	UserCheck,
	PlaneTakeoff,
	RefreshCw,
	Upload,
	Download,
	FileSpreadsheet,
	Loader2,
	X,
	Trash2,
} from "lucide-react";

type EmployeeStatus = "all" | "onsite" | "leave";
type EmploymentFilter = "all" | "active" | "inactive";
type EmployeeRole = "PJO" | "HSE" | "PENGAWAS" | "CREW";

const defaultTargets = {
	PJO: {
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
	HSE: {
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
	PENGAWAS: {
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
	CREW: {
		targetTta: 0,
		targetHazard: 0,
		targetInspeksi: 0,
		targetObservasi: 0,
		targetOpkKeberadaanPengawas: 0,
		targetOpkFungsiPengawas: 0,
		targetOpkP2h: 0,
		targetOpkSeatbelt: 0,
		targetOpkSimper: 0,
		targetOpkRoster: 0,
		targetOpkFatigue: 0,
		targetOpkLototo: 0,
	},
} as const;

const targetColumns = [
	{ header: "Target TTA", key: "targetTta", width: 14 },
	{ header: "Target Hazard", key: "targetHazard", width: 16 },
	{ header: "Target Inspeksi", key: "targetInspeksi", width: 16 },
	{ header: "Target Observasi", key: "targetObservasi", width: 17 },
	{
		header: "Target OPK Keberadaan Pengawas",
		key: "targetOpkKeberadaanPengawas",
		width: 30,
	},
	{
		header: "Target OPK Fungsi Pengawas",
		key: "targetOpkFungsiPengawas",
		width: 27,
	},
	{ header: "Target OPK P2H", key: "targetOpkP2h", width: 16 },
	{ header: "Target OPK Seatbelt", key: "targetOpkSeatbelt", width: 18 },
	{ header: "Target OPK Simper", key: "targetOpkSimper", width: 16 },
	{ header: "Target OPK Roster", key: "targetOpkRoster", width: 16 },
	{ header: "Target OPK Fatigue", key: "targetOpkFatigue", width: 18 },
	{ header: "Target OPK LOTOTO", key: "targetOpkLototo", width: 18 },
] as const;

interface EmployeeImportPreviewRow {
	row: number;
	nik: string;
	name: string;
	department: string;
	jabatan: string;
	role: EmployeeRole;
	status: "ONSITE" | "CUTI";
	action: "BARU" | "UPDATE";
}

interface EmployeeImportPreviewError {
	row: number;
	nik: string;
	reason: string;
}

interface EmployeeImportPreview {
	file: File;
	rows: EmployeeImportPreviewRow[];
	errors: EmployeeImportPreviewError[];
	inserted: number;
	updated: number;
}

function EmployeeStatusBadge({ isOnLeave }: { isOnLeave: boolean }) {
	return (
		<Badge
			variant="outline"
			className={
				isOnLeave
					? "border-amber-300 bg-amber-50 text-amber-700"
					: "border-emerald-300 bg-emerald-50 text-emerald-700"
			}
		>
			{isOnLeave ? "CUTI" : "ONSITE"}
		</Badge>
	);
}

interface MasterDataEmployeesProps {
	onAdd: () => void;
	onEdit: (employee: TeamMember) => void;
}

export default function MasterDataEmployees({
	onAdd,
	onEdit,
}: MasterDataEmployeesProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<EmployeeStatus>("all");
	const [employmentFilter, setEmploymentFilter] =
		useState<EmploymentFilter>("all");

	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<EmployeeImportResult | null>(
		null,
	);
	const [importError, setImportError] = useState("");
	const [importPreview, setImportPreview] =
		useState<EmployeeImportPreview | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
	const [deleteConfirmNik, setDeleteConfirmNik] = useState("");

	const handleDownloadTemplate = async () => {
		const workbook = new ExcelJS.Workbook();

		workbook.creator = "PT Minergo Visi Maxima";
		workbook.subject = "Template Master Data Karyawan";
		workbook.created = new Date();

		// SHEET 1: MASTER DATA
		const sheet = workbook.addWorksheet("Master Data", {
			views: [{ state: "frozen", ySplit: 1 }],
		});

		sheet.columns = [
			{ header: "NIK", key: "nik", width: 20 },
			{ header: "Nama", key: "nama", width: 35 },
			{ header: "Departemen", key: "departemen", width: 25 },
			{ header: "Jabatan", key: "jabatan", width: 35 },
			{ header: "Role", key: "role", width: 18 },
			{ header: "Status", key: "status", width: 18 },
			...targetColumns,
		];

		// FORMAT HEADER
		const header = sheet.getRow(1);
		header.height = 28;

		header.eachCell((cell) => {
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF1E40AF" },
			};

			cell.font = {
				bold: true,
				color: { argb: "FFFFFFFF" },
				size: 11,
			};

			cell.alignment = {
				horizontal: "center",
				vertical: "middle",
			};
		});

		// FORMAT ISI
		sheet.getColumn("nik").numFmt = "@";

		sheet.eachRow((row, rowNumber) => {
			if (rowNumber === 1) return;

			row.height = 23;

			row.eachCell((cell) => {
				cell.alignment = {
					vertical: "middle",
				};

				cell.border = {
					bottom: {
						style: "thin",
						color: { argb: "FFE2E8F0" },
					},
				};
			});
		});

		// FILTER
		sheet.autoFilter = {
			from: "A1",
			to: "R501",
		};

		// DROPDOWN STATUS
		for (let row = 2; row <= 501; row++) {
			sheet.getCell(`E${row}`).dataValidation = {
				type: "list",
				allowBlank: false,
				formulae: ['"PJO,HSE,PENGAWAS,CREW"'],
				showErrorMessage: true,
				errorTitle: "Role tidak valid",
				error: "Pilih PJO, HSE, PENGAWAS, atau CREW.",
			};

			sheet.getCell(`F${row}`).dataValidation = {
				type: "list",
				allowBlank: false,
				formulae: ['"ONSITE,CUTI"'],
				showErrorMessage: true,
				errorTitle: "Status tidak valid",
				error: "Pilih ONSITE atau CUTI.",
			};
		}

		// SHEET 2: PETUNJUK
		const guide = workbook.addWorksheet("Petunjuk");

		guide.columns = [{ width: 25 }, { width: 85 }];

		guide.addRows([
			["PETUNJUK IMPORT MASTER DATA KARYAWAN", ""],
			["Kolom", "Keterangan"],
			["NIK", "Nomor Induk Karyawan. Wajib diisi dan harus unik."],
			["Nama", "Nama lengkap karyawan."],
			["Departemen", "Departemen atau bagian karyawan."],
			["Jabatan", "Jabatan resmi karyawan."],
			["Status", "Pilih ONSITE atau CUTI melalui dropdown."],
			[
				"Pengisian Data",
				"Isi data karyawan mulai dari baris 2. Jangan mengubah nama kolom pada baris pertama.",
			],
			["", ""],
			["KETENTUAN IMPORT", ""],
			["Karyawan Baru", "NIK baru akan dibuat sebagai karyawan AKTIF."],
			[
				"Karyawan Lama",
				"Data nama, departemen, jabatan, dan status kehadiran diperbarui.",
			],
			[
				"Role SAP",
				"Role PJO, HSE, dan target SAP karyawan lama tetap dipertahankan.",
			],
			[
				"Data Kosong",
				"NIK kosong atau data wajib yang tidak lengkap akan ditolak.",
			],
			[
				"NIK Duplikat",
				"NIK yang muncul lebih dari sekali dalam satu file akan ditolak.",
			],
			[
				"Data Tidak Ada",
				"Karyawan yang tidak tercantum dalam file tidak akan dinonaktifkan.",
			],
		]);

		guide.mergeCells("A1:B1");
		guide.mergeCells("A9:B9");

		[1, 9].forEach((rowNumber) => {
			const row = guide.getRow(rowNumber);
			row.height = 28;

			row.getCell(1).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FF1E40AF" },
			};

			row.getCell(1).font = {
				bold: true,
				color: { argb: "FFFFFFFF" },
			};
		});

		guide.getRow(2).font = { bold: true };
		guide.getRow(2).eachCell((cell) => {
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFDBEAFE" },
			};
		});

		guide.eachRow((row) => {
			row.eachCell((cell) => {
				cell.alignment = {
					vertical: "middle",
					wrapText: true,
				};
			});
		});

		// DOWNLOAD XLSX
		const buffer = await workbook.xlsx.writeBuffer();

		const blob = new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});

		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = "Template_Master_Data_Karyawan.xlsx";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	};

	const handleImportEmployees = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];

		if (!file) return;

		if (isLoading || !members) {
			throw new Error(
				"Data karyawan belum selesai dimuat. Silakan tunggu beberapa saat lalu pilih file kembali.",
			);
		}

		setIsImporting(true);
		setImportResult(null);
		setImportError("");
		setImportPreview(null);

		try {
			const extension = file.name
				.substring(file.name.lastIndexOf("."))
				.toLowerCase();

			if (extension !== ".xlsx") {
				throw new Error(
					"Format file belum didukung. Silakan gunakan file Excel .xlsx.",
				);
			}

			if (file.size > 200 * 1024 * 1024) {
				throw new Error("Ukuran file maksimal 200 MB.");
			}

			const workbook = new ExcelJS.Workbook();

			await workbook.xlsx.load(await file.arrayBuffer());

			const sheet =
				workbook.getWorksheet("Master Data") ?? workbook.worksheets[0];

			if (!sheet || sheet.rowCount < 2) {
				throw new Error("Data Excel kosong atau sheet tidak ditemukan.");
			}

			const normalize = (value: ExcelJS.CellValue): string => {
				if (value === null || value === undefined) return "";
				if (typeof value === "object" && "text" in value) {
					return String(value.text).trim();
				}
				return String(value).trim();
			};

			const headers = new Map<string, number>();

			sheet.getRow(1).eachCell((cell, column) => {
				headers.set(
					normalize(cell.value)
						.toLowerCase()
						.replace(/[\s_-]+/g, ""),
					column,
				);
			});

			const getColumn = (...names: string[]) => {
				for (const name of names) {
					const column = headers.get(
						name.toLowerCase().replace(/[\s_-]+/g, ""),
					);
					if (column) return column;
				}
				return undefined;
			};

			const nikCol = getColumn("NIK");
			const nameCol = getColumn("Nama", "Nama Lengkap");
			const departmentCol = getColumn("Departemen", "Department");
			const jabatanCol = getColumn("Jabatan", "Position");
			const roleCol = getColumn("Role");
			const statusCol = getColumn("Status", "Status Kehadiran");

			if (
				!nikCol ||
				!nameCol ||
				!departmentCol ||
				!jabatanCol ||
				!roleCol ||
				!statusCol
			) {
				throw new Error(
					"Header wajib: NIK, Nama, Departemen, Jabatan, Role, Status.",
				);
			}

			const existingNiks = new Set(
				(members ?? []).map((member) => member.nik.trim().toLowerCase()),
			);

			const seenNiks = new Set<string>();
			const rows: EmployeeImportPreviewRow[] = [];
			const errors: EmployeeImportPreviewError[] = [];

			sheet.eachRow((row, rowNumber) => {
				if (rowNumber === 1) return;

				const nik = normalize(row.getCell(nikCol).value);
				const name = normalize(row.getCell(nameCol).value);
				const department = normalize(row.getCell(departmentCol).value);
				const jabatan = normalize(row.getCell(jabatanCol).value);
				const role = normalize(row.getCell(roleCol).value).toUpperCase();
				const status = normalize(row.getCell(statusCol).value).toUpperCase();

				if (!nik || !name || !department || !jabatan || !status) {
					errors.push({
						row: rowNumber,
						nik: nik || "-",
						reason: "NIK, nama, departemen, jabatan, dan status wajib diisi.",
					});
					return;
				}

				const normalizedNik = nik.toLowerCase();

				if (seenNiks.has(normalizedNik)) {
					errors.push({
						row: rowNumber,
						nik,
						reason: "NIK duplikat dalam file.",
					});
					return;
				}

				seenNiks.add(normalizedNik);

				if (status !== "ONSITE" && status !== "CUTI") {
					errors.push({
						row: rowNumber,
						nik,
						reason: "Status harus ONSITE atau CUTI.",
					});
					return;
				}

				if (!["PJO", "HSE", "PENGAWAS", "CREW"].includes(role)) {
					errors.push({
						row: rowNumber,
						nik,
						reason: "Role harus PJO, HSE, PENGAWAS, atau CREW.",
					});
					return;
				}

				rows.push({
					row: rowNumber,
					nik,
					name,
					department,
					jabatan,
					role: role as EmployeeRole,
					status,
					action: existingNiks.has(normalizedNik) ? "UPDATE" : "BARU",
				});
			});

			if (rows.length === 0 && errors.length === 0) {
				throw new Error("Tidak ada data karyawan untuk diproses.");
			}

			setImportPreview({
				file,
				rows,
				errors,
				inserted: rows.filter((row) => row.action === "BARU").length,
				updated: rows.filter((row) => row.action === "UPDATE").length,
			});
		} catch (error) {
			setImportError(
				error instanceof Error ? error.message : "Gagal membaca file Excel.",
			);
		} finally {
			setIsImporting(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const handleConfirmImport = async () => {
		if (!importPreview || importPreview.rows.length === 0) return;

		const confirmed = window.confirm(
			`Konfirmasi Import Master Data Karyawan\n\n` +
				`File: ${importPreview.file.name}\n` +
				`Karyawan Baru: ${importPreview.inserted}\n` +
				`Data Diperbarui: ${importPreview.updated}\n` +
				`Data Gagal: ${importPreview.errors.length}\n\n` +
				`Lanjutkan menyimpan data yang valid?`,
		);

		if (!confirmed) return;

		try {
			setIsImporting(true);
			setImportError("");

			const result = await uploadEmployees(importPreview.file);

			setImportResult(result);
			setImportPreview(null);

			await queryClient.invalidateQueries({
				queryKey: getListMembersQueryKey(),
			});
		} catch (error) {
			setImportError(
				error instanceof Error
					? error.message
					: "Gagal mengimpor data karyawan.",
			);
		} finally {
			setIsImporting(false);
		}
	};

	const setMemberActive = useSetMemberActive({
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getListMembersQueryKey(),
				});
			},
		},
	});

	const deleteMemberPermanent = useDeleteMemberPermanent({
		mutation: {
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: getListMembersQueryKey(),
				});

				setDeleteTarget(null);
				setDeleteConfirmNik("");
			},
		},
	});

	const handleToggleActive = (employee: TeamMember) => {
		const action = employee.isActive ? "menonaktifkan" : "mengaktifkan kembali";

		if (!window.confirm(`Yakin ingin ${action} karyawan ${employee.name}?`)) {
			return;
		}

		setMemberActive.mutate({
			nik: employee.nik,
			data: {
				isActive: !employee.isActive,
			},
		});
	};
	const handlePermanentDelete = () => {
		if (!deleteTarget) return;

		if (deleteConfirmNik !== deleteTarget.nik) return;

		deleteMemberPermanent.mutate({
			nik: deleteTarget.nik,
			data: {
				confirmNik: deleteConfirmNik,
			},
		});
	};

	const {
		data: members,
		isLoading,
		isError,
		refetch,
	} = useListMembers({
		query: {
			queryKey: getListMembersQueryKey(),
		},
	});

	const employees = useMemo(() => {
		if (!members) return [];

		const query = searchQuery.trim().toLowerCase();

		return members.filter((employee) => {
			const matchesSearch =
				!query ||
				employee.nik.toLowerCase().includes(query) ||
				employee.name.toLowerCase().includes(query) ||
				employee.department.toLowerCase().includes(query) ||
				employee.jabatan.toLowerCase().includes(query);

			const matchesStatus =
				statusFilter === "all" ||
				(statusFilter === "onsite" && !employee.isOnLeave) ||
				(statusFilter === "leave" && employee.isOnLeave);

			const matchesEmployment =
				employmentFilter === "all" ||
				(employmentFilter === "active" && employee.isActive) ||
				(employmentFilter === "inactive" && !employee.isActive);

			return matchesSearch && matchesStatus && matchesEmployment;
		});
	}, [members, searchQuery, statusFilter, employmentFilter]);

	const totalEmployees = members?.length ?? 0;
	const totalOnsite =
		members?.filter((employee) => !employee.isOnLeave).length ?? 0;
	const totalLeave =
		members?.filter((employee) => employee.isOnLeave).length ?? 0;

	return (
		<div className="space-y-6 [&_button]:transition-all [&_button]:duration-150 [&_button]:ease-out [&_button]:active:scale-[0.97] [&_button]:hover:-translate-y-px">
			{isImporting && (
				<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
					<div className="w-full max-w-sm rounded-xl border bg-background p-6 text-center shadow-2xl">
						<Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />

						<h3 className="mt-4 text-lg font-semibold">
							{importPreview
								? "Mengunggah Data Karyawan"
								: "Memproses File Excel"}
						</h3>

						<p className="mt-2 text-sm text-muted-foreground">
							{importPreview
								? "Sedang menyimpan data karyawan ke database. Mohon tunggu dan jangan tutup halaman."
								: "Sedang membaca file dan memvalidasi data karyawan. Mohon tunggu."}
						</p>
					</div>
				</div>
			)}
			{/* PAGE HEADER */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-xl font-bold tracking-tight">
						Master Data Karyawan
					</h2>
					<p className="text-sm text-muted-foreground">
						Pengelolaan data induk seluruh karyawan PT Minergo Visi Maxima.
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".xlsx"
						className="hidden"
						onChange={handleImportEmployees}
					/>

					<Button variant="outline" onClick={handleDownloadTemplate}>
						<Download className="mr-2 h-4 w-4" />
						Template
					</Button>

					<Button
						variant="outline"
						disabled={isImporting}
						onClick={() => fileInputRef.current?.click()}
					>
						{isImporting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Memproses File...
							</>
						) : (
							<>
								<Upload className="mr-2 h-4 w-4" />
								Import Excel
							</>
						)}
					</Button>

					<Button onClick={onAdd}>
						<Users className="mr-2 h-4 w-4" />
						Tambah Karyawan
					</Button>
				</div>
			</div>

			{/* IMPORT PREVIEW */}
			{importPreview && (
				<Card className="overflow-hidden border-2 border-amber-400 bg-amber-50/50 shadow-md ring-2 ring-amber-100">
					<div className="border-b border-amber-300 bg-amber-100 px-4 py-3">
						<div className="flex items-center gap-2">
							<FileSpreadsheet className="h-5 w-5 text-amber-800" />

							<span className="font-bold text-amber-900">
								PREVIEW IMPORT — BELUM DISIMPAN
							</span>
						</div>

						<p className="mt-1 text-sm text-amber-800">
							Ini adalah data sementara. Periksa kembali seluruh data sebelum
							menekan Konfirmasi Import. Data belum masuk ke database.
						</p>
					</div>

					<CardContent className="space-y-4 bg-background/80 p-4">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h3 className="font-semibold text-lg">
									Preview Import Karyawan
								</h3>
								<p className="text-sm text-muted-foreground">
									File: {importPreview.file.name}
								</p>
							</div>

							<Badge variant="outline">
								{importPreview.rows.length} Data Valid
							</Badge>
						</div>

						{/* SUMMARY */}
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<div className="rounded-lg bg-emerald-50 p-3">
								<p className="text-xs text-emerald-700">Karyawan Baru</p>
								<p className="text-2xl font-bold text-emerald-700">
									{importPreview.inserted}
								</p>
							</div>

							<div className="rounded-lg bg-blue-50 p-3">
								<p className="text-xs text-blue-700">Akan Diperbarui</p>
								<p className="text-2xl font-bold text-blue-700">
									{importPreview.updated}
								</p>
							</div>

							<div className="rounded-lg bg-red-50 p-3">
								<p className="text-xs text-red-700">Data Bermasalah</p>
								<p className="text-2xl font-bold text-red-700">
									{importPreview.errors.length}
								</p>
							</div>
						</div>

						{/* VALID DATA */}
						{importPreview.rows.length > 0 && (
							<div className="space-y-2">
								<h4 className="font-semibold text-sm">
									Data Karyawan yang Akan Diproses
								</h4>

								<div className="max-h-80 overflow-auto rounded-lg border">
									<table className="w-full text-sm">
										<thead className="sticky top-0 bg-muted">
											<tr>
												<th className="p-3 text-left">NIK</th>
												<th className="p-3 text-left">Nama</th>
												<th className="p-3 text-left">Departemen</th>
												<th className="p-3 text-left">Jabatan</th>
												<th className="p-3 text-left">Role</th>
												<th className="p-3 text-left">Status</th>
												<th className="p-3 text-left">Aksi</th>
											</tr>
										</thead>

										<tbody>
											{importPreview.rows.map((row) => (
												<tr key={`${row.row}-${row.nik}`} className="border-t">
													<td className="p-3 font-mono text-xs">{row.nik}</td>
													<td className="p-3">{row.name}</td>
													<td className="p-3">{row.department}</td>
													<td className="p-3">{row.jabatan}</td>

													<td className="p-3">
														<Badge variant="secondary">{row.role}</Badge>
													</td>

													<td className="p-3">
														<Badge variant="outline">{row.status}</Badge>
													</td>
													<td className="p-3">
														<Badge
															className={
																row.action === "BARU"
																	? "bg-emerald-600"
																	: "bg-blue-600"
															}
														>
															{row.action}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}

						{/* ERROR DATA */}
						{importPreview.errors.length > 0 && (
							<div className="space-y-2">
								<h4 className="font-semibold text-sm text-destructive">
									Baris yang Bermasalah
								</h4>

								<div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
									{importPreview.errors.map((error, index) => (
										<div key={`${error.row}-${index}`} className="text-sm">
											<span className="font-semibold">Baris {error.row}</span>
											{" | NIK: "}
											{error.nik}

											<p className="text-xs text-destructive">{error.reason}</p>
										</div>
									))}
								</div>
							</div>
						)}

						{/* ACTION BUTTONS */}
						<div className="flex flex-wrap justify-end gap-2 border-t pt-4">
							<Button
								variant="outline"
								disabled={isImporting}
								onClick={() => setImportPreview(null)}
							>
								Batalkan
							</Button>

							<Button
								disabled={isImporting || importPreview.rows.length === 0}
								onClick={handleConfirmImport}
							>
								<Upload className="mr-2 h-4 w-4" />
								{isImporting ? "Memproses..." : "Konfirmasi Import"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* IMPORT RESULT */}
			{importError && (
				<Card className="border-destructive">
					<CardContent className="p-4">
						<p className="font-semibold text-destructive">Import gagal</p>
						<p className="mt-1 text-sm">{importError}</p>
					</CardContent>
				</Card>
			)}

			{/* IMPORT RESULT MODAL */}
			{importResult && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="import-result-title"
						className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background shadow-2xl"
					>
						{/* HEADER */}
						<div className="flex items-start justify-between border-b p-5">
							<div className="flex items-center gap-3">
								<div className="rounded-full bg-emerald-100 p-2">
									<FileSpreadsheet className="h-6 w-6 text-emerald-700" />
								</div>

								<div>
									<h3 id="import-result-title" className="text-lg font-bold">
										Import Selesai
									</h3>

									<p className="text-sm text-muted-foreground">
										Hasil pemrosesan Master Data Karyawan
									</p>
								</div>
							</div>

							<Button
								variant="ghost"
								size="icon"
								onClick={() => setImportResult(null)}
								aria-label="Tutup hasil import"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						{/* CONTENT */}
						<div className="space-y-4 p-5">
							<div className="grid grid-cols-2 gap-3">
								<div className="rounded-lg bg-muted p-3">
									<p className="text-xs text-muted-foreground">Total Baris</p>
									<p className="text-2xl font-bold">{importResult.totalRows}</p>
								</div>

								<div className="rounded-lg bg-emerald-50 p-3">
									<p className="text-xs text-emerald-700">Karyawan Baru</p>
									<p className="text-2xl font-bold text-emerald-700">
										{importResult.inserted}
									</p>
								</div>

								<div className="rounded-lg bg-blue-50 p-3">
									<p className="text-xs text-blue-700">Diperbarui</p>
									<p className="text-2xl font-bold text-blue-700">
										{importResult.updated}
									</p>
								</div>

								<div className="rounded-lg bg-red-50 p-3">
									<p className="text-xs text-red-700">Gagal</p>
									<p className="text-2xl font-bold text-red-700">
										{importResult.failed}
									</p>
								</div>
							</div>

							{/* DETAIL ERROR */}
							{importResult.failed > 0 ? (
								<div className="rounded-lg border border-red-200 bg-red-50 p-3">
									<h4 className="mb-2 font-semibold text-red-800">
										Detail Data Bermasalah
									</h4>

									<div className="max-h-48 space-y-3 overflow-y-auto">
										{importResult.errors.map((error, index) => (
											<div
												key={`${error.row}-${index}`}
												className="border-b border-red-200 pb-2 last:border-0"
											>
												<p className="text-sm font-medium text-red-900">
													Baris {error.row} — NIK: {error.nik || "-"}
												</p>

												<p className="text-xs text-red-700">{error.reason}</p>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
									<p className="text-sm font-medium text-emerald-800">
										Seluruh data berhasil diproses tanpa kesalahan.
									</p>
								</div>
							)}

							{/* FOOTER */}
							<div className="flex justify-end border-t pt-4">
								<Button onClick={() => setImportResult(null)}>Tutup</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{deleteTarget && (
				<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby="delete-member-title"
						className="w-full max-w-md rounded-xl border bg-background shadow-2xl"
					>
						<div className="border-b p-5">
							<div className="flex items-center gap-3">
								<div className="rounded-full bg-red-100 p-3">
									<Trash2 className="h-6 w-6 text-red-600" />
								</div>
								<div>
									<h3 id="delete-member-title" className="font-bold text-lg">
										Hapus Permanen Karyawan
									</h3>
									<p className="text-sm text-muted-foreground">
										Tindakan ini tidak dapat dibatalkan.
									</p>
								</div>
							</div>
						</div>

						<div className="space-y-4 p-5">
							<div className="rounded-lg border bg-muted/40 p-3 text-sm">
								<p>
									<span className="text-muted-foreground">Nama:</span>{" "}
									<strong>{deleteTarget.name}</strong>
								</p>
								<p className="mt-1">
									<span className="text-muted-foreground">NIK:</span>{" "}
									<strong className="font-mono">{deleteTarget.nik}</strong>
								</p>
							</div>

							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
								<strong>Perhatian!</strong>
								<p className="mt-1">
									Data master karyawan akan dihapus permanen. Data histori SAP
									dan Sosialisasi tidak ikut dihapus.
								</p>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									Ketik ulang NIK untuk konfirmasi:
								</label>
								<Input
									value={deleteConfirmNik}
									onChange={(event) => setDeleteConfirmNik(event.target.value)}
									placeholder="Masukkan NIK karyawan"
									disabled={deleteMemberPermanent.isPending}
									autoComplete="off"
								/>
							</div>

							{deleteMemberPermanent.isError && (
								<p className="text-sm text-destructive">
									Gagal menghapus karyawan. Silakan coba kembali.
								</p>
							)}

							<div className="flex justify-end gap-2 border-t pt-4">
								<Button
									type="button"
									variant="outline"
									disabled={deleteMemberPermanent.isPending}
									onClick={() => {
										setDeleteTarget(null);
										setDeleteConfirmNik("");
									}}
								>
									Batal
								</Button>

								<Button
									type="button"
									variant="destructive"
									disabled={
										deleteConfirmNik !== deleteTarget.nik ||
										deleteMemberPermanent.isPending
									}
									onClick={handlePermanentDelete}
								>
									{deleteMemberPermanent.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Menghapus...
										</>
									) : (
										<>
											<Trash2 className="mr-2 h-4 w-4" />
											Hapus Permanen
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SUMMARY */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="rounded-lg bg-primary/10 p-3">
							<Users className="h-5 w-5 text-primary" />
						</div>

						<div>
							<p className="text-xs text-muted-foreground">Total Karyawan</p>
							<p className="text-2xl font-bold">{totalEmployees}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="rounded-lg bg-emerald-100 p-3">
							<UserCheck className="h-5 w-5 text-emerald-700" />
						</div>

						<div>
							<p className="text-xs text-muted-foreground">Onsite</p>
							<p className="text-2xl font-bold">{totalOnsite}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-3 p-4">
						<div className="rounded-lg bg-amber-100 p-3">
							<PlaneTakeoff className="h-5 w-5 text-amber-700" />
						</div>

						<div>
							<p className="text-xs text-muted-foreground">Cuti</p>
							<p className="text-2xl font-bold">{totalLeave}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* SEARCH AND FILTER */}
			<Card>
				<CardContent className="space-y-4 p-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

						<Input
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							placeholder="Cari nama, NIK, departemen, atau jabatan..."
							className="pl-9"
						/>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							size="sm"
							variant={statusFilter === "all" ? "default" : "outline"}
							onClick={() => setStatusFilter("all")}
						>
							Semua
						</Button>

						<Button
							size="sm"
							variant={statusFilter === "onsite" ? "default" : "outline"}
							onClick={() => setStatusFilter("onsite")}
						>
							Onsite
						</Button>

						<Button
							size="sm"
							variant={statusFilter === "leave" ? "default" : "outline"}
							onClick={() => setStatusFilter("leave")}
						>
							Cuti
						</Button>

						<Button
							size="sm"
							variant={employmentFilter === "active" ? "default" : "outline"}
							onClick={() => setEmploymentFilter("active")}
						>
							Aktif
						</Button>

						<Button
							size="sm"
							variant={employmentFilter === "inactive" ? "default" : "outline"}
							onClick={() => setEmploymentFilter("inactive")}
						>
							Nonaktif
						</Button>

						<div className="ml-auto text-xs text-muted-foreground">
							Menampilkan {employees.length} dari {totalEmployees} karyawan
						</div>
					</div>
				</CardContent>
			</Card>

			{/* EMPLOYEE LIST */}
			{/* EMPLOYEE LIST */}
			{isLoading ? (
				<div className="rounded-xl border bg-background p-4">
					<div className="space-y-3">
						{[1, 2, 3, 4, 5].map((item) => (
							<div
								key={item}
								className="h-12 animate-pulse rounded-md bg-muted"
							/>
						))}
					</div>
				</div>
			) : isError ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-3 p-8 text-center">
						<p className="text-sm text-destructive">
							Gagal mengambil data karyawan.
						</p>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetch()}
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Coba Lagi
						</Button>
					</CardContent>
				</Card>
			) : employees.length === 0 ? (
				<Card>
					<CardContent className="p-8 text-center">
						<p className="font-medium">Data karyawan tidak ditemukan</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Coba ubah kata kunci atau filter pencarian.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="overflow-hidden rounded-xl border bg-background shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[1050px] text-sm">
							<thead className="border-b bg-muted/50">
								<tr className="text-left">
									<th className="whitespace-nowrap px-4 py-3 font-semibold">
										No.
									</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">
										NIK
									</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">
										Nama Karyawan
									</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">
										Departemen
									</th>
									<th className="whitespace-nowrap px-4 py-3 font-semibold">
										Jabatan
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
										Status Kepegawaian
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
										Kehadiran
									</th>
									<th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
										Aksi
									</th>
								</tr>
							</thead>

							<tbody className="divide-y">
								{employees.map((employee, index) => (
									<tr
										key={employee.nik}
										className="transition-colors hover:bg-muted/40"
									>
										<td className="px-4 py-3 text-muted-foreground">
											{index + 1}
										</td>

										<td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
											{employee.nik}
										</td>

										<td className="px-4 py-3 font-medium">{employee.name}</td>

										<td className="px-4 py-3">{employee.department}</td>

										<td className="px-4 py-3">{employee.jabatan}</td>

										<td className="px-4 py-3 text-center">
											<Badge
												variant="outline"
												className={
													employee.isActive
														? "border-emerald-300 bg-emerald-50 text-emerald-700"
														: "border-red-300 bg-red-50 text-red-700"
												}
											>
												{employee.isActive ? "AKTIF" : "NONAKTIF"}
											</Badge>
										</td>

										<td className="px-4 py-3 text-center">
											<EmployeeStatusBadge isOnLeave={employee.isOnLeave} />
										</td>

										<td className="px-4 py-3">
											<div className="flex items-center justify-center gap-2">
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => onEdit(employee)}
												>
													Edit
												</Button>

												<Button
													type="button"
													size="sm"
													variant={
														employee.isActive ? "destructive" : "default"
													}
													disabled={setMemberActive.isPending}
													onClick={() => handleToggleActive(employee)}
												>
													{employee.isActive
														? "Nonaktifkan"
														: "Aktifkan Kembali"}
												</Button>
												<Button
													type="button"
													size="sm"
													variant="destructive"
													disabled={deleteMemberPermanent.isPending}
													onClick={() => {
														setDeleteTarget(employee);
														setDeleteConfirmNik("");
													}}
												>
													<Trash2 className="mr-1 h-4 w-4" />
													Hapus Permanen
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
						Menampilkan {employees.length} karyawan
					</div>
				</div>
			)}
		</div>
	);
}
