import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorMonitor } from '../services/errorMonitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorMonitor.captureException(error, {
      source: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-xl dark:border-rose-900/50 dark:bg-slate-900 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              An unexpected error occurred while rendering this view. Your session and data remain safe.
            </p>
            {this.state.error?.message && (
              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-left font-mono text-xs text-rose-700 dark:bg-slate-950 dark:text-rose-400 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Home className="h-4 w-4" /> Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
