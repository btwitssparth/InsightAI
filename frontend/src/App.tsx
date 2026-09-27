import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import './App.css'

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <div className="page-enter">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9a9a95]">
          InsightAI
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-[#171717]">
          {title}
        </h1>
      </div>
    </section>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Placeholder title="Login" />} />
        <Route path="/signup" element={<Placeholder title="Create your account" />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/datasets" element={<Placeholder title="Datasets" />} />
          <Route
            path="/datasets/:datasetId"
            element={<Placeholder title="Dataset workspace" />}
          />
          <Route
            path="/analyses/:analysisId"
            element={<Placeholder title="Analysis" />}
          />
          <Route path="/history" element={<Placeholder title="Analysis history" />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
