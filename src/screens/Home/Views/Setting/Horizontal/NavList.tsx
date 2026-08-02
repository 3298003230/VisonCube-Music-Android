import { memo, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_GROUPS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'

const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()
  const active = activeId == id

  return (
    <View style={styles.listItem}>
      {active ? <Icon style={styles.listActiveIcon} name="chevron-right" size={12} color={theme['c-primary-font']} /> : null}
      <TouchableOpacity style={styles.listName} onPress={() => { onPress(id) }}>
        <Text numberOfLines={1} size={16} color={active ? theme['c-primary-font'] : theme['c-font']}>{t(`setting_${id}`)}</Text>
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})

export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)
  const theme = useTheme()
  const t = useI18n()

  const handleChangeId = (id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      {SETTING_GROUPS.map(group => (
        <View key={group.id} style={styles.group}>
          <Text size={12} color={theme['c-font-label']} style={styles.groupTitle}>{t(group.titleKey)}</Text>
          {group.screens.map(id => <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />)}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
    paddingTop: 8,
  },
  group: {
    paddingBottom: 8,
  },
  groupTitle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: '600',
  },
  listItem: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    paddingLeft: 10,
  },
  listActiveIcon: {
    marginLeft: 3,
    textAlign: 'center',
  },
  listName: {
    minHeight: 40,
    justifyContent: 'center',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 5,
  },
})
