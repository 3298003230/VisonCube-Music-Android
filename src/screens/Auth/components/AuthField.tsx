import { View, StyleSheet, type TextInputProps } from 'react-native'
import Input from '@/components/common/Input'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { styles } from '../styles'

interface AuthFieldProps extends TextInputProps {
  label: string
}

export default ({ label, style, ...props }: AuthFieldProps) => {
  const theme = useTheme()

  return (
    <View style={styles.field}>
      <Text size={13} color={theme['c-font-label']} style={styles.fieldLabel}>{label}</Text>
      <View style={{ ...styles.inputShell, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}>
        <Input {...props} style={StyleSheet.compose(styles.input, style)} />
      </View>
    </View>
  )
}
