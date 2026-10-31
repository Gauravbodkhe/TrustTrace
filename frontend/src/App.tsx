import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './layouts/AppLayout';

// Direct core views for instant load
import { Dashboard } from './pages/Dashboard';
import { CreateExperiment } from './pages/CreateExperiment';

// Code-split pages for performance optimization
const ExperimentsList = lazy(() =>
  import('./pages/ExperimentsList').then((m) => ({ default: m.ExperimentsList }))
);
const ExperimentDetails = lazy(() =>
  import('./pages/ExperimentDetails').then((m) => ({ default: m.ExperimentDetails }))
);
const TestCaseLibrary = lazy(() =>
  import('./pages/TestCaseLibrary').then((m) => ({ default: m.TestCaseLibrary }))
);
const RecoveryStrategies = lazy(() =>
  import('./pages/RecoveryStrategies').then((m) => ({ default: m.RecoveryStrategies }))
);
const PolicyComparison = lazy(() =>
  import('./pages/PolicyComparison').then((m) => ({ default: m.PolicyComparison }))
);
const TraceExplorer = lazy(() =>
  import('./pages/TraceExplorer').then((m) => ({ default: m.TraceExplorer }))
);
const Evidence = lazy(() =>
  import('./pages/Evidence').then((m) => ({ default: m.Evidence }))
);
const ScenarioLibrary = lazy(() =>
  import('./pages/ScenarioLibrary').then((m) => ({ default: m.ScenarioLibrary }))
);
const ResearchReports = lazy(() =>
  import('./pages/ResearchReports').then((m) => ({ default: m.ResearchReports }))
);
const VoiceAssistantPage = lazy(() =>
  import('./pages/VoiceAssistantPage').then((m) => ({ default: m.VoiceAssistantPage }))
);
const Settings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings }))
);
const Login = lazy(() =>
  import('./pages/Login').then((m) => ({ default: m.Login }))
);
const Register = lazy(() =>
  import('./pages/Register').then((m) => ({ default: m.Register }))
);

const PageFallback: React.FC = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent dark:border-indigo-400" />
      <span className="text-xs text-slate-500 dark:text-slate-400">Loading module...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Main App Layout */}
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="experiments" element={<ExperimentsList />} />
                  <Route path="experiments/new" element={<CreateExperiment />} />
                  <Route path="experiments/:id" element={<ExperimentDetails />} />
                  <Route path="test-cases" element={<TestCaseLibrary />} />
                  <Route path="strategies" element={<RecoveryStrategies />} />
                  <Route path="comparison" element={<PolicyComparison />} />
                  <Route path="traces" element={<TraceExplorer />} />
                  <Route path="evidence" element={<Evidence />} />
                  <Route path="scenarios" element={<ScenarioLibrary />} />
                  <Route path="reports" element={<ResearchReports />} />
                  <Route path="voice" element={<VoiceAssistantPage />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
