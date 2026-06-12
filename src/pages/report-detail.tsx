import {
	useGetReport,
	getGetReportQueryKey,
	useUpdateReport,
	useDeleteReport,
	getListReportsQueryKey,
	getGetDashboardSummaryQueryKey,
	getGetRecentReportsQueryKey,
} from "@/api-client";
import { useParams, useLocation } from "wouter";
import { Link } from "wouter";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	ArrowLeft,
	MapPin,
	User,
	Calendar,
	Building2,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Pencil,
	Trash2,
	Save,
	X,
} from "lucide-react";

export default function ReportDetail() {
	const params = useParams<{ id: string }>();
	const id = parseInt(params.id, 10);
	const [, setLocation] = useLocation();
	const { toast } = useToast();
	const queryClient = useQueryClient();

	const [isEditing, setIsEditing] = useState(false);
	const [editStatus, setEditStatus] = useState<string>("");
	const [editCorrectiveAction, setEditCorrectiveAction] = useState<string>("");

	const { data: report, isLoading } = useGetReport(id, {
		query: { queryKey: getGetReportQueryKey(id), enabled: !isNaN(id) },
	});

	const updateMut = useUpdateReport();
	const deleteMut = useDeleteReport();

	const startEdit = () => {
		setEditStatus(report?.status ?? "open");
		setEditCorrectiveAction(report?.correctiveAction ?? "");
		setIsEditing(true);
	};

	const cancelEdit = () => setIsEditing(false);

	const saveEdit = () => {
		updateMut.mutate(
			{
				id,
				data: {
					status: editStatus as "open" | "in_progress" | "closed",
					correctiveAction: editCorrectiveAction,
				},
			},
			{
				onSuccess: () => {
					toast({
						title: "Report Updated",
						description: "Changes saved successfully.",
					});
					queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
					queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
					queryClient.invalidateQueries({
						queryKey: getGetDashboardSummaryQueryKey(),
					});
					queryClient.invalidateQueries({
						queryKey: getGetRecentReportsQueryKey(),
					});
					setIsEditing(false);
				},
				onError: () => {
					toast({
						title: "Update Failed",
						description: "Could not save changes. Please try again.",
						variant: "destructive",
					});
				},
			},
		);
	};

	const handleDelete = () => {
		if (
			!confirm(
				"Are you sure you want to delete this report? This action cannot be undone.",
			)
		)
			return;
		deleteMut.mutate(
			{ id },
			{
				onSuccess: () => {
					toast({
						title: "Report Deleted",
						description: "The safety report has been removed.",
					});
					queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
					queryClient.invalidateQueries({
						queryKey: getGetDashboardSummaryQueryKey(),
					});
					setLocation("/reports");
				},
				onError: () => {
					toast({
						title: "Delete Failed",
						description: "Could not delete report.",
						variant: "destructive",
					});
				},
			},
		);
	};

	const getSeverityBadge = (severity: string) => {
		switch (severity) {
			case "critical":
				return (
					<Badge variant="destructive" className="text-sm px-3 py-1">
						Critical
					</Badge>
				);
			case "high":
				return (
					<Badge className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1">
						High
					</Badge>
				);
			case "medium":
				return (
					<Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-3 py-1">
						Medium
					</Badge>
				);
			case "low":
				return (
					<Badge className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1">
						Low
					</Badge>
				);
			default:
				return <Badge className="text-sm px-3 py-1">{severity}</Badge>;
		}
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "open":
				return (
					<Badge
						variant="outline"
						className="border-amber-500 text-amber-600 text-sm px-3 py-1"
					>
						<Clock className="h-3 w-3 mr-1" />
						Open
					</Badge>
				);
			case "in_progress":
				return (
					<Badge
						variant="outline"
						className="border-blue-500 text-blue-600 text-sm px-3 py-1"
					>
						<AlertTriangle className="h-3 w-3 mr-1" />
						In Progress
					</Badge>
				);
			case "closed":
				return (
					<Badge
						variant="outline"
						className="border-green-500 text-green-600 text-sm px-3 py-1"
					>
						<CheckCircle2 className="h-3 w-3 mr-1" />
						Closed
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="text-sm px-3 py-1">
						{status}
					</Badge>
				);
		}
	};

	const getTypeLabel = (type: string) =>
		type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

	if (isLoading) {
		return (
			<div className="max-w-3xl mx-auto space-y-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (!report) {
		return (
			<div className="max-w-3xl mx-auto text-center py-20">
				<AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
				<p className="text-muted-foreground mb-6">
					The safety report you are looking for does not exist or has been
					removed.
				</p>
				<Link href="/reports">
					<Button variant="outline">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Reports
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6 pb-10">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link href="/reports">
						<Button variant="outline" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<p className="text-xs text-muted-foreground font-mono">
							REPORT #{report.id}
						</p>
						<h1 className="text-2xl font-bold tracking-tight leading-tight">
							{report.title}
						</h1>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{!isEditing && (
						<>
							<Button variant="outline" size="sm" onClick={startEdit}>
								<Pencil className="h-4 w-4 mr-2" />
								Edit
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={handleDelete}
								disabled={deleteMut.isPending}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								Delete
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Status + Severity banner */}
			<div className="flex items-center gap-3 flex-wrap">
				{getStatusBadge(report.status)}
				{getSeverityBadge(report.severity)}
				<Badge variant="secondary" className="text-sm px-3 py-1 capitalize">
					{getTypeLabel(report.type)}
				</Badge>
			</div>

			{/* Main info */}
			<Card>
				<CardHeader>
					<CardTitle>Incident Information</CardTitle>
					<CardDescription>
						Details recorded at the time of submission.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="flex items-start gap-3">
							<Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
									Department
								</p>
								<p className="text-sm font-medium">{report.department}</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
									Location
								</p>
								<p className="text-sm font-medium">{report.location}</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<User className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
									Reported By
								</p>
								<p className="text-sm font-medium">{report.reportedBy}</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
							<div>
								<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
									Report Date
								</p>
								<p className="text-sm font-medium">
									{new Date(report.reportedAt).toLocaleDateString("id-ID", {
										day: "numeric",
										month: "long",
										year: "numeric",
									})}
								</p>
							</div>
						</div>
						{report.closedAt && (
							<div className="flex items-start gap-3">
								<CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
								<div>
									<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">
										Closed Date
									</p>
									<p className="text-sm font-medium text-green-700">
										{new Date(report.closedAt).toLocaleDateString("id-ID", {
											day: "numeric",
											month: "long",
											year: "numeric",
										})}
									</p>
								</div>
							</div>
						)}
					</div>

					{report.description && (
						<div className="pt-2 border-t">
							<p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
								Description
							</p>
							<p className="text-sm leading-relaxed">{report.description}</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Status & Corrective Action — editable */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Status & Corrective Action</CardTitle>
						<CardDescription>
							Update the progress and actions taken for this report.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{isEditing ? (
						<>
							<div>
								<p className="text-sm font-medium mb-2">Status</p>
								<Select value={editStatus} onValueChange={setEditStatus}>
									<SelectTrigger className="w-full sm:w-[200px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="open">Open</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="closed">Closed</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<p className="text-sm font-medium mb-2">Corrective Action</p>
								<Textarea
									value={editCorrectiveAction}
									onChange={(e) => setEditCorrectiveAction(e.target.value)}
									placeholder="Describe the corrective actions taken or planned..."
									className="min-h-[100px]"
								/>
							</div>
							<div className="flex items-center gap-2 pt-2">
								<Button
									size="sm"
									onClick={saveEdit}
									disabled={updateMut.isPending}
								>
									<Save className="h-4 w-4 mr-2" />
									{updateMut.isPending ? "Saving..." : "Save Changes"}
								</Button>
								<Button size="sm" variant="outline" onClick={cancelEdit}>
									<X className="h-4 w-4 mr-2" />
									Cancel
								</Button>
							</div>
						</>
					) : (
						<>
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium text-muted-foreground w-28">
									Current Status:
								</p>
								{getStatusBadge(report.status)}
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground mb-2">
									Corrective Action:
								</p>
								{report.correctiveAction ? (
									<p className="text-sm leading-relaxed bg-muted/50 rounded-md p-3 border">
										{report.correctiveAction}
									</p>
								) : (
									<p className="text-sm text-muted-foreground italic">
										No corrective action recorded yet. Click Edit to add one.
									</p>
								)}
							</div>
							<Button size="sm" variant="outline" onClick={startEdit}>
								<Pencil className="h-4 w-4 mr-2" />
								Edit Status & Action
							</Button>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
