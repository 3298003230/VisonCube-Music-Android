import { useMemo, useState, useEffect, memo } from 'react'
import { View, ScrollView } from 'react-native'

import { compareVer, sizeFormate } from '@/utils'
import Button from '@/components/common/Button'
import { updateApp } from '@/utils/version'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type VersionInfo } from '@/store/version/state'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useVersionDownloadProgressUpdated, useVersionInfo, useVersionInfoIgnoreVersionUpdated } from '@/store/version/hook'
import ModalContent from './ModalContent'
import { checkUpdate, deferFailedUpdateReminder, downloadUpdate, hideModal, setIgnoreVersion } from '@/core/version'
import { APP_DISPLAY_VERSION } from '@/config/version'

const currentVer = process.versions.app

const VersionItem = ({ version, desc }: VersionInfo) => {
  return (
    <View style={styles.versionItem}>
      <Text style={styles.label}>v{version}</Text>
      <Text selectable style={styles.desc}>{desc}</Text>
    </View>
  )
}

const VersionDetails = memo(({ title, newVersionInfo }: {
  title: string
  newVersionInfo: VersionInfo | null
}) => {
  const t = useI18n()
  const history = useMemo(() => {
    if (!newVersionInfo?.history) return []
    return newVersionInfo.history.filter(ver => compareVer(currentVer, ver.version) < 0)
  }, [newVersionInfo])

  return (
    <View style={styles.main}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="always">
        <Text style={styles.label}>{t('version_label_latest_ver')}{newVersionInfo?.displayVersion ?? newVersionInfo?.version}</Text>
        <Text style={styles.label}>{t('version_label_current_ver')}{APP_DISPLAY_VERSION}</Text>
        {newVersionInfo?.desc ? <Text selectable style={styles.desc}>{newVersionInfo.desc}</Text> : null}
        {history.length ? (
          <View style={styles.history}>
            <Text style={styles.label}>{t('version_label_history')}</Text>
            {history.map((item, index) => <VersionItem key={index} version={item.version} desc={item.desc} />)}
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
})

const FailedDetails = () => {
  const t = useI18n()
  return (
    <View style={styles.main}>
      <Text style={styles.title}>{t('version_title_unknown')}</Text>
      <Text style={styles.label}>{t('version_label_current_ver')}{APP_DISPLAY_VERSION}</Text>
      <Text style={styles.desc}>{t('version_tip_unknown')}</Text>
    </View>
  )
}

const VersionModal = ({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const t = useI18n()
  const versionInfo = useVersionInfo()
  const progress = useVersionDownloadProgressUpdated()
  const ignoreVersion = useVersionInfoIgnoreVersionUpdated()
  const [ignoreBtn, setIgnoreBtn] = useState({ text: t('version_btn_ignore'), show: true, disabled: false })
  const [closeBtnText, setCloseBtnText] = useState(t('version_btn_close'))
  const [confirmBtn, setConfirmBtn] = useState({ text: '', show: true, disabled: false })
  const [title, setTitle] = useState('')
  const [tip, setTip] = useState('')

  useEffect(() => {
    if (versionInfo.isUnknown) return

    const nextIgnoreBtn = { ...ignoreBtn }
    if (versionInfo.isLatest) {
      setTitle(t('version_title_latest'))
      setTip('')
      nextIgnoreBtn.show = false
      setConfirmBtn({ text: '', show: false, disabled: true })
      setCloseBtnText(t('version_btn_close'))
    } else {
      switch (versionInfo.status) {
        case 'downloading':
          setTitle(t('version_title_new'))
          setTip(t('version_btn_downloading', {
            total: sizeFormate(progress.total),
            current: sizeFormate(progress.current),
            progress: progress.total ? (progress.current / progress.total * 100).toFixed(2) : '0',
          }))
          nextIgnoreBtn.show = false
          setConfirmBtn({ text: t('version_btn_update'), show: true, disabled: true })
          setCloseBtnText(t('version_btn_min'))
          break
        case 'downloaded':
          setTitle(t('version_title_update'))
          setTip('')
          nextIgnoreBtn.show = false
          setConfirmBtn({ text: t('version_btn_update'), show: true, disabled: false })
          setCloseBtnText(t('version_btn_close'))
          break
        case 'checking':
          setTitle(t('version_title_checking'))
          setTip('')
          nextIgnoreBtn.show = false
          setConfirmBtn({ text: '', show: false, disabled: true })
          setCloseBtnText(t('version_btn_close'))
          break
        case 'error':
          setTitle(t('version_title_failed'))
          setTip(t('version_tip_failed'))
          nextIgnoreBtn.show = true
          nextIgnoreBtn.disabled = false
          setConfirmBtn({ text: t('version_btn_failed'), show: true, disabled: false })
          setCloseBtnText(t('version_btn_close'))
          break
        default:
          setTitle(t('version_title_new'))
          setTip('')
          nextIgnoreBtn.show = true
          nextIgnoreBtn.disabled = false
          setConfirmBtn({ text: t('version_btn_new'), show: true, disabled: false })
          setCloseBtnText(t('version_btn_close'))
          break
      }
    }
    nextIgnoreBtn.text = t(ignoreVersion == versionInfo.newVersion?.version ? 'version_btn_ignore_cancel' : 'version_btn_ignore')
    setIgnoreBtn(nextIgnoreBtn)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, versionInfo, ignoreVersion, progress])

  const handleCancel = () => {
    hideModal(componentId)
  }
  const handleIgnore = () => {
    setIgnoreVersion(ignoreVersion != versionInfo.newVersion!.version ? versionInfo.newVersion!.version : null)
  }
  const handleConfirm = () => {
    if (versionInfo.isLatest || versionInfo.isUnknown) {
      void checkUpdate()
    } else if (versionInfo.status == 'downloaded') {
      void updateApp()
    } else if (versionInfo.status == 'idle' || versionInfo.status == 'error') {
      downloadUpdate()
    }
  }
  const handleDeferFailure = () => {
    deferFailedUpdateReminder()
    handleCancel()
  }

  return (
    <ModalContent>
      {versionInfo.isUnknown ? <FailedDetails /> : <VersionDetails title={title} newVersionInfo={versionInfo.newVersion} />}
      {tip.length && !versionInfo.isUnknown ? <Text style={styles.tip} color={theme['c-primary-font']}>{tip}</Text> : null}
      <View style={styles.btns}>
        {versionInfo.isUnknown ? (
          <>
            <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleDeferFailure}>
              <Text color={theme['c-button-font']}>{t('version_btn_defer')}</Text>
            </Button>
            <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleConfirm}>
              <Text color={theme['c-button-font']}>{t('version_btn_failed')}</Text>
            </Button>
          </>
        ) : (
          <>
            {ignoreBtn.show ? (
              <Button disabled={ignoreBtn.disabled} style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleIgnore}>
                <Text color={theme['c-button-font']}>{ignoreBtn.text}</Text>
              </Button>
            ) : null}
            <Button style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleCancel}>
              <Text color={theme['c-button-font']}>{closeBtnText}</Text>
            </Button>
            {confirmBtn.show ? (
              <Button disabled={confirmBtn.disabled} style={{ ...styles.btn, backgroundColor: theme['c-button-background'] }} onPress={handleConfirm}>
                <Text color={theme['c-button-font']}>{confirmBtn.text}</Text>
              </Button>
            ) : null}
          </>
        )}
      </View>
    </ModalContent>
  )
}

const styles = createStyle({
  main: {
    flexShrink: 1,
    marginTop: 15,
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 20,
  },
  content: {
    flexGrow: 0,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  history: {
    marginTop: 15,
  },
  versionItem: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    lineHeight: 20,
  },
  tip: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    paddingLeft: 15,
  },
  btn: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderRadius: 4,
    marginRight: 15,
  },
})

export default VersionModal
