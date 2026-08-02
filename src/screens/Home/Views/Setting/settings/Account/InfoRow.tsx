import { memo } from 'react'
import { View } from 'react-native'

import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

interface InfoRowProps {
  label: string
  value: string
  last?: boolean
}

export default memo(({ label, value, last = false }: InfoRowProps) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.row, borderBottomColor: theme['c-border-background'], borderBottomWidth: last ? 0 : 1 }}>
      <Text size={14} color={theme['c-font-label']} style={styles.label}>{label}</Text>
      <Text size={14} numberOfLines={1} ellipsizeMode="middle" style={styles.value}>{value}</Text>
    </View>
  )
})

const styles = createStyle({
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    width: 92,
  },
  value: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
})
