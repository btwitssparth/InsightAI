import { useEffect, useState } from 'react'
import { ArrowRight, Database, FileSpreadsheet, History, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDatasets, type Dataset } from '../api/datasets'
import { getAnalyses, type Analysis } from '../api/analyses'

export default function Dashboard() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const [datasetData, analysisData] = await Promise.all([
          getDatasets(),
          getAnalyses(),
        ])

        if (!cancelled) {
          setDatasets(datasetData)
          setAnalyses(analysisData)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load dashboard data.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="page-enter">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#969690]">Workspace</p>
            <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#171717]">Dashboard</h1>
            <p className="mt-1.5 text-sm text-[#73736f]">Turn your datasets into analysis and evidence-backed insights.</p>
          </div>
          <Link to="/datasets" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#30302e]">
            <Upload size={16} /> Upload dataset
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-4 py-3 text-sm text-[#7b5148]">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/datasets" className="group rounded-xl border border-[#e5e5e3] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d7d7d3] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
            <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f1ee] text-[#444440]"><Database size={18} /></div>
            <p className="text-xs font-medium text-[#8a8a85]">Datasets</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">
              {loading ? '—' : datasets.length}
            </p>
          </Link>

          <Link to="/history" className="group rounded-xl border border-[#e5e5e3] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d7d7d3] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
            <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f1ee] text-[#444440]"><History size={18} /></div>
            <p className="text-xs font-medium text-[#8a8a85]">Analyses</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">
              {loading ? '—' : analyses.length}
            </p>
          </Link>

          <div className="rounded-xl border border-[#e5e5e3] bg-white p-5">
            <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f1ee] text-[#444440]"><FileSpreadsheet size={18} /></div>
            <p className="text-xs font-medium text-[#8a8a85]">Supported files</p>
            <p className="mt-1 text-sm font-semibold text-[#292927]">CSV and XLSX</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
          <section className="rounded-xl border border-[#e5e5e3] bg-white">
            <div className="border-b border-[#ededeb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#292927]">Recent analyses</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Your latest questions and generated insights.</p>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-[#8b8b86]">Loading analyses…</div>
            ) : analyses.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-[#555550]">No analyses yet</p>
                <p className="mt-1 text-xs text-[#999994]">Upload a dataset to start asking questions.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#ededeb]">
                {analyses.slice(0, 5).map((analysis) => (
                  <Link
                    key={analysis.analysis_id}
                    to={`/analyses/${analysis.analysis_id}`}
                    className="block px-5 py-4 transition-colors hover:bg-[#fafaf8]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="line-clamp-2 text-sm font-medium text-[#353532]">{analysis.question}</p>
                      <span className="shrink-0 text-xs text-[#858580]">{analysis.status}</span>
                    </div>
                    {analysis.insight && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#858580]">{analysis.insight}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#e5e5e3] bg-white p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#171717] text-white"><Upload size={17} /></div>
            <h2 className="mt-5 text-base font-semibold text-[#292927]">Start with a dataset</h2>
            <p className="mt-1.5 text-sm leading-6 text-[#777772]">Upload a CSV or XLSX file and InsightAI will profile it so you can ask questions about the data.</p>
            <Link to="/datasets" className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border border-[#dededb] px-3.5 text-xs font-medium text-[#353532] transition-colors hover:bg-[#f5f5f2]">
              Go to datasets <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </section>
  )
}
