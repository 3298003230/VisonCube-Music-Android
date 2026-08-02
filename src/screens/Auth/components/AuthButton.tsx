import { useTheme } from '@/store/theme/hook'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import Text from '@/components/common/Text'
import { styles } from '../styles'

interface AuthButtonProps {
  label: string
  loading?: boolean
  disabled?: boolean
  onPress: () => void
}

export default ({ label, loading = false, disabled = false, onPress }: AuthButtonProps) => {
  const theme = useTheme()

  return (
    <Button style={{ ...styles.primaryButton, backgroundColor: theme['c-primary'] }} disabled={disabled || loading} onPress={onPress}>
      {loading
        ? <Loading size={18} color={theme['c-primary-light-1000']} />
        : <Text size={15} color={theme['c-primary-light-1000']} style={{ fontWeight: '700' }}>{label}</Text>}
    </Button>
  )
}
