import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useI18n } from '@/lang'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { confirmDialog, createStyle, exitApp as backHome } from '@/utils/tools'
import { NAV_MENUS } from '@/config/constant'
import type { InitState } from '@/store/common/state'
// import { navigations } from '@/navigation'
// import commonState from '@/store/common/state'
import { exitApp, setNavActiveId } from '@/core/common'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { getCurrentUser } from '@/features/auth/authState'

const styles = createStyle({
  container: {
    flex: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    // padding: 10,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    textAlign: 'center',
    marginLeft: 0,
  },
  menus: {
    flex: 1,
  },
  list: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 25,
    paddingRight: 25,
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContent: {
    width: 24,
    alignItems: 'center',
  },
  text: {
    paddingLeft: 20,
    // fontWeight: '500',
  },
  accountShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBody: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  accountName: {
    fontWeight: '700',
  },
  accountEmail: {
    marginTop: 3,
  },
  accountArrow: {
    marginLeft: 8,
  },
})

const Header = () => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  return (
    <View style={{ paddingTop: statusBarHeight, backgroundColor: theme['c-primary-light-700-alpha-500'] }}>
      <View style={styles.header}>
        <Text style={styles.headerText} size={28} color={theme['c-primary-dark-100-alpha-300']}>VisonCube Music</Text>
      </View>
    </View>
  )
}

type IdType = InitState['navActiveId'] | 'nav_exit' | 'back_home'

const MenuItem = ({ id, icon, onPress }: {
  id: IdType
  icon: string
  onPress: (id: IdType) => void
}) => {
  const t = useI18n()
  const activeId = useNavActiveId()
  const theme = useTheme()

  return activeId == id
    ? <View style={styles.menuItem}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['c-primary-font-active']} />
        </View>
        <Text style={styles.text} color={theme['c-primary-font']}>{t(id)}</Text>
      </View>
    : <TouchableOpacity style={styles.menuItem} onPress={() => { onPress(id) }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['c-font-label']} />
        </View>
        <Text style={styles.text}>{t(id)}</Text>
      </TouchableOpacity>
}

const AccountShortcut = ({ onPress }: { onPress: () => void }) => {
  const theme = useTheme()
  const t = useI18n()
  const user = getCurrentUser()
  if (!user) return null

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ ...styles.accountShortcut, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}
    >
      <View style={{ ...styles.accountAvatar, backgroundColor: theme['c-primary'] }}>
        <Text size={18} color={theme['c-primary-light-1000']} style={{ fontWeight: '800' }}>V</Text>
      </View>
      <View style={styles.accountBody}>
        <Text size={15} numberOfLines={1} style={styles.accountName}>{user.username}</Text>
        <Text size={12} numberOfLines={1} color={theme['c-font-label']} style={styles.accountEmail}>{user.email ?? t('account_no_email')}</Text>
      </View>
      <Icon name="chevron-right" size={13} color={theme['c-font-label']} style={styles.accountArrow} />
    </TouchableOpacity>
  )
}

export default memo(() => {
  const theme = useTheme()
  // console.log('render drawer nav')
  const showBackBtn = useSettingValue('common.showBackBtn')
  const showExitBtn = useSettingValue('common.showExitBtn')

  const openAccount = () => {
    global.lx.settingActiveId = 'account'
    global.app_event.changeMenuVisible(false)
    setNavActiveId('nav_setting')
  }

  const handlePress = (id: IdType) => {
    switch (id) {
      case 'nav_exit':
        void confirmDialog({
          message: global.i18n.t('exit_app_tip'),
          confirmButtonText: global.i18n.t('list_remove_tip_button'),
        }).then(isExit => {
          if (!isExit) return
          exitApp('Exit Btn')
        })
        return
      case 'back_home':
        backHome()
        return
    }

    global.app_event.changeMenuVisible(false)
    setNavActiveId(id)
  }


  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
      <Header />
      <AccountShortcut onPress={openAccount} />
      <ScrollView style={styles.menus}>
        <View style={styles.list}>
          {NAV_MENUS.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} onPress={handlePress} />)}
        </View>
      </ScrollView>

      {
        showBackBtn ? <MenuItem id="back_home" icon="home" onPress={handlePress} /> : null
      }
      {
        showExitBtn ? <MenuItem id="nav_exit" icon="exit2" onPress={handlePress} /> : null
      }
    </View>
  )
})

