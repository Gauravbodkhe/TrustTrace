import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  ShieldAlert,
  Play,
  Layers,
} from 'lucide-react';

export type StatusType =
  | 'success'
  | 'failure'
  | 'unsafe'
  | 'clarification_needed'
  | 'partial'
  | 'running'
  | 'completed'
  | 'pending'
  | 'high'
  | 'medium'
  | 'low'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
  size = 'md',
}) => {
  const norm = status?.toLowerCase() || '';

  let styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let Icon = HelpCircle;
  let text = label || status;

  if (norm === 'success' || norm === 'completed') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40';
    Icon = CheckCircle2;
  } else if (norm === 'failure' || norm === 'failed') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40';
    Icon = XCircle;
  } else if (norm === 'unsafe') {
    styles = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-700/60';
    Icon = ShieldAlert;
  } else if (norm === 'clarification_needed' || norm === 'clarify') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/40';
    Icon = AlertTriangle;
    if (!label) text = 'Clarification';
  } else if (norm === 'partial') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/40';
    Icon = Layers;
  } else if (norm === 'running') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/40 animate-pulse';
    Icon = Play;
  } else if (norm === 'pending') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    Icon = Clock;
  } else if (norm === 'high') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40';
    Icon = AlertTriangle;
  } else if (norm === 'medium') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40';
    Icon = AlertTriangle;
  } else if (norm === 'low') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    Icon = CheckCircle2;
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center space-x-1 rounded-md border font-mono font-semibold uppercase tracking-wider ${sizeClasses} ${styles} ${className}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>{text}</span>
    </span>
  );
};
