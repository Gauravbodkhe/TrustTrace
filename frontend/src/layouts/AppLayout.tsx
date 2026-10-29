import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  GitCompare,
  Activity,
  AlertTriangle,
  FileText,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus } from '../types';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await api.health();
        setHealth(data);
        setIsHealthy(data.status === 'ok');
      } catch {
        setIsHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/experiments/new', label: 'Create Experiment', icon: FlaskConical },
    { to: '/comparison', label: 'Policy Comparison', icon: GitCompare },
    { to: '/traces', label: 'Trace Explorer', icon: Activity },
    { to: '/scenarios', label: 'Fault Scenario Library', icon: AlertTriangle },
    { to: '/reports', label: 'Research Reports', icon: FileText },
    { to: '/settings', label: 'Platform Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-slate-800/80 bg-[#0d1322]">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold tracking-wider">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-white tracking-tight leading-none text-base">
                TrustTrace
              </h1>
              <p className="text-[11px] text-slate-400 mt-1 font-mono tracking-tight">
                AI Reliability Benchmark
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Experimentation Platform
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* System Status pill */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0a0f1d]">
          <div className="rounded-lg border border-slate-800 p-2.5 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isHealthy === true
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                      : isHealthy === false
                      ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span className="font-mono">
                  {isHealthy === true
                    ? 'Engine Online'
                    : isHealthy === false
                    ? 'Engine Offline'
                    : 'Connecting...'}
                </span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                v0.1.0
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
              <span>Agent Mode:</span>
              <span className="text-indigo-300 font-semibold">
                {health?.mock_mode ? 'Deterministic Mock' : 'Gemini Hybrid'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800/80 bg-[#0c1220] px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>platform</span>
            <ChevronRight className="h-3 w-3 text-slate-600" />
            <span className="text-slate-200 capitalize">
              {location.pathname === '/'
                ? 'Overview'
                : location.pathname.split('/')[1]?.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-slate-400">DB:</span>
              <span className="text-slate-300 font-semibold">{health?.database || 'SQLite (Local)'}</span>
            </div>
            <NavLink
              to="/experiments/new"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm shadow-indigo-600/30 flex items-center space-x-1.5"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              <span>Run Experiment</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#090d16]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
