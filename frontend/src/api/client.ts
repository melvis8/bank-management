import type { ApiResponse, PaginatedResponse, Pagination } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TOKEN_STORAGE_KEY = 'bms.token'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** Set by AuthProvider so the API layer can react to a 401 without importing React state. */
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | undefined>
}

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return `${url.pathname}${url.search}`
}

async function rawRequest(path: string, options: RequestOptions): Promise<Record<string, unknown>> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('Impossible de contacter le serveur. Vérifiez votre connexion.', 0, 'NETWORK_ERROR')
  }

  let payload: Record<string, unknown> | null = null
  try {
    payload = (await response.json()) as Record<string, unknown>
  } catch {
    // No JSON body (e.g. 204) — fall through with payload = null.
  }

  if (response.status === 401) {
    unauthorizedHandler?.()
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      (payload?.message as string | undefined) ?? `Erreur ${response.status}`,
      response.status,
      payload?.error as string | undefined
    )
  }

  return payload
}

/** Unwraps the standard `{ success, data }` envelope. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = (await rawRequest(path, options)) as unknown as ApiResponse<T>
  return payload.data
}

/** Unwraps `{ success, data, pagination }` list responses. */
export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T[]; pagination: Pagination }> {
  const payload = (await rawRequest(path, options)) as unknown as PaginatedResponse<T>
  return { data: payload.data, pagination: payload.pagination }
}

/** Returns the full response body — for endpoints like login that don't nest under `data`. */
export async function requestFull<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await rawRequest(path, options)) as unknown as T
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    request<T>(path, { method: 'GET', params }),
  getPaginated: <T>(path: string, params?: RequestOptions['params']) =>
    requestPaginated<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  postFull: <T>(path: string, body?: unknown) => requestFull<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  // DELETE endpoints on this API return `{ success, message }` with no `data` key.
  delete: (path: string) => requestFull<{ success: boolean; message?: string }>(path, { method: 'DELETE' }),
}
