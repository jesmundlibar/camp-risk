import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, X, Users } from 'lucide-react';
import { xuLogo } from '../constants/xuLogo';
import {
  completeMitigationAction,
  fetchDashboardSummary,
  fetchReports,
  type MitigationTracking,
} from '../lib/api';

type PendingReportRow = {
  id: string;
  hazard: string;
  date: string;
  priority: string;
  location: string;
  guard: string;
  status: string;
};

type OpenRiskRow = {
  id: string;
  hazard: string;
  severity: string;
  status: string;
  score: number;
  location: string;
  dateAssessed: string;
};

type OverdueActionRow = {
  id: string;
  task: string;
  dueDate: string;
  daysOverdue: number;
  assignedTo: string;
  relatedRisk: string;
};

type RiskRegisterRow = { id: string; severity: string; status: string };
type HazardFrequencyRow = { hazard: string; count: number };
type TopRiskTypeRow = { risk_type: string; count: number };
type ChartKind = 'bar' | 'pie' | 'line';
type ChartDatum = { label: string; value: number; color: string };
type GraphAction = 'print' | 'download';
type AnalyticsWindow = 'all' | '7d' | '30d' | 'custom';
const RISK_CLASS_LABELS: Record<string, string> = {
  'earthquake-impact': 'Earthquake Impact',
  'fire-hazard': 'Fire Hazard',
  'laboratory-hazard': 'Laboratory Hazard',
  'campus-security': 'Campus Security Risk',
  'traffic-safety': 'Traffic Safety Risk',
  'flooding-impact': 'Flooding Impact',
  'electrical-hazard': 'Electrical Hazard',
  'evacuation-failure': 'Emergency Evacuation Failure',
  'slip-trip-fall': 'Slip / Trip / Fall',
  'public-health': 'Public Health Risk',
};

function formatRiskClassification(code: string) {
  if (!code || code === 'Uncategorized') return code || 'Uncategorized';
  const mapped = RISK_CLASS_LABELS[code];
  if (mapped) return mapped;
  return code.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function maxBarDenominator(rows: Array<{ count: number }>): number {
  if (rows.length === 0) return 1;
  return Math.max(1, ...rows.map((r) => r.count));
}

function displayHazardLabel(name: string) {
  return name === 'Other (specify)' ? 'Others' : name;
}

function ChartTypeSelector({
  value,
  onChange,
}: {
  value: ChartKind;
  onChange: (value: ChartKind) => void;
}) {
  const options: ChartKind[] = ['bar', 'pie', 'line'];
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-3 py-1.5 text-xs rounded-md transition-all ${
            value === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          {option === 'bar' ? 'Bar' : option === 'pie' ? 'Pie' : 'Line'}
        </button>
      ))}
    </div>
  );
}

function BarChartPanel({ data }: { data: ChartDatum[] }) {
  const maxValue = maxBarDenominator(data.map((d) => ({ count: d.value })));
  return (
    <div className="space-y-5">
      {data.map((row) => {
        const pct = Math.round((100 * row.value) / maxValue);
        return (
          <div key={row.label}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-700 min-w-0 pr-4 line-clamp-2">{row.label}</span>
              <span className="text-sm tabular-nums shrink-0 font-medium text-slate-700">{row.value}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChartPanel({ data }: { data: ChartDatum[] }) {
  const total = Math.max(1, data.reduce((sum, row) => sum + row.value, 0));
  const size = 190;
  const strokeWidth = 30;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let runningRatio = 0;

  return (
    <div className="grid sm:grid-cols-[200px,1fr] gap-6 items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {data.map((row) => {
          const ratio = row.value / total;
          const dash = ratio * circumference;
          const offset = -runningRatio * circumference;
          runningRatio += ratio;
          return (
            <circle
              key={row.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={row.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700 ease-out"
            />
          );
        })}
      </svg>
      <div className="space-y-3">
        {data.map((row) => {
          const pct = Math.round((100 * row.value) / total);
          return (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-sm text-slate-700 line-clamp-1">{row.label}</span>
              </div>
              <span className="text-xs text-slate-600 tabular-nums shrink-0">
                {row.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChartPanel({ data }: { data: ChartDatum[] }) {
  const width = 520;
  const height = 210;
  const paddingX = 30;
  const paddingY = 20;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;
  const maxValue = maxBarDenominator(data.map((d) => ({ count: d.value })));
  const points = data.map((row, idx) => {
    const x = paddingX + (idx * chartW) / Math.max(1, data.length - 1);
    const y = paddingY + chartH - (row.value / maxValue) * chartH;
    return { x, y, ...row };
  });
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52">
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#cbd5e1" />
        <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="#cbd5e1" />
        <polyline
          fill="none"
          stroke="#1e40af"
          strokeWidth="3"
          points={polyline}
          className="transition-all duration-700 ease-out"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.5" fill={point.color} className="transition-all duration-700 ease-out" />
          </g>
        ))}
      </svg>
      <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0,1fr))` }}>
        {data.map((row) => (
          <div key={row.label} className="text-center">
            <p className="text-[11px] text-slate-500 line-clamp-2">{row.label}</p>
            <p className="text-xs text-slate-700 tabular-nums">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildChartSvg(title: string, kind: ChartKind, data: ChartDatum[]): string {
  if (data.length === 0) return '';
  const width = 840;
  const height = 480;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  svgParts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
  svgParts.push(`<text x="40" y="40" font-family="Arial" font-size="22" fill="#0f172a">${title} (${kind.toUpperCase()})</text>`);
  if (kind === 'bar') {
    const chartX = 70;
    const chartY = 90;
    const chartW = 720;
    const chartH = 280;
    const barW = Math.max(28, Math.floor(chartW / Math.max(1, data.length * 1.6)));
    data.forEach((row, i) => {
      const h = Math.round((row.value / maxValue) * chartH);
      const x = chartX + i * Math.floor(chartW / Math.max(1, data.length));
      const y = chartY + (chartH - h);
      svgParts.push(`<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${row.color}" rx="4"/>`);
      svgParts.push(`<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="12" fill="#334155">${row.value}</text>`);
      svgParts.push(`<text x="${x + barW / 2}" y="${chartY + chartH + 18}" text-anchor="middle" font-size="11" fill="#475569">${row.label}</text>`);
    });
  } else if (kind === 'line') {
    const chartX = 70;
    const chartY = 90;
    const chartW = 720;
    const chartH = 280;
    const points = data.map((row, i) => {
      const x = chartX + (i * chartW) / Math.max(1, data.length - 1);
      const y = chartY + chartH - (row.value / maxValue) * chartH;
      return { x, y, ...row };
    });
    svgParts.push(`<line x1="${chartX}" y1="${chartY + chartH}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="#cbd5e1" />`);
    svgParts.push(`<line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartH}" stroke="#cbd5e1" />`);
    svgParts.push(`<polyline fill="none" stroke="#1e40af" stroke-width="3" points="${points.map((p) => `${p.x},${p.y}`).join(' ')}"/>`);
    points.forEach((p) => {
      svgParts.push(`<circle cx="${p.x}" cy="${p.y}" r="5" fill="${p.color}"/>`);
      svgParts.push(`<text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="12" fill="#334155">${p.value}</text>`);
      svgParts.push(`<text x="${p.x}" y="${chartY + chartH + 18}" text-anchor="middle" font-size="11" fill="#475569">${p.label}</text>`);
    });
  } else {
    const cx = 240;
    const cy = 240;
    const r = 120;
    const total = Math.max(1, data.reduce((sum, row) => sum + row.value, 0));
    let start = -Math.PI / 2;
    data.forEach((row, i) => {
      const slice = (row.value / total) * Math.PI * 2;
      const end = start + slice;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const largeArc = slice > Math.PI ? 1 : 0;
      svgParts.push(`<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${row.color}"/>`);
      svgParts.push(`<rect x="470" y="${120 + i * 28}" width="14" height="14" fill="${row.color}"/>`);
      svgParts.push(`<text x="492" y="${132 + i * 28}" font-size="12" fill="#334155">${row.label}: ${row.value}</text>`);
      start = end;
    });
  }
  svgParts.push('</svg>');
  return svgParts.join('');
}

function printSelectedChart(title: string, kind: ChartKind, data: ChartDatum[]) {
  const svgMarkup = buildChartSvg(title, kind, data);
  if (!svgMarkup) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title></head><body style="margin:0;padding:16px;font-family:Arial,sans-serif;">${svgMarkup}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  iframe.onload = () => {
    const frameWin = iframe.contentWindow;
    if (!frameWin) {
      iframe.remove();
      return;
    }
    frameWin.focus();
    frameWin.print();
    window.setTimeout(() => iframe.remove(), 1000);
  };
}

function downloadSelectedChart(title: string, kind: ChartKind, data: ChartDatum[]) {
  const svgMarkup = buildChartSvg(title, kind, data);
  if (!svgMarkup) return;
  const safeName = `${title}-${kind}`.toLowerCase().replace(/[^\w.-]+/g, '-');
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.decoding = 'async';

  const done = new Promise<void>((resolve, reject) => {
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || 840;
        const height = img.naturalHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare canvas for PDF export'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: width >= height ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const headerGap = 22;
        const drawW = pageW - margin * 2;
        const drawH = pageH - margin * 2 - headerGap;
        const imageRatio = width / height;
        const boxRatio = drawW / drawH;
        let imgW = drawW;
        let imgH = drawH;
        if (imageRatio > boxRatio) {
          imgH = drawW / imageRatio;
        } else {
          imgW = drawH * imageRatio;
        }
        const x = (pageW - imgW) / 2;
        const y = margin + headerGap + (drawH - imgH) / 2;

        const generatedAt = new Date().toLocaleString();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(title, margin, margin + 6);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`Chart: ${kind.toUpperCase()}`, margin, margin + 12);
        pdf.text(`Generated: ${generatedAt}`, margin, margin + 17);
        pdf.addImage(pngData, 'PNG', x, y, imgW, imgH);
        pdf.save(`${safeName}.pdf`);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Could not generate PDF'));
      }
    };
    img.onerror = () => reject(new Error('Could not render chart image'));
  });

  img.src = svgUrl;
  void done.finally(() => URL.revokeObjectURL(svgUrl));
}

async function runGraphAction(action: GraphAction, title: string, kind: ChartKind, data: ChartDatum[]) {
  if (action === 'download') {
    downloadSelectedChart(title, kind, data);
    return;
  }
  printSelectedChart(title, kind, data);
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState<'pending' | 'risks' | 'overdue' | null>(null);
  const [pendingReports, setPendingReports] = useState<PendingReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [openRisks, setOpenRisks] = useState<OpenRiskRow[]>([]);
  const [overdueActions, setOverdueActions] = useState<OverdueActionRow[]>([]);
  const [riskRegister, setRiskRegister] = useState<RiskRegisterRow[]>([]);
  const [hazardFrequency, setHazardFrequency] = useState<HazardFrequencyRow[]>([]);
  const [topRiskTypes, setTopRiskTypes] = useState<TopRiskTypeRow[]>([]);
  const [openRisksCount, setOpenRisksCount] = useState(0);
  const [overdueActionsCount, setOverdueActionsCount] = useState(0);
  const [mitigationTracking, setMitigationTracking] = useState<MitigationTracking>({
    total_actions: 0,
    completed_actions: 0,
    in_progress_actions: 0,
    overdue_actions: 0,
    completed_pct: 0,
    in_progress_pct: 0,
    overdue_pct: 0,
  });
  const [mitigationChart, setMitigationChart] = useState<ChartKind>('bar');
  const [hazardChart, setHazardChart] = useState<ChartKind>('bar');
  const [riskTypeChart, setRiskTypeChart] = useState<ChartKind>('bar');
  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [mitigationGraphAction, setMitigationGraphAction] = useState<GraphAction>('print');
  const [hazardGraphAction, setHazardGraphAction] = useState<GraphAction>('print');
  const [riskTypeGraphAction, setRiskTypeGraphAction] = useState<GraphAction>('print');
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setPendingReports([]);
      setReportsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setReportsLoading(true);
      try {
        const data = await fetchReports({ status: 'pending' });
        if (!cancelled) {
          setPendingReports(
            data.map((r) => ({
              id: r.id,
              hazard: r.hazard,
              date: r.date,
              priority: r.priority,
              location: r.location,
              guard: r.guard,
              status: r.status_code,
            })),
          );
        }
      } catch {
        if (!cancelled) setPendingReports([]);
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, location.pathname]);

  const reloadDashboardSummary = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setSummaryLoading(true);
    try {
      const today = new Date();
      const toIso = (d: Date) => d.toISOString().slice(0, 10);
      let params: { startDate?: string; endDate?: string } | undefined;
      if (analyticsWindow === '7d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        params = { startDate: toIso(start), endDate: toIso(today) };
      } else if (analyticsWindow === '30d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        params = { startDate: toIso(start), endDate: toIso(today) };
      } else if (analyticsWindow === 'custom' && customStartDate && customEndDate) {
        params = { startDate: customStartDate, endDate: customEndDate };
      }

      const d = await fetchDashboardSummary(params);
      setOpenRisksCount(d.open_risks_count);
      setOverdueActionsCount(d.overdue_actions_count);
      setOpenRisks(
        d.open_risks.map((r) => ({
          id: r.id,
          hazard: r.hazard,
          severity: r.severity,
          status: r.status,
          score: r.score,
          location: r.location,
          dateAssessed: r.dateAssessed,
        })),
      );
      setOverdueActions(
        d.overdue_actions.map((a) => ({
          id: a.id,
          task: a.task,
          dueDate: a.dueDate,
          daysOverdue: a.daysOverdue,
          assignedTo: a.assignedTo,
          relatedRisk: a.relatedRisk,
        })),
      );
      setRiskRegister(
        d.risk_register.map((row) => ({
          id: row.id,
          severity: row.severity,
          status: row.status,
        })),
      );
      if (d.mitigation_tracking) {
        setMitigationTracking(d.mitigation_tracking);
      }
      setHazardFrequency(d.hazard_frequency ?? []);
      setTopRiskTypes(d.top_risk_types ?? []);
    } catch {
      setOpenRisksCount(0);
      setOverdueActionsCount(0);
      setOpenRisks([]);
      setOverdueActions([]);
      setRiskRegister([]);
      setHazardFrequency([]);
      setTopRiskTypes([]);
      setMitigationTracking({
        total_actions: 0,
        completed_actions: 0,
        in_progress_actions: 0,
        overdue_actions: 0,
        completed_pct: 0,
        in_progress_pct: 0,
        overdue_pct: 0,
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [analyticsWindow, customEndDate, customStartDate, user?.role]);

  useEffect(() => {
    void reloadDashboardSummary();
  }, [reloadDashboardSummary, user?.id, location.pathname, analyticsWindow, customStartDate, customEndDate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const hazardsSlice = hazardFrequency.slice(0, 8);
  const riskTypesSlice = topRiskTypes.slice(0, 8);
  const mitigationData = useMemo<ChartDatum[]>(
    () => [
      { label: 'Completed', value: mitigationTracking.completed_actions, color: '#22c55e' },
      { label: 'In progress', value: mitigationTracking.in_progress_actions, color: '#f59e0b' },
      { label: 'Overdue', value: mitigationTracking.overdue_actions, color: '#ef4444' },
    ],
    [mitigationTracking],
  );
  const hazardData = useMemo<ChartDatum[]>(
    () =>
      hazardsSlice.map((row, i) => ({
        label: displayHazardLabel(row.hazard),
        value: row.count,
        color: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#0ea5e9', '#0284c7', '#38bdf8', '#0f766e'][i % 8],
      })),
    [hazardsSlice],
  );
  const riskTypeData = useMemo<ChartDatum[]>(
    () =>
      riskTypesSlice.map((row, i) => ({
        label: formatRiskClassification(row.risk_type),
        value: row.count,
        color: ['#a16207', '#ca8a04', '#d97706', '#f59e0b', '#fbbf24', '#b45309', '#f97316', '#92400e'][i % 8],
      })),
    [riskTypesSlice],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={xuLogo} alt="XU Logo" className="h-12" />
            <div>
              <h1 className="text-xl text-[var(--xu-blue)]">CAMP-RISK</h1>
              <p className="text-sm text-slate-600">Risk Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/manage-personnel')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              Manage Personnel
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl mb-2">Welcome, {user?.fullName}</h2>
          <p className="text-slate-600">Administrator Dashboard</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Analytics timeframe</label>
              <select
                value={analyticsWindow}
                onChange={(e) => setAnalyticsWindow(e.target.value as AnalyticsWindow)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-800 min-w-[170px]"
              >
                <option value="all">All time</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            {analyticsWindow === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Start date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">End date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-800"
                  />
                </div>
              </>
            ) : null}
            <p className="text-xs text-slate-500 pb-1">
              {summaryLoading ? 'Refreshing analytics...' : 'Cards and charts follow this selected timeframe.'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div
            onClick={() => setShowModal('pending')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-blue)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Pending Reports</h3>
              <Clock className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-blue)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{pendingReports.length}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>

          <div
            onClick={() => setShowModal('risks')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-gold)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Open Risks</h3>
              <AlertCircle className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-gold)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{openRisksCount}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>

          <div
            onClick={() => setShowModal('overdue')}
            className="bg-white rounded-lg shadow-lg p-6 lg:p-8 border-t-4 border-[var(--xu-red)] cursor-pointer hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-slate-600 text-sm sm:text-base">Overdue Actions</h3>
              <AlertCircle className="h-6 w-6 lg:h-7 lg:w-7 text-[var(--xu-red)]" />
            </div>
            <p className="text-4xl lg:text-5xl text-slate-800 mb-2">{overdueActionsCount}</p>
            <p className="text-xs text-slate-500">Click to view details</p>
          </div>
        </div>

        {/* Risk Assessment Queue */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-xl text-slate-800">Risk Assessment Queue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">ID</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Hazard</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Date</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Priority</th>
                  <th className="px-6 py-3 text-left text-sm text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      Loading reports…
                    </td>
                  </tr>
                ) : pendingReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                      No incident reports in the queue. Guards can submit new reports from their dashboard.
                    </td>
                  </tr>
                ) : (
                  pendingReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-[var(--xu-blue)]">{report.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-800">{report.hazard}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{report.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            report.priority === 'High'
                              ? 'bg-red-100 text-red-800'
                              : report.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {report.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/assess/${report.id}`)}
                          className="px-4 py-2 bg-[var(--xu-blue)] text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Assess
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Risk Register */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-t-4 border-[var(--xu-red)]">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl text-[var(--xu-red)]">Risk Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">ID</th>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">Severity</th>
                    <th className="px-6 py-3 text-left text-sm text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {riskRegister.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500 text-sm">
                        No risks in the register yet.
                      </td>
                    </tr>
                  ) : (
                    riskRegister.map((risk) => (
                      <tr key={risk.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-[var(--xu-blue)]">{risk.id}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              risk.severity === 'High'
                                ? 'bg-red-100 text-red-800'
                                : risk.severity === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {risk.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{risk.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mitigation Tracking — from saved risk assessments (see API /api/dashboard/summary/) */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-green-600">
            <div className="border-b border-slate-200 pb-4 mb-6 flex items-start justify-between gap-4">
              <div>
              <h3 className="text-xl text-slate-800">Mitigation Tracking</h3>
              <p className="text-sm text-slate-600 mt-1">
                {mitigationTracking.total_actions === 0
                  ? 'No mitigation action rows yet. They appear after an SSIO assessment is submitted with actions filled in.'
                  : `${mitigationTracking.total_actions} action(s) across open and closed incidents.`}
              </p>
              </div>
              <div className="flex items-center gap-2">
                <ChartTypeSelector value={mitigationChart} onChange={setMitigationChart} />
                <button
                  type="button"
                  onClick={() =>
                    runGraphAction(mitigationGraphAction, 'Mitigation Tracking', mitigationChart, mitigationData)
                  }
                  className="px-3 py-1.5 text-xs bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
                >
                  Graph Action
                </button>
                <select
                  value={mitigationGraphAction}
                  onChange={(e) => setMitigationGraphAction(e.target.value as GraphAction)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
                >
                  <option value="print">Print graph</option>
                  <option value="download">Download graph</option>
                </select>
              </div>
            </div>
            {mitigationChart === 'bar' ? (
              <BarChartPanel data={mitigationData} />
            ) : mitigationChart === 'pie' ? (
              <PieChartPanel data={mitigationData} />
            ) : (
              <LineChartPanel data={mitigationData} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-[var(--xu-blue)]">
            <div className="border-b border-slate-200 pb-4 mb-6 flex items-start justify-between gap-4">
              <div>
              <h3 className="text-xl text-[var(--xu-blue)]">Frequent Hazards</h3>
              <p className="text-sm text-slate-600 mt-1">
                {hazardsSlice.length === 0
                  ? 'No hazard selections recorded yet.'
                  : 'Counts from hazard types tagged on incident reports.'}
              </p>
              </div>
              <div className="flex items-center gap-2">
                <ChartTypeSelector value={hazardChart} onChange={setHazardChart} />
                <button
                  type="button"
                  onClick={() => runGraphAction(hazardGraphAction, 'Frequent Hazards', hazardChart, hazardData)}
                  className="px-3 py-1.5 text-xs bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
                >
                  Graph Action
                </button>
                <select
                  value={hazardGraphAction}
                  onChange={(e) => setHazardGraphAction(e.target.value as GraphAction)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
                >
                  <option value="print">Print graph</option>
                  <option value="download">Download graph</option>
                </select>
              </div>
            </div>
            {hazardsSlice.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No data.</p>
            ) : hazardChart === 'bar' ? (
              <BarChartPanel data={hazardData} />
            ) : hazardChart === 'pie' ? (
              <PieChartPanel data={hazardData} />
            ) : (
              <LineChartPanel data={hazardData} />
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-[var(--xu-gold)]">
            <div className="border-b border-slate-200 pb-4 mb-6 flex items-start justify-between gap-4">
              <div>
              <h3 className="text-xl text-amber-800">Top Risk Types</h3>
              <p className="text-sm text-slate-600 mt-1">
                {riskTypesSlice.length === 0
                  ? 'Risk categories appear after admins save assessments.'
                  : 'How often each risk classification appears across assessments.'}
              </p>
              </div>
              <div className="flex items-center gap-2">
                <ChartTypeSelector value={riskTypeChart} onChange={setRiskTypeChart} />
                <button
                  type="button"
                  onClick={() => runGraphAction(riskTypeGraphAction, 'Top Risk Types', riskTypeChart, riskTypeData)}
                  className="px-3 py-1.5 text-xs bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700"
                >
                  Graph Action
                </button>
                <select
                  value={riskTypeGraphAction}
                  onChange={(e) => setRiskTypeGraphAction(e.target.value as GraphAction)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
                >
                  <option value="print">Print graph</option>
                  <option value="download">Download graph</option>
                </select>
              </div>
            </div>
            {riskTypesSlice.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No data.</p>
            ) : riskTypeChart === 'bar' ? (
              <BarChartPanel data={riskTypeData} />
            ) : riskTypeChart === 'pie' ? (
              <PieChartPanel data={riskTypeData} />
            ) : (
              <LineChartPanel data={riskTypeData} />
            )}
          </div>
        </div>
      </main>

      {/* Pending Reports Modal */}
      {showModal === 'pending' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Pending Reports</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Incident reports awaiting risk assessment
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {pendingReports.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No pending reports.</p>
                ) : (
                  pendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{report.id}</span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              report.priority === 'High'
                                ? 'bg-red-100 text-red-800'
                                : report.priority === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {report.priority} Priority
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-2">{report.hazard}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Location:</span> {report.location}
                          </div>
                          <div>
                            <span className="font-medium">Reported by:</span> {report.guard}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {report.date}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> Awaiting Assessment
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/assess/${report.id}`)}
                        className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Assess This Report
                      </button>
                      <button
                        onClick={() => navigate(`/admin/request-info/${report.id}`)}
                        className="flex-1 px-4 py-2 border border-[var(--xu-blue)] text-[var(--xu-blue)] rounded-md hover:bg-blue-50 transition-colors"
                      >
                        Request More Info
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Risks Modal */}
      {showModal === 'risks' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Open Risks</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Active risks requiring monitoring and mitigation
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {openRisks.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No open risks on file.</p>
                ) : (
                  openRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{risk.id}</span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              risk.severity === 'High'
                                ? 'bg-red-100 text-red-800'
                                : risk.severity === 'Medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {risk.severity} Severity
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Risk Score: {risk.score}
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-2">{risk.hazard}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Location:</span> {risk.location}
                          </div>
                          <div>
                            <span className="font-medium">Status:</span> {risk.status}
                          </div>
                          <div>
                            <span className="font-medium">Assessed:</span> {risk.dateAssessed}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/view-risk/${risk.id}`)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => navigate(`/admin/update-mitigation/${risk.id}`)}
                        className="flex-1 px-4 py-2 bg-[var(--xu-blue)] text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Update Mitigation
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Actions Modal */}
      {showModal === 'overdue' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-2xl text-slate-800">Overdue Actions</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Mitigation actions past their due date requiring immediate attention
                </p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {overdueActions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No overdue actions.</p>
                ) : (
                  overdueActions.map((action) => (
                  <div
                    key={action.id}
                    className="border-l-4 border-red-500 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[var(--xu-blue)]">{action.id}</span>
                          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-red-600 text-white">
                            {action.daysOverdue} days overdue
                          </span>
                        </div>
                        <h4 className="text-lg text-slate-800 mb-3">{action.task}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
                          <div>
                            <span className="font-medium">Due Date:</span> {action.dueDate}
                          </div>
                          <div>
                            <span className="font-medium">Assigned To:</span> {action.assignedTo}
                          </div>
                          <div>
                            <span className="font-medium">Related Risk:</span> {action.relatedRisk}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/admin/view-risk/${action.relatedRisk}`)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 bg-white rounded-md hover:bg-slate-100 transition-colors"
                      >
                        View Risk Details
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure?\n\nMark ${action.id} as completed?`)) return;
                          try {
                            await completeMitigationAction(action.id);
                            await reloadDashboardSummary();
                            alert('Action marked as completed.');
                          } catch (e) {
                            alert(e instanceof Error ? e.message : 'Could not mark action as completed');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Mark as Completed
                      </button>
                      <button
                        onClick={() => navigate(`/admin/extend-deadline/${action.id}`)}
                        className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                      >
                        Extend Deadline
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
