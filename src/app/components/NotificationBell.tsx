import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotificationRow,
} from '../lib/api';

type Role = 'admin' | 'guard';

type PanelBox = { top: number; left: number; width: number; maxHeight: number };

/** Pending incidents notify admins — those must not open view-risk (no assessment JSON yet). */
function adminDestination(reportId: string, kind: string): string {
  const id = (reportId || '').trim();
  if (!id) return '/admin/dashboard';
  if (kind === 'incident_submitted' || kind === 'incident_updated') {
    return `/admin/assess/${encodeURIComponent(id)}`;
  }
  return `/admin/view-risk/${encodeURIComponent(id)}`;
}

function guardDestination(reportId: string): string {
  const id = (reportId || '').trim();
  return id ? `/guard/dashboard?report=${encodeURIComponent(id)}` : '/guard/dashboard';
}

/** While the tab is active, poll often enough to feel live on desktop; hidden tabs poll rarely for battery. */
const POLL_MS_VISIBLE = 5_000;
const POLL_MS_HIDDEN = 45_000;

function formatBellCount(n: number): string {
  return n > 99 ? '99+' : String(n);
}

export function NotificationBell({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [panelBox, setPanelBox] = useState<PanelBox | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const portalPanelRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<ApiNotificationRow[]>([]);
  itemsRef.current = items;

  const load = useCallback(async () => {
    const hadRows = itemsRef.current.length > 0;
    if (!hadRows) setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications();
      setItems(data.notifications);
      setUnread(data.unread_count);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const pollMs = () => (document.visibilityState === 'visible' ? POLL_MS_VISIBLE : POLL_MS_HIDDEN);

    let id = window.setInterval(() => void load(), pollMs());

    const resetInterval = () => {
      window.clearInterval(id);
      id = window.setInterval(() => void load(), pollMs());
    };

    const onVis = () => {
      resetInterval();
      void load();
      if (document.visibilityState === 'visible') {
        window.setTimeout(() => void load(), 400);
      }
    };

    const onFocus = () => void load();

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void load();
    };

    const onOnline = () => void load();

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, [load]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelBox(null);
      return;
    }

    const update = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const vw = vv?.width ?? window.innerWidth;
      const pad = 12;
      const below = rect.bottom + 8;
      const isNarrow = vw < 640;
      let left: number;
      let width: number;
      if (isNarrow) {
        width = Math.max(200, vw - pad * 2);
        left = pad;
      } else {
        width = Math.min(352, vw - pad * 2);
        left = rect.right - width;
        if (left < pad) left = pad;
        if (left + width > vw - pad) left = Math.max(pad, vw - pad - width);
      }
      const maxHeight = Math.max(160, Math.min(384, vh - below - pad));
      setPanelBox({ top: below, left, width, maxHeight });
    };

    update();
    window.addEventListener('resize', update);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener('resize', update);
    visualViewport?.addEventListener('scroll', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      visualViewport?.removeEventListener('resize', update);
      visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (portalPanelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const unreadItems = items.filter((n) => !n.read);
  const bellTitle =
    unread > 0
      ? `${unread} unread notification${unread === 1 ? '' : 's'}`
      : 'No new notifications';

  const onItemClick = async (n: ApiNotificationRow) => {
    try {
      if (!n.read) await markNotificationRead(n.id);
    } catch {
      /* still navigate */
    }
    setOpen(false);
    void load();
    navigate(role === 'admin' ? adminDestination(n.report_id, n.kind) : guardDestination(n.report_id));
  };

  const panelContent = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="min-w-0 text-sm font-medium text-slate-800">
          Notifications
          {unread > 0 ? (
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              <span className="font-medium text-red-600">
                {unread} unread
              </span>
            </span>
          ) : null}
        </span>
        <button
          type="button"
          disabled={unread === 0 || loading}
          onClick={() => {
            void (async () => {
              try {
                await markAllNotificationsRead();
                await load();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not mark read');
              }
            })();
          }}
          className="min-h-10 shrink-0 px-2 py-2 text-xs text-[var(--xu-blue)] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline touch-manipulation rounded-md"
        >
          Mark all read
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? <p className="p-3 text-xs text-red-600">{error}</p> : null}
        {loading && items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
        ) : unreadItems.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No new notifications. You are all caught up.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {unreadItems.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void onItemClick(n)}
                  className="w-full touch-manipulation bg-blue-50/50 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                    {n.report_id ? ` · ${n.report_id}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  const portal =
    open &&
    panelBox &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={portalPanelRef}
        className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        style={{
          position: 'fixed',
          top: panelBox.top,
          left: panelBox.left,
          width: panelBox.width,
          maxHeight: panelBox.maxHeight,
          zIndex: 70,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {panelContent}
      </div>,
      document.body,
    );

  return (
    <div className="relative touch-manipulation">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100 touch-manipulation"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications. ${bellTitle}.`}
        title={bellTitle}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white"
            aria-hidden
          >
            {formatBellCount(unread)}
          </span>
        ) : null}
      </button>

      {portal}
    </div>
  );
}
