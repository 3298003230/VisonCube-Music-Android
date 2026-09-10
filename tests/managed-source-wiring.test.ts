import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

void test('managed source storage exports remain connected to the update flow', async() => {
  const [dataSource, managedSource] = await Promise.all([
    readSource('../src/utils/data.ts'),
    readSource('../src/features/musicSource/managedSource.ts'),
  ])

  assert.match(dataSource, /export const upsertManagedUserApi\s*=/)
  assert.match(dataSource, /export const removeManagedUserApi\s*=/)
  assert.match(dataSource, /await ensureUserApiListLoaded\(\)/)
  assert.match(managedSource, /import \{ getUserApiList, removeManagedUserApi, upsertManagedUserApi \} from '@\/utils\/data'/)
  assert.match(managedSource, /await upsertManagedUserApi\(script, manifest\)/)
  assert.match(managedSource, /await removeManagedUserApi\(\)/)
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
