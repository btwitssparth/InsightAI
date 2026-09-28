import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquare,
  Rows3,
  Table2,
} from 'lucide-react'
import {
  getDataset,
  getDatasetAnalyses,
  previewDataset,
  profileDataset,
  type Dataset,
  type DatasetAnalysis,
  type DatasetPreview,
  type DatasetProfile,
} from '../api/datasets'

function formatBytes(bytes: number | null) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

function fileTypeIcon(type: string) {
  return type === 'xlsx' ? <FileSpreadsheet size={18} /> : <FileText size={18} />
}

type ColumnDetail = {
  name: string
  data_type: string
  missing: number
  missing_percentage: number
  unique_values: number
  statistics?: Record<string, number>
}

export default function DatasetWorkspace() {
  const { datasetId } = useParams()
  const navigate = useNavigate()
  const id = Number(datasetId)

  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [preview, setPreview] = useState<DatasetPreview | null>(null)
  const [profile, setProfile] = useState<DatasetProfile | null>(null)
  const [analyses, setAnalyses] = useState<DatasetAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState(true)

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError('Invalid dataset.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadWorkspace() {
      setLoading(true)
      setError(null)

      try {
        const [datasetData, previewData, profileData, analysisData] = await Promise.all([
          getDataset(id),
          previewDataset(id),
          profileDataset(id),
          getDatasetAnalyses(id),
        ])

        if (cancelled) return

        setDataset(datasetData)
        setPreview(previewData)
        setProfile(profileData)
        setAnalyses(analysisData)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load this dataset.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadWorkspace()

    return () => {
      cancelled = true
    }
  }, [id])

  const columns = useMemo<ColumnDetail[]>(() => {
    const details = profile?.profile?.column_details
    return Array.isArray(details) ? details as ColumnDetail[] : []
  }, [profile])

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#777772]" />
            <p className="mt-3 text-sm text-[#858580]">Loading dataset workspace…</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !dataset || !preview) {
    return (
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8">
        <Link to="/datasets" className="inline-flex items-center gap-2 text-xs font-medium text-[#666660] hover:text-[#171717]">
          <ArrowLeft size={14} /> Back to datasets
        </Link>
        <div className="mt-6 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-5 py-10 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-[#8a5c52]" />
          <p className="mt-3 text-sm font-medium text-[#6f4d46]">{error ?? 'Dataset could not be loaded.'}</p>
          <button
            type="button"
            onClick={() => navigate('/datasets')}
            className="mt-4 h-9 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white"
          >
            Back to datasets
          </button>
        </div>
      </section>
    )
  }

  const profileRows = profile?.profile?.rows
  const profileColumns = profile?.profile?.columns
  const duplicateRows = profile?.profile?.duplicate_rows

  return (
    <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="page-enter">
        <Link to="/datasets" className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-[#777772] transition-colors hover:text-[#171717]">
          <ArrowLeft size={14} /> Back to datasets
        </Link>

        <div className="flex flex-col justify-between gap-5 border-b border-[#e5e5e3] pb-7 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f0ed] text-[#555550]">
                {fileTypeIcon(dataset.file_type)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[25px] font-semibold tracking-[-0.035em] text-[#171717]">{dataset.file_name}</h1>
                <p className="mt-1 text-xs text-[#888883]">Added {formatDate(dataset.created_at)}</p>
              </div>
            </div>
          </div>

          <Link
            to={`/datasets/${dataset.id}/analyze`}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white hover:bg-[#30302e]"
          >
            <MessageSquare size={16} />
            Ask about this data
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Rows', value: dataset.row_count?.toLocaleString() ?? '—', icon: Rows3 },
            { label: 'Columns', value: dataset.column_count?.toLocaleString() ?? '—', icon: Table2 },
            { label: 'File size', value: formatBytes(dataset.file_size), icon: Database },
            { label: 'Status', value: dataset.status, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-[#e5e5e3] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8a8a85]">{label}</span>
                <Icon size={15} className="text-[#999994]" />
              </div>
              <p className="mt-3 truncate text-lg font-semibold tracking-[-0.02em] text-[#292927]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[#ededeb] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-[#292927]">Data preview</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">
                First {preview.rows.length} rows of {preview.total_rows.toLocaleString()} total rows.
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-medium text-[#666660]">
              {preview.columns.length} columns
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ededeb] bg-[#fafaf8]">
                  <th className="w-12 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a09b]">#</th>
                  {preview.columns.map((column) => (
                    <th key={column} className="max-w-[240px] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#777772]">
                      <span className="block truncate" title={column}>{column}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ededeb]">
                {preview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-[#fafaf8]">
                    <td className="px-4 py-3 text-xs text-[#aaa9a4]">{rowIndex + 1}</td>
                    {preview.columns.map((column) => (
                      <td key={column} className="max-w-[240px] px-4 py-3 text-xs text-[#555550]">
                        <span className="block truncate" title={formatValue(row[column])}>{formatValue(row[column])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#fafaf8]"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#292927]">Column profile</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Types, missing values, uniqueness, and numeric statistics.</p>
            </div>
            <ChevronDown size={17} className={profileOpen ? 'rotate-180 text-[#777772] transition-transform' : 'text-[#777772] transition-transform'} />
          </button>

          {profileOpen && (
            <div className="border-t border-[#ededeb]">
              <div className="grid gap-3 border-b border-[#ededeb] bg-[#fafaf8] px-5 py-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a09b]">Profile rows</p>
                  <p className="mt-1 text-sm font-semibold text-[#353532]">{typeof profileRows === 'number' ? profileRows.toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a09b]">Profile columns</p>
                  <p className="mt-1 text-sm font-semibold text-[#353532]">{typeof profileColumns === 'number' ? profileColumns.toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a0a09b]">Duplicate rows</p>
                  <p className="mt-1 text-sm font-semibold text-[#353532]">{typeof duplicateRows === 'number' ? duplicateRows.toLocaleString() : '—'}</p>
                </div>
              </div>

              {columns.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[#858580]">No column profile is available.</div>
              ) : (
                <div className="divide-y divide-[#ededeb]">
                  {columns.map((column) => (
                    <div key={column.name} className="px-5 py-4">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#353532]" title={column.name}>{column.name}</p>
                          <p className="mt-0.5 text-[11px] text-[#999994]">{column.data_type}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-[#777772]">
                          <span className="rounded-full bg-[#f3f3f0] px-2 py-1">{column.unique_values.toLocaleString()} unique</span>
                          <span className="rounded-full bg-[#f3f3f0] px-2 py-1">{column.missing.toLocaleString()} missing ({column.missing_percentage}%)</span>
                        </div>
                      </div>

                      {column.statistics && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {Object.entries(column.statistics).map(([key, value]) => (
                            <div key={key} className="rounded-lg border border-[#ededeb] px-3 py-2">
                              <p className="text-[10px] capitalize text-[#999994]">{key.replaceAll('_', ' ')}</p>
                              <p className="mt-1 text-xs font-medium text-[#555550]">{formatValue(value)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[#e5e5e3] bg-white">
          <div className="flex items-center justify-between border-b border-[#ededeb] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#292927]">Recent analyses</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Questions already asked about this dataset.</p>
            </div>
            <BarChart3 size={17} className="text-[#999994]" />
          </div>

          {analyses.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-[#555550]">No analyses yet</p>
              <p className="mt-1 text-xs text-[#999994]">Ask a question to generate your first analysis.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#ededeb]">
              {analyses.slice(0, 5).map((analysis) => (
                <Link key={analysis.analysis_id} to={`/analyses/${analysis.analysis_id}`} className="block px-5 py-4 hover:bg-[#fafaf8]">
                  <div className="flex items-start justify-between gap-4">
                    <p className="line-clamp-2 text-sm font-medium text-[#353532]">{analysis.question}</p>
                    <span className="shrink-0 rounded-full bg-[#f3f3f0] px-2 py-1 text-[10px] font-medium text-[#777772]">{analysis.status}</span>
                  </div>
                  {analysis.insight && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#858580]">{analysis.insight}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
