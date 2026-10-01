import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Clock3, Loader2, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAnalyses, type Analysis } from '../api/analyses'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await getAnalyses()
        if (!cancelled) setAnalyses(data)
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load analysis history.',
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

  const filteredAnalyses = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return analyses

    return analyses.filter((analysis) =>
      analysis.question.toLowerCase().includes(normalized)
      || (analysis.insight ?? '').toLowerCase().includes(normalized),
    )
  }, [analyses, query])

  return (
    <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="page-enter">
        <div className="flex flex-col justify-between gap-5 border-b border-[#e5e5e3] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#969690]">Workspace</p>
            <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#171717]">Analysis history</h1>
            <p className="mt-1.5 text-sm text-[#73736f]">Review your previous questions, verified results, and insights.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#999994]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search analyses…"
              className="h-10 w-full rounded-lg border border-[#dededb] bg-white pl-9 pr-3 text-xs text-[#292927] outline-none placeholder:text-[#aaa9a4] focus:border-[#aaa9a4]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-4 py-3 text-sm text-[#7b5148]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-xl border border-[#e5e5e3] bg-white px-5 py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#777772]" />
            <p className="mt-3 text-sm text-[#858580]">Loading analysis history…</p>
          </div>
        ) : filteredAnalyses.length === 0 ? (
          <div className="mt-6 rounded-xl border border-[#e5e5e3] bg-white px-5 py-16 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-[#8a8a85]" />
            <p className="mt-3 text-sm font-medium text-[#555550]">
              {analyses.length === 0 ? 'No analyses yet' : 'No matching analyses'}
            </p>
            <p className="mt-1 text-xs text-[#999994]">
              {analyses.length === 0
                ? 'Start an analysis from one of your datasets.'
                : 'Try a different search term.'}
            </p>
            {analyses.length === 0 && (
              <Link
                to="/datasets"
                className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#30302e]"
              >
                Go to datasets <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
            <div className="divide-y divide-[#ededeb]">
              {filteredAnalyses.map((analysis) => (
                <Link
                  key={analysis.analysis_id}
                  to={`/analyses/${analysis.analysis_id}`}
                  className="block px-5 py-5 transition-colors hover:bg-[#fafaf8]"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">
                          Analysis #{analysis.analysis_id}
                        </span>
                        <span className="text-[#c0c0bb]">·</span>
                        <span className="text-[10px] text-[#999994]">{formatDate(analysis.created_at)}</span>
                      </div>
                      <h2 className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[#292927]">
                        {analysis.question}
                      </h2>
                      {analysis.insight && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#777772]">{analysis.insight}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs text-[#777772]">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f1ee] px-2.5 py-1">
                        <Clock3 size={12} />
                        {statusLabel(analysis.status)}
                      </span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
