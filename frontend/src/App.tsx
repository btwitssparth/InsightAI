import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

function Placeholder({ title }: { title: string }) {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Placeholder title="Login" />} />
        <Route path="/signup" element={<Placeholder title="Create your account" />} />
        <Route path="/dashboard" element={<Placeholder title="Dashboard" />} />
        <Route path="/datasets" element={<Placeholder title="Datasets" />} />
        <Route path="/datasets/:datasetId" element={<Placeholder title="Dataset workspace" />} />
        <Route path="/analyses/:analysisId" element={<Placeholder title="Analysis" />} />
        <Route path="/history" element={<Placeholder title="Analysis history" />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
