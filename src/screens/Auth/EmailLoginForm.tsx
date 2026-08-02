import { useState } from 'react'
import { Keyboard, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthButton from './components/AuthButton'
import AuthError from './components/AuthError'
import EmailCodeFields from './components/EmailCodeFields'
import { styles } from './styles'

interface EmailLoginFormProps {
  busy: boolean
  error?: string
  onRequestCode: (email: string) => Promise<void>
  onSubmit: (email: string, code: string) => void | Promise<void>
  onPasswordLogin: () => void
  onResetPassword: () => void
}

export default ({ busy, error, onRequestCode, onSubmit, onPasswordLogin, onResetPassword }: EmailLoginFormProps) => {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [validationError, setValidationError] = useState('')

  const validateEmail = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setValidationError('请输入正确的邮箱地址')
      return false
    }
    setValidationError('')
    return true
  }

  const handleSubmit = () => {
    Keyboard.dismiss()
    if (!validateEmail()) return
    if (!/^\d{6}$/.test(code.trim())) {
      setValidationError('请输入 6 位验证码')
      return
    }
    void onSubmit(email.trim().toLowerCase(), code.trim())
  }

  return (
    <>
      <EmailCodeFields
        email={email}
        code={code}
        disabled={busy}
        onEmailChange={setEmail}
        onCodeChange={setCode}
        onRequestCode={onRequestCode}
        validateEmail={validateEmail}
        onSubmitEditing={handleSubmit}
      />
      <AuthError message={error ?? validationError} />
      <AuthButton label="邮箱登录" loading={busy} onPress={handleSubmit} />
      <View style={styles.linkRow}>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onPasswordLogin}>使用密码登录</Text>
        <Text size={14} color={theme['c-font-label']}> · </Text>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onResetPassword}>找回密码</Text>
      </View>
    </>
  )
}
