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

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { data, error } = await supabase.auth.refreshSession()

      if (error || !data.session?.access_token) {
        throw new ApiError(
          'Your session has expired. Please sign in again.',
          'AUTHENTICATION_REQUIRED',
          401,
        )
      }

      return data.session.access_token
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    return refreshAccessToken()
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new ApiError(
      'You must be signed in to perform this action.',
      'AUTHENTICATION_REQUIRED',
      401,
    )
  }

  // Avoid sending a token that is already expired or about to expire.
  const expiresAt = session.expires_at
  if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 30) {
    return refreshAccessToken()
  }

  return session.access_token
}

function isAuthenticationError(error: unknown) {
  if (!(error instanceof ApiError)) return false

  return (
    error.status === 401 ||
    error.code === 'AUTHENTICATION_REQUIRED' ||
    error.code === 'TOKEN_EXPIRED' ||
    error.code === 'INVALID_TOKEN'
  )
}

async function requestWithToken(
  path: string,
  options: RequestInit,
  accessToken: string,
): Promise<{ response: Response; body: unknown }> {
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

  let body: unknown = null

  if (response.status !== 204) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  }

  return { response, body }
}

function parseApiError(response: Response, body: unknown) {
  let message = 'Something went wrong.'
  let code = 'API_ERROR'

  if (body && typeof body === 'object' && 'error' in body) {
    const errorBody = body.error

    if (errorBody && typeof errorBody === 'object') {
      if ('message' in errorBody && typeof errorBody.message === 'string') {
        message = errorBody.message
      }

      if ('code' in errorBody && typeof errorBody.code === 'string') {
        code = errorBody.code
      }
    }
  }

  if (response.status === 401) {
    code = 'AUTHENTICATION_REQUIRED'
    if (message === 'Something went wrong.') {
      message = 'Your session has expired. Please sign in again.'
    }
  }

  return new ApiError(message, code, response.status)
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let accessToken = await getAccessToken()
  let result = await requestWithToken(path, options, accessToken)

  if (!result.response.ok) {
    const apiError = parseApiError(result.response, result.body)

    if (isAuthenticationError(apiError)) {
      accessToken = await getAccessToken(true)
      result = await requestWithToken(path, options, accessToken)
    }
  }

  if (!result.response.ok) {
    throw parseApiError(result.response, result.body)
  }

  if (result.response.status === 204) {
    return undefined as T
  }

  return result.body as T
}
