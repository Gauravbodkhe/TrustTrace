import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const Login: React.FC = () => {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 transition-colors py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Shield className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Sign in to TrustTrace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          AI Agent Reliability Testing & Recovery Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-slate-200/80 dark:border-slate-800">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-3.5 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@trusttrace.ai"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400">
                Or explore without signup
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 py-2.5 px-4 text-sm font-semibold transition-all cursor-pointer"
          >
            {demoLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span>Launching demo session...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Explore as Demo Researcher</span>
              </>
            )}
          </button>

          <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Create researcher account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
