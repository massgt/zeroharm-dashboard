import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import UploadData from "@/pages/upload";
import Members from "@/pages/members";
import NotFound from "@/pages/not-found";
import Summary from "@/pages/summary";
import SafetyCampaign from "@/pages/safety-campaign";
import Sosialisasi from "@/pages/sosialisasi";

const queryClient = new QueryClient();

function Router() {
	return (
		<Switch>
			<Route path="/" component={Dashboard} />
			<Route path="/upload" component={UploadData} />
			<Route path="/members" component={Members} />
			<Route path="/summary" component={Summary} />
			<Route path="/safety-campaign" component={SafetyCampaign} />
			<Route path="/sosialisasi" component={Sosialisasi} />
			<Route component={NotFound} />
		</Switch>
	);
}

function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
					<Layout>
						<Router />
					</Layout>
				</WouterRouter>
				<Toaster />
			</TooltipProvider>
		</QueryClientProvider>
	);
}

export default App;
