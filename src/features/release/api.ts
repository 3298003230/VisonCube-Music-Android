import { MUSIC_ANDROID_RELEASE_API_URL } from './config'
import { APP_DISPLAY_VERSION } from '@/config/version'

export interface MusicAndroidRelease {
  version: string
  displayVersion: string
  minVersion: string
  forceUpdate: boolean
  fileName: string
  downloadUrl: string
  sha256: string
  changelog: string
}

export const getMusicAndroidRelease = async(): Promise<MusicAndroidRelease> => {
  const response = await fetch(MUSIC_ANDROID_RELEASE_API_URL, {
    headers: {
      Accept: 'application/json',
    },
  })
  if (!response.ok) throw new Error('Failed to fetch release information')

  const release = await response.json()
  if (!release || typeof release.version != 'string' || typeof release.download_url != 'string') {
    throw new Error('Invalid release information')
  }

  return {
    version: release.version,
    displayVersion: typeof release.display_version == 'string' && release.display_version
      ? release.display_version
      : APP_DISPLAY_VERSION,
    minVersion: typeof release.min_version == 'string' ? release.min_version : '',
    forceUpdate: release.force_update === true,
    fileName: typeof release.file_name == 'string' ? release.file_name : '',
    downloadUrl: release.download_url,
    sha256: typeof release.sha256 == 'string' ? release.sha256 : '',
    changelog: typeof release.changelog == 'string' ? release.changelog : '',
  }
}
