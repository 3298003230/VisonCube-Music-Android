import { useState } from 'react'
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import {
  confirmEmailBinding,
  emailLogin,
  getCurrentUser,
  login,
  register,
  requestEmailLoginCode,
  requestEmailBindingCode,
  requestPasswordResetCode,
  resetPassword,
  signOut,
} from '@/features/auth/authState'
import { type AuthGateState, type PasswordCredentials, type RegisterCredentials } from '@/features/auth/models'
import EmailBindingForm from './EmailBindingForm'
import EmailLoginForm from './EmailLoginForm'
import LoginForm from './LoginForm'
import PasswordResetForm from './PasswordResetForm'
import RegisterForm from './RegisterForm'
import { styles } from './styles'

export type AuthScreenMode = 'login' | 'register' | 'bind' | 'email_login' | 'reset'

interface AuthScreenProps {
  initialMode?: AuthScreenMode
  onAuthenticated: () => void | Promise<void>
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试'

export default ({ initialMode = 'login', onAuthenticated }: AuthScreenProps) => {
  const theme = useTheme()
  const [mode, setMode] = useState<AuthScreenMode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleGateResult = async(gateState: AuthGateState) => {
    if (gateState === 'authenticated') {
      await onAuthenticated()
    } else {
      setMode('bind')
    }
  }

  const handleLogin = async(credentials: PasswordCredentials) => {
    setBusy(true)
    setError('')
    try {
      await handleGateResult(await login(credentials))
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async(credentials: RegisterCredentials) => {
    setBusy(true)
    setError('')
    try {
      await handleGateResult(await register(credentials))
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleRequestEmailLoginCode = async(email: string) => {
    setBusy(true)
    setError('')
    try {
      await requestEmailLoginCode(email)
    } catch (error) {
      setError(getErrorMessage(error))
      throw error
    } finally {
      setBusy(false)
    }
  }

  const handleEmailLogin = async(email: string, code: string) => {
    setBusy(true)
    setError('')
    try {
      await handleGateResult(await emailLogin(email, code))
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleRequestPasswordResetCode = async(email: string) => {
    setBusy(true)
    setError('')
    try {
      await requestPasswordResetCode(email)
    } catch (error) {
      setError(getErrorMessage(error))
      throw error
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async(email: string, code: string, password: string) => {
    setBusy(true)
    setError('')
    try {
      await handleGateResult(await resetPassword(email, code, password))
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleRequestCode = async(email: string) => {
    setBusy(true)
    setError('')
    try {
      await requestEmailBindingCode(email)
    } catch (error) {
      setError(getErrorMessage(error))
      throw error
    } finally {
      setBusy(false)
    }
  }

  const handleBindEmail = async(email: string, code: string) => {
    setBusy(true)
    setError('')
    try {
      await handleGateResult(await confirmEmailBinding(email, code))
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const handleLogout = async() => {
    setBusy(true)
    try {
      await signOut()
      setError('')
      setMode('login')
    } finally {
      setBusy(false)
    }
  }

  const isBinding = mode === 'bind'
  const title = isBinding
    ? '完成邮箱验证'
    : mode === 'login'
      ? '欢迎回来'
      : mode === 'register'
        ? '创建账号'
        : mode === 'email_login'
          ? '邮箱验证码登录'
          : '重置密码'
  const subtitle = isBinding
    ? '验证邮箱后即可使用 VisonCube Music'
    : mode === 'reset'
      ? '通过邮箱验证码设置新密码'
      : '一个账号，连接你的 VisonCube 设备'

  return (
    <SafeAreaView style={{ ...styles.root, backgroundColor: theme['c-content-background'] }}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.brand}>
              <View style={{ ...styles.brandMark, backgroundColor: theme['c-primary'] }}>
                <Text size={28} color={theme['c-primary-light-1000']} style={{ fontWeight: '800' }}>V</Text>
              </View>
              <Text size={27} color={theme['c-font']} style={styles.title}>VisonCube Music</Text>
              <Text size={14} color={theme['c-font-label']} style={styles.subtitle}>{subtitle}</Text>
            </View>
            <Text size={22} color={theme['c-font']} style={{ ...styles.title, marginBottom: 18 }}>{title}</Text>
            <View style={styles.form}>
              {isBinding
                ? <EmailBindingForm
                    initialEmail={getCurrentUser()?.email ?? ''}
                    busy={busy}
                    error={error}
                    onRequestCode={handleRequestCode}
                    onSubmit={handleBindEmail}
                    onLogout={handleLogout}
                  />
                : mode === 'login'
                  ? <LoginForm
                      busy={busy}
                      error={error}
                      onSubmit={handleLogin}
                      onRegister={() => { setError(''); setMode('register') }}
                      onEmailLogin={() => { setError(''); setMode('email_login') }}
                      onResetPassword={() => { setError(''); setMode('reset') }}
                    />
                  : mode === 'register'
                    ? <RegisterForm busy={busy} error={error} onSubmit={handleRegister} onLogin={() => { setError(''); setMode('login') }} />
                    : mode === 'email_login'
                      ? <EmailLoginForm
                          busy={busy}
                          error={error}
                          onRequestCode={handleRequestEmailLoginCode}
                          onSubmit={handleEmailLogin}
                          onPasswordLogin={() => { setError(''); setMode('login') }}
                          onResetPassword={() => { setError(''); setMode('reset') }}
                        />
                      : <PasswordResetForm
                          busy={busy}
                          error={error}
                          onRequestCode={handleRequestPasswordResetCode}
                          onSubmit={handleResetPassword}
                          onLogin={() => { setError(''); setMode('login') }}
                        />}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
