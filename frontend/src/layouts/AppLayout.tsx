import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  GitCompare,
  Activity,
  FileCheck2,
  FileText,
  Settings as SettingsIcon,
  Database,
  Menu,
  X,
  RefreshCw,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { VoiceAssistantModal } from '../voice/VoiceAssistantModal';

export const AppLayout: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  // Foldable sidebar state with localStorage persistence
  const [sidebarFolded, setSidebarFolded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('trusttrace:sidebar-folded') === 'true';
    } catch {
      return false;
    }
  });

  const location = useLocation();

  const toggleSidebarFold = () => {
    setSidebarFolded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('trusttrace:sidebar-folded', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar fold
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarFold();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Listen for custom trigger to open voice assistant from any page
  useEffect(() => {
    const handleOpenVoice = () => setVoiceAssistantOpen(true);
    window.addEventListener('trusttrace:open-voice', handleOpenVoice);
    return () => window.removeEventListener('trusttrace:open-voice', handleOpenVoice);
  }, []);

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
    { to: '/evidence', label: 'Evidence', icon: FileCheck2 },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Helper to render the sidebar content
  const renderSidebar = (isFolded: boolean, isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c121e] border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300">
      {/* Brand Header */}
      <div
        className={`h-16 border-b border-slate-200 dark:border-slate-800/80 flex items-center transition-all ${
          isFolded ? 'justify-center px-2' : 'justify-between px-4 sm:px-5'
        }`}
      >
        <NavLink
          to="/"
          className={`flex items-center group transition-all min-w-0 ${isFolded ? 'justify-center' : 'space-x-3'}`}
          title={isFolded ? 'TrustTrace v0.1 • AI Reliability Benchmark' : undefined}
        >
          <div className="h-9 w-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-600/20 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold group-hover:scale-105 transition-transform shadow-xs flex-shrink-0">
            <Layers className="h-5 w-5" />
          </div>

          {!isFolded && (
            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-base truncate">
                  TrustTrace
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 flex-shrink-0">
                  v0.1
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tracking-tight truncate">
                AI Reliability Benchmark
              </p>
            </div>
          )}
        </NavLink>

        {/* Desktop Fold Toggle button in sidebar header */}
        {!isFolded && !isMobile && (
          <button
            onClick={toggleSidebarFold}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            title="Fold sidebar (Ctrl+B)"
            aria-label="Fold navigation sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        className={`flex-1 space-y-1 overflow-y-auto transition-all ${
          isFolded ? 'px-2 py-4' : 'px-3 py-4'
        }`}
      >
        {!isFolded && (
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
        )}

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
              title={isFolded ? item.label : undefined}
              className={`flex items-center rounded-lg text-xs font-medium transition-all group relative ${
                isFolded
                  ? 'justify-center p-2.5 my-1'
                  : 'space-x-3 px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              />

              {!isFolded && <span className="truncate">{item.label}</span>}

              {/* Floating Tooltip Pill when sidebar is folded */}
              {isFolded && (
                <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[11px] font-sans font-medium shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700/60">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Live System Telemetry Card */}
      <div
        className={`border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0a0f1d] transition-all ${
          isFolded ? 'p-2 flex flex-col items-center' : 'p-3'
        }`}
      >
        {isFolded ? (
          <div className="flex flex-col items-center space-y-2 py-1">
            {/* Status dot with tooltip */}
            <button
              onClick={checkHealth}
              title={`Engine: ${isHealthy === true ? 'Online' : isHealthy === false ? 'Offline' : 'Connecting'} • DB: ${
                health?.database === 'ok' ? 'SQLite (WAL)' : 'Offline'
              } • Click to ping`}
              className="relative p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors group"
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full ${
                  isHealthy === true
                    ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    : isHealthy === false
                    ? 'bg-rose-500 shadow-xs shadow-rose-500/50'
                    : 'bg-amber-500 animate-pulse'
                }`}
              />
              <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-800 text-[11px] font-sans font-medium shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700/60">
                {isHealthy === true ? 'Engine Online' : 'Engine Offline'} • Click to ping
              </div>
            </button>

            {/* Quick Unfold Button at bottom */}
            <button
              onClick={toggleSidebarFold}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors group relative"
              title="Expand sidebar (Ctrl+B)"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
              <div className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-800 text-[11px] font-sans font-medium shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700/60">
                Expand Sidebar (Ctrl+B)
              </div>
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Foldable Sidebar */}
      <aside
        className={`hidden lg:flex flex-shrink-0 flex-col z-20 transition-all duration-300 ease-in-out ${
          sidebarFolded ? 'w-18' : 'w-64'
        }`}
      >
        {renderSidebar(sidebarFolded, false)}
      </aside>

      {/* Mobile Drawer (Responsive Overlay - Always full width) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebar(false, true)}
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

            {/* Desktop Fold / Expand Toggle Button in Top Header */}
            <button
              onClick={toggleSidebarFold}
              className="hidden lg:flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              title={sidebarFolded ? 'Expand Sidebar (Ctrl+B)' : 'Fold Sidebar (Ctrl+B)'}
              aria-label={sidebarFolded ? 'Expand Sidebar' : 'Fold Sidebar'}
            >
              {sidebarFolded ? (
                <PanelLeftOpen className="h-4.5 w-4.5" />
              ) : (
                <PanelLeftClose className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Breadcrumb Trail */}
            <Breadcrumbs />
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-2.5">
            {/* Database indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <Database className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>DB:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {health?.database === 'ok' ? 'Connected' : 'Offline'}
              </span>
            </div>

            {/* Voice Assistant Header Trigger */}
            <button
              onClick={() => setVoiceAssistantOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-2xs group"
              title="Open TrustTrace Voice Assistant (Natural commands & speech synthesis)"
              aria-label="Open Voice Assistant"
            >
              <Mic className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Voice Assistant</span>
            </button>

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

      {/* Global Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
      />
    </div>
  );
};
