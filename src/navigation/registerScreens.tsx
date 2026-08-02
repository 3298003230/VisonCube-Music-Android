// @flow

import { Navigation } from 'react-native-navigation'

import Home from '@/screens/Home'
import PlayDetail from '@/screens/PlayDetail'
import SonglistDetail from '@/screens/SonglistDetail'
import Comment from '@/screens/Comment'
import Auth from '@/screens/Auth'
import AccountChangePassword from '@/screens/AccountChangePassword'
import { Provider } from '@/store/Provider'

import {
  HOME_SCREEN,
  PLAY_DETAIL_SCREEN,
  SONGLIST_DETAIL_SCREEN,
  COMMENT_SCREEN,
  AUTH_SCREEN,
  ACCOUNT_CHANGE_PASSWORD_SCREEN,
  VERSION_MODAL,
  SYNC_MODE_MODAL,
  // SETTING_SCREEN,
} from './screenNames'
import VersionModal from './components/VersionModal'
import SyncModeModal from './components/SyncModeModal'

function WrappedComponent(Component: any) {
  return function inject(props: Record<string, any>) {
    const EnhancedComponent = () => (
      <Provider>
        <Component
          {...props}
        />
      </Provider>
    )

    return <EnhancedComponent />
  }
}

export default () => {
  Navigation.registerComponent(HOME_SCREEN, () => WrappedComponent(Home))
  Navigation.registerComponent(PLAY_DETAIL_SCREEN, () => WrappedComponent(PlayDetail))
  Navigation.registerComponent(SONGLIST_DETAIL_SCREEN, () => WrappedComponent(SonglistDetail))
  Navigation.registerComponent(COMMENT_SCREEN, () => WrappedComponent(Comment))
  Navigation.registerComponent(AUTH_SCREEN, () => WrappedComponent(Auth))
  Navigation.registerComponent(ACCOUNT_CHANGE_PASSWORD_SCREEN, () => WrappedComponent(AccountChangePassword))
  Navigation.registerComponent(VERSION_MODAL, () => WrappedComponent(VersionModal))
  Navigation.registerComponent(SYNC_MODE_MODAL, () => WrappedComponent(SyncModeModal))
  // Navigation.registerComponent(SETTING_SCREEN, () => WrappedComponent(Setting))

  console.info('All screens have been registered...')
}
