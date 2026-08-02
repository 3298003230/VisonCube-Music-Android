import { installApk } from '@/utils/nativeModules/utils'
import { downloadFile, hash, temporaryDirectoryPath, unlink } from '@/utils/fs'
import { APP_PROVIDER_NAME } from '@/config/constant'

const noop = () => {}
let apkSavePath

const removeFileIfExists = async(path) => {
  await unlink(path).catch(() => {})
}

const getSafeApkFileName = (fileName, version) => {
  const candidate = typeof fileName == 'string' ? fileName.trim() : ''
  if (/^[A-Za-z0-9._-]+\.apk$/i.test(candidate)) return candidate
  return `VisonCube-Music-v${version}.apk`
}

export const downloadNewVersion = async(release, onDownload = noop) => {
  if (!release?.downloadUrl || !release?.sha256) {
    throw new Error('Release download information is incomplete')
  }

  const apkPath = `${temporaryDirectoryPath}/${getSafeApkFileName(release.fileName, release.version)}`
  await removeFileIfExists(apkPath)

  try {
    const task = downloadFile(release.downloadUrl, apkPath, {
      connectionTimeout: 15000,
      readTimeout: 60000,
      progressInterval: 250,
      progress: ({ contentLength, bytesWritten }) => {
        onDownload(contentLength || 0, bytesWritten)
      },
    })
    const result = await task.promise
    if (result.statusCode < 200 || result.statusCode >= 300) {
      throw new Error(`Update download failed with HTTP ${result.statusCode}`)
    }

    const actualSha256 = await hash(apkPath, 'sha256')
    if (actualSha256.toUpperCase() != release.sha256.trim().toUpperCase()) {
      throw new Error('Update package checksum verification failed')
    }

    apkSavePath = apkPath
    return apkPath
  } catch (error) {
    await removeFileIfExists(apkPath)
    throw error
  }
}

export const updateApp = async() => {
  if (!apkSavePath) throw new Error('APK file is not ready')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
