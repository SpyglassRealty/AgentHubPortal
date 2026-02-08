import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import AppView from "@/pages/app-view";
import CalendarPage from "@/pages/calendar";
import EmailPage from "@/pages/email";
import ReportsPage from "@/pages/reports";
import LeadsPage from "@/pages/leads";
import MyPerformancePage from "@/pages/my-performance";
import SettingsPage from "@/pages/settings";
import PropertiesPage from "@/pages/properties";
import MarketingPage from "@/pages/marketing";
import MarketingCalendarPage from "@/pages/marketing-calendar";
import TrainingPage from "@/pages/training";
import CmaPage from "@/pages/cma";
import CmaBuilderPage from "@/pages/cma-builder";
import CmaPresentationPage from "@/pages/cma-presentation";
import PulsePage from "@/pages/pulse";
import AdminSettingsPage from "@/pages/admin-settings";


function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#EF4923] border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/my-performance" component={MyPerformancePage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/email" component={EmailPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/leads" component={LeadsPage} />
      <Route path="/properties" component={PropertiesPage} />
      <Route path="/pulse" component={PulsePage} />
      <Route path="/cma" component={CmaPage} />
      <Route path="/cma/:id/presentation" component={CmaPresentationPage} />
      <Route path="/cma/:id" component={CmaBuilderPage} />
      <Route path="/marketing" component={MarketingPage} />
      <Route path="/marketing-calendar" component={MarketingCalendarPage} />
      <Route path="/training" component={TrainingPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/app/:id" component={AppView} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
