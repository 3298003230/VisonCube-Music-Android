import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthField from './AuthField'
import { styles } from '../styles'

interface EmailCodeFieldsProps {
  email: string
  code: string
  disabled?: boolean
  onEmailChange: (value: string) => void
  onCodeChange: (value: string) => void
  onRequestCode: (email: string) => Promise<void>
  validateEmail: () => boolean
  onSubmitEditing?: () => void
}

export default ({
  email,
  code,
  disabled = false,
  onEmailChange,
  onCodeChange,
  onRequestCode,
  validateEmail,
  onSubmitEditing,
}: EmailCodeFieldsProps) => {
  const theme = useTheme()
  const [countdown, setCountdown] = useState(0)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown(value => { return Math.max(0, value - 1) })
    }, 1000)
    return () => { clearInterval(timer) }
  }, [countdown])

  const handleRequestCode = async() => {
    if (disabled || sending || countdown > 0 || !validateEmail()) return
    setSending(true)
    try {
      await onRequestCode(email.trim().toLowerCase())
      setCountdown(60)
    } catch {
      // 错误信息由父表单统一显示。
    } finally {
      setSending(false)
    }
  }

  const codeDisabled = disabled || sending || countdown > 0

  return (
    <>
      <AuthField
        label="邮箱"
        placeholder="输入邮箱地址"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <View style={styles.codeRow}>
        <View style={styles.codeField}>
          <AuthField
            label="验证码"
            placeholder="输入 6 位验证码"
            value={code}
            onChangeText={onCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={onSubmitEditing}
          />
        </View>
        <Button
          disabled={codeDisabled}
          onPress={() => { void handleRequestCode() }}
          style={{ ...styles.codeButton, backgroundColor: codeDisabled ? theme['c-primary-light-100-alpha-700'] : theme['c-primary-background'] }}
        >
          <Text size={13} color={theme['c-primary-font']}>
            {sending ? '发送中' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
          </Text>
        </Button>
      </View>
    </>
  )
}
