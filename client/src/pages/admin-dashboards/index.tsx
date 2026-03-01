import { Switch, Route } from "wouter";
import Layout from "@/components/layout";
import AdminDashboardOverview from "./overview";
import TransactionsPage from "./transactions";
import ListingsPage from "./listings";
import RevenuePage from "./revenue";
import NetworkPage from "./network";
import LeaderboardPage from "./leaderboard";
import InsightsPage from "./insights";
import LeadsPage from "./leads";
import NetworkFrontlinePage from "./network-frontline";
import NetworkTrendsPage from "./network-trends";
import NetworkRevSharePage from "./network-revshare";
import AgentInsightsPage from "./agent-insights";
import MemberManagementPage from "./member-management";
import TeamTasksPage from "./team-tasks";
import DirectoryPage from "./directory";
import LinksPage from "./links";
import ReportsPage from "./reports";
import RetentionRiskPage from "./retention-risk";
import RecruitingBattlecardsPage from "./recruiting-battlecards";
import BillionTrackerPage from "./billion-tracker";

export default function AdminDashboardsRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/admin/dashboards" component={AdminDashboardOverview} />
        <Route path="/admin/dashboards/billion-tracker" component={BillionTrackerPage} />
        <Route path="/admin/dashboards/retention-risk" component={RetentionRiskPage} />
        <Route path="/admin/dashboards/recruiting-battlecards" component={RecruitingBattlecardsPage} />
        <Route path="/admin/dashboards/insights" component={InsightsPage} />
        <Route path="/admin/dashboards/leads" component={LeadsPage} />
        <Route path="/admin/dashboards/transactions" component={TransactionsPage} />
        <Route path="/admin/dashboards/listings" component={ListingsPage} />
        <Route path="/admin/dashboards/revenue" component={RevenuePage} />
        <Route path="/admin/dashboards/network" component={NetworkPage} />
        <Route path="/admin/dashboards/network/frontline" component={NetworkFrontlinePage} />
        <Route path="/admin/dashboards/network/trends" component={NetworkTrendsPage} />
        <Route path="/admin/dashboards/network/revshare" component={NetworkRevSharePage} />
        <Route path="/admin/dashboards/network/members" component={NetworkPage} />
        <Route path="/admin/dashboards/agent-insights" component={AgentInsightsPage} />
        <Route path="/admin/dashboards/member-management" component={MemberManagementPage} />
        <Route path="/admin/dashboards/team-tasks" component={TeamTasksPage} />
        <Route path="/admin/dashboards/leaderboard" component={LeaderboardPage} />
        <Route path="/admin/dashboards/directory" component={DirectoryPage} />
        <Route path="/admin/dashboards/links" component={LinksPage} />
        <Route path="/admin/dashboards/reports" component={ReportsPage} />
        <Route>
          <AdminDashboardOverview />
        </Route>
      </Switch>
    </Layout>
  );
}
