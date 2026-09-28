import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireAuth } from './components/auth/RequireAuth'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Datasets from './pages/Datasets'
import DatasetWorkspace from './pages/DatasetWorkspace'
import AnalysisPage from './pages/AnalysisPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './App.css'

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <div className="page-enter">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a9a95]">InsightAI</p>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#171717]">{title}</h1>
      </div>
    </section>
  )
}

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
            <Route path="/analyses/new" element={<AnalysisPage />} />
        <Route path="/analyses/:analysisId" element={<AnalysisPage />} />
            <Route path="/history" element={<Placeholder title="Analysis history" />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
