import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { CreateExperiment } from './pages/CreateExperiment';
import { ExperimentDetails } from './pages/ExperimentDetails';
import { TraceExplorer } from './pages/TraceExplorer';
import { PolicyComparison } from './pages/PolicyComparison';
import { ScenarioLibrary } from './pages/ScenarioLibrary';
import { ResearchReports } from './pages/ResearchReports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="experiments/new" element={<CreateExperiment />} />
          <Route path="experiments/:id" element={<ExperimentDetails />} />
          <Route path="comparison" element={<PolicyComparison />} />
          <Route path="traces" element={<TraceExplorer />} />
          <Route path="scenarios" element={<ScenarioLibrary />} />
          <Route path="reports" element={<ResearchReports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
