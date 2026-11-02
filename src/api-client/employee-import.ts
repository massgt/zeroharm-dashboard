import { customFetch } from "./custom-fetch";

export interface EmployeeImportResult {
	success: boolean;
	totalRows: number;
	inserted: number;
	updated: number;
	failed: number;
	errors: {
		row: number;
		nik: string;
		reason: string;
	}[];
}

export async function uploadEmployees(
	file: File,
): Promise<EmployeeImportResult> {
	const formData = new FormData();
	formData.append("file", file);

	return customFetch<EmployeeImportResult>("/api/upload/employees", {
		method: "POST",
		body: formData,
	});
}
