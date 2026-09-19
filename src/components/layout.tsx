import { Link, useLocation } from "wouter";
import {
	Shield,
	Activity,
	Upload,
	Users,
	Search,
	Bell,
	Settings,
	FileBarChart,
	Megaphone,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import CompanyLogo from "../assets/LogoMVM.png";
import userLogo from "@/assets/user.png";

export function Layout({ children }: { children: React.ReactNode }) {
	const [location] = useLocation();

	const navItems = [
		{ href: "/", icon: Activity, label: "Dashboard" },
		{ href: "/upload", icon: Upload, label: "Upload Data" },
		{ href: "/members", icon: Users, label: "Kelola Anggota" },
		{ href: "/safety-campaign", icon: Megaphone, label: "Safety Campaign" },
		{ href: "/summary", icon: FileBarChart, label: "Summary" },
	];

	return (
		<div className="flex h-screen w-full bg-background overflow-hidden">
			{/* Sidebar */}
			<aside className="w-64 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex shrink-0">
				<div className="h-16 flex items-center px-6 border-b border-sidebar-border">
					<img
						src={CompanyLogo}
						alt="MVM Logo"
						className="h-9 w-9 mr-2 shrink-0"
					/>
					<div>
						<div className="font-bold tracking-tight text-base leading-tight">
							SAP Monitoring
						</div>
						<div className="text-[12px] text-sidebar-foreground/50 leading-tight">
							PT. Minergo Visi Maxima
						</div>
					</div>
				</div>

				<div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
					<div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
						Program Zero Harm 2.0
					</div>
					{navItems.map((item) => (
						<Link key={item.href} href={item.href}>
							<div
								className={`flex items-center px-3 py-2 rounded-md transition-colors cursor-pointer ${
									location === item.href ||
									(item.href !== "/" && location.startsWith(item.href))
										? "bg-sidebar-primary text-sidebar-primary-foreground"
										: "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
								}`}
								data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
							>
								<item.icon className="h-4 w-4 mr-3" />
								<span className="font-medium text-sm">{item.label}</span>
							</div>
						</Link>
					))}
				</div>

				<div className="p-4 border-t border-sidebar-border pb-1">
					<div className="flex items-center cursor-pointer hover:bg-sidebar-accent p-2 rounded-md transition-colors">
						<Avatar className="h-8 w-8 bg-sidebar-accent border border-sidebar-border mr-3">
							{/* <AvatarFallback className="text-sidebar-foreground">
								JD
							</AvatarFallback> */}
							<img src={userLogo} />
						</Avatar>
						<div className="flex-1 overflow-hidden">
							<div className="text-sm font-medium truncate">John Doe</div>
							<div className="text-xs text-sidebar-foreground/60 truncate">
								HSE Manager
							</div>
						</div>
					</div>
					<div className="text-xs text-sidebar-foreground/60 truncate text-center pt-2 font-medium">
						Provided by HSE Dept. MVM ©️ 2026
					</div>
				</div>
			</aside>

			{/* Main Content */}
			<main className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* Top Navbar */}
				<header className="h-16 flex items-center justify-between px-6 border-b bg-card shrink-0">
					<div className="flex items-center md:hidden">
						<Shield className="h-6 w-6 text-primary mr-2" />
						<span className="font-bold">Zero Harm</span>
					</div>

					<div className="hidden md:flex items-center bg-muted/50 rounded-md px-3 py-1.5 w-96 border border-border">
						<Search className="h-4 w-4 text-muted-foreground mr-2" />
						<input
							type="text"
							placeholder="Search reports, incidents, locations..."
							className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
						/>
					</div>

					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="relative text-muted-foreground"
						>
							<Bell className="h-5 w-5" />
							<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground"
						>
							<Settings className="h-5 w-5" />
						</Button>
					</div>
				</header>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-4 md:p-8">
					<div className="max-w-7xl mx-auto">{children}</div>
				</div>
			</main>
		</div>
	);
}
