import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, CheckCircle2, Clock3, Loader2, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import { getAnalysis, askAnalysis, type Analysis } from '../api/analyses'
import { getDataset, type Dataset } from '../api/datasets'

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  return String(value)
}

function ResultTable({ result }: { result: Record<string, unknown> }) {
  const raw = result.result

  if (Array.isArray(raw)) {
    const rows = raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    if (!rows.length) return <EmptyResult />

    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-[#ededeb] bg-[#fafaf8]">
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#777772]">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ededeb]">
            {rows.map((row, index) => (
              <tr key={index} className="hover:bg-[#fafaf8]">
                {columns.map((column) => (
                  <td key={column} className="max-w-[280px] truncate px-4 py-3 text-xs text-[#555550]">{formatValue(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (raw && typeof raw === 'object') {
    const entries = Object.entries(raw)
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-[#ededeb] p-3">
            <p className="text-xs font-medium text-[#555550]">{key}</p>
            {value && typeof value === 'object' ? (
              <div className="mt-2 space-y-1.5">
                {Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => (
                  <div key={childKey} className="flex justify-between gap-3 text-[11px]">
                    <span className="text-[#999994]">{childKey}</span>
                    <span className="text-right font-medium text-[#555550]">{formatValue(childValue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm font-semibold text-[#292927]">{formatValue(value)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <EmptyResult />
}

function EmptyResult() {
  return <div className="px-5 py-10 text-center text-sm text-[#858580]">The analysis returned no rows.</div>
}

function AnalysisChart({ visualization }: { visualization: Record<string, unknown> }) {
  const data = Array.isArray(visualization.data) ? visualization.data : []
  if (!data.length) return null

  const chartType = String(visualization.chart_type ?? 'bar')
  const chartData = data as { label: string; value: number }[]
  const commonMargin = { top: 10, right: 12, left: 0, bottom: 35 }

  if (chartType === 'pie') {
    return (
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={105} label>
              {chartData.map((entry, index) => <Cell key={entry.label + index} fill={index % 2 === 0 ? '#292927' : '#8a8a84'} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'line') {
    return (
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={commonMargin}>
            <CartesianGrid vertical={false} stroke="#ededeb" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777772' }} />
            <YAxis tick={{ fontSize: 11, fill: '#777772' }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#292927" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={commonMargin}>
          <CartesianGrid vertical={false} stroke="#ededeb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#777772' }} angle={data.length > 6 ? -35 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} interval={0} />
          <YAxis tick={{ fontSize: 11, fill: '#777772' }} />
          <Tooltip />
          <Bar dataKey="value" fill="#292927" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const suggestions = [
  'Which categories have the highest total value?',
  'Show me the top 10 rows by value.',
  'What is the average of the numeric columns?',
]

export default function AnalysisPage() {
  const { analysisId, datasetId: datasetIdParam } = useParams()
  const navigate = useNavigate()
  const isNew = Boolean(datasetIdParam)
  const datasetId = Number(datasetIdParam ?? 0)

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isNew) return
    if (!Number.isInteger(datasetId) || datasetId <= 0) {
      setError('A valid dataset is required to start an analysis.')
      return
    }

    let cancelled = false
    void getDataset(datasetId)
      .then((data) => { if (!cancelled) setDataset(data) })
      .catch((requestError) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Could not load the dataset.')
      })
    return () => { cancelled = true }
  }, [isNew, datasetId])

  useEffect(() => {
    if (isNew || !analysisId || !/^\d+$/.test(analysisId)) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function load() {
      try {
        const data = await getAnalysis(Number(analysisId))
        if (cancelled) return
        setAnalysis(data)
        setLoading(false)

        if (data.status === 'pending' || data.status === 'processing') {
          timer = setTimeout(() => void load(), 2000)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load the analysis.')
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [isNew, analysisId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !datasetId) return

    setSubmitting(true)
    setError(null)

    try {
      const created = await askAnalysis({ dataset_id: datasetId, question: trimmed })
      navigate(`/analyses/${created.analysis_id}`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start the analysis.')
    } finally {
      setSubmitting(false)
    }
  }

  const status = analysis?.status
  const statusLabel = status === 'processing' ? 'Analyzing your dataset' : status === 'pending' ? 'Waiting for analysis worker' : status

  const chart = useMemo(() => {
    if (!analysis?.visualization) return null
    return analysis.visualization
  }, [analysis?.visualization])

  if (!isNew && loading) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#777772]" /><p className="mt-3 text-sm text-[#858580]">Loading analysis…</p></div>
        </div>
      </section>
    )
  }

  if (!isNew && error && !analysis) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-9 md:px-8">
        <Link to="/history" className="inline-flex items-center gap-2 text-xs font-medium text-[#666660] hover:text-[#171717]"><ArrowLeft size={14} /> Back to history</Link>
        <div className="mt-6 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] p-8 text-center text-sm text-[#7b5148]">{error}</div>
      </section>
    )
  }

  if (isNew) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-10">
        <Link to={dataset ? `/datasets/${dataset.id}` : '/datasets'} className="inline-flex items-center gap-2 text-xs font-medium text-[#777772] hover:text-[#171717]"><ArrowLeft size={14} /> Back to dataset</Link>

        <div className="mx-auto mt-10 max-w-2xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#171717] text-white"><Sparkles size={18} /></div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[#969690]">AI analysis</p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#171717]">Ask a question about your data</h1>
          <p className="mt-2 text-sm leading-6 text-[#73736f]">
            InsightAI will create an analysis plan, execute it against the actual dataset, and explain the verified result.
          </p>

          {dataset && (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#e5e5e3] bg-white px-4 py-3">
              <DatabaseIcon />
              <div className="min-w-0"><p className="truncate text-xs font-medium text-[#353532]">{dataset.file_name}</p><p className="mt-0.5 text-[11px] text-[#999994]">{dataset.row_count?.toLocaleString()} rows · {dataset.column_count} columns</p></div>
            </div>
          )}

          {error && <div className="mt-5 flex gap-2.5 rounded-lg border border-[#ead8d4] bg-[#fffaf8] px-3.5 py-3 text-xs text-[#7c5148]"><AlertCircle size={15} className="shrink-0" />{error}</div>}

          <form onSubmit={handleSubmit} className="mt-5 rounded-xl border border-[#dededb] bg-white p-3 shadow-[0_10px_35px_rgba(0,0,0,0.04)]">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="e.g. Which products generated the most revenue?"
              maxLength={2000}
              rows={5}
              autoFocus
              className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-[#292927] outline-none placeholder:text-[#aaa9a4]"
            />
            <div className="flex items-center justify-between border-t border-[#ededeb] px-2 pt-3">
              <span className="text-[11px] text-[#aaa9a4]">{question.length}/2000</span>
              <button type="submit" disabled={!question.trim() || submitting || !dataset} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#30302e] disabled:cursor-not-allowed disabled:opacity-40">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? 'Starting…' : 'Analyze data'}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#a0a09b]">Try asking</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)} className="rounded-full border border-[#dededb] bg-white px-3 py-2 text-xs text-[#666660] hover:border-[#bdbdb8] hover:text-[#292927]">{item}</button>)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-7 md:px-8 md:py-9">
      <Link to={`/datasets/${analysis?.dataset_id}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#777772] hover:text-[#171717]"><ArrowLeft size={14} /> Back to dataset</Link>

      <div className="mt-5 flex flex-col justify-between gap-4 border-b border-[#e5e5e3] pb-6 sm:flex-row sm:items-start">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#969690]">Analysis</p>
          <h1 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[#171717]">{analysis?.question}</h1>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-medium text-[#666660]">
          {status === 'completed' ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}
          {statusLabel}
        </span>
      </div>

      {error && <div className="mt-5 rounded-lg border border-[#ead8d4] bg-[#fffaf8] px-4 py-3 text-xs text-[#7c5148]">{error}</div>}

      {(status === 'pending' || status === 'processing') && (
        <div className="mt-6 rounded-xl border border-[#e5e5e3] bg-white px-5 py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#555550]" />
          <h2 className="mt-4 text-sm font-semibold text-[#353532]">{status === 'processing' ? 'Analyzing your data…' : 'Analysis queued…'}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-[#858580]">The AI planner is creating a structured plan, then the backend will execute it against your actual dataset.</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-6 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] p-6">
          <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 text-[#8a5c52]" /><div><h2 className="text-sm font-semibold text-[#6f4d46]">Analysis failed</h2><p className="mt-1 text-xs leading-5 text-[#7c5148]">{analysis?.error ?? 'The analysis could not be completed.'}</p></div></div>
          <Link to={`/datasets/${analysis?.dataset_id}/analyze`} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white">Try another question</Link>
        </div>
      )}

      {status === 'completed' && analysis && (
        <div className="mt-6 grid gap-5">
          {analysis.insight && (
            <section className="rounded-xl border border-[#e5e5e3] bg-white p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#777772]"><Sparkles size={14} /> Verified insight</div>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#3f3f3b]">{analysis.insight}</p>
            </section>
          )}

          {chart && (
            <section className="rounded-xl border border-[#e5e5e3] bg-white p-5">
              <div className="mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-[#555550]" /><h2 className="text-sm font-semibold text-[#292927]">{String(chart.title ?? 'Visualization')}</h2></div>
              <AnalysisChart visualization={chart} />
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
            <div className="border-b border-[#ededeb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#292927]">Verified result</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Calculated by the backend from your uploaded dataset.</p>
            </div>
            <ResultTable result={analysis.result ?? {}} />
          </section>

          {analysis.plan && (
            <details className="rounded-xl border border-[#e5e5e3] bg-white">
              <summary className="cursor-pointer px-5 py-4 text-xs font-medium text-[#555550]">View analysis plan</summary>
              <pre className="overflow-x-auto border-t border-[#ededeb] bg-[#fafaf8] p-5 text-[11px] leading-5 text-[#666660]">{JSON.stringify(analysis.plan, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function DatabaseIcon() {
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f0f0ed] text-[#555550]"><DatabaseIconInner /></div>
}

function DatabaseIconInner() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 12v7c0 1.66 3.58 3 8 3s8-1.34 8-3v-7" /></svg>
}
