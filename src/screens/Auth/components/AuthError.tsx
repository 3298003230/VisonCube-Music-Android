import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { styles } from '../styles'

export default ({ message }: { message?: string }) => {
  const theme = useTheme()
  if (!message) return null
  return <Text size={13} color={theme['c-font']} style={{ ...styles.error, backgroundColor: theme['c-primary-light-100-alpha-700'] }}>{message}</Text>
}
