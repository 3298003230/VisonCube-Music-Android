import { useState } from 'react'
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, TouchableOpacity, View } from 'react-native'
import { Navigation } from 'react-native-navigation'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { changePassword } from '@/features/auth/authState'
import { createStyle, toast } from '@/utils/tools'
import PasswordForm from './PasswordForm'

interface Props {
  componentId: string
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请稍后重试'

export default ({ componentId }: Props) => {
  const t = useI18n()
  const theme = useTheme()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async(oldPassword: string, newPassword: string) => {
    setBusy(true)
    setError('')
    try {
      await changePassword(oldPassword, newPassword)
      toast(t('account_password_updated'))
      await Navigation.pop(componentId)
      return true
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={{ ...styles.root, backgroundColor: theme['c-content-background'] }}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
          <TouchableOpacity onPress={() => { void Navigation.pop(componentId) }} style={styles.backButton}>
            <Icon name="chevron-left" size={20} color={theme['c-font']} />
          </TouchableOpacity>
          <Text size={18} style={styles.headerTitle}>{t('account_change_password')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ ...styles.panel, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}>
            <PasswordForm busy={busy} error={error} onSubmit={handleSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = createStyle({
  root: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    marginLeft: 4,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
})
