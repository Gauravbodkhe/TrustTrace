import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const pathNames: Record<string, string> = {
  '': 'Overview',
  experiments: 'Experiments',
  new: 'Create Experiment',
  comparison: 'Policy Comparison',
  traces: 'Trace Explorer',
  scenarios: 'Fault Scenarios',
  reports: 'Research Reports',
  settings: 'Platform Settings',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
      <NavLink
        to="/"
        className="flex items-center space-x-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">TrustTrace</span>
      </NavLink>

      {segments.length === 0 ? (
        <>
          <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
          <span className="text-slate-800 dark:text-slate-200 font-medium">Overview</span>
        </>
      ) : (
        segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const to = '/' + segments.slice(0, idx + 1).join('/');
          const label = pathNames[seg] || (seg.length > 10 ? `${seg.slice(0, 8)}...` : seg);

          return (
            <React.Fragment key={to}>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
              {isLast ? (
                <span className="text-slate-900 dark:text-slate-100 font-medium truncate max-w-[150px] sm:max-w-none">
                  {label}
                </span>
              ) : (
                <NavLink
                  to={to}
                  className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors truncate max-w-[120px] sm:max-w-none"
                >
                  {label}
                </NavLink>
              )}
            </React.Fragment>
          );
        })
      )}
    </nav>
  );
};
