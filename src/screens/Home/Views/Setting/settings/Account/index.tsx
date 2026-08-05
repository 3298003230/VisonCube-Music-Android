import { useEffect, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import AuthButton from '@/screens/Auth/components/AuthButton'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { getCurrentUser, refreshUser, signOut } from '@/features/auth/authState'
import { type AuthUser } from '@/features/auth/models'
import { confirmDialog, createStyle } from '@/utils/tools'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import {
  getMusicCloudSyncStatus,
  resolveMusicPlaylistConflicts,
  subscribeMusicCloudSyncStatus,
  syncMusicCloudNow,
} from '@/features/musicSync'
import Section from '../../components/Section'
import InfoRow from './InfoRow'

const getRoleLabel = (user: AuthUser, t: ReturnType<typeof useI18n>) => {
  if (user.role === 'admin') return t('account_role_admin')
  if (user.role === 'user') return t('account_role_user')
  return user.role
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [user, setUser] = useState<AuthUser | null>(getCurrentUser())
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState(getMusicCloudSyncStatus())

  useEffect(() => {
    let active = true
    void refreshUser().then(nextUser => {
      if (active) setUser(nextUser)
    }).catch(() => {
      // Keep the locally restored user visible when a refresh is temporarily unavailable.
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => subscribeMusicCloudSyncStatus(setSyncStatus), [])

  const handleChangePassword = () => {
    const componentId = commonState.componentIds.home
    if (componentId) void navigations.pushAccountChangePasswordScreen(componentId)
  }

  const handleLogout = async() => {
    if (logoutBusy) return
    const confirmed = await confirmDialog({
      message: t('account_logout_confirm'),
      confirmButtonText: t('account_logout'),
    })
    if (!confirmed) return

    setLogoutBusy(true)
    try {
      await signOut()
      await navigations.pushAuthScreen(async() => {
        await navigations.pushHomeScreen()
      })
    } finally {
      setLogoutBusy(false)
    }
  }

  const username = user?.username ?? '-'
  const email = user?.email ?? t('account_no_email')
  const role = user ? getRoleLabel(user, t) : '-'
  const verified = Boolean(user?.email && user.email_verified_at)
  const syncBusy = syncStatus.phase === 'syncing'
  const syncStatusText = (() => {
    switch (syncStatus.phase) {
      case 'syncing': return t('account_sync_syncing')
      case 'success': return t('account_sync_success')
      case 'partial': return t('account_sync_partial')
      case 'error': return t('account_sync_error')
      case 'conflict': return t('account_sync_conflict', { num: syncStatus.conflictCount })
      default: return t('account_sync_idle')
    }
  })()

  return (
    <Section title={t('account_title')}>
      <View style={styles.content}>
        <View style={{ ...styles.profile, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}>
          <View style={{ ...styles.avatar, backgroundColor: theme['c-primary'] }}>
            <Text size={24} color={theme['c-primary-light-1000']} style={styles.avatarText}>V</Text>
          </View>
          <View style={styles.profileBody}>
            <Text size={20} numberOfLines={1} style={styles.username}>{username}</Text>
            <Text size={13} color={theme['c-font-label']} style={styles.status}>{t('account_logged_in')}</Text>
          </View>
          <View style={{ ...styles.role, backgroundColor: theme['c-primary-light-100-alpha-700'] }}>
            <Text size={12} color={theme['c-primary-font-active']} style={styles.roleText}>{role}</Text>
          </View>
        </View>

        <View style={{ ...styles.info, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}>
          <InfoRow label={t('account_username')} value={username} />
          <InfoRow label={t('account_email')} value={email} />
          <InfoRow label={t('account_email_status')} value={verified ? t('account_email_verified') : t('account_email_unverified')} last />
        </View>

        <View style={{ ...styles.sync, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}>
          <Text size={16} style={styles.syncTitle}>{t('account_sync_title')}</Text>
          <Text size={13} color={theme['c-font-label']} style={styles.syncStatus}>{syncStatusText}</Text>
          {syncStatus.lastSuccessAt
            ? <Text size={12} color={theme['c-font-label']} style={styles.syncMeta}>{t('account_sync_last', { time: new Date(syncStatus.lastSuccessAt).toLocaleString() })}</Text>
            : null}
          {syncStatus.error
            ? <Text size={12} color={theme['c-font-label']} style={styles.syncMeta}>{syncStatus.error}</Text>
            : null}
          <View style={styles.syncActions}>
            {syncStatus.phase === 'conflict'
              ? <>
                  <TouchableOpacity
                    disabled={syncBusy}
                    onPress={() => { void resolveMusicPlaylistConflicts('local') }}
                    style={{ ...styles.syncButton, borderColor: theme['c-border-background'] }}
                  >
                    <Text size={13}>{t('account_sync_keep_local')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={syncBusy}
                    onPress={() => { void resolveMusicPlaylistConflicts('remote') }}
                    style={{ ...styles.syncButton, borderColor: theme['c-border-background'] }}
                  >
                    <Text size={13}>{t('account_sync_use_cloud')}</Text>
                  </TouchableOpacity>
                </>
              : syncStatus.phase !== 'success'
                ? <TouchableOpacity
                    disabled={syncBusy}
                    onPress={() => { void syncMusicCloudNow() }}
                    style={{ ...styles.syncButton, borderColor: theme['c-border-background'] }}
                  >
                    <Text size={13}>{t('account_sync_retry')}</Text>
                  </TouchableOpacity>
                : null}
          </View>
        </View>

        <View style={styles.securityHeader}>
          <Text size={16} style={styles.securityTitle}>{t('account_security')}</Text>
        </View>
        <Text size={13} color={theme['c-font-label']} style={styles.securityTip}>{t('account_security_tip')}</Text>
        <AuthButton label={t('account_change_password')} onPress={handleChangePassword} />

        <TouchableOpacity
          disabled={logoutBusy}
          onPress={() => { void handleLogout() }}
          style={{ ...styles.logout, borderColor: theme['c-border-background'], backgroundColor: theme['c-primary-light-1000-alpha-700'] }}
        >
          <Text size={15} color={theme['c-font']} style={styles.logoutText}>{t('account_logout')}</Text>
        </TouchableOpacity>
      </View>
    </Section>
  )
}

const styles = createStyle({
  content: {
    paddingHorizontal: 5,
  },
  profile: {
    minHeight: 88,
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
  },
  profileBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },
  username: {
    fontWeight: '700',
  },
  status: {
    marginTop: 4,
  },
  role: {
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  roleText: {
    fontWeight: '600',
  },
  info: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 22,
  },
  sync: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
  },
  syncTitle: {
    fontWeight: '700',
  },
  syncStatus: {
    lineHeight: 19,
    marginTop: 6,
  },
  syncMeta: {
    lineHeight: 18,
    marginTop: 4,
  },
  syncActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  syncButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  securityHeader: {
    marginBottom: 10,
  },
  securityTitle: {
    fontWeight: '700',
  },
  securityTip: {
    lineHeight: 20,
    marginBottom: 12,
  },
  logout: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  logoutText: {
    fontWeight: '700',
  },
})
