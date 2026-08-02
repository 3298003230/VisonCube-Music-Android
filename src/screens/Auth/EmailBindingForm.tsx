import { useState } from 'react'
import { Keyboard } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthButton from './components/AuthButton'
import AuthError from './components/AuthError'
import EmailCodeFields from './components/EmailCodeFields'
import { styles } from './styles'

interface EmailBindingFormProps {
  initialEmail: string
  busy: boolean
  error?: string
  onRequestCode: (email: string) => Promise<void>
  onSubmit: (email: string, code: string) => void | Promise<void>
  onLogout: () => void | Promise<void>
}

export default ({ initialEmail, busy, error, onRequestCode, onSubmit, onLogout }: EmailBindingFormProps) => {
  const theme = useTheme()
  const [email, setEmail] = useState(initialEmail)
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
      <Text size={14} color={theme['c-font']} style={{ ...styles.bindingNotice, backgroundColor: theme['c-primary-light-100-alpha-700'] }}>
        为了保护账号并启用跨设备同步，请先完成邮箱验证。
      </Text>
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
      <AuthButton label="完成验证" loading={busy} onPress={handleSubmit} />
      <Text size={14} color={theme['c-primary-font']} style={styles.secondaryButton} onPress={onLogout}>退出并更换账号</Text>
    </>
  )
}
