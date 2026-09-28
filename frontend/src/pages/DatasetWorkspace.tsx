import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquare,
  Rows3,
  Table2,
  Trash2,
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
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  return String(value)
}

function fileTypeIcon(type: string) {
  return type === 'xlsx' ? <FileSpreadsheet size={18} /> : <FileText size={18} />
}

function isNumericType(type: string) {
  return ['int', 'float', 'complex', 'decimal'].some((token) => type.toLowerCase().includes(token))
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
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)

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
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load this dataset.',
          )
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
    return Array.isArray(details) ? (details as ColumnDetail[]) : []
  }, [profile])

  const profileSummary = useMemo(() => {
    const totalRows = typeof profile?.profile?.rows === 'number'
      ? profile.profile.rows
      : dataset?.row_count ?? 0
    const duplicateRows = typeof profile?.profile?.duplicate_rows === 'number'
      ? profile.profile.duplicate_rows
      : 0
    const missingCells = columns.reduce((sum, column) => sum + column.missing, 0)
    const totalCells = Math.max(1, totalRows * Math.max(columns.length, dataset?.column_count ?? 0))
    const missingPercentage = totalCells > 0 ? (missingCells / totalCells) * 100 : 0
    const numericColumns = columns.filter((column) => isNumericType(column.data_type)).length

    return {
      totalRows,
      duplicateRows,
      missingCells,
      missingPercentage,
      numericColumns,
      categoricalColumns: Math.max(0, columns.length - numericColumns),
    }
  }, [columns, dataset, profile])

  const selectedColumnDetail = selectedColumn
    ? columns.find((column) => column.name === selectedColumn) ?? null
    : null

  const automaticOverview = useMemo(() => {
    const numericColumns = columns.filter((column) => isNumericType(column.data_type))
    const columnsWithMissing = columns
      .filter((column) => column.missing > 0)
      .sort((a, b) => b.missing - a.missing)

    return {
      numericNames: numericColumns.map((column) => column.name),
      missingColumns: columnsWithMissing.map((column) => column.name),
    }
  }, [columns])

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
        <Link
          to="/datasets"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#666660] hover:text-[#171717]"
        >
          <ArrowLeft size={14} /> Back to datasets
        </Link>
        <div className="mt-6 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-5 py-10 text-center">
          <AlertCircle className="mx-auto h-5 w-5 text-[#8a5c52]" />
          <p className="mt-3 text-sm font-medium text-[#6f4d46]">
            {error ?? 'Dataset could not be loaded.'}
          </p>
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

  return (
    <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="page-enter">
        <Link
          to="/datasets"
          className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-[#777772] transition-colors hover:text-[#171717]"
        >
          <ArrowLeft size={14} /> Back to datasets
        </Link>

        <div className="flex flex-col justify-between gap-5 border-b border-[#e5e5e3] pb-7 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f0ed] text-[#555550]">
                {fileTypeIcon(dataset.file_type)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[25px] font-semibold tracking-[-0.035em] text-[#171717]">
                  {dataset.file_name}
                </h1>
                <p className="mt-1 text-xs text-[#888883]">Added {formatDate(dataset.created_at)}</p>
              </div>
            </div>
          </div>

          <Link
            to={`/datasets/${dataset.id}/analyze`}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-[#30302e]"
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Missing data</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#292927]">
              {profileSummary.missingCells.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-[#888883]">
              {profileSummary.missingPercentage.toFixed(1)}% of all cells
            </p>
          </div>
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Duplicates</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#292927]">
              {profileSummary.duplicateRows.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-[#888883]">duplicate rows</p>
          </div>
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Numeric fields</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#292927]">
              {profileSummary.numericColumns}
            </p>
            <p className="mt-1 text-[11px] text-[#888883]">of {columns.length} columns</p>
          </div>
          <div className="rounded-xl border border-[#e5e5e3] bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Rows scanned</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#292927]">
              {profileSummary.totalRows.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-[#888883]">profiled rows</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#e5e5e3] bg-white">
          <div className="border-b border-[#ededeb] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#292927]">Automatic dataset overview</h2>
            <p className="mt-0.5 text-xs text-[#90908b]">
              A deterministic summary generated from the dataset profile. No AI request is used.
            </p>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.35fr_0.85fr]">
            <div>
              <p className="text-xs font-medium text-[#555550]">What we found</p>
              <ul className="mt-3 space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#777772]" />
                  <p className="text-sm leading-6 text-[#666660]">
                    {profileSummary.totalRows.toLocaleString()} rows across {columns.length.toLocaleString()} columns were profiled.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  {profileSummary.missingCells > 0 ? (
                    <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#806957]" />
                  ) : (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#777772]" />
                  )}
                  <p className="text-sm leading-6 text-[#666660]">
                    {profileSummary.missingCells > 0
                      ? profileSummary.missingCells.toLocaleString() + " missing cells were detected (" + profileSummary.missingPercentage.toFixed(1) + "% of all cells)."
                      : "No missing cells were detected."}
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  {profileSummary.duplicateRows > 0 ? (
                    <CircleAlert size={16} className="mt-0.5 shrink-0 text-[#806957]" />
                  ) : (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#777772]" />
                  )}
                  <p className="text-sm leading-6 text-[#666660]">
                    {profileSummary.duplicateRows > 0
                      ? profileSummary.duplicateRows.toLocaleString() + " exact duplicate rows were detected."
                      : "No exact duplicate rows were detected."}
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#777772]" />
                  <p className="text-sm leading-6 text-[#666660]">
                    {profileSummary.numericColumns} numeric {profileSummary.numericColumns === 1 ? "field" : "fields"} and {profileSummary.categoricalColumns} non-numeric {profileSummary.categoricalColumns === 1 ? "field" : "fields"} were identified.
                  </p>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-[#ededeb] bg-[#fafaf8] p-4">
              <p className="text-xs font-medium text-[#555550]">Key fields</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Numeric</p>
                  <p className="mt-1 text-xs leading-5 text-[#666660]">
                    {automaticOverview.numericNames.length > 0
                      ? automaticOverview.numericNames.join(", ")
                      : "No numeric fields detected."}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Columns with missing data</p>
                  <p className="mt-1 text-xs leading-5 text-[#666660]">
                    {automaticOverview.missingColumns.length > 0
                      ? automaticOverview.missingColumns.join(", ")
                      : "None"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
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

          <div className="rounded-xl border border-[#e5e5e3] bg-white">
            <div className="border-b border-[#ededeb] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#292927]">Dataset health</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Quick checks from the dataset profile.</p>
            </div>
            <div className="divide-y divide-[#ededeb]">
              <div className="flex items-start gap-3 px-5 py-4">
                {profileSummary.missingCells > 0 ? (
                  <CircleAlert size={17} className="mt-0.5 shrink-0 text-[#806957]" />
                ) : (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#666660]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[#353532]">
                    {profileSummary.missingCells > 0 ? 'Missing values detected' : 'No missing values detected'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#888883]">
                    {profileSummary.missingCells.toLocaleString()} missing cells across the profiled columns.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-4">
                {profileSummary.duplicateRows > 0 ? (
                  <CircleAlert size={17} className="mt-0.5 shrink-0 text-[#806957]" />
                ) : (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#666660]" />
                )}
                <div>
                  <p className="text-sm font-medium text-[#353532]">
                    {profileSummary.duplicateRows > 0 ? 'Duplicate rows found' : 'No duplicate rows detected'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#888883]">
                    {profileSummary.duplicateRows.toLocaleString()} exact duplicate rows are present.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-4">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#666660]" />
                <div>
                  <p className="text-sm font-medium text-[#353532]">Dataset structure detected</p>
                  <p className="mt-1 text-xs leading-5 text-[#888883]">
                    {profileSummary.numericColumns} numeric and {profileSummary.categoricalColumns} non-numeric columns identified.
                  </p>
                </div>
              </div>
              <div className="px-5 py-4">
                <Link
                  to={`/datasets/${dataset.id}/analyze`}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#dededb] text-xs font-medium text-[#353532] transition-colors hover:bg-[#f5f5f2]"
                >
                  Explore with InsightAI <MessageSquare size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#fafaf8]"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#292927]">Column profile</h2>
              <p className="mt-0.5 text-xs text-[#90908b]">Inspect field types, completeness, uniqueness, and numeric ranges.</p>
            </div>
            <ChevronDown size={17} className={profileOpen ? 'rotate-180 text-[#777772] transition-transform' : 'text-[#777772] transition-transform'} />
          </button>

          {profileOpen && (
            <div className="border-t border-[#ededeb]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#ededeb] bg-[#fafaf8]">
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8f8a]">Column</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8f8a]">Type</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8f8a]">Unique</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8f8a]">Missing</th>
                      <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8f8f8a]">Range / stats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ededeb]">
                    {columns.map((column) => (
                      <tr
                        key={column.name}
                        className="group cursor-pointer hover:bg-[#fafaf8]"
                        onClick={() => setSelectedColumn(column.name)}
                      >
                        <td className="px-5 py-3.5">
                          <p className="max-w-[220px] truncate text-sm font-medium text-[#353532]" title={column.name}>{column.name}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#777772]">{column.data_type}</td>
                        <td className="px-5 py-3.5 text-xs text-[#555550]">{column.unique_values.toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          <span className={column.missing > 0 ? 'text-xs font-medium text-[#806957]' : 'text-xs text-[#777772]'}>
                            {column.missing.toLocaleString()} ({column.missing_percentage}%)
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {column.statistics ? (
                            <span className="text-xs text-[#777772]">
                              {formatValue(column.statistics.min)} → {formatValue(column.statistics.max)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#999994]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {columns.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-[#858580]">No column profile is available.</div>
              )}
            </div>
          )}
        </div>

        {selectedColumnDetail && (
          <div className="mt-4 rounded-xl border border-[#dededb] bg-[#fafaf8] px-5 py-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#999994]">Selected column</p>
                <h3 className="mt-1 text-base font-semibold text-[#292927]">{selectedColumnDetail.name}</h3>
                <p className="mt-1 text-xs text-[#858580]">
                  {selectedColumnDetail.data_type} · {selectedColumnDetail.unique_values.toLocaleString()} unique values · {selectedColumnDetail.missing_percentage}% missing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedColumn(null)}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#dededb] px-3 text-xs font-medium text-[#666660] hover:bg-white"
              >
                Close
              </button>
            </div>

            {selectedColumnDetail.statistics ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Object.entries(selectedColumnDetail.statistics).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-[#e4e4e1] bg-white px-3 py-2.5">
                    <p className="text-[10px] capitalize text-[#999994]">{key.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-xs font-medium text-[#555550]">{formatValue(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-[#e4e4e1] bg-white px-3 py-3 text-xs text-[#777772]">
                This column has no numeric statistics. Use InsightAI to explore its distribution.
              </div>
            )}
          </div>
        )}

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
                <Link
                  key={analysis.analysis_id}
                  to={`/analyses/${analysis.analysis_id}`}
                  className="block px-5 py-4 transition-colors hover:bg-[#fafaf8]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="line-clamp-2 text-sm font-medium text-[#353532]">{analysis.question}</p>
                    <span className="shrink-0 rounded-full bg-[#f3f3f0] px-2 py-1 text-[10px] font-medium text-[#777772]">{analysis.status}</span>
                  </div>
                  {analysis.insight && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#858580]">{analysis.insight}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled
            title="Dataset deletion remains available from the datasets list."
            className="inline-flex items-center gap-2 text-xs text-[#a1a19c]"
          >
            <Trash2 size={14} />
            Manage dataset from Datasets
          </button>
        </div>
      </div>
    </section>
  )
}
