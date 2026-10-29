import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  accentColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  accentColor = 'indigo',
  tooltip,
}) => {
  const accentClasses = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
    rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40',
    slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50',
  }[accentColor];

  const valueClasses = {
    indigo: 'text-indigo-700 dark:text-indigo-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
    slate: 'text-slate-800 dark:text-slate-100',
  }[accentColor];

  return (
    <div
      title={tooltip}
      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f1728] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
    >
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
        <span>{label}</span>
        <div className={`p-1.5 rounded-lg border ${accentClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className={`text-2xl font-bold font-mono tracking-tight ${valueClasses}`}>
          {value}
        </span>
      </div>

      {subtext && (
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
          {subtext}
        </div>
      )}
    </div>
  );
};
