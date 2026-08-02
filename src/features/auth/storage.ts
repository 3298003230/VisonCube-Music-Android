import { getData, removeData, saveData } from '@/plugins/storage'
import { AUTH_STORAGE_KEY } from './config'
import { type AuthSession } from './models'

export const loadSession = async() => {
  try {
    return await getData<AuthSession>(AUTH_STORAGE_KEY)
  } catch {
    await removeData(AUTH_STORAGE_KEY)
    return null
  }
}

export const saveSession = async(session: AuthSession) => {
  await saveData(AUTH_STORAGE_KEY, session)
}

export const clearSession = async() => {
  await removeData(AUTH_STORAGE_KEY)
}
