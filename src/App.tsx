import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import type { ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AuthProvider, useAuth } from "@/auth/auth-context";
import Dashboard from "@/pages/dashboard";
import UploadData from "@/pages/upload";
import Members from "@/pages/members";
import NotFound from "@/pages/not-found";
import Summary from "@/pages/summary";
import SafetyCampaign from "@/pages/safety-campaign";
import Sosialisasi from "@/pages/sosialisasi";
import Login from "@/pages/login";

const queryClient = new QueryClient();

function AdminRoute({ component: Component }: { component: ComponentType }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Memeriksa sesi...</div>;
  return isAdmin ? <Component /> : <Redirect to="/" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/upload">
        <AdminRoute component={UploadData} />
      </Route>
      <Route path="/members">
        <AdminRoute component={Members} />
      </Route>
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
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout><Router /></Layout>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
