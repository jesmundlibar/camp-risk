import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotificationRow,
} from '../lib/api';

type Role = 'admin' | 'guard';

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
  const panelRef = useRef<HTMLDivElement>(null);
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

    /** iOS / mobile often throttle timers in background; always refetch when the page is shown again. */
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

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  const total = items.length;
  const bellTitle =
    unread > 0
      ? `${unread} unread notification${unread === 1 ? '' : 's'}${total !== unread ? ` (${total} in inbox)` : ''}`
      : total > 0
        ? `${total} notification${total === 1 ? '' : 's'} (all read)`
        : 'No notifications';

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

  return (
    <div className="relative touch-manipulation" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 transition-colors hover:bg-slate-100 touch-manipulation"
        aria-expanded={open}
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
        ) : total > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white"
            aria-hidden
          >
            {formatBellCount(total)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="z-[60] flex max-h-[min(70dvh,24rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg max-sm:fixed max-sm:left-[max(0.75rem,env(safe-area-inset-left))] max-sm:right-[max(0.75rem,env(safe-area-inset-right))] max-sm:top-[max(4.5rem,env(safe-area-inset-top))] max-sm:max-h-[min(calc(100dvh-5.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)),24rem)] max-sm:w-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[min(100vw-2rem,22rem)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="min-w-0 text-sm font-medium text-slate-800">
              Notifications
              {total > 0 ? (
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {unread > 0 ? (
                    <>
                      <span className="font-medium text-red-600">{unread} unread</span>
                      {total !== unread ? <span> · {total} total</span> : null}
                    </>
                  ) : (
                    <span>{total} total (all read)</span>
                  )}
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
              className="min-h-10 px-2 py-2 text-xs text-[var(--xu-blue)] hover:underline disabled:opacity-40 disabled:no-underline touch-manipulation rounded-md"
            >
              Mark all read
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {error ? <p className="p-3 text-xs text-red-600">{error}</p> : null}
            {loading && items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void onItemClick(n)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors ${
                        n.read ? 'bg-white' : 'bg-blue-50/50'
                      }`}
                    >
                      <p className={`text-sm ${n.read ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>
                        {n.title}
                      </p>
                      {n.body ? <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p> : null}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                        {n.report_id ? ` · ${n.report_id}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
