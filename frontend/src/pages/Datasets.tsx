import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteDataset, getDatasets, uploadDataset, type Dataset } from '../api/datasets'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['csv', 'xlsx']

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
  }).format(new Date(value))
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Only CSV and XLSX files are supported.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File size must be 10 MB or smaller.'
  }
  if (file.size === 0) {
    return 'The selected file is empty.'
  }
  return null
}

function FileIcon({ type }: { type: string }) {
  return type === 'xlsx'
    ? <FileSpreadsheet size={18} />
    : <FileText size={18} />
}

export default function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function loadDatasets() {
    setLoading(true)
    setPageError(null)
    try {
      setDatasets(await getDatasets())
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not load datasets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDatasets()
  }, [])

  function chooseFile(file: File | undefined) {
    if (!file) return
    const validationError = validateFile(file)
    setUploadError(validationError)
    setSelectedFile(validationError ? null : file)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0])
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files?.[0])
  }

  function openUpload() {
    setSelectedFile(null)
    setUploadError(null)
    setUploadOpen(true)
  }

  function closeUpload() {
    if (uploading) return
    setUploadOpen(false)
    setSelectedFile(null)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile) {
      setUploadError('Choose a CSV or XLSX file first.')
      return
    }

    const validationError = validateFile(selectedFile)
    if (validationError) {
      setUploadError(validationError)
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      await uploadDataset(selectedFile)
      closeUpload()
      await loadDatasets()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload dataset.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(dataset: Dataset) {
    const confirmed = window.confirm(`Delete "${dataset.file_name}"? This will permanently remove the dataset.`)
    if (!confirmed) return

    setDeletingId(dataset.id)
    setPageError(null)
    try {
      await deleteDataset(dataset.id)
      setDatasets((current) => current.filter((item) => item.id !== dataset.id))
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Could not delete dataset.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredDatasets = datasets.filter((dataset) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return dataset.file_name.toLowerCase().includes(query) ||
      dataset.name.toLowerCase().includes(query)
  })

  return (
    <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-9">
      <div className="page-enter">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#969690]">Workspace</p>
            <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-[#171717]">Datasets</h1>
            <p className="mt-1.5 text-sm text-[#73736f]">
              Upload data, inspect its structure, and turn it into analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={openUpload}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-[#30302e]"
          >
            <Upload size={16} />
            Upload dataset
          </button>
        </div>

        {pageError && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#e6d6d2] bg-[#fffaf8] px-4 py-3 text-sm text-[#7b5148]">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{pageError}</span>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999994]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search datasets..."
              className="h-10 w-full rounded-lg border border-[#dededb] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-[#171717] focus:ring-4 focus:ring-[#171717]/[0.05]"
            />
          </div>
          <p className="text-xs text-[#8a8a85]">
            {datasets.length} {datasets.length === 1 ? 'dataset' : 'datasets'}
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-[#e5e5e3] bg-white px-5 py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#777772]" />
            <p className="mt-3 text-sm text-[#858580]">Loading your datasets…</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d8d4] bg-white px-5 py-16 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0f0ed] text-[#555550]">
              <Database size={20} />
            </div>
            <h2 className="mt-5 text-base font-semibold text-[#292927]">No datasets yet</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-[#777772]">
              Upload a CSV or XLSX file and InsightAI will validate and profile it automatically.
            </p>
            <button
              type="button"
              onClick={openUpload}
              className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#30302e]"
            >
              <Upload size={14} />
              Upload your first dataset
            </button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="rounded-xl border border-[#e5e5e3] bg-white px-5 py-14 text-center">
            <Search className="mx-auto h-5 w-5 text-[#999994]" />
            <p className="mt-3 text-sm font-medium text-[#555550]">No matching datasets</p>
            <p className="mt-1 text-xs text-[#999994]">Try a different filename or clear the search.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#e5e5e3] bg-white">
            <div className="hidden grid-cols-[minmax(0,1.7fr)_120px_150px_110px_52px] border-b border-[#ededeb] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#a0a09b] md:grid">
              <span>Dataset</span>
              <span>Size</span>
              <span>Dimensions</span>
              <span>Status</span>
              <span />
            </div>

            <div className="divide-y divide-[#ededeb]">
              {filteredDatasets.map((dataset) => (
                <div key={dataset.id} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-[#fafaf8] md:grid-cols-[minmax(0,1.7fr)_120px_150px_110px_52px] md:items-center">
                  <Link to={`/datasets/${dataset.id}`} className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f0f0ed] text-[#555550]">
                        <FileIcon type={dataset.file_type} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#292927] group-hover:text-[#171717]">{dataset.file_name}</p>
                        <p className="mt-0.5 text-xs text-[#999994]">
                          Added {formatDate(dataset.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>

                  <div className="pl-12 text-xs text-[#777772] md:pl-0">{formatBytes(dataset.file_size)}</div>

                  <div className="pl-12 text-xs text-[#777772] md:pl-0">
                    {dataset.row_count?.toLocaleString() ?? '—'} rows · {dataset.column_count ?? '—'} cols
                  </div>

                  <div className="pl-12 md:pl-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5ef] px-2.5 py-1 text-[11px] font-medium text-[#4f6549]">
                      <CheckCircle2 size={12} />
                      {dataset.status}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleDelete(dataset)}
                      disabled={deletingId === dataset.id}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#999994] transition-colors hover:bg-[#f1f1ee] hover:text-[#7b5148] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Delete ${dataset.file_name}`}
                      title="Delete dataset"
                    >
                      {deletingId === dataset.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title">
          <div className="w-full max-w-lg rounded-2xl border border-[#dededb] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between border-b border-[#ededeb] px-5 py-4">
              <div>
                <h2 id="upload-title" className="text-base font-semibold text-[#292927]">Upload dataset</h2>
                <p className="mt-0.5 text-xs text-[#8a8a85]">CSV or XLSX, up to 10 MB.</p>
              </div>
              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#8a8a85] hover:bg-[#f3f3f0] hover:text-[#292927] disabled:opacity-40"
                aria-label="Close upload dialog"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5">
              <input ref={inputRef} type="file" accept=".csv,.xlsx" onChange={handleInputChange} className="hidden" />

              <div
                onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
                onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
                onDrop={handleDrop}
                className={[
                  'rounded-xl border border-dashed px-5 py-10 text-center transition-colors',
                  dragging ? 'border-[#171717] bg-[#f7f7f5]' : 'border-[#d7d7d3] bg-[#fafaf8]',
                ].join(' ')}
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#ededeb] text-[#555550]">
                  <Upload size={19} />
                </div>
                <p className="mt-4 text-sm font-medium text-[#353532]">
                  {selectedFile ? selectedFile.name : 'Drop your dataset here'}
                </p>
                <p className="mt-1 text-xs text-[#999994]">
                  {selectedFile
                    ? `${formatBytes(selectedFile.size)} · Ready to upload`
                    : 'or choose a file from your computer'}
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="mt-5 inline-flex h-9 items-center rounded-lg border border-[#d9d9d5] bg-white px-3.5 text-xs font-medium text-[#353532] hover:bg-[#f5f5f2] disabled:opacity-50"
                >
                  Browse files
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[#ead8d4] bg-[#fffaf8] px-3.5 py-3 text-xs leading-5 text-[#7c5148]">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {selectedFile && !uploadError && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#e4e4e1] px-3.5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f0f0ed] text-[#555550]">
                    <FileIcon type={selectedFile.name.endsWith('.xlsx') ? 'xlsx' : 'csv'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#353532]">{selectedFile.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#999994]">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
                    disabled={uploading}
                    className="text-[#999994] hover:text-[#555550] disabled:opacity-40"
                    aria-label="Remove selected file"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#ededeb] px-5 py-4">
              <button type="button" onClick={closeUpload} disabled={uploading} className="h-9 rounded-lg px-3.5 text-xs font-medium text-[#666660] hover:bg-[#f5f5f2] disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={() => void handleUpload()} disabled={!selectedFile || uploading} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#171717] px-3.5 text-xs font-medium text-white hover:bg-[#30302e] disabled:cursor-not-allowed disabled:opacity-50">
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? 'Uploading…' : 'Upload dataset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
