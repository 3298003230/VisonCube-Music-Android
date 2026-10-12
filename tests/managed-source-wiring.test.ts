import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

void test('managed source storage exports remain connected to the update flow', async() => {
  const [dataSource, managedSource, managedSourceStorage] = await Promise.all([
    readSource('../src/utils/data.ts'),
    readSource('../src/features/musicSource/managedSource.ts'),
    readSource('../src/features/musicSource/storage.ts'),
  ])

  assert.match(dataSource, /export const upsertManagedUserApi\s*=/)
  assert.match(dataSource, /export const removeManagedUserApi\s*=/)
  assert.match(dataSource, /await ensureUserApiListLoaded\(\)/)
  assert.match(managedSource, /import \{ getUserApiList, removeManagedUserApi, upsertManagedUserApi \} from '@\/utils\/data'/)
  assert.match(managedSource, /await upsertManagedUserApi\(script, manifest\)/)
  assert.match(managedSource, /await removeManagedUserApi\(\)/)
  assert.match(managedSourceStorage, /export const removeManagedSource\s*=/)
  assert.match(managedSourceStorage, /await removeManagedUserApi\(\)/)
})

void test('cached managed source remains connected to user API initialization', async() => {
  const initSource = await readSource('../src/core/init/userApi/index.ts')

  assert.match(initSource, /import \{ hydrateManagedSource \} from '@\/features\/musicSource\/managedSource'/)
  assert.match(initSource, /await hydrateManagedSource\(\)/)
  assert.ok(
    initSource.indexOf('await hydrateManagedSource()') < initSource.indexOf('setUserApiList(await getUserApiList())'),
    'managed source must hydrate before publishing the user API list',
  )
})

void test('managed source is routed through the user API playback adapter', async() => {
  const apiSource = await readSource('../src/utils/musicSdk/api-source.js')

  assert.match(apiSource, /import \{ isUserApiSource \} from '@\/config\/constant'/)
  assert.match(apiSource, /isUserApiSource\(settingState\.setting\['common\.apiSource'\]\)/)
})

void test('removing the managed source clears its persistent cache', async() => {
  const [sourceList, managedSource, managedSourceStorage] = await Promise.all([
    readSource('../src/screens/Home/Views/Setting/settings/Basic/UserApiEditModal/List.tsx'),
    readSource('../src/features/musicSource/managedSource.ts'),
    readSource('../src/features/musicSource/storage.ts'),
  ])

  assert.match(managedSource, /export \{ clearManagedSourceCache, removeManagedSource \} from '\.\/storage'/)
  assert.match(managedSourceStorage, /export const clearManagedSourceCache\s*=/)
  assert.match(managedSourceStorage, /managedSourcePaths\.manifestPath/)
  assert.match(managedSourceStorage, /managedSourcePaths\.sourcePath/)
  assert.match(managedSourceStorage, /await clearManagedSourceCache\(\)/)
  assert.match(managedSourceStorage, /await removeManagedUserApi\(\)/)
  assert.match(sourceList, /id == MANAGED_USER_API_ID \? removeManagedSource\(\) : removeUserApi\(\[id\]\)/)
})

void test('signing out clears authentication and stops sync without deleting or switching sources', async() => {
  const source = stripTypeScriptTypes(await readSource('../src/features/auth/authState.ts'))
    .replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
  const validSession = { token: 'test-token', user: { username: 'test-user' } }
  for (const session of [null, validSession, { ...validSession, expires_at_ms: 1 }]) {
    for (const logoutFails of [false, true]) {
      const calls: string[] = []
      const api = runInNewContext(source + '\n({ restoreSession, signOut, getCurrentSession })', {
        loadSession: async() => session,
        clearSession: async() => { calls.push('session-clear') }, stopMusicCloudSync: () => calls.push('sync-stop'),
        authApi: { logout: async() => { calls.push('logout'); if (logoutFails) throw new Error('fixture logout failure') } },
        MANAGED_USER_API_ID: 'managed-test', settingState: { setting: { 'common.apiSource': 'managed-test' } },
        apiSourceInfo: [{ id: 'fallback' }],
        removeManagedSource: async() => { calls.push('source-remove') },
        setApiSource: async() => { calls.push('source-switch') },
      })
      await api.restoreSession()
      calls.length = 0
      await api.signOut()
      assert.equal(api.getCurrentSession(), null)
      assert.deepEqual(calls, ['sync-stop', 'session-clear', ...(session && !('expires_at_ms' in session) ? ['logout'] : [])])
      calls.length = 0
      await api.signOut()
      assert.deepEqual(calls, ['sync-stop', 'session-clear'])
    }
  }
})
