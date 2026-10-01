import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './components/auth/RequireAuth'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import DatasetWorkspace from './pages/DatasetWorkspace'
import AnalysisPage from './pages/AnalysisPage'
import AnalysisHistory from './pages/AnalysisHistory'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/datasets/:datasetId" element={<DatasetWorkspace />} />
            <Route path="/datasets/:datasetId/analyze" element={<AnalysisPage />} />
            <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            <Route path="/history" element={<AnalysisHistory />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
