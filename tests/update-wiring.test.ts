import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

void test('APK installation derives the Provider from the running package and exposes recoverable failures', async() => {
  const [nativeModule, nativeUtils, versionUtils, versionModal, manifest] = await Promise.all([
    readSource('../android/app/src/main/java/cn/toside/music/mobile/utils/UtilsModule.java'),
    readSource('../src/utils/nativeModules/utils.ts'),
    readSource('../src/utils/version.js'),
    readSource('../src/navigation/components/VersionModal.tsx'),
    readSource('../android/app/src/main/AndroidManifest.xml'),
  ])

  assert.match(nativeModule, /installApk\(String filePath, Promise promise\)/)
  assert.match(nativeModule, /reactContext\.getPackageName\(\) \+ "\.provider"/)
  assert.match(nativeModule, /canRequestPackageInstalls\(\)/)
  assert.match(nativeModule, /Settings\.ACTION_MANAGE_UNKNOWN_APP_SOURCES/)
  assert.match(nativeModule, /"INSTALL_PERMISSION_REQUIRED"/)
  assert.match(nativeUtils, /installApk = \(filePath: string\): Promise<void> => UtilsModule\.installApk\(filePath\)/)
  assert.match(versionUtils, /await installApk\(apkSavePath\)/)
  assert.doesNotMatch(versionUtils, /APP_PROVIDER_NAME/)
  assert.match(versionModal, /INSTALL_PERMISSION_REQUIRED/)
  assert.match(manifest, /android:authorities="\$\{applicationId\}\.provider"/)
})

void test('both Music protocols and the per-song URL cache clear entry remain wired', async() => {
  const [deeplink, data, onlineMenu, onlineList, localMenu, localList] = await Promise.all([
    readSource('../src/core/init/deeplink/index.ts'),
    readSource('../src/utils/data.ts'),
    readSource('../src/components/OnlineList/ListMenu.tsx'),
    readSource('../src/components/OnlineList/index.tsx'),
    readSource('../src/screens/Home/Views/Mylist/MusicList/ListMenu.tsx'),
    readSource('../src/screens/Home/Views/Mylist/MusicList/index.tsx'),
  ])

  assert.match(deeplink, /\^\(\?:lxmusic\|visoncubemusic\)/)
  assert.match(data, /export const clearMusicUrlForMusic\s*=/)
  assert.match(data, /\$\{storageDataPrefix\.musicUrl\}\$\{id\}_/)
  for (const source of [onlineMenu, onlineList, localMenu, localList]) {
    assert.match(source, /clearUrlCache|onClearUrlCache/)
  }
})
