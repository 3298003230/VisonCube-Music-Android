import { memo, useEffect, useState } from 'react'

import { View } from 'react-native'

import Button from '../../../components/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import { setApiSource } from '@/core/apiSource'
import { MANAGED_USER_API_ID, getManagedSourceStatus, subscribeManagedSourceStatus, updateManagedSource } from '@/features/musicSource/managedSource'

export default memo(() => {
  const t = useI18n()
  const [managedStatus, setManagedStatus] = useState(getManagedSourceStatus())
  useEffect(() => subscribeManagedSourceStatus(setManagedStatus), [])

  const handleUpdate = async() => {
    try {
      await updateManagedSource()
      const initialized = await setApiSource(MANAGED_USER_API_ID)
      if (!initialized) throw new Error(t('setting_basic_source_update_failed'))
    } catch {
      // The source module keeps the last known-good source when an update fails.
    }
  }

  const statusLabel = managedStatus.phase == 'updating'
    ? t('setting_basic_source_update_loading')
    : managedStatus.phase == 'error'
      ? t('setting_basic_source_update_failed')
      : managedStatus.manifest
        ? `${t('setting_basic_source_update_version')} v${managedStatus.manifest.version}`
        : t('setting_basic_source_update_idle')

  return (
    <View style={styles.container}>
      <Button disabled={managedStatus.phase == 'updating'} onPress={() => { void handleUpdate() }}>
        {t('setting_basic_source_update_btn')}
      </Button>
      <Text style={styles.status} size={13}>{statusLabel}</Text>
    </View>
  )
})

const styles = createStyle({
  container: {
    marginTop: 15,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  status: {
    marginLeft: 8,
    flexShrink: 1,
  },
})
