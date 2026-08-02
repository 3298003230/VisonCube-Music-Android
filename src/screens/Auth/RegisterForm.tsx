import { useState } from 'react'
import { Keyboard } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthButton from './components/AuthButton'
import AuthError from './components/AuthError'
import AuthField from './components/AuthField'
import { styles } from './styles'
import { type RegisterCredentials } from '@/features/auth/models'

interface RegisterFormProps {
  busy: boolean
  error?: string
  onSubmit: (credentials: RegisterCredentials) => void | Promise<void>
  onLogin: () => void
}

export default ({ busy, error, onSubmit, onLogin }: RegisterFormProps) => {
  const theme = useTheme()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  const handleSubmit = () => {
    Keyboard.dismiss()
    if (!username.trim()) {
      setValidationError('请输入用户名')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setValidationError('请输入正确的邮箱地址')
      return
    }
    if (password.length < 6) {
      setValidationError('密码至少需要 6 位')
      return
    }
    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致')
      return
    }
    setValidationError('')
    void onSubmit({ username: username.trim(), email: email.trim().toLowerCase(), password })
  }

  return (
    <>
      <AuthField label="用户名" placeholder="设置用户名" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
      <AuthField label="邮箱" placeholder="用于验证账号" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
      <AuthField label="密码" placeholder="至少 6 位" value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" />
      <AuthField label="确认密码" placeholder="再次输入密码" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleSubmit} />
      <AuthError message={error ?? validationError} />
      <AuthButton label="注册并继续" loading={busy} onPress={handleSubmit} />
      <Text size={14} color={theme['c-font-label']} style={styles.linkRow}>
        <Text size={14} color={theme['c-font-label']}>已有账号？</Text>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onLogin}>返回登录</Text>
      </Text>
    </>
  )
}
