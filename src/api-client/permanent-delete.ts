import { useMutation } from "@tanstack/react-query";
import type {
	UseMutationOptions,
	UseMutationResult,
} from "@tanstack/react-query";

import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export interface PermanentDeleteMemberBody {
	confirmNik: string;
}

export interface PermanentDeleteMemberResponse {
	success: boolean;
	message: string;
	deleted: {
		nik: string;
		name: string;
	};
}

export const deleteMemberPermanent = async (
	nik: string,
	data: PermanentDeleteMemberBody,
): Promise<PermanentDeleteMemberResponse> => {
	return customFetch<PermanentDeleteMemberResponse>(
		`/api/members/${encodeURIComponent(nik)}/permanent`,
		{
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		},
	);
};

export const useDeleteMemberPermanent = <
	TError = ErrorType<unknown>,
	TContext = unknown,
>(options?: {
	mutation?: UseMutationOptions<
		PermanentDeleteMemberResponse,
		TError,
		{ nik: string; data: PermanentDeleteMemberBody },
		TContext
	>;
}): UseMutationResult<
	PermanentDeleteMemberResponse,
	TError,
	{ nik: string; data: PermanentDeleteMemberBody },
	TContext
> => {
	return useMutation({
		mutationFn: ({ nik, data }) => deleteMemberPermanent(nik, data),
		...options?.mutation,
	});
};
