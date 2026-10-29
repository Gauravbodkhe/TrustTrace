import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  GitCompare,
  Activity,
  AlertTriangle,
  FileText,
  Settings as SettingsIcon,
  Database,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const checkHealth = async () => {
    try {
      const data = await api.health();
      setHealth(data);
      setIsHealthy(data.status === 'ok');
    } catch {
      setIsHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/experiments/new', label: 'New Experiment', icon: PlusCircle },
    { to: '/experiments', label: 'Experiments', icon: Layers },
    { to: '/comparison', label: 'Policy Comparison', icon: GitCompare },
    { to: '/traces', label: 'Trace Explorer', icon: Activity },
    { to: '/scenarios', label: 'Fault Scenarios', icon: AlertTriangle },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c121e] border-r border-slate-200 dark:border-slate-800/80">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
        <NavLink to="/" className="flex items-center space-x-3 group">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-600/20 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold group-hover:scale-105 transition-transform shadow-xs">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base">
                TrustTrace
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                v0.1
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tracking-tight">
              AI Reliability Benchmark
            </p>
          </div>
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : item.to === '/experiments'
              ? location.pathname === '/experiments'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Live System Telemetry Card */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a0f1d]">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 space-y-2 text-[11px] bg-white dark:bg-slate-900/60 shadow-xs">
          {/* Engine Online Status */}
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-mono">
              <span
                className={`h-2 w-2 rounded-full ${
                  isHealthy === true
                    ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    : isHealthy === false
                    ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>
                {isHealthy === true
                  ? 'Engine Online'
                  : isHealthy === false
                  ? 'Engine Offline'
                  : 'Connecting...'}
              </span>
            </span>

            <button
              onClick={checkHealth}
              title="Ping backend"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          {/* Database and Agent Mode Sub-pills */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 space-y-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Database:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {health?.database === 'ok' ? 'SQLite (WAL)' : 'Connecting...'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Agent:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                {health?.mock_mode ? 'Deterministic Mock' : 'Gemini Hybrid'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Responsive Overlay) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0c121e]/90 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb Trail */}
            <Breadcrumbs />
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-3">
            {/* Database indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>DB:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {health?.database === 'ok' ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* New Experiment Quick CTA */}
            <NavLink
              to="/experiments/new"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs shadow-indigo-600/30 flex items-center space-x-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Experiment</span>
              <span className="sm:hidden">New</span>
            </NavLink>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-[#080c14] transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
