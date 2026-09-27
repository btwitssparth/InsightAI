import { apiRequest } from './client'

export interface Analysis {
  analysis_id: number
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

export interface AskAnalysisRequest {
  dataset_id: number
  question: string
}

export async function getAnalyses(): Promise<Analysis[]> {
  return apiRequest<Analysis[]>('/analyses/')
}

export async function getAnalysis(analysisId: number): Promise<Analysis> {
  return apiRequest<Analysis>(`/analyses/${analysisId}`)
}

export async function askAnalysis(
  request: AskAnalysisRequest,
): Promise<Analysis> {
  return apiRequest<Analysis>('/analyses/ask', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
