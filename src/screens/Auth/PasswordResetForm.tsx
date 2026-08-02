import { useState } from 'react'
import { Keyboard } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthButton from './components/AuthButton'
import AuthError from './components/AuthError'
import AuthField from './components/AuthField'
import EmailCodeFields from './components/EmailCodeFields'
import { styles } from './styles'

interface PasswordResetFormProps {
  busy: boolean
  error?: string
  onRequestCode: (email: string) => Promise<void>
  onSubmit: (email: string, code: string, password: string) => void | Promise<void>
  onLogin: () => void
}

export default ({ busy, error, onRequestCode, onSubmit, onLogin }: PasswordResetFormProps) => {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (password.length < 6) {
      setValidationError('新密码至少需要 6 位')
      return
    }
    if (password !== confirmPassword) {
      setValidationError('两次输入的新密码不一致')
      return
    }
    void onSubmit(email.trim().toLowerCase(), code.trim(), password)
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
      />
      <AuthField label="新密码" placeholder="至少 6 位" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" />
      <AuthField label="确认新密码" placeholder="再次输入新密码" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleSubmit} />
      <AuthError message={error ?? validationError} />
      <AuthButton label="重置密码并登录" loading={busy} onPress={handleSubmit} />
      <Text size={14} color={theme['c-primary-font']} style={styles.secondaryButton} onPress={onLogin}>返回登录</Text>
    </>
  )
}
