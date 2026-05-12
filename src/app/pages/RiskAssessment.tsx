import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Save, Send, AlertCircle } from 'lucide-react';
import { AppShellHeader } from '../components/AppShellHeader';
import { riskChoicesForHazard } from '../constants/hazardRiskChoices';
import { MITIGATION_TEAM_OPTIONS } from '../constants/mitigationTeams';
import {
  ensureMediaSrc,
  fetchReport,
  submitRiskAssessment,
  type ApiReport,
} from '../lib/api';

interface MitigationAction {
  description: string;
  dueDate: string;
}

interface HazardRowDraft {
  specificRisk: string;
  affectedArea: string;
  likelihood: string;
  severity: string;
}

interface RiskAssessmentDraft {
  riskClassification: string;
  likelihood: string;
  severity: string;
  engineering: string;
  administrative: string;
  ppe: string;
  residualRisk: string;
  actions: MitigationAction[];
  hazardRows?: HazardRowDraft[];
  mitigationAssignedTo?: string;
}

export function RiskAssessment() {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [sourceReport, setSourceReport] = useState<ApiReport | null>(null);
  const [reportLoading, setReportLoading] = useState(!!reportId);

  useEffect(() => {
    if (!reportId) {
      setSourceReport(null);
      setReportLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setReportLoading(true);
      try {
        const r = await fetchReport(reportId);
        if (!cancelled) setSourceReport(r);
      } catch {
        if (!cancelled) setSourceReport(null);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const [riskClassification, setRiskClassification] = useState('');
  const [likelihood, setLikelihood] = useState('');
  const [severity, setSeverity] = useState('');
  const [engineering, setEngineering] = useState('');
  const [administrative, setAdministrative] = useState('');
  const [ppe, setPpe] = useState('');
  const [residualRisk, setResidualRisk] = useState('');
  const [actions, setActions] = useState<MitigationAction[]>([{ description: '', dueDate: '' }]);
  const [mitigationAssignedTo, setMitigationAssignedTo] = useState<string>(MITIGATION_TEAM_OPTIONS[0]);
  const [hazardRows, setHazardRows] = useState<HazardRowDraft[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  /** True while image is shown in fullscreen (Browser API or viewport fallback). */
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [fullscreenFallback, setFullscreenFallback] = useState(false);
  const [fsImageScale, setFsImageScale] = useState(1);
  const fullscreenHostRef = useRef<HTMLDivElement>(null);
  const fullscreenWheelRef = useRef<HTMLDivElement>(null);
  const imageFullscreenRef = useRef(false);
  /** Drag-to-pan in fullscreen viewer (same pointer id only). */
  const imagePanRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const requestFullscreenEl = useCallback((el: Element) => {
    const node = el as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    if (typeof node.requestFullscreen === 'function') {
      return node.requestFullscreen();
    }
    if (typeof node.webkitRequestFullscreen === 'function') {
      return Promise.resolve(node.webkitRequestFullscreen());
    }
    return Promise.reject(new Error('Fullscreen not supported'));
  }, []);

  const exitFullscreenDoc = useCallback(async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    try {
      if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen();
      } else if (typeof doc.webkitExitFullscreen === 'function') {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore if not in fullscreen.
    }
  }, []);

  const closeImageViewer = useCallback(async () => {
    await exitFullscreenDoc();
    setImageFullscreen(false);
    setFullscreenFallback(false);
    setFsImageScale(1);
    setShowImageModal(false);
  }, [exitFullscreenDoc]);

  const exitImageFullscreenOnly = useCallback(async () => {
    await exitFullscreenDoc();
    setImageFullscreen(false);
    setFullscreenFallback(false);
    setFsImageScale(1);
  }, [exitFullscreenDoc]);

  useEffect(() => {
    if (!imageFullscreen) return;
    const host = fullscreenHostRef.current;
    if (!host) return;
    let cancelled = false;
    void (async () => {
      try {
        await requestFullscreenEl(host);
        if (!cancelled) setFullscreenFallback(false);
      } catch {
        if (!cancelled) setFullscreenFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageFullscreen, requestFullscreenEl]);

  useEffect(() => {
    const onFsChange = () => {
      const fs =
        document.fullscreenElement ??
        (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
        null;
      if (!fs && imageFullscreenRef.current) {
        setImageFullscreen(false);
        setFullscreenFallback(false);
        setFsImageScale(1);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  imageFullscreenRef.current = imageFullscreen;

  useEffect(() => {
    if (!imageFullscreen) return;
    const el = fullscreenWheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const horizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontalIntent) {
        e.preventDefault();
        const amount = e.shiftKey ? e.deltaY : e.deltaX;
        el.scrollLeft += amount;
        return;
      }
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.06 : 0.94;
      setFsImageScale((s) => {
        const next = s * factor;
        return Math.min(10, Math.max(0.2, Number(next.toFixed(4))));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [imageFullscreen]);

  useEffect(() => {
    if (!showImageModal && !imageFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (imageFullscreen) void exitImageFullscreenOnly();
      else void closeImageViewer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showImageModal, imageFullscreen, exitImageFullscreenOnly, closeImageViewer]);

  useEffect(() => {
    if (!fullscreenFallback) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreenFallback]);

  const draftStorageKey = reportId ? `camp-risk:draft:${reportId}` : '';

  const hazardTypesList = sourceReport?.hazard_types ?? [];
  const multiHazard = hazardTypesList.length > 0;

  const perHazardScores = multiHazard
    ? hazardRows.map((r) =>
        r.likelihood && r.severity ? parseInt(r.likelihood, 10) * parseInt(r.severity, 10) : 0,
      )
    : [];
  const riskScore = multiHazard
    ? Math.max(0, ...perHazardScores, 0)
    : likelihood && severity
      ? parseInt(likelihood, 10) * parseInt(severity, 10)
      : 0;
  const riskLevel =
    riskScore >= 20
      ? 'High Risk'
      : riskScore >= 12
        ? 'Medium Risk'
        : riskScore > 0
          ? 'Low Risk'
          : '';

  const addAction = () => {
    setActions([...actions, { description: '', dueDate: '' }]);
  };

  const updateAction = (index: number, field: keyof MitigationAction, value: string) => {
    const newActions = [...actions];
    newActions[index][field] = value;
    setActions(newActions);
  };

  const updateHazardRow = (index: number, patch: Partial<HazardRowDraft>) => {
    setHazardRows((rows) => {
      const next = [...rows];
      if (!next[index]) return rows;
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const initHazardRowsFromReport = useCallback((r: ApiReport) => {
    const types = r.hazard_types ?? [];
    if (types.length === 0) {
      setHazardRows([]);
      return;
    }
    const bd = r.assessment?.hazard_risk_breakdown;
    setHazardRows(
      types.map((h, i) => {
        const raw =
          Array.isArray(bd) && bd[i] && typeof bd[i] === 'object' ? (bd[i] as Record<string, unknown>) : null;
        if (raw) {
          return {
            specificRisk: String(raw.specific_risk || ''),
            affectedArea: String(raw.affected_area || ''),
            likelihood: raw.likelihood != null ? String(raw.likelihood) : '',
            severity: raw.severity != null ? String(raw.severity) : '',
          };
        }
        const picks = riskChoicesForHazard(h);
        return {
          specificRisk: picks[0].risk,
          affectedArea: picks[0].affected,
          likelihood: '',
          severity: '',
        };
      }),
    );
  }, []);

  useEffect(() => {
    if (!draftStorageKey || !sourceReport) return;
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) {
        initHazardRowsFromReport(sourceReport);
        return;
      }
      const draft = JSON.parse(raw) as RiskAssessmentDraft;
      if (draft.riskClassification) setRiskClassification(draft.riskClassification);
      if (draft.likelihood) setLikelihood(draft.likelihood);
      if (draft.severity) setSeverity(draft.severity);
      if (draft.engineering) setEngineering(draft.engineering);
      if (draft.administrative) setAdministrative(draft.administrative);
      if (draft.ppe) setPpe(draft.ppe);
      if (draft.residualRisk) setResidualRisk(draft.residualRisk);
      if (Array.isArray(draft.actions) && draft.actions.length > 0) {
        setActions(draft.actions);
      }
      if (draft.mitigationAssignedTo && draft.mitigationAssignedTo.trim()) {
        setMitigationAssignedTo(draft.mitigationAssignedTo.trim());
      }
      const types = sourceReport.hazard_types ?? [];
      if (
        types.length > 0 &&
        Array.isArray(draft.hazardRows) &&
        draft.hazardRows.length === types.length
      ) {
        setHazardRows(draft.hazardRows);
      } else {
        initHazardRowsFromReport(sourceReport);
      }
    } catch {
      initHazardRowsFromReport(sourceReport);
    }
  }, [draftStorageKey, sourceReport, initHazardRowsFromReport]);

  useEffect(() => {
    if (!draftMessage) return;
    const t = window.setTimeout(() => setDraftMessage(''), 4800);
    return () => window.clearTimeout(t);
  }, [draftMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!reportId || !sourceReport) {
      setSubmitError('No incident loaded to assess.');
      return;
    }
    if (!riskClassification.trim()) {
      setSubmitError('Select a risk classification.');
      return;
    }
    if (multiHazard) {
      if (hazardRows.length !== hazardTypesList.length) {
        setSubmitError('Hazard breakdown is still loading — wait a moment and try again.');
        return;
      }
      for (let i = 0; i < hazardTypesList.length; i++) {
        const row = hazardRows[i];
        if (!row.specificRisk.trim()) {
          setSubmitError(`Describe or select a specific risk for: ${hazardTypesList[i]}`);
          return;
        }
        if (!row.likelihood || !row.severity) {
          setSubmitError(`Select likelihood and severity for: ${hazardTypesList[i]}`);
          return;
        }
      }
    } else if (!likelihood || !severity) {
      setSubmitError('Select likelihood and severity (1–5).');
      return;
    }
    const eng = engineering.trim();
    const adm = administrative.trim();
    const ppeT = ppe.trim();
    if (!eng || !adm || !ppeT) {
      setSubmitError('Fill in all control measure fields (engineering, administrative, and PPE).');
      return;
    }
    const residual = residualRisk.trim();
    if (!residual) {
      setSubmitError('Residual risk is required.');
      return;
    }
    const filledActions = actions.filter((a) => a.description.trim() || a.dueDate);
    if (filledActions.length === 0) {
      setSubmitError('Add at least one mitigation action with both description and due date.');
      return;
    }
    for (const a of filledActions) {
      if (!a.description.trim() || !a.dueDate) {
        setSubmitError('Each mitigation action row must include both description and due date (remove empty rows or complete them).');
        return;
      }
    }
    setSubmitting(true);
    try {
      const payloadCommon = {
        risk_classification: riskClassification,
        engineering_controls: eng,
        administrative_controls: adm,
        ppe_controls: ppeT,
        residual_risk: residual,
        mitigation_actions: filledActions.map((a) => ({
          description: a.description.trim(),
          due_date: a.dueDate,
        })),
        mitigation_assigned_to: mitigationAssignedTo.trim(),
      };
      if (multiHazard) {
        await submitRiskAssessment(reportId, {
          ...payloadCommon,
          hazard_risk_breakdown: hazardTypesList.map((h, i) => ({
            hazard: h,
            specific_risk: hazardRows[i].specificRisk.trim(),
            affected_area: hazardRows[i].affectedArea.trim(),
            likelihood: parseInt(hazardRows[i].likelihood, 10),
            severity: parseInt(hazardRows[i].severity, 10),
          })),
        });
      } else {
        await submitRiskAssessment(reportId, {
          ...payloadCommon,
          likelihood: parseInt(likelihood, 10),
          severity: parseInt(severity, 10),
        });
      }
      if (draftStorageKey) {
        window.localStorage.removeItem(draftStorageKey);
      }
      navigate(`/admin/view-risk/${encodeURIComponent(reportId)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!draftStorageKey) {
      setSubmitError('Cannot save draft: missing report ID.');
      return;
    }
    const payload: RiskAssessmentDraft = {
      riskClassification,
      likelihood,
      severity,
      engineering,
      administrative,
      ppe,
      residualRisk,
      actions,
      hazardRows,
      mitigationAssignedTo,
    };
    window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    setDraftMessage('');
    window.setTimeout(
      () => setDraftMessage('Draft saved. Reopen this report anytime to continue where you left off.'),
      0,
    );
    setSubmitError('');
  };

  const incidentPhotoSrc = sourceReport ? ensureMediaSrc(sourceReport.photo_url) : null;

  return (
    <div className="app-page">
      <AppShellHeader
        actions={
          <button type="button" onClick={() => navigate('/admin/dashboard')} className="app-btn-outline w-full sm:w-auto">
            Dashboard
          </button>
        }
      />

      <main className="app-main-wide">
        <div className="app-form-panel">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="app-page-title">Risk assessment — report #{reportId}</h2>
            <button
              onClick={handleSaveDraft}
              type="button"
              className="app-btn-outline flex w-full min-h-11 shrink-0 items-center justify-center gap-2 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {submitError ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{submitError}</div>
            ) : null}
            {draftMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-800">
                {draftMessage}
              </div>
            ) : null}
            {/* Incident Details (Read-Only) */}
            <div className="bg-slate-50 rounded-lg p-4 sm:p-6 lg:p-8 border border-slate-200">
              <h3 className="text-lg lg:text-xl text-slate-800 mb-4">Incident Details</h3>
              {reportLoading ? (
                <p className="text-sm text-slate-500">Loading incident…</p>
              ) : sourceReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
                  <div>
                    <span className="text-slate-600">Hazard:</span>
                    <span className="ml-2 text-slate-800">{sourceReport.hazard}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Location:</span>
                    <span className="ml-2 text-slate-800">{sourceReport.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Reported:</span>
                    <span className="ml-2 text-slate-800">
                      {sourceReport.date} — {sourceReport.guard}
                    </span>
                  </div>
                  <div>
                    {incidentPhotoSrc ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFsImageScale(1);
                          setShowImageModal(true);
                          setImageFullscreen(false);
                          setFullscreenFallback(false);
                        }}
                        className="text-[var(--xu-blue)] hover:underline"
                      >
                        View attached image
                      </button>
                    ) : (
                      <span className="text-slate-500">No image attached</span>
                    )}
                  </div>
                  {hazardTypesList.length > 0 ? (
                    <div className="sm:col-span-2">
                      <span className="text-slate-600">Hazard types on report:</span>
                      <ul className="mt-2 list-disc pl-6 text-slate-800 space-y-1">
                        {hazardTypesList.map((t, i) => (
                          <li key={`${i}-${t}`}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {sourceReport.description ? (
                    <div className="sm:col-span-2">
                      <span className="text-slate-600">Description:</span>
                      <p className="mt-1 text-slate-800">{sourceReport.description}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  No incident loaded for this ID. Use &quot;Assess&quot; from a pending report in the admin queue, or
                  check that the API is running.
                </p>
              )}
            </div>

            {/* Risk Classification */}
            <div>
              <label className="block text-slate-800 mb-3">Risk Classification</label>
              <select
                value={riskClassification}
                onChange={(e) => setRiskClassification(e.target.value)}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
              >
                <option value="">Select Risk</option>
                <option value="earthquake-impact">Earthquake Impact</option>
                <option value="fire-hazard">Fire Hazard</option>
                <option value="laboratory-hazard">Laboratory Hazard</option>
                <option value="campus-security">Campus Security Risk</option>
                <option value="traffic-safety">Traffic Safety Risk</option>
                <option value="flooding-impact">Flooding Impact</option>
                <option value="electrical-hazard">Electrical Hazard</option>
                <option value="evacuation-failure">Emergency Evacuation Failure</option>
                <option value="slip-trip-fall">Slip/Trip/Fall</option>
                <option value="public-health">Public Health Risk</option>
              </select>
            </div>

            {/* Risk Rating */}
            <div>
              <label className="block text-slate-800 mb-3">
                Risk Rating{multiHazard ? ' (per reported hazard)' : ''}
              </label>
              {multiHazard ? (
                <div className="space-y-6">
                  <p className="text-sm text-slate-600">
                    Each selected hazard gets its own specific risk, affected area, likelihood, and severity (HIRAC-style).
                    The summary score uses the highest per-hazard product, matching SSIO aggregation on the server.
                  </p>
                  {hazardTypesList.map((hazardLabel, idx) => {
                    const picks = riskChoicesForHazard(hazardLabel);
                    const row = hazardRows[idx];
                    if (!row) {
                      return (
                        <p key={`${hazardLabel}-${idx}`} className="text-sm text-slate-500">
                          Loading row for {hazardLabel}…
                        </p>
                      );
                    }
                    return (
                      <div
                        key={`${hazardLabel}-${idx}`}
                        className="rounded-lg border border-slate-200 bg-slate-50/90 p-4 sm:p-5 space-y-4"
                      >
                        <h4 className="text-base font-semibold text-slate-800">{hazardLabel}</h4>
                        <div>
                          <label className="block text-sm text-slate-600 mb-2">Typical risks (preset)</label>
                          <select
                            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                            value=""
                            onChange={(e) => {
                              const j = parseInt(e.target.value, 10);
                              const opt = picks[j];
                              if (opt) {
                                updateHazardRow(idx, { specificRisk: opt.risk, affectedArea: opt.affected });
                              }
                            }}
                          >
                            <option value="">Choose a preset to fill fields…</option>
                            {picks.map((p, j) => (
                              <option key={j} value={j}>
                                {p.risk}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-2">Specific risk</label>
                            <textarea
                              value={row.specificRisk}
                              onChange={(e) => updateHazardRow(idx, { specificRisk: e.target.value })}
                              rows={2}
                              required
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm resize-none"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm text-slate-600 mb-2">Affected area</label>
                            <input
                              type="text"
                              value={row.affectedArea}
                              onChange={(e) => updateHazardRow(idx, { affectedArea: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <fieldset>
                            <legend className="block text-sm text-slate-600 mb-2">Likelihood (1–5)</legend>
                            <div className="flex flex-wrap gap-3">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <label key={num} className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input
                                    type="radio"
                                    name={`likelihood-${idx}`}
                                    value={num}
                                    checked={row.likelihood === String(num)}
                                    onChange={() => updateHazardRow(idx, { likelihood: String(num) })}
                                    required
                                    className="h-4 w-4 text-[var(--xu-blue)]"
                                  />
                                  <span>
                                    {num}
                                    <span className="ml-1 text-xs text-slate-500">
                                      {num === 1
                                        ? 'Rare'
                                        : num === 2
                                          ? 'Unlikely'
                                          : num === 3
                                            ? 'Possible'
                                            : num === 4
                                              ? 'Likely'
                                              : 'Very likely'}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          <fieldset>
                            <legend className="block text-sm text-slate-600 mb-2">Severity (1–5)</legend>
                            <div className="flex flex-wrap gap-3">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <label key={num} className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input
                                    type="radio"
                                    name={`severity-${idx}`}
                                    value={num}
                                    checked={row.severity === String(num)}
                                    onChange={() => updateHazardRow(idx, { severity: String(num) })}
                                    required
                                    className="h-4 w-4 text-[var(--xu-blue)]"
                                  />
                                  <span>
                                    {num}
                                    <span className="ml-1 text-xs text-slate-500">
                                      {num === 1
                                        ? 'Insignificant'
                                        : num === 2
                                          ? 'Minor'
                                          : num === 3
                                            ? 'Moderate'
                                            : num === 4
                                              ? 'Major'
                                              : 'Catastrophic'}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Likelihood (1-5)</label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <label key={num} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="likelihood"
                            value={num}
                            checked={likelihood === String(num)}
                            onChange={(e) => setLikelihood(e.target.value)}
                            required
                            className="h-4 w-4 text-[var(--xu-blue)]"
                          />
                          <span className="text-slate-700">
                            {num}
                            <span className="ml-1 text-xs text-slate-500">
                              {num === 1
                                ? 'Rare'
                                : num === 2
                                  ? 'Unlikely'
                                  : num === 3
                                    ? 'Possible'
                                    : num === 4
                                      ? 'Likely'
                                      : 'Very likely'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Severity (1-5)</label>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <label key={num} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="severity"
                            value={num}
                            checked={severity === String(num)}
                            onChange={(e) => setSeverity(e.target.value)}
                            required
                            className="h-4 w-4 text-[var(--xu-blue)]"
                          />
                          <span className="text-slate-700">
                            {num}
                            <span className="ml-1 text-xs text-slate-500">
                              {num === 1
                                ? 'Insignificant'
                                : num === 2
                                  ? 'Minor'
                                  : num === 3
                                    ? 'Moderate'
                                    : num === 4
                                      ? 'Major'
                                      : 'Catastrophic'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {riskScore > 0 && (
                <div className="mt-4 p-4 bg-slate-100 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
                  <AlertCircle
                    className={`h-6 w-6 shrink-0 ${
                      riskLevel === 'High Risk'
                        ? 'text-red-600'
                        : riskLevel === 'Medium Risk'
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}
                  />
                  <div>
                    <span className="text-slate-600">Summary score (for register): </span>
                    <span className="text-slate-800 font-medium">{riskScore}</span>
                    <span
                      className={`ml-3 px-3 py-1 rounded-full text-sm ${
                        riskLevel === 'High Risk'
                          ? 'bg-red-100 text-red-800'
                          : riskLevel === 'Medium Risk'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {riskLevel}
                    </span>
                    {multiHazard ? (
                      <p className="text-xs text-slate-500 mt-2">
                        Highest of the per-hazard likelihood × severity products (aligned with SSIO worksheet).
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-800 mb-2">Assigned to (mitigation)</label>
              <p className="text-sm text-slate-600 mb-2">
                Default assignee recorded on mitigation actions (you can change per action later in Update Mitigation).
              </p>
              <select
                value={mitigationAssignedTo}
                onChange={(e) => setMitigationAssignedTo(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)]"
              >
                {MITIGATION_TEAM_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Control measure */}
            <div>
              <label className="block text-slate-800 mb-3">Control measure</label>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Engineering controls</label>
                  <input
                    type="text"
                    value={engineering}
                    onChange={(e) => setEngineering(e.target.value)}
                    required
                    placeholder="e.g., Replace wiring, Install protective barriers"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Administrative controls</label>
                  <input
                    type="text"
                    value={administrative}
                    onChange={(e) => setAdministrative(e.target.value)}
                    required
                    placeholder="e.g., Post warning signs, Restrict access"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-2">PPE requirements</label>
                  <input
                    type="text"
                    value={ppe}
                    onChange={(e) => setPpe(e.target.value)}
                    required
                    placeholder="e.g., Insulated gloves, Safety footwear"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-800 mb-2">Residual Risk (after controls)</label>
              <textarea
                value={residualRisk}
                onChange={(e) => setResidualRisk(e.target.value)}
                rows={3}
                required
                placeholder="Describe the remaining risk after implementing controls."
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white resize-none"
              />
            </div>

            {/* Mitigation Actions */}
            <div>
              <label className="block text-slate-800 mb-3">Mitigation Actions</label>
              <div className="space-y-4">
                {actions.map((action, index) => (
                  <div key={index} className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div className="lg:col-span-2">
                      <label className="block text-sm text-slate-600 mb-2">
                        Action {index + 1}
                      </label>
                      <input
                        type="text"
                        value={action.description}
                        onChange={(e) =>
                          updateAction(index, 'description', e.target.value)
                        }
                        required={index === 0}
                        placeholder="Describe the action to be taken"
                        className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={action.dueDate}
                        onChange={(e) => updateAction(index, 'dueDate', e.target.value)}
                        required={index === 0}
                        className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--xu-blue)] bg-white"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAction}
                  className="text-[var(--xu-blue)] text-sm hover:underline"
                >
                  + Add Another Action
                </button>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                disabled={!reportId}
                onClick={() => {
                  if (reportId) navigate(`/admin/request-info/${encodeURIComponent(reportId)}`);
                }}
                className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Request more info
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Saving…' : 'Submit Assessment'}
              </button>
            </div>
          </form>
        </div>
      </main>
      {showImageModal && incidentPhotoSrc && !imageFullscreen ? (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-4xl shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-800 text-lg font-medium">Attached Incident Image</h3>
              <button
                type="button"
                onClick={() => void closeImageViewer()}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh] rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[160px]">
              <button
                type="button"
                onClick={() => {
                  setFsImageScale(1);
                  setImageFullscreen(true);
                }}
                className="p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--xu-blue)] rounded-md"
                aria-label="Open image fullscreen"
              >
                <img src={incidentPhotoSrc} alt="Incident attachment preview" className="max-w-full max-h-[65vh] object-contain rounded-md" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showImageModal && incidentPhotoSrc && imageFullscreen ? (
        <div
          ref={fullscreenHostRef}
          className={`bg-black flex flex-col text-white w-screen h-screen ${fullscreenFallback ? 'fixed inset-0 z-[2147483647]' : ''}`}
        >
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 bg-black/80 select-none">
            <button
              type="button"
              onClick={() => void exitImageFullscreenOnly()}
              className="px-4 py-2 text-sm rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white outline-none select-none caret-transparent cursor-pointer focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Exit fullscreen
            </button>
            <button
              type="button"
              onClick={() => void closeImageViewer()}
              className="px-4 py-2 text-sm rounded-md bg-white text-slate-900 hover:bg-slate-100 outline-none select-none caret-transparent cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--xu-blue)]"
            >
              Close
            </button>
          </div>
          <div
            ref={fullscreenWheelRef}
            role="presentation"
            className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              imagePanRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const st = imagePanRef.current;
              if (!st || st.pointerId !== e.pointerId) return;
              const dx = e.clientX - st.x;
              const dy = e.clientY - st.y;
              st.x = e.clientX;
              st.y = e.clientY;
              e.currentTarget.scrollLeft -= dx;
              e.currentTarget.scrollTop -= dy;
            }}
            onPointerUp={(e) => {
              if (imagePanRef.current?.pointerId === e.pointerId) {
                imagePanRef.current = null;
              }
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* already released */
              }
            }}
            onPointerCancel={(e) => {
              imagePanRef.current = null;
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* already released */
              }
            }}
          >
            <img
              src={incidentPhotoSrc}
              alt="Incident attachment"
              className="max-w-none object-contain select-none"
              draggable={false}
              style={{
                transform: `scale(${fsImageScale})`,
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
