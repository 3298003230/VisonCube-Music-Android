import * as authApi from '@/features/auth/api'
import { type AuthSession } from '@/features/auth/models'
import { getListMusics } from '@/core/list'
import { LIST_IDS } from '@/config/constant'
import { getData, saveData } from '@/plugins/storage'
import listState from '@/store/list/state'
import {
  decidePlaylistChange,
  isSamePlaylistSnapshot,
  mergeOnlineSongsPreservingLocal,
  normalizeSourceListId,
  playlistKey,
  snapshotFingerprint,
  type PlaylistSnapshot,
} from './model'

const STORAGE_PREFIX = '@visoncube/music-cloud-sync/'
const MUSIC_SOURCE_PREFIX = 'music:'
const MAX_HISTORY_ITEMS = 200

interface LocalEntry {
  music: LX.Music.MusicInfo
  updatedAt: number
  deleted: boolean
  dirty: boolean
}

interface PlaylistPendingOperation {
  baseRevision: number
  fingerprint: string
  operationId: string
}

interface PlaylistSyncEntry {
  revision: number
  synced: PlaylistSnapshot<LX.Music.MusicInfo>
  pending?: PlaylistPendingOperation
  conflict?: {
    remote: authApi.MusicPlaylistRecord
  }
}

interface LocalState {
  history: Record<string, LocalEntry>
  favorites: Record<string, LocalEntry>
  playlists: Record<string, PlaylistSyncEntry>
}

interface SyncRun {
  generation: number
  session: AuthSession
  state: LocalState
}

interface LocalPlaylist {
  info: LX.List.UserListInfo
  snapshot: PlaylistSnapshot<LX.Music.MusicInfo>
}

interface RemotePlaylist {
  record: authApi.MusicPlaylistRecord
  snapshot: PlaylistSnapshot<LX.Music.MusicInfo>
}

export type MusicCloudSyncPhase = 'idle' | 'syncing' | 'success' | 'partial' | 'error' | 'conflict'

export interface MusicCloudSyncStatus {
  phase: MusicCloudSyncPhase
  lastSuccessAt: number | null
  error: string | null
  conflictCount: number
}

let session: AuthSession | null = null
let state: LocalState | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncPromise: Promise<void> | null = null
let syncPending = false
let syncGeneration = 0
let syncStatus: MusicCloudSyncStatus = {
  phase: 'idle',
  lastSuccessAt: null,
  error: null,
  conflictCount: 0,
}

const statusListeners = new Set<(status: MusicCloudSyncStatus) => void>()

const storageKey = (userId: number) => `${STORAGE_PREFIX}${userId}`

const isSyncableMusic = (value: unknown): value is LX.Music.MusicInfo => {
  if (!value || typeof value !== 'object') return false
  const music = value as Partial<LX.Music.MusicInfo>
  return typeof music.id === 'string' && typeof music.source === 'string' && music.source !== 'local'
}

const isLocalMusic = (value: LX.Music.MusicInfo) => value.source === 'local'

const musicKey = (music: LX.Music.MusicInfo) => `${music.source}:${music.id}`

const sourceKey = (music: LX.Music.MusicInfo) => `${MUSIC_SOURCE_PREFIX}${music.source}`

const parseMusic = (data: string | null | undefined) => {
  if (!data) return null
  try {
    const music = JSON.parse(data) as unknown
    return isSyncableMusic(music) ? music : null
  } catch {
    return null
  }
}

const musicData = (music: LX.Music.MusicInfo) => JSON.stringify(music)

const createEntry = (music: LX.Music.MusicInfo, updatedAt: number, dirty: boolean, deleted = false): LocalEntry => ({
  music,
  updatedAt,
  dirty,
  deleted,
})

const createOperationId = () => `${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : '同步失败'

const setSyncStatus = (status: MusicCloudSyncStatus) => {
  syncStatus = status
  for (const listener of statusListeners) listener(syncStatus)
}

const countConflicts = (targetState: LocalState) =>
  Object.values(targetState.playlists).filter(entry => entry.conflict).length

const loadState = async(userId: number): Promise<LocalState> => {
  const stored = await getData<Partial<LocalState>>(storageKey(userId))
  return {
    history: stored?.history ?? {},
    favorites: stored?.favorites ?? {},
    playlists: stored?.playlists ?? {},
  }
}

const isRunActive = (run: SyncRun) =>
  syncGeneration === run.generation &&
  state === run.state &&
  session?.user.id === run.session.user.id &&
  session.token === run.session.token

const persistState = async(run: SyncRun) => {
  if (isRunActive(run)) await saveData(storageKey(run.session.user.id), run.state)
}

const getCurrentFavorites = async() => {
  const musicList = await getListMusics(LIST_IDS.LOVE)
  return musicList.filter(isSyncableMusic)
}

const mergeRemoteEntries = (
  target: Record<string, LocalEntry>,
  records: Array<authApi.MusicHistoryRecord | authApi.MusicCollectRecord>,
) => {
  const remoteKeys = new Set<string>()
  for (const record of records) {
    if (!record.source_key.startsWith(MUSIC_SOURCE_PREFIX)) continue
    const music = parseMusic(record.data_json)
    const key = `${record.source_key.slice(MUSIC_SOURCE_PREFIX.length)}:${record.vod_id}`
    remoteKeys.add(key)
    const local = target[key]
    if (record.deleted) {
      if (local && record.update_time >= local.updatedAt) {
        target[key] = createEntry(local.music, record.update_time, false, true)
      }
      continue
    }
    if (!music) continue
    if (!local || record.update_time >= local.updatedAt || !local.dirty) {
      target[key] = createEntry(music, record.update_time, false)
    }
  }

  const now = Date.now()
  for (const [key, local] of Object.entries(target)) {
    if (local.dirty || local.deleted || remoteKeys.has(key)) continue
    local.updatedAt = now
    local.dirty = true
  }
}

const updateFavoritesFromLocal = (target: Record<string, LocalEntry>, favorites: LX.Music.MusicInfo[]) => {
  const currentKeys = new Set(favorites.map(musicKey))
  const now = Date.now()
  for (const music of favorites) {
    const key = musicKey(music)
    const local = target[key]
    if (!local) {
      target[key] = createEntry(music, 0, false)
    } else if (local.deleted) {
      target[key] = createEntry(music, now, true)
    } else {
      local.music = music
    }
  }
  for (const local of Object.values(target)) {
    if (local.deleted || currentKeys.has(musicKey(local.music))) continue
    local.deleted = true
    local.updatedAt = now
    local.dirty = true
  }
}

const applyRemoteFavorites = async(run: SyncRun) => {
  const current = await getListMusics(LIST_IDS.LOVE)
  if (!isRunActive(run)) return
  const activeOnline = Object.values(run.state.favorites)
    .filter(entry => !entry.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(entry => entry.music)
  const merged = mergeOnlineSongsPreservingLocal(current, activeOnline)
  if (JSON.stringify(current) === JSON.stringify(merged)) return
  await global.list_event.list_music_overwrite(LIST_IDS.LOVE, merged, true)
}

const sendEntry = async(run: SyncRun, kind: 'history' | 'favorite', entry: LocalEntry) => {
  if (!entry.dirty || !isRunActive(run)) return
  const token = run.session.token
  const source = sourceKey(entry.music)
  const id = entry.music.id
  if (entry.deleted) {
    if (kind === 'history') await authApi.deleteMusicHistory(token, source, id, entry.updatedAt)
    else await authApi.deleteMusicCollect(token, source, id)
  } else if (kind === 'history') {
    await authApi.putMusicHistory(token, {
      source_key: source,
      vod_id: id,
      update_time: entry.updatedAt,
      data_json: musicData(entry.music),
    })
  } else {
    const pic = typeof entry.music.meta?.picUrl === 'string' ? entry.music.meta.picUrl : null
    await authApi.putMusicCollect(token, {
      source_key: source,
      vod_id: id,
      update_time: entry.updatedAt,
      name: entry.music.name,
      pic,
      data_json: musicData(entry.music),
    })
  }
  if (isRunActive(run)) entry.dirty = false
}

const sendDirtyEntries = async(run: SyncRun) => {
  for (const entry of Object.values(run.state.history)) await sendEntry(run, 'history', entry)
  for (const entry of Object.values(run.state.favorites)) await sendEntry(run, 'favorite', entry)
}

const trimHistory = (target: Record<string, LocalEntry>) => {
  const activeEntries = Object.entries(target)
    .filter(([, entry]) => !entry.deleted)
    .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
  const now = Date.now()
  for (const [index, [, entry]] of activeEntries.entries()) {
    if (index < MAX_HISTORY_ITEMS) continue
    entry.deleted = true
    entry.updatedAt = now
    entry.dirty = true
  }
}

const toRemotePlaylist = (record: authApi.MusicPlaylistRecord): RemotePlaylist | null => {
  if (
    typeof record.source !== 'string' || !record.source || record.source === 'local' ||
    typeof record.source_list_id !== 'string' || !record.source_list_id ||
    typeof record.name !== 'string' || !record.name ||
    !Number.isInteger(record.revision) || record.revision < 1 ||
    !Array.isArray(record.songs) || record.songs.some(song => !isSyncableMusic(song))
  ) return null
  return {
    record,
    snapshot: {
      source: record.source,
      sourceListId: normalizeSourceListId(record.source, record.source_list_id),
      name: record.name,
      songs: record.deleted ? [] : record.songs,
      deleted: record.deleted,
    },
  }
}

const toDeletedSnapshot = (snapshot: PlaylistSnapshot<LX.Music.MusicInfo>): PlaylistSnapshot<LX.Music.MusicInfo> => ({
  ...snapshot,
  songs: [],
  deleted: true,
})

const getCurrentPlaylists = async(run: SyncRun) => {
  const playlists = new Map<string, LocalPlaylist>()
  const migrations: LX.List.UserListInfo[] = []
  for (const info of [...listState.userList]) {
    if (!info.source || !info.sourceListId) continue
    const normalizedId = normalizeSourceListId(info.source, info.sourceListId)
    if (!normalizedId) continue
    const key = playlistKey(info.source, normalizedId)
    if (playlists.has(key)) throw new Error(`检测到重复的来源歌单：${info.name}`)
    const normalizedInfo = normalizedId === info.sourceListId ? info : { ...info, sourceListId: normalizedId }
    const songs = (await getListMusics(info.id)).filter(isSyncableMusic)
    if (!isRunActive(run)) return new Map<string, LocalPlaylist>()
    playlists.set(key, {
      info: normalizedInfo,
      snapshot: {
        source: info.source,
        sourceListId: normalizedId,
        name: info.name,
        songs,
        deleted: false,
      },
    })
    if (normalizedInfo !== info) migrations.push(normalizedInfo)
  }
  if (migrations.length && isRunActive(run)) {
    await global.list_event.list_update(migrations, true)
  }
  return playlists
}

const findPlaylistInfo = (source: string, sourceListId: string) =>
  listState.userList.find(info =>
    info.source === source &&
    Boolean(info.sourceListId) &&
    normalizeSourceListId(source, info.sourceListId!) === sourceListId,
  )

const applyRemotePlaylist = async(run: SyncRun, snapshot: PlaylistSnapshot<LX.Music.MusicInfo>) => {
  if (!isRunActive(run)) return
  const target = findPlaylistInfo(snapshot.source, snapshot.sourceListId)
  if (snapshot.deleted) {
    if (!target) return
    const current = await getListMusics(target.id)
    if (!isRunActive(run)) return
    const localSongs = current.filter(isLocalMusic)
    if (localSongs.length) {
      await global.list_event.list_update([{
        ...target,
        source: undefined,
        sourceListId: undefined,
      }], true)
      if (!isRunActive(run)) return
      await global.list_event.list_music_overwrite(target.id, localSongs, true)
    } else {
      await global.list_event.list_remove([target.id], true)
    }
    return
  }

  if (!target) {
    const id = `userlist_cloud_${Date.now()}_${Math.random().toString(36).slice(2)}`
    await global.list_event.list_create(listState.userList.length, [{
      id,
      name: snapshot.name,
      source: snapshot.source as LX.OnlineSource,
      sourceListId: snapshot.sourceListId,
      locationUpdateTime: null,
    }], true)
    if (!isRunActive(run)) return
    await global.list_event.list_music_overwrite(id, snapshot.songs, true)
    return
  }

  if (target.name !== snapshot.name || target.sourceListId !== snapshot.sourceListId) {
    await global.list_event.list_update([{
      ...target,
      name: snapshot.name,
      source: snapshot.source as LX.OnlineSource,
      sourceListId: snapshot.sourceListId,
    }], true)
  }
  if (!isRunActive(run)) return
  const current = await getListMusics(target.id)
  if (!isRunActive(run)) return
  const merged = mergeOnlineSongsPreservingLocal(current, snapshot.songs)
  if (JSON.stringify(current) !== JSON.stringify(merged)) {
    await global.list_event.list_music_overwrite(target.id, merged, true)
  }
}

const saveRemotePlaylist = async(run: SyncRun, key: string, remote: RemotePlaylist, applyRemote: boolean) => {
  if (applyRemote) await applyRemotePlaylist(run, remote.snapshot)
  if (!isRunActive(run)) return
  run.state.playlists[key] = {
    revision: remote.record.revision,
    synced: remote.snapshot,
  }
}

const uploadPlaylist = async(
  run: SyncRun,
  key: string,
  desired: PlaylistSnapshot<LX.Music.MusicInfo>,
  currentEntry?: PlaylistSyncEntry,
) => {
  const entry = currentEntry ?? {
    revision: 0,
    synced: toDeletedSnapshot(desired),
  }
  run.state.playlists[key] = entry
  const fingerprint = snapshotFingerprint(desired)
  if (
    !entry.pending ||
    entry.pending.baseRevision !== entry.revision ||
    entry.pending.fingerprint !== fingerprint
  ) {
    entry.pending = {
      baseRevision: entry.revision,
      fingerprint,
      operationId: createOperationId(),
    }
  }
  entry.conflict = undefined
  await persistState(run)
  if (!isRunActive(run)) return

  try {
    const remoteRecord = await authApi.putMusicPlaylist(run.session.token, {
      source: desired.source,
      source_list_id: desired.sourceListId,
      name: desired.name,
      songs: desired.deleted ? [] : desired.songs,
      deleted: desired.deleted,
      base_revision: entry.pending.baseRevision,
      operation_id: entry.pending.operationId,
    })
    if (!isRunActive(run)) return
    const remote = toRemotePlaylist(remoteRecord)
    if (!remote) throw new Error('服务器返回了无效歌单数据')
    run.state.playlists[key] = {
      revision: remote.record.revision,
      synced: remote.snapshot,
    }
  } catch (error) {
    if (!(error instanceof authApi.AuthApiError) || error.status !== 409 || !isRunActive(run)) throw error
    const latestRecords = await authApi.getMusicPlaylists(run.session.token)
    if (!isRunActive(run)) return
    const latest = latestRecords
      .map(toRemotePlaylist)
      .find(item => item && playlistKey(item.snapshot.source, item.snapshot.sourceListId) === key)
    if (!latest) throw error
    entry.pending = undefined
    entry.conflict = { remote: latest.record }
  }
}

const syncPlaylists = async(run: SyncRun, records: authApi.MusicPlaylistRecord[]) => {
  const localPlaylists = await getCurrentPlaylists(run)
  if (!isRunActive(run)) return
  const remotePlaylists = new Map<string, RemotePlaylist>()
  for (const record of records) {
    const remote = toRemotePlaylist(record)
    if (!remote) throw new Error('服务器返回了无效歌单数据')
    const key = playlistKey(remote.snapshot.source, remote.snapshot.sourceListId)
    if (remotePlaylists.has(key)) throw new Error('服务器返回了重复歌单')
    remotePlaylists.set(key, remote)
  }

  const keys = new Set([
    ...Object.keys(run.state.playlists),
    ...localPlaylists.keys(),
    ...remotePlaylists.keys(),
  ])
  for (const key of keys) {
    if (!isRunActive(run)) return
    const local = localPlaylists.get(key)
    const remote = remotePlaylists.get(key)
    const entry = run.state.playlists[key]

    if (!entry) {
      if (local && remote) {
        if (isSamePlaylistSnapshot(local.snapshot, remote.snapshot)) {
          await saveRemotePlaylist(run, key, remote, false)
        } else {
          run.state.playlists[key] = {
            revision: 0,
            synced: toDeletedSnapshot(local.snapshot),
            conflict: { remote: remote.record },
          }
        }
      } else if (local) {
        await uploadPlaylist(run, key, local.snapshot)
      } else if (remote) {
        await saveRemotePlaylist(run, key, remote, true)
      }
      continue
    }

    const desired = local?.snapshot ?? toDeletedSnapshot(entry.synced)
    if (!remote) {
      if (entry.revision > 0) throw new Error('服务器缺少已同步的歌单记录')
      if (!desired.deleted) await uploadPlaylist(run, key, desired, entry)
      continue
    }

    switch (decidePlaylistChange(entry.synced, desired, remote.snapshot, entry.revision, remote.record.revision)) {
      case 'acceptRemote':
        await saveRemotePlaylist(run, key, remote, false)
        break
      case 'conflict':
        entry.pending = undefined
        entry.conflict = { remote: remote.record }
        break
      case 'applyRemote':
        await saveRemotePlaylist(run, key, remote, true)
        break
      case 'upload':
        await uploadPlaylist(run, key, desired, entry)
        break
      default:
        entry.conflict = undefined
    }
  }
}

const performSync = async(run: SyncRun) => {
  updateFavoritesFromLocal(run.state.favorites, await getCurrentFavorites())
  if (!isRunActive(run)) return
  const playlistRequest = authApi.getMusicPlaylists(run.session.token)
    .then(records => ({ records, error: null as unknown }))
    .catch(error => ({ records: null, error: error as unknown }))
  const [history, favorites, playlists] = await Promise.all([
    authApi.getMusicHistory(run.session.token),
    authApi.getMusicCollect(run.session.token),
    playlistRequest,
  ])
  if (!isRunActive(run)) return
  mergeRemoteEntries(run.state.history, history)
  mergeRemoteEntries(run.state.favorites, favorites)
  await applyRemoteFavorites(run)
  if (!isRunActive(run)) return
  if (playlists.records) await syncPlaylists(run, playlists.records)
  if (!isRunActive(run)) return
  await sendDirtyEntries(run)
  await persistState(run)
  if (!isRunActive(run)) return

  const conflictCount = countConflicts(run.state)
  const now = Date.now()
  if (conflictCount) {
    setSyncStatus({ phase: 'conflict', lastSuccessAt: now, error: null, conflictCount })
  } else if (playlists.error) {
    setSyncStatus({
      phase: 'partial',
      lastSuccessAt: now,
      error: getErrorMessage(playlists.error),
      conflictCount: 0,
    })
  } else {
    setSyncStatus({ phase: 'success', lastSuccessAt: now, error: null, conflictCount: 0 })
  }
}

const syncNow = async(): Promise<void> => {
  if (!session || !state) return
  if (syncPromise) {
    syncPending = true
    return syncPromise
  }
  const run: SyncRun = { generation: syncGeneration, session, state }
  syncPending = false
  setSyncStatus({
    phase: 'syncing',
    lastSuccessAt: syncStatus.lastSuccessAt,
    error: null,
    conflictCount: countConflicts(run.state),
  })
  syncPromise = performSync(run).catch(error => {
    if (!isRunActive(run)) return
    console.warn('[MusicCloudSync] sync failed', error)
    setSyncStatus({
      phase: 'error',
      lastSuccessAt: syncStatus.lastSuccessAt,
      error: getErrorMessage(error),
      conflictCount: countConflicts(run.state),
    })
  }).finally(() => {
    syncPromise = null
    if (syncPending && session && state) {
      syncPending = false
      setTimeout(() => { void syncNow() }, 0)
    }
  })
  return syncPromise
}

const scheduleSync = () => {
  if (syncPromise) {
    syncPending = true
    return
  }
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void syncNow()
  }, 1500)
}

const handleLocalListAction = (...args: unknown[]) => {
  if (args[args.length - 1] !== true) scheduleSync()
}

const handlePlayMusicInfoChanged = ({ musicInfo }: { musicInfo: unknown }) => {
  if (!state || !isSyncableMusic(musicInfo)) return
  const key = musicKey(musicInfo)
  state.history[key] = createEntry(musicInfo, Date.now(), true)
  trimHistory(state.history)
  if (session) void saveData(storageKey(session.user.id), state)
  scheduleSync()
}

const registerListListeners = () => {
  global.list_event.on('list_data_overwrite', handleLocalListAction)
  global.list_event.on('list_create', handleLocalListAction)
  global.list_event.on('list_remove', handleLocalListAction)
  global.list_event.on('list_update', handleLocalListAction)
  global.list_event.on('list_update_position', handleLocalListAction)
  global.list_event.on('list_music_overwrite', handleLocalListAction)
  global.list_event.on('list_music_add', handleLocalListAction)
  global.list_event.on('list_music_move', handleLocalListAction)
  global.list_event.on('list_music_remove', handleLocalListAction)
  global.list_event.on('list_music_update', handleLocalListAction)
  global.list_event.on('list_music_update_position', handleLocalListAction)
  global.list_event.on('list_music_clear', handleLocalListAction)
}

const unregisterListListeners = () => {
  global.list_event.off('list_data_overwrite', handleLocalListAction)
  global.list_event.off('list_create', handleLocalListAction)
  global.list_event.off('list_remove', handleLocalListAction)
  global.list_event.off('list_update', handleLocalListAction)
  global.list_event.off('list_update_position', handleLocalListAction)
  global.list_event.off('list_music_overwrite', handleLocalListAction)
  global.list_event.off('list_music_add', handleLocalListAction)
  global.list_event.off('list_music_move', handleLocalListAction)
  global.list_event.off('list_music_remove', handleLocalListAction)
  global.list_event.off('list_music_update', handleLocalListAction)
  global.list_event.off('list_music_update_position', handleLocalListAction)
  global.list_event.off('list_music_clear', handleLocalListAction)
}

export const startMusicCloudSync = async(nextSession: AuthSession) => {
  stopMusicCloudSync()
  const generation = syncGeneration
  const nextState = await loadState(nextSession.user.id)
  if (generation !== syncGeneration) return
  session = nextSession
  state = nextState
  registerListListeners()
  global.state_event.on('playMusicInfoChanged', handlePlayMusicInfoChanged)
  void syncNow()
}

export const updateMusicCloudSyncSession = (nextSession: AuthSession) => {
  if (!session || session.user.id !== nextSession.user.id) return
  syncGeneration++
  session = nextSession
  scheduleSync()
}

export const stopMusicCloudSync = () => {
  syncGeneration++
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = null
  syncPending = false
  unregisterListListeners()
  global.state_event.off('playMusicInfoChanged', handlePlayMusicInfoChanged)
  session = null
  state = null
  setSyncStatus({ phase: 'idle', lastSuccessAt: null, error: null, conflictCount: 0 })
}

export const syncMusicCloudNow = async() => syncNow()

export const getMusicCloudSyncStatus = () => syncStatus

export const subscribeMusicCloudSyncStatus = (listener: (status: MusicCloudSyncStatus) => void) => {
  statusListeners.add(listener)
  listener(syncStatus)
  return () => { statusListeners.delete(listener) }
}

export const resolveMusicPlaylistConflicts = async(strategy: 'local' | 'remote') => {
  if (!session || !state) return
  const run: SyncRun = { generation: syncGeneration, session, state }
  const conflicts = Object.entries(run.state.playlists).filter(([, entry]) => entry.conflict)
  if (!conflicts.length) return
  setSyncStatus({
    phase: 'syncing',
    lastSuccessAt: syncStatus.lastSuccessAt,
    error: null,
    conflictCount: conflicts.length,
  })
  try {
    for (const [key, entry] of conflicts) {
      const remote = entry.conflict ? toRemotePlaylist(entry.conflict.remote) : null
      if (!remote) continue
      if (strategy === 'remote') await applyRemotePlaylist(run, remote.snapshot)
      if (!isRunActive(run)) return
      run.state.playlists[key] = {
        revision: remote.record.revision,
        synced: remote.snapshot,
      }
    }
    await persistState(run)
    if (isRunActive(run)) scheduleSync()
  } catch (error) {
    if (!isRunActive(run)) return
    setSyncStatus({
      phase: 'error',
      lastSuccessAt: syncStatus.lastSuccessAt,
      error: getErrorMessage(error),
      conflictCount: countConflicts(run.state),
    })
  }
}
