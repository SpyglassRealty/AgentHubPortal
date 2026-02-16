import { Switch, Route } from "wouter";
import Layout from "@/components/layout";
import CmsDashboard from "./cms-dashboard";
import CmsContentList from "./cms-content-list";
import CmsPageEditor from "./cms-editor";

export default function CmsRouter() {
  return (
    <Switch>
      <Route path="/admin/cms" component={CmsDashboardWithLayout} />
      <Route path="/admin/cms/pages" component={CmsContentListWithLayout} />
      <Route path="/admin/cms/editor/new" component={CmsEditorPage} />
      <Route path="/admin/cms/editor/:id" component={CmsEditorPage} />
      <Route>
        <CmsDashboardWithLayout />
      </Route>
    </Switch>
  );
}

function CmsDashboardWithLayout() {
  return (
    <Layout>
      <CmsDashboard />
    </Layout>
  );
}

function CmsContentListWithLayout() {
  return (
    <Layout>
      <CmsContentList />
    </Layout>
  );
}

// Editor has its own full-screen layout, no sidebar
function CmsEditorPage() {
  return <CmsPageEditor />;
}
