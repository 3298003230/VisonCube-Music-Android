import * as authApi from './api'
import { type AuthGateState, type AuthSession, type AuthUser, type PasswordCredentials, type RegisterCredentials } from './models'
import { clearSession, loadSession, saveSession } from './storage'
import { stopMusicCloudSync, updateMusicCloudSyncSession } from '@/features/musicSync'

let currentSession: AuthSession | null = null

const hasVerifiedEmail = (user: AuthUser) => Boolean(user.email?.trim() && user.email_verified_at?.trim())

const getGateState = (session: AuthSession | null): AuthGateState => {
  if (!session) return 'signed_out'
  return hasVerifiedEmail(session.user) ? 'authenticated' : 'email_binding'
}

const isSessionUsable = (session: AuthSession) => {
  if (!session.token || !session.user?.username) return false
  if (!session.expires_at_ms || session.expires_at_ms <= 0) return true
  return Date.now() + 60000 < session.expires_at_ms
}

const persistSession = async(session: AuthSession) => {
  currentSession = session
  await saveSession(session)
  updateMusicCloudSyncSession(session)
  return getGateState(session)
}

export const restoreSession = async() => {
  const session = await loadSession()
  if (!session || !isSessionUsable(session)) {
    currentSession = null
    if (session) await clearSession()
    return 'signed_out' as const
  }
  currentSession = session
  return getGateState(session)
}

export const login = async(credentials: PasswordCredentials) => persistSession(await authApi.login(credentials))

export const register = async(credentials: RegisterCredentials) => persistSession(await authApi.register(credentials))

export const requestEmailLoginCode = async(email: string) =>
  await authApi.requestEmailLoginCode(email)

export const emailLogin = async(email: string, code: string) =>
  persistSession(await authApi.confirmEmailLogin(email, code))

export const requestPasswordResetCode = async(email: string) =>
  await authApi.requestPasswordResetCode(email)

export const resetPassword = async(email: string, code: string, newPassword: string) =>
  persistSession(await authApi.confirmPasswordReset(email, code, newPassword))

const requireSession = () => {
  if (!currentSession || !isSessionUsable(currentSession)) throw new authApi.AuthApiError(401, '登录状态已失效，请重新登录')
  return currentSession
}

export const requestEmailBindingCode = async(email: string) => {
  const session = requireSession()
  return await authApi.requestEmailBindingCode(session.token, email)
}

export const refreshUser = async() => {
  const session = requireSession()
  const user = await authApi.me(session.token)
  currentSession = { ...session, user }
  await saveSession(currentSession)
  return user
}

export const changePassword = async(oldPassword: string, newPassword: string) => {
  const session = requireSession()
  return persistSession(await authApi.changePassword(session.token, oldPassword, newPassword))
}

export const confirmEmailBinding = async(email: string, code: string) => {
  const session = requireSession()
  const user = await authApi.updateEmail(session.token, email, code)
  currentSession = { ...session, user }
  await saveSession(currentSession)
  return getGateState(currentSession)
}

export const getCurrentUser = () => currentSession?.user ?? null
export const getCurrentSession = () => currentSession

export const signOut = async() => {
  const session = currentSession
  currentSession = null
  stopMusicCloudSync()
  await clearSession()
  if (!session || !isSessionUsable(session)) return
  try {
    await authApi.logout(session.token)
  } catch {
    // 本地会话已经清除，服务端撤销失败不应阻止用户更换账号。
  }
}
