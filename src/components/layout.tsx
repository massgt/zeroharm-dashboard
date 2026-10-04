import { Link, useLocation } from "wouter";
import { useState } from "react";
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
	Menu,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import CompanyLogo from "../assets/LogoMVM.png";
import CompanyLogoExpanded from "../assets/LogoMVM2.png";
import userLogo from "@/assets/user.png";

export function Layout({ children }: { children: React.ReactNode }) {
	const [location] = useLocation();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const navItems = [
		{ href: "/", icon: Activity, label: "Dashboard" },
		{ href: "/upload", icon: Upload, label: "Upload Data" },
		{ href: "/members", icon: Users, label: "Kelola Anggota" },
		{ href: "/safety-campaign", icon: Megaphone, label: "Safety Campaign" },
		{ href: "/summary", icon: FileBarChart, label: "Summary" },
	];

	return (
		<div className="flex h-screen w-full bg-background overflow-hidden">
			{/* Mobile overlay */}
			{sidebarOpen && (
				<button
					type="button"
					aria-label="Tutup menu"
					className="fixed inset-0 z-40 bg-black/40 md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* =========================================================
          SIDEBAR
          Desktop:
          collapsed = 64px
          hover     = 256px

          Mobile:
          drawer    = 256px
      ========================================================= */}
			<aside
				className={`
          group
          fixed inset-y-0 left-0 z-50
          flex flex-col
          bg-sidebar text-sidebar-foreground
          border-r border-sidebar-border
          overflow-hidden
          bg-amber-500

          transform
          transition-[width,transform]
          duration-200
          ease-out

          w-64

          md:relative
          md:translate-x-0
          md:w-16
          md:hover:w-64
          md:shrink-0

          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
			>
				{/* =====================================================
            SIDEBAR HEADER / LOGO
            ===================================================== */}
				<div
					className="
    h-16
    flex
    items-center
    shrink-0
    border-b border-sidebar-border
    overflow-hidden
    px-6

    md:px-2
    md:group-hover:px-6

    transition-[padding]
    duration-200
  "
				>
					{/* =====================================================
      MOBILE
      Sidebar terbuka = expanded logo
      Sidebar tertutup = tidak terlihat karena drawer tertutup
  ===================================================== */}
					<div className="flex md:hidden items-center">
						<img
							src={CompanyLogoExpanded}
							alt="SAP Monitoring"
							className="h-10 w-auto shrink-0"
						/>
						<div className="ml-2">
							<div className="font-bold tracking-tight text-base leading-tight py-0.5">
								SAP Monitoring
							</div>

							<div className="text-[12px] text-sidebar-foreground/50 leading-tight ">
								PT. Minergo Visi Maxima
							</div>
						</div>
					</div>

					{/* =====================================================
                  DESKTOP
                  Collapsed = CompanyLogo
                  Hover    = CompanyLogoExpanded + title
              ===================================================== */}
					<div className="hidden md:flex items-center min-w-0 w-full">
						{/* Logo collapsed */}
						<img
							src={CompanyLogo}
							alt="MVM Logo"
							className="
        h-9
        w-9
        shrink-0
        md:group-hover:hidden
      "
						/>

						{/* Logo expanded + title */}
						<div
							className="
        hidden
        md:group-hover:flex
        items-center
        min-w-0
      "
						>
							<img
								src={CompanyLogoExpanded}
								alt="MVM Logo"
								className="h-10 w-auto shrink-0"
							/>

							<div className="ml-2 overflow-hidden whitespace-nowrap">
								<div className="font-bold tracking-tight text-base leading-tight">
									SAP Monitoring
								</div>

								<div className="text-[12px] text-sidebar-foreground/50 leading-tight">
									PT. Minergo Visi Maxima
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* =====================================================
            NAVIGATION
        ===================================================== */}
				<div
					className="
            flex-1
            py-6
            px-2
            md:px-2
            md:group-hover:px-4
            space-y-1
            overflow-y-auto
            transition-[padding]
            duration-200
          "
				>
					{/* Section title */}
					<div className="mb-4 px-2">
						{/* Desktop collapsed */}
						<span
							className="
      hidden
      md:block
      md:group-hover:hidden
      text-xs
      font-semibold
      text-sidebar-foreground/50
      text-center
    "
						>
							---
						</span>

						{/* Desktop expanded + Mobile */}
						<span
							className="
      block
      md:hidden
      md:group-hover:block
      text-xs
      font-semibold
      text-sidebar-foreground/50
      uppercase
      tracking-wider
      whitespace-nowrap
      text-left
    "
						>
							Program Zero Harm 2.0
						</span>
					</div>

					{/* Navigation items */}
					{navItems.map((item) => {
						const isActive =
							location === item.href ||
							(item.href !== "/" && location.startsWith(item.href));

						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setSidebarOpen(false)}
							>
								<div
									className={`
                    flex
                    items-center
                    rounded-md
                    cursor-pointer
                    transition-colors
                    duration-150

                    px-3
                    py-2

                    md:justify-center
                    md:group-hover:justify-start

                    ${
											isActive
												? "bg-sidebar-primary text-sidebar-primary-foreground"
												: "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
										}
                  `}
									title={item.label}
									data-testid={`nav-${item.label
										.toLowerCase()
										.replace(/\s+/g, "-")}`}
								>
									<item.icon
										className="
                      h-4 w-4
                      shrink-0
                      md:mr-0
                      md:group-hover:mr-3
                      transition-[margin]
                      duration-200
                    "
									/>

									<span
										className="
                      ml-3
                      md:ml-0
                      md:max-w-0
                      md:opacity-0
                      md:group-hover:max-w-[180px]
                      md:group-hover:opacity-100
                      md:group-hover:ml-0

                      overflow-hidden
                      whitespace-nowrap

                      font-medium
                      text-sm

                      transition-all
                      duration-200
                    "
									>
										{item.label}
									</span>
								</div>
							</Link>
						);
					})}
				</div>

				{/* =====================================================
            USER PROFILE
        ===================================================== */}
				<div className="shrink-0 p-3 border-t border-sidebar-border ">
					<div
						className="
                flex
                items-center
                justify-center
                md:justify-center
                md:group-hover:justify-start

                p-2
                md:px-0
                md:group-hover:px-2

                rounded-md
                cursor-pointer
                hover:bg-sidebar-accent

                transition-all
                duration-200
            "
					>
						<Avatar
							className="
                h-8 w-8
                shrink-0
                bg-sidebar-accent
                border
                border-sidebar-border
                left-1.5
              "
						>
							<img
								src={userLogo}
								alt="User"
								className="h-full w-full object-cover"
							/>
						</Avatar>

						<div
							className="
                ml-3
                overflow-hidden
                whitespace-nowrap

                md:max-w-0
                md:opacity-0

                md:group-hover:max-w-[150px]
                md:group-hover:opacity-100

                transition-all
                duration-200
              "
						>
							<div className="text-sm font-medium truncate">John Doe</div>

							<div className="text-xs text-sidebar-foreground/60 truncate">
								HSE Manager
							</div>
						</div>
					</div>

					{/* Footer */}
					<div
						className="
              hidden
              md:block

              mt-2
              text-xs
              text-sidebar-foreground/60
              text-center
              font-medium

              whitespace-nowrap
              overflow-hidden

              max-w-0
              opacity-0

              md:group-hover:max-w-[220px]
              md:group-hover:opacity-100

              transition-all
              duration-200
            "
					>
						Provided by HSE Dept. MVM ©️ 2026
					</div>
				</div>
			</aside>

			{/* =========================================================
          MAIN CONTENT
      ========================================================= */}
			<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y">
				{/* =====================================================
            TOP NAVBAR
        ===================================================== */}
				<header
					className="
            h-16
            flex
            items-center
            justify-between
            px-4
            md:px-6
            border-b
            bg-card
            shrink-0
          "
				>
					{/* Mobile header */}
					<div className="flex items-center gap-2 md:hidden">
						<Button
							variant="ghost"
							size="icon"
							aria-label="Buka menu"
							className="shrink-0"
							onClick={() => setSidebarOpen(true)}
						>
							<Menu className="h-5 w-5" />
						</Button>

						<img
							src={CompanyLogo}
							alt="MVM Logo"
							className="h-5 w-5 shrink-0"
						/>

						<span className="font-bold">Zero Harm 2.0</span>
					</div>

					{/* Desktop search */}
					<div
						className="
              hidden
              md:flex
              items-center
              bg-muted/50
              rounded-md
              px-3
              py-1.5
              w-96
              border
              border-border
            "
					>
						<Search className="h-4 w-4 text-muted-foreground mr-2" />

						<input
							type="text"
							placeholder="Search reports, incidents, locations..."
							className="
                bg-transparent
                border-none
                outline-none
                text-sm
                w-full
                text-foreground
                placeholder:text-muted-foreground
              "
						/>
					</div>

					{/* Right actions */}
					<div className="flex items-center gap-2 md:gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="relative text-muted-foreground"
						>
							<Bell className="h-5 w-5" />

							<span
								className="
                  absolute
                  top-1.5
                  right-1.5
                  h-2
                  w-2
                  rounded-full
                  bg-destructive
                  border
                  border-card
                "
							/>
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

				{/* =====================================================
            PAGE CONTENT
        ===================================================== */}
				<div className="p-4 md:p-8">
					<div className="w-full">{children}</div>
				</div>
			</main>
		</div>
	);
}
