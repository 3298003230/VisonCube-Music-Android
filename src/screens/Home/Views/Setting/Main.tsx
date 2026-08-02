import { forwardRef, memo, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import LyricDesktop from './settings/LyricDesktop'
import Search from './settings/Search'
import List from './settings/List'
import Sync from './settings/Sync'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Version from './settings/Version'
import About from './settings/About'
import Account from './settings/Account'

export const SETTING_SCREENS = [
  'account',
  'basic',
  'player',
  'lyric_desktop',
  'search',
  'list',
  'sync',
  'backup',
  'other',
  'version',
  'about',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

export type SettingGroupIds = 'account' | 'general' | 'playback' | 'content' | 'data' | 'other'

export interface SettingGroup {
  id: SettingGroupIds
  titleKey: string
  screens: readonly SettingScreenIds[]
}

export const SETTING_GROUPS: readonly SettingGroup[] = [
  { id: 'account', titleKey: 'setting_group_account', screens: ['account'] },
  { id: 'general', titleKey: 'setting_group_general', screens: ['basic'] },
  { id: 'playback', titleKey: 'setting_group_playback', screens: ['player', 'lyric_desktop'] },
  { id: 'content', titleKey: 'setting_group_content', screens: ['search', 'list'] },
  { id: 'data', titleKey: 'setting_group_data', screens: ['sync', 'backup', 'other'] },
  { id: 'other', titleKey: 'setting_group_other', screens: ['version', 'about'] },
]

// interface MainProps {
//   onUpdateActiveId: (id: string) => void
// }
export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

export const SettingContent = memo(({ id }: { id: SettingScreenIds }) => {
  switch (id) {
    case 'account': return <Account />
    case 'player': return <Player />
    case 'lyric_desktop': return <LyricDesktop />
    case 'search': return <Search />
    case 'list': return <List />
    case 'sync': return <Sync />
    case 'backup': return <Backup />
    case 'other': return <Other />
    case 'version': return <Version />
    case 'about': return <About />
    case 'basic': return <Basic />
  }
})

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState(global.lx.settingActiveId)

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setId(id)
        })
      })
    },
  }))

  const component = useMemo(() => <SettingContent id={id} />, [id])

  return component
})


export default Main

