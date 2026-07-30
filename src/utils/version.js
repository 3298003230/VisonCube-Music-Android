import { installApk } from '@/utils/nativeModules/utils'
import { APP_PROVIDER_NAME } from '@/config/constant'

const getUpdateSourceError = () => new Error('Update source is not configured')

export const getVersionInfo = async() => {
  throw getUpdateSourceError()
}

const noop = () => {}
let apkSavePath

export const downloadNewVersion = async(version, onDownload = noop) => {
  onDownload(0, 0)
  throw getUpdateSourceError()
}

export const updateApp = async() => {
  if (!apkSavePath) throw new Error('apk Save Path is null')
  await installApk(apkSavePath, APP_PROVIDER_NAME)
}
