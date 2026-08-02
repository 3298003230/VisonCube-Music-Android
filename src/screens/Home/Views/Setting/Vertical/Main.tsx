import { useMemo, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import {
  SETTING_GROUPS,
  SettingContent,
  type SettingGroup,
  type SettingGroupIds,
  type SettingScreenIds,
} from '../Main'

const GroupCard = ({ group, onPress }: { group: SettingGroup, onPress: (id: SettingGroupIds) => void }) => {
  const theme = useTheme()
  const t = useI18n()

  return (
    <TouchableOpacity
      onPress={() => { onPress(group.id) }}
      style={{ ...styles.groupCard, backgroundColor: theme['c-primary-light-1000-alpha-700'], borderColor: theme['c-border-background'] }}
    >
      <View style={styles.groupBody}>
        <Text size={16} style={styles.groupTitle}>{t(group.titleKey)}</Text>
        <Text size={12} color={theme['c-font-label']} style={styles.groupSummary}>{group.screens.map(id => t(`setting_${id}`)).join(' · ')}</Text>
      </View>
      <Icon name="chevron-right" size={14} color={theme['c-font-label']} />
    </TouchableOpacity>
  )
}

const PageHeader = ({ title, onBack }: { title: string, onBack: () => void }) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.pageHeader, borderBottomColor: theme['c-border-background'] }}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="chevron-left" size={18} color={theme['c-font']} />
      </TouchableOpacity>
      <Text size={17} style={styles.pageTitle}>{title}</Text>
    </View>
  )
}

export default () => {
  const t = useI18n()
  const initialScreen = global.lx.settingActiveId
  const [groupId, setGroupId] = useState<SettingGroupIds | null>(null)
  const [screenId, setScreenId] = useState<SettingScreenIds | null>(initialScreen === 'account' ? 'account' : null)
  const theme = useTheme()

  const activeGroup = useMemo(() => SETTING_GROUPS.find(group => group.id === groupId) ?? null, [groupId])

  const openGroup = (id: SettingGroupIds) => {
    setScreenId(null)
    setGroupId(id)
    const group = SETTING_GROUPS.find(item => item.id === id)
    if (group) global.lx.settingActiveId = group.screens[0]
  }

  const goBack = () => {
    if (screenId) {
      setScreenId(null)
      return
    }
    setGroupId(null)
  }

  if (screenId) {
    return (
      <View style={styles.container}>
        <PageHeader title={t(`setting_${screenId}`)} onBack={goBack} />
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.detailContent}>
          <SettingContent id={screenId} />
        </ScrollView>
      </View>
    )
  }

  if (activeGroup) {
    return (
      <View style={styles.container}>
        <PageHeader title={t(activeGroup.titleKey)} onBack={goBack} />
        <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={styles.detailContent}>
          {activeGroup.screens.map(id => <SettingContent key={id} id={id} />)}
        </ScrollView>
      </View>
    )
  }

  return (
    <ScrollView keyboardShouldPersistTaps="always" contentContainerStyle={{ ...styles.content, backgroundColor: theme['c-content-background'] }}>
      <Text size={13} color={theme['c-font-label']} style={styles.overviewTip}>{t('setting_groups_summary')}</Text>
      {SETTING_GROUPS.map(group => <GroupCard key={group.id} group={group} onPress={openGroup} />)}
    </ScrollView>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  content: {
    padding: 15,
    flexGrow: 1,
  },
  overviewTip: {
    lineHeight: 20,
    marginBottom: 12,
  },
  groupCard: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupBody: {
    flex: 1,
    minWidth: 0,
  },
  groupTitle: {
    fontWeight: '700',
  },
  groupSummary: {
    marginTop: 4,
  },
  pageHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontWeight: '700',
    marginLeft: 2,
  },
  detailContent: {
    padding: 15,
  },
})
