import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface SafetyCampaignImage {
	id: number;
	campaignId: number;
	filename: string;
	filePath: string;
	sortOrder: number;
	createdAt: string;
}

export interface SafetyCampaign {
	id: number;
	week: number;
	year: number;
	title: string;
	highlight: string | null;
	startDate: string | null;
	endDate: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	images: SafetyCampaignImage[];
}

export interface CreateSafetyCampaignInput {
	week: number;
	year: number;
	title: string;
	highlight?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	isActive?: boolean;
}

export interface UpdateSafetyCampaignInput {
	week?: number;
	year?: number;
	title?: string;
	highlight?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	isActive?: boolean;
}

interface SafetyCampaignListResponse {
	success: boolean;
	data: SafetyCampaign[];
}

interface SafetyCampaignResponse {
	success: boolean;
	data: SafetyCampaign;
}

export async function getSafetyCampaigns(
	options?: RequestInit,
): Promise<SafetyCampaignListResponse> {
	return customFetch<SafetyCampaignListResponse>("/api/safety-campaigns", {
		...options,
		method: "GET",
	});
}

export async function getSafetyCampaign(
	id: number,
	options?: RequestInit,
): Promise<SafetyCampaignResponse> {
	return customFetch<SafetyCampaignResponse>(`/api/safety-campaigns/${id}`, {
		...options,
		method: "GET",
	});
}

export async function createSafetyCampaign(
	data: CreateSafetyCampaignInput,
	options?: RequestInit,
): Promise<SafetyCampaign> {
	const response = await customFetch<{
		success: boolean;
		data: SafetyCampaign;
	}>("/api/safety-campaigns", {
		...options,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		body: JSON.stringify(data),
	});

	return response.data;
}

export async function updateSafetyCampaign(
	id: number,
	data: UpdateSafetyCampaignInput,
	options?: RequestInit,
): Promise<SafetyCampaign> {
	const response = await customFetch<{
		success: boolean;
		data: SafetyCampaign;
	}>(`/api/safety-campaigns/${id}`, {
		...options,
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		body: JSON.stringify(data),
	});

	return response.data;
}

export async function deleteSafetyCampaign(
	id: number,
	options?: RequestInit,
): Promise<void> {
	await customFetch<{
		success: boolean;
		message: string;
	}>(`/api/safety-campaigns/${id}`, {
		...options,
		method: "DELETE",
	});
}

export function useDeleteSafetyCampaign() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id }: { id: number }) => deleteSafetyCampaign(id),

		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignsQueryKey(),
			});
		},
	});
}

export function useUpdateSafetyCampaign() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number;
			data: UpdateSafetyCampaignInput;
		}) => updateSafetyCampaign(id, data),

		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignQueryKey(variables.id),
			});
		},
	});
}

export async function deleteSafetyCampaignImage(
	campaignId: number,
	imageId: number,
	options?: RequestInit,
): Promise<void> {
	await customFetch<{
		success: boolean;
		message: string;
	}>(`/api/safety-campaigns/${campaignId}/images/${imageId}`, {
		...options,
		method: "DELETE",
	});
}

export function useDeleteSafetyCampaignImage() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			campaignId,
			imageId,
		}: {
			campaignId: number;
			imageId: number;
		}) => deleteSafetyCampaignImage(campaignId, imageId),

		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignQueryKey(variables.campaignId),
			});
		},
	});
}

export async function uploadSafetyCampaignImages(
	campaignId: number,
	files: File[],
	options?: RequestInit,
): Promise<SafetyCampaignImage[]> {
	const formData = new FormData();

	for (const file of files) {
		formData.append("images", file);
	}

	const response = await customFetch<{
		success: boolean;
		data: SafetyCampaignImage[];
	}>(`/api/safety-campaigns/${campaignId}/images`, {
		...options,
		method: "POST",
		body: formData,
	});

	return response.data;
}

export const getSafetyCampaignsQueryKey = () =>
	["/api/safety-campaigns"] as const;

export function useSafetyCampaigns() {
	return useQuery({
		queryKey: getSafetyCampaignsQueryKey(),
		queryFn: () => getSafetyCampaigns(),
	});
}

export const getSafetyCampaignQueryKey = (id: number) =>
	["/api/safety-campaigns", id] as const;

export function useSafetyCampaign(id: number) {
	return useQuery({
		queryKey: getSafetyCampaignQueryKey(id),
		queryFn: () => getSafetyCampaign(id),
		enabled: Number.isInteger(id) && id > 0,
	});
}

export function useCreateSafetyCampaign() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createSafetyCampaign,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignsQueryKey(),
			});
		},
	});
}

export function useUploadSafetyCampaignImages() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			campaignId,
			files,
		}: {
			campaignId: number;
			files: File[];
		}) => uploadSafetyCampaignImages(campaignId, files),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignsQueryKey(),
			});

			queryClient.invalidateQueries({
				queryKey: getSafetyCampaignQueryKey(variables.campaignId),
			});
		},
	});
}
