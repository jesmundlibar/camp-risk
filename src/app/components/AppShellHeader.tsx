import type { ReactNode } from 'react';
import { xuLogo } from '../constants/xuLogo';

type AppShellHeaderProps = {
  actions?: ReactNode;
};

export function AppShellHeader({ actions }: AppShellHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <img src={xuLogo} alt="XU Logo" className="h-10 w-auto shrink-0 sm:h-11" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--xu-blue)] sm:text-lg">
              CAMP-RISK
            </h1>
            <p className="text-xs text-slate-500 sm:text-[13px]">Risk Management System</p>
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-2.5">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
