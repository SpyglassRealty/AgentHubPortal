import { Switch, Route, Redirect, useRoute, useLocation } from "wouter";
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
import CmaPresentationPage from "@/components/cma-presentation/pages/CMAPresentation";
import CMAPresentationBuilder from "@/pages/CMAPresentationBuilder";
import SharedCmaPage from "@/pages/shared-cma";
import PulsePage from "@/pages/pulse";
import AdminSettingsPage from "@/pages/admin-settings";
import AdminPage from "@/pages/admin";
import AdminDashboardsRouter from "@/pages/admin-dashboards";
import AdminBeaconPage from "@/pages/admin-beacon";
import CommunityListPage from "@/pages/admin/CommunityList";
import CommunityEditorPage from "@/pages/admin/CommunityEditor";
import AdminSiteEditorPage from "@/pages/admin-site-editor";
import RedirectsListPage from "@/pages/admin/RedirectsList";
import GlobalScriptsListPage from "@/pages/admin/GlobalScriptsList";
import BlogPostListPage from "@/pages/admin/BlogPostList";
import BlogPostEditorPage from "@/pages/admin/BlogPostEditor";
import BlogCategoryListPage from "@/pages/admin/BlogCategoryList";
import AgentListPage from "@/pages/admin/AgentList";
import AgentEditorPage from "@/pages/admin/AgentEditor";
import LandingPageListPage from "@/pages/admin/LandingPageList";
import LandingPageEditorPage from "@/pages/admin/LandingPageEditor";
import PagesListPage from "@/pages/admin/pages-list";
import PageEditorPage from "@/pages/admin/page-editor";
import TestimonialListPage from "@/pages/admin/TestimonialList";
import TestimonialEditorPage from "@/pages/admin/TestimonialEditor";
import ReviewSourceManagerPage from "@/pages/admin/ReviewSourceManager";
import DeveloperPage from "./pages/developer";

// Backward compatibility redirect component
function CmaPresentationRedirect() {
  const [, routeParams] = useRoute("/cma/:id/presentation");
  const [, setLocation] = useLocation();
  
  if (routeParams?.id) {
    setLocation(`/cma/${routeParams.id}/cma-presentation`);
  }
  
  return null;
}

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
        <Route path="/share/:token" component={SharedCmaPage} />
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
      <Route path="/cma/:id/cma-presentation" component={CmaPresentationPage} />
      <Route path="/cma/:id/presentation-builder" component={CMAPresentationBuilder} />
      {/* Backward compatibility redirect */}
      <Route path="/cma/:id/presentation" component={CmaPresentationRedirect} />
      <Route path="/cma/:id" component={CmaBuilderPage} />
      <Route path="/marketing" component={MarketingPage} />
      <Route path="/marketing-calendar" component={MarketingCalendarPage} />
      <Route path="/training" component={TrainingPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/developer" component={DeveloperPage} />
      <Route path="/admin/*" component={AdminPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/share/:token" component={SharedCmaPage} />
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
