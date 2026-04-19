import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login.tsx";
import { GuardDashboard } from "./pages/GuardDashboard.tsx";
import { AdminDashboard } from "./pages/AdminDashboard.tsx";
import { IncidentReport } from "./pages/IncidentReport.tsx";
import { RiskAssessment } from "./pages/RiskAssessment.tsx";
import { ManagePersonnel } from "./pages/ManagePersonnel.tsx";
import { ViewRiskDetails } from "./pages/ViewRiskDetails.tsx";
import { UpdateMitigation } from "./pages/UpdateMitigation.tsx";
import { RequestMoreInfo } from "./pages/RequestMoreInfo.tsx";
import { ExtendDeadline } from "./pages/ExtendDeadline.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
  },
  {
    path: "/guard/dashboard",
    Component: GuardDashboard,
  },
  {
    path: "/guard/report",
    Component: IncidentReport,
  },
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
  {
    path: "/admin/assess/:reportId",
    Component: RiskAssessment,
  },
  {
    path: "/admin/manage-personnel",
    Component: ManagePersonnel,
  },
  {
    path: "/admin/view-risk/:riskId",
    Component: ViewRiskDetails,
  },
  {
    path: "/admin/update-mitigation/:riskId",
    Component: UpdateMitigation,
  },
  {
    path: "/admin/request-info/:reportId",
    Component: RequestMoreInfo,
  },
  {
    path: "/admin/extend-deadline/:actionId",
    Component: ExtendDeadline,
  },
]);
