import { compareVer } from '@/utils'
import { downloadNewVersion } from '@/utils/version'
import versionActions from '@/store/version/action'
import versionState, { type InitState } from '@/store/version/state'
import { getIgnoreVersion, getIgnoreVersionFailTipTime, saveIgnoreVersion, saveIgnoreVersionFailTipTime } from '@/utils/data'
import { showVersionModal } from '@/navigation'
import { Navigation } from 'react-native-navigation'
import { getMusicAndroidRelease } from '@/features/release/api'

export const showModal = () => {
  if (versionState.showModal) return
  versionActions.setVisibleModal(true)
  showVersionModal()
}

export const hideModal = (componentId: string) => {
  if (!versionState.showModal) return
  versionActions.setVisibleModal(false)
  void Navigation.dismissOverlay(componentId)
}

export const checkUpdate = async() => {
  versionActions.setVersionInfo({ status: 'checking', isUnknown: false, isLatest: false })
  const versionInfo: InitState['versionInfo'] = {
    ...versionState.versionInfo,
    isLatest: false,
    isUnknown: false,
  }

  try {
    const release = await getMusicAndroidRelease()
    versionInfo.newVersion = {
      version: release.version,
      displayVersion: release.displayVersion,
      desc: release.changelog,
      history: [],
      fileName: release.fileName,
      downloadUrl: release.downloadUrl,
      sha256: release.sha256,
      minVersion: release.minVersion,
      forceUpdate: release.forceUpdate,
    }
  } catch {
    versionInfo.newVersion = {
      version: '0.0.0',
      desc: '',
      history: [],
    }
  }

  if (versionInfo.newVersion.version == '0.0.0') {
    versionInfo.isUnknown = true
    versionInfo.status = 'error'
  } else {
    versionInfo.status = 'idle'
    if (compareVer(versionInfo.version, versionInfo.newVersion.version) != -1) {
      versionInfo.isLatest = true
    }
  }

  versionActions.setVersionInfo(versionInfo)

  if (versionInfo.isUnknown) {
    const lastIgnoredAt = await getIgnoreVersionFailTipTime()
    if (Date.now() - lastIgnoredAt >= 7 * 86400000) showModal()
  } else if (!versionInfo.isLatest && versionInfo.newVersion.version != await getIgnoreVersion()) {
    showModal()
  }
}

export const downloadUpdate = () => {
  const release = versionState.versionInfo.newVersion
  if (!release) return

  versionActions.setVersionInfo({ status: 'downloading' })
  versionActions.setProgress({ total: 0, current: 0 })
  downloadNewVersion(release, (total: number, current: number) => {
    versionActions.setProgress({ total, current })
  }).then(() => {
    versionActions.setVersionInfo({ status: 'downloaded' })
  }).catch(() => {
    versionActions.setVersionInfo({ status: 'error' })
  })
}

export const deferFailedUpdateReminder = () => {
  saveIgnoreVersionFailTipTime(Date.now())
}

export const setIgnoreVersion = (version: InitState['ignoreVersion']) => {
  versionActions.setIgnoreVersion(version)
  saveIgnoreVersion(version)
}
