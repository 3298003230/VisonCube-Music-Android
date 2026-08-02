import { useState } from 'react'
import { Keyboard, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import AuthButton from './components/AuthButton'
import AuthError from './components/AuthError'
import AuthField from './components/AuthField'
import { styles } from './styles'
import { type PasswordCredentials } from '@/features/auth/models'

interface LoginFormProps {
  busy: boolean
  error?: string
  onSubmit: (credentials: PasswordCredentials) => void | Promise<void>
  onRegister: () => void
  onEmailLogin: () => void
  onResetPassword: () => void
}

export default ({ busy, error, onSubmit, onRegister, onEmailLogin, onResetPassword }: LoginFormProps) => {
  const theme = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  const handleSubmit = () => {
    Keyboard.dismiss()
    if (!username.trim()) {
      setValidationError('请输入用户名或邮箱')
      return
    }
    if (!password) {
      setValidationError('请输入密码')
      return
    }
    setValidationError('')
    void onSubmit({ username: username.trim(), password })
  }

  return (
    <>
      <AuthField
        label="用户名或邮箱"
        placeholder="输入用户名或已绑定邮箱"
        value={username}
        onChangeText={setUsername}
        returnKeyType="next"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AuthField
        label="密码"
        placeholder="输入密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <AuthError message={error ?? validationError} />
      <AuthButton label="登录" loading={busy} onPress={handleSubmit} />
      <View style={styles.linkRow}>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onEmailLogin}>邮箱验证码登录</Text>
        <Text size={14} color={theme['c-font-label']}> · </Text>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onResetPassword}>找回密码</Text>
      </View>
      <Text size={14} color={theme['c-font-label']} style={styles.linkRow}>
        <Text size={14} color={theme['c-font-label']}>还没有账号？</Text>
        <Text size={14} color={theme['c-primary-font']} style={styles.link} onPress={onRegister}>注册账号</Text>
      </Text>
    </>
  )
}
