import { getCurrentSession } from '@/features/auth/authState'
import { getUserApiList, removeManagedUserApi, upsertManagedUserApi } from '@/utils/data'
import { existsFile, hash, mkdir, moveFile, privateStorageDirectoryPath, readFile, unlink, writeFile } from '@/utils/fs'
import { MANAGED_USER_API_ID, MUSIC_SOURCE_MANIFEST_URL, MUSIC_SOURCE_REQUEST_TIMEOUT_MS } from './config'
import type { ManagedSourceStatus, MusicSourceManifest } from './models'
import { setUserApiList } from '@/core/userApi'

const sourceDir = `${privateStorageDirectoryPath}/visoncube-music-source`
const manifestPath = `${sourceDir}/manifest.json`
const sourcePath = `${sourceDir}/source.js`
const sourceTempPath = `${sourceDir}/source.tmp`

let status: ManagedSourceStatus = { phase: 'idle' }
const listeners = new Set<(status: ManagedSourceStatus) => void>()

const setStatus = (next: ManagedSourceStatus) => {
  status = next
  listeners.forEach(listener => { listener(status) })
}

export const getManagedSourceStatus = () => status
export const subscribeManagedSourceStatus = (listener: (status: ManagedSourceStatus) => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const requireSession = () => {
  const session = getCurrentSession()
  if (!session) throw new Error('请先登录账号')
  return session
}

const ensureSourceDir = async() => {
  if (!await existsFile(sourceDir)) await mkdir(sourceDir)
}

const replaceFile = async(fromPath: string, toPath: string) => {
  if (await existsFile(toPath)) await unlink(toPath)
  await moveFile(fromPath, toPath)
}

const request = async<T>(url: string, token: string, accept: string) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => { controller.abort() }, MUSIC_SOURCE_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      let message = `音源请求失败（${response.status}）`
      try {
        const body = await response.json() as { detail?: string }
        if (body.detail) message = body.detail
      } catch {
        // Keep the HTTP status when the server does not return JSON.
      }
      throw new Error(message)
    }
    return await response.text() as unknown as T
  } catch (error) {
    if (error instanceof Error && error.name == 'AbortError') throw new Error('音源请求超时')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

const requestManifest = async(token: string): Promise<MusicSourceManifest> => {
  const raw = await request<string>(MUSIC_SOURCE_MANIFEST_URL, token, 'application/json')
  const manifest = JSON.parse(raw) as Partial<MusicSourceManifest>
  if (manifest.schema_version !== 1 || !manifest.source_id || !manifest.content_url || !manifest.sha256 || !manifest.max_size) {
    throw new Error('服务器返回的音源清单无效')
  }
  return manifest as MusicSourceManifest
}

const isScript = (script: string) => /^\/\*[\S|\s]+?\*\//.test(script)

const saveCache = async(userId: number, manifest: MusicSourceManifest, script: string) => {
  if (!isScript(script)) throw new Error('服务器返回的音源文件格式无效')
  if (script.length > manifest.max_size) throw new Error('音源文件超过大小限制')

  await ensureSourceDir()
  await writeFile(sourceTempPath, script, 'utf8')
  const actualHash = (await hash(sourceTempPath, 'sha256')).toUpperCase()
  if (actualHash != manifest.sha256.toUpperCase()) {
    await unlink(sourceTempPath).catch(() => {})
    throw new Error('音源文件校验失败')
  }

  await replaceFile(sourceTempPath, sourcePath)
  await writeFile(manifestPath, JSON.stringify({ ...manifest, user_id: userId }), 'utf8')
}

const loadCache = async(userId: number) => {
  if (!await existsFile(manifestPath) || !await existsFile(sourcePath)) return null
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as MusicSourceManifest & { user_id?: number }
    if (manifest.user_id !== userId || !manifest.sha256 || !manifest.source_id) return null
    const script = await readFile(sourcePath, 'utf8')
    const actualHash = (await hash(sourcePath, 'sha256')).toUpperCase()
    if (actualHash != manifest.sha256.toUpperCase() || !isScript(script)) return null
    return { manifest, script }
  } catch {
    return null
  }
}

export const hydrateManagedSource = async() => {
  const session = getCurrentSession()
  if (!session) return false
  const cached = await loadCache(session.user.id)
  if (!cached) {
    await removeManagedUserApi()
    return false
  }
  await upsertManagedUserApi(cached.script, cached.manifest)
  return true
}

export const updateManagedSource = async() => {
  const session = requireSession()
  setStatus({ phase: 'updating' })
  try {
    const manifest = await requestManifest(session.token)
    const script = await request<string>(manifest.content_url, session.token, 'application/javascript')
    await saveCache(session.user.id, manifest, script)
    await upsertManagedUserApi(script, manifest)
    setUserApiList(await getUserApiList())
    setStatus({ phase: 'ready', manifest })
    return manifest
  } catch (error) {
    const message = error instanceof Error ? error.message : '音源更新失败'
    setStatus({ phase: 'error', message })
    throw error
  }
}

export { MANAGED_USER_API_ID }
