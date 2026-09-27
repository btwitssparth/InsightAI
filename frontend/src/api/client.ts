import { supabase } from '../lib/supabase'

const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error('VITE_API_URL is not configured')
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ApiError(
      'You must be signed in to perform this action.',
      'AUTHENTICATION_REQUIRED',
      401,
    )
  }

  return session.access_token
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await getAccessToken()

  const headers = new Headers(options.headers)

  headers.set('Authorization', `Bearer ${accessToken}`)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = 'Something went wrong.'
    let code = 'API_ERROR'

    try {
      const body = await response.json()

      if (body?.error) {
        message = body.error.message ?? message
        code = body.error.code ?? code
      }
    } catch {
      // Keep the default error when the response isn't valid JSON.
    }

    throw new ApiError(message, code, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}