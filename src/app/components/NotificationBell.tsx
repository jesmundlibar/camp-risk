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

export function NotificationBell({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiNotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
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
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70dvh,24rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-sm font-medium text-slate-800">Notifications</span>
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
