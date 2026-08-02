import { useState } from 'react'
import { View } from 'react-native'

import AuthButton from '@/screens/Auth/components/AuthButton'
import AuthError from '@/screens/Auth/components/AuthError'
import AuthField from '@/screens/Auth/components/AuthField'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

interface PasswordFormProps {
  busy: boolean
  error: string
  onSubmit: (oldPassword: string, newPassword: string) => Promise<boolean>
}

export default ({ busy, error, onSubmit }: PasswordFormProps) => {
  const t = useI18n()
  const theme = useTheme()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')

  const handleSubmit = async() => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setValidationError(t('account_field_required'))
      return
    }
    if (newPassword.length < 6) {
      setValidationError(t('account_password_min'))
      return
    }
    if (newPassword !== confirmPassword) {
      setValidationError(t('account_password_mismatch'))
      return
    }

    setValidationError('')
    if (await onSubmit(oldPassword, newPassword)) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <View style={styles.form}>
      <Text size={13} color={theme['c-font-label']} style={styles.tip}>{t('account_security_tip')}</Text>
      <AuthField
        label={t('account_old_password')}
        value={oldPassword}
        onChangeText={setOldPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
      />
      <AuthField
        label={t('account_new_password')}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
      />
      <AuthField
        label={t('account_confirm_password')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="password-new"
        onSubmitEditing={() => { void handleSubmit() }}
      />
      <AuthError message={validationError || error} />
      <AuthButton label={t('account_change_password_submit')} loading={busy} onPress={() => { void handleSubmit() }} />
    </View>
  )
}

const styles = createStyle({
  form: {
    gap: 12,
  },
  tip: {
    lineHeight: 20,
    marginBottom: 2,
  },
})
