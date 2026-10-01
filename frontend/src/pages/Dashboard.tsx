import { useEffect, useState } from 'react'
import { ArrowRight, Database, History, Upload, Sparkles } from 'lucide-react'
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

    async function load() {
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
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-7 md:px-9 md:py-9">
      <div className="page-enter">
        <div className="mb-8 overflow-hidden rounded-2xl border border-[#dcdcd7] bg-white shadow-[0_10px_35px_rgba(0,0,0,0.045)]">
          <div className="flex flex-col justify-between gap-7 px-6 py-7 md:flex-row md:items-center md:px-8 md:py-8">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#deded9] bg-[#f5f5f2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#696963]">
                <Sparkles size={12} />
                AI data workspace
              </div>
              <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.04em] md:text-[38px]">
                Understand your data faster.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#6f6f69] md:text-[15px]">
                Upload a dataset, ask a question in plain language, and get
                calculations executed against your actual data before InsightAI
                explains the result.
              </p>
            </div>

            <Link
              to="/datasets"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#20201e] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:bg-[#30302e]"
            >
              <Upload size={16} />
              Upload dataset
            </Link>
          </div>

          <div className="grid border-t border-[#ededeb] sm:grid-cols-3">
            <div className="border-b border-[#ededeb] px-6 py-4 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a94]">Datasets</p>
              <p className="mt-1 text-2xl font-semibold">{loading ? '—' : datasets.length}</p>
            </div>
            <div className="border-b border-[#ededeb] px-6 py-4 sm:border-b-0 sm:border-r">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a94]">Analyses</p>
              <p className="mt-1 text-2xl font-semibold">{loading ? '—' : analyses.length}</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a9a94]">Formats</p>
              <p className="mt-1 text-sm font-semibold">CSV · XLSX</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-4 py-3 text-sm text-[#7b5148]">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#999994]">Workspace activity</p>
            <h2 className="mt-1 text-lg font-semibold">Recent analyses</h2>
          </div>
          <Link to="/history" className="text-xs font-medium text-[#555550] hover:text-[#171717]">
            View all <ArrowRight size={13} className="ml-1 inline" />
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)]">
          <section className="overflow-hidden rounded-2xl border border-[#dcdcd7] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.035)]">
            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-[#858580]">Loading analyses…</div>
            ) : analyses.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <History className="mx-auto h-6 w-6 text-[#aaa9a4]" />
                <p className="mt-3 text-sm font-medium">No analyses yet</p>
                <p className="mt-1 text-xs text-[#999994]">Upload a dataset to start asking questions.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#ededeb]">
                {analyses.slice(0, 6).map((analysis) => (
                  <Link
                    key={analysis.analysis_id}
                    to={`/analyses/${analysis.analysis_id}`}
                    className="group block px-6 py-5 transition-colors hover:bg-[#f8f8f5]"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-[#292927]">
                          {analysis.question}
                        </p>
                        {analysis.insight && (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#777772]">
                            {analysis.insight}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[10px] font-semibold text-[#6f6f69]">
                        {analysis.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#dcdcd7] bg-[#20201e] p-6 text-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#20201e]">
              <Database size={18} />
            </div>
            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">Start here</p>
            <h2 className="mt-2 text-xl font-semibold">Bring in a dataset.</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              InsightAI profiles the file first, then turns your question into an executable analysis plan.
            </p>
            <Link
              to="/datasets"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#20201e] hover:bg-[#ededeb]"
            >
              Go to datasets <ArrowRight size={14} />
            </Link>
          </section>
        </div>
      </div>
    </section>
  )
}
