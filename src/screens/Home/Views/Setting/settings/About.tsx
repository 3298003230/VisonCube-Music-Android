import { memo } from 'react'
import { View } from 'react-native'

import Section from '../components/Section'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { APP_DISPLAY_VERSION } from '@/config/version'

export default memo(() => {
  const t = useI18n()

  return (
    <Section title={t('setting_about')}>
      <View style={styles.part}>
        <Text style={styles.title}>VisonCube Music</Text>
        <Text style={styles.text}>当前版本：{APP_DISPLAY_VERSION}</Text>
      </View>
    </Section>
  )
})

const styles = createStyle({
  part: {
    marginLeft: 15,
    marginRight: 15,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
})
