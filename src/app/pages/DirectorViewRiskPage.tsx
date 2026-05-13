import { ViewRiskDetails } from './ViewRiskDetails';

/** Director route: same report detail as SSIO, without mutation entry points. */
export function DirectorViewRiskPage() {
  return <ViewRiskDetails homePath="/director/dashboard" allowProgressActions={false} />;
}
