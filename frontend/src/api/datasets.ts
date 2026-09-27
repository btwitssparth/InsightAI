import { apiRequest } from './client'

export interface Dataset {
  id: number
  name: string
  file_name: string
  file_type: string
  file_size: number | null
  row_count: number | null
  column_count: number | null
  status: string
  created_at: string
  updated_at: string
}

export interface DatasetPreview {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface DatasetProfile {
  columns: Record<string, unknown>
  row_count: number
  column_count: number
}

export interface DatasetAnalysis {
  id: number
  dataset_id: number
  question: string
  status: string
  plan: Record<string, unknown> | null
  result: Record<string, unknown> | null
  insight: string | null
  visualization: Record<string, unknown> | null
  error: string | null
  attempt_count: number
  created_at: string
  updated_at: string
}

export async function getDatasets(): Promise<Dataset[]> {
  return apiRequest<Dataset[]>('/datasets/')
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  return apiRequest<Dataset>(`/datasets/${datasetId}`)
}

export async function uploadDataset(file: File): Promise<Dataset> {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<Dataset>('/datasets/upload', {
    method: 'POST',
    body: formData,
  })
}

export async function previewDataset(
  datasetId: number,
): Promise<DatasetPreview> {
  return apiRequest<DatasetPreview>(
    `/datasets/${datasetId}/preview`,
  )
}

export async function profileDataset(
  datasetId: number,
): Promise<DatasetProfile> {
  return apiRequest<DatasetProfile>(
    `/datasets/${datasetId}/profile`,
  )
}

export async function deleteDataset(datasetId: number): Promise<void> {
  await apiRequest<void>(`/datasets/${datasetId}`, {
    method: 'DELETE',
  })
}

export async function getDatasetAnalyses(
  datasetId: number,
): Promise<DatasetAnalysis[]> {
  return apiRequest<DatasetAnalysis[]>(
    `/datasets/${datasetId}/analyses`,
  )
}