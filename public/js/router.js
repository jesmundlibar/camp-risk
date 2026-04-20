import * as auth from './auth.js';
import { mount as mountLogin } from './pages/login.js';
import { mount as mountGuardDashboard } from './pages/guardDashboard.js';
import { mount as mountIncidentReport } from './pages/incidentReport.js';
import { mount as mountAdminDashboard } from './pages/adminDashboard.js';
import { mount as mountRiskAssessment } from './pages/riskAssessment.js';
import { mount as mountViewRiskDetails } from './pages/viewRiskDetails.js';
import { mount as mountUpdateMitigation } from './pages/updateMitigation.js';
import { mount as mountRequestMoreInfo } from './pages/requestMoreInfo.js';
import { mount as mountExtendDeadline } from './pages/extendDeadline.js';
import { mount as mountManagePersonnel } from './pages/managePersonnel.js';

function match(path) {
  const p = path.replace(/\/$/, '') || '/';
  if (p === '/') return { name: 'login', params: {} };
  if (p === '/guard/dashboard') return { name: 'guardDashboard', params: {} };
  if (p === '/guard/report') return { name: 'incidentReport', params: {} };
  if (p === '/admin/dashboard') return { name: 'adminDashboard', params: {} };
  if (p === '/admin/manage-personnel') return { name: 'managePersonnel', params: {} };
  let m = p.match(/^\/admin\/assess\/([^/]+)$/);
  if (m) return { name: 'riskAssessment', params: { reportId: m[1] } };
  m = p.match(/^\/admin\/view-risk\/([^/]+)$/);
  if (m) return { name: 'viewRiskDetails', params: { riskId: m[1] } };
  m = p.match(/^\/admin\/update-mitigation\/([^/]+)$/);
  if (m) return { name: 'updateMitigation', params: { riskId: m[1] } };
  m = p.match(/^\/admin\/request-info\/([^/]+)$/);
  if (m) return { name: 'requestMoreInfo', params: { reportId: m[1] } };
  m = p.match(/^\/admin\/extend-deadline\/([^/]+)$/);
  if (m) return { name: 'extendDeadline', params: { actionId: m[1] } };
  return { name: 'login', params: {} };
}

function guard(route, user) {
  if (route.name === 'login') return true;
  if (!user) return false;
  if (route.name === 'guardDashboard' || route.name === 'incidentReport') {
    return user.role === 'guard';
  }
  if (
    route.name === 'adminDashboard' ||
    route.name === 'riskAssessment' ||
    route.name === 'viewRiskDetails' ||
    route.name === 'updateMitigation' ||
    route.name === 'requestMoreInfo' ||
    route.name === 'extendDeadline' ||
    route.name === 'managePersonnel'
  ) {
    return user.role === 'admin';
  }
  return false;
}

function redirectForRole(user) {
  if (!user) return '/';
  return user.role === 'guard' ? '/guard/dashboard' : '/admin/dashboard';
}

export function startRouter(container) {
  const navigate = (path) => {
    history.pushState(null, '', path);
    render();
  };

  const ctx = (base) => ({
    navigate,
    auth,
    ...base,
  });

  function render() {
    const path = window.location.pathname;
    let route = match(path);
    const user = auth.loadUser();

    if (route.name !== 'login' && !guard(route, user)) {
      history.replaceState(null, '', redirectForRole(user));
      route = match(window.location.pathname);
    }

    if (route.name !== 'login' && !user) {
      history.replaceState(null, '', '/');
      route = { name: 'login', params: {} };
    }

    if (route.name === 'login' && user) {
      history.replaceState(null, '', redirectForRole(user));
      route = match(window.location.pathname);
    }

    container.replaceChildren();
    container.className = '';

    switch (route.name) {
      case 'login':
        mountLogin(container, ctx({}));
        break;
      case 'guardDashboard':
        mountGuardDashboard(container, ctx({}));
        break;
      case 'incidentReport':
        mountIncidentReport(container, ctx({}));
        break;
      case 'adminDashboard':
        mountAdminDashboard(container, ctx({}));
        break;
      case 'riskAssessment':
        mountRiskAssessment(container, ctx({ params: route.params }));
        break;
      case 'viewRiskDetails':
        mountViewRiskDetails(container, ctx({ params: route.params }));
        break;
      case 'updateMitigation':
        mountUpdateMitigation(container, ctx({ params: route.params }));
        break;
      case 'requestMoreInfo':
        mountRequestMoreInfo(container, ctx({ params: route.params }));
        break;
      case 'extendDeadline':
        mountExtendDeadline(container, ctx({ params: route.params }));
        break;
      case 'managePersonnel':
        mountManagePersonnel(container, ctx({}));
        break;
      default:
        mountLogin(container, ctx({}));
    }
  }

  window.addEventListener('popstate', render);
  render();
}
