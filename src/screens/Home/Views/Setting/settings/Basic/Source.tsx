import { memo, useEffect, useState } from 'react'

import { View } from 'react-native'

import SubTitle from '../../components/SubTitle'
import { createStyle, toast } from '@/utils/tools'
import { setApiSource } from '@/core/apiSource'
import { useI18n } from '@/lang'
import Button from '../../components/Button'
import Text from '@/components/common/Text'
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
      toast(t('setting_basic_source_update_success'))
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
    <SubTitle title={t('setting_basic_source')}>
      <View style={styles.btn}>
        <Button disabled={managedStatus.phase == 'updating'} onPress={() => { void handleUpdate() }}>{t('setting_basic_source_update_btn')}</Button>
        <Text style={styles.sourceStatus} size={13}>  {statusLabel}</Text>
      </View>
    </SubTitle>
  )
})

const styles = createStyle({
  btn: {
    marginTop: 10,
    flexDirection: 'row',
  },
  sourceStatus: {
    alignSelf: 'center',
  },
})
