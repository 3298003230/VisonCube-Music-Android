import { AUTH_REQUEST_TIMEOUT_MS, AUTH_SERVER_URL } from './config'
import { type AuthSession, type AuthUser, type PasswordCredentials, type RegisterCredentials } from './models'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
  headers?: Record<string, string>
}

export interface MusicHistoryRecord {
  source_key: string
  vod_id: string
  update_time: number
  data_json: string
  deleted: boolean
}

export interface MusicCollectRecord {
  source_key: string
  vod_id: string
  update_time: number
  name: string
  pic: string | null
  data_json: string | null
  deleted: boolean
}

export class AuthApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const buildUrl = (path: string) => `${AUTH_SERVER_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`

const getErrorMessage = (body: unknown) => {
  if (!body || typeof body !== 'object') return ''
  const detail = (body as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0]
    if (first && typeof first === 'object' && typeof (first as { msg?: unknown }).msg === 'string') {
      return (first as { msg: string }).msg
    }
  }
  const message = (body as { message?: unknown }).message
  return typeof message === 'string' ? message : ''
}

const parseBody = async(response: Response) => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AuthApiError(response.status, '服务器返回了无效数据')
  }
}

const request = async<T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => { controller.abort() }, AUTH_REQUEST_TIMEOUT_MS)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  try {
    const response = await fetch(buildUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    })
    const body = await parseBody(response)

    if (!response.ok) {
      throw new AuthApiError(response.status, getErrorMessage(body) || `请求失败（${response.status}）`)
    }
    return body as T
  } catch (error) {
    if (error instanceof AuthApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AuthApiError(0, '请求超时，请检查网络后重试')
    }
    throw new AuthApiError(0, '网络连接失败，请检查网络后重试')
  } finally {
    clearTimeout(timeoutId)
  }
}

export const login = async(credentials: PasswordCredentials) =>
  await request<AuthSession>('/api/auth/login', { method: 'POST', body: credentials })

export const register = async(credentials: RegisterCredentials) =>
  await request<AuthSession>('/api/auth/register', { method: 'POST', body: credentials })

export const requestEmailLoginCode = async(email: string) =>
  await request<{ message: string }>('/api/auth/email-login/request', {
    method: 'POST',
    body: { email },
  })

export const confirmEmailLogin = async(email: string, code: string) =>
  await request<AuthSession>('/api/auth/email-login/confirm', {
    method: 'POST',
    body: { email, code },
  })

export const requestPasswordResetCode = async(email: string) =>
  await request<{ message: string }>('/api/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  })

export const confirmPasswordReset = async(email: string, code: string, newPassword: string) =>
  await request<AuthSession>('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: { email, code, new_password: newPassword },
  })

export const requestEmailBindingCode = async(token: string, email: string) =>
  await request<{ message: string }>('/api/auth/email/bind/request', {
    method: 'POST',
    token,
    body: { email },
  })

export const updateEmail = async(token: string, email: string, code: string) =>
  await request<AuthUser>('/api/auth/email', {
    method: 'PUT',
    token,
    body: { email, code },
  })

export const logout = async(token: string) =>
  await request<null>('/api/auth/logout', { method: 'POST', token })

export const me = async(token: string) =>
  await request<AuthUser>('/api/auth/me', { token })

export const getMusicHistory = async(token: string) =>
  await request<MusicHistoryRecord[]>('/api/history', {
    token,
    headers: { 'X-VisonCube-Sync-Deleted': '1' },
  })

export const putMusicHistory = async(token: string, record: Omit<MusicHistoryRecord, 'deleted'>) =>
  await request<{ message: string }>('/api/history', {
    method: 'PUT',
    token,
    body: { ...record, deleted: false },
  })

export const deleteMusicHistory = async(token: string, sourceKey: string, musicId: string, deleteTime: number) =>
  await request<{ message: string }>('/api/history/delete', {
    method: 'POST',
    token,
    body: { source_key: sourceKey, vod_id: musicId, delete_time: deleteTime },
  })

export const getMusicCollect = async(token: string) =>
  await request<MusicCollectRecord[]>('/api/collect', {
    token,
    headers: { 'X-VisonCube-Sync-Deleted': '1' },
  })

export const putMusicCollect = async(token: string, record: Omit<MusicCollectRecord, 'deleted'>) =>
  await request<{ message: string }>('/api/collect', {
    method: 'PUT',
    token,
    body: { ...record, deleted: false },
  })

export const deleteMusicCollect = async(token: string, sourceKey: string, musicId: string) =>
  await request<{ message: string }>(`/api/collect/${encodeURIComponent(sourceKey)}/${encodeURIComponent(musicId)}`, {
    method: 'DELETE',
    token,
  })

export const changePassword = async(token: string, oldPassword: string, newPassword: string) =>
  await request<AuthSession>('/api/auth/change-password', {
    method: 'POST',
    token,
    body: {
      old_password: oldPassword,
      new_password: newPassword,
    },
  })
