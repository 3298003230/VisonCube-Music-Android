import { Alert } from 'react-native'
// import { exitApp } from '@/utils/common'
import { setJSExceptionHandler, setNativeExceptionHandler } from 'react-native-exception-handler'
import { log } from '@/utils/log'
import { toast } from './tools'

const errorHandler = (e: Error, isFatal: boolean) => {
  if (isFatal) {
    const message = `应用运行出现异常，请联系管理员反馈。请附上刚才的操作步骤和“设置-错误日志”内容。\n\n错误：${e.name} ${e.message}`
    if (e.message.includes('Failed to construct \'Response\'')) {
      toast('应用运行出现异常，请联系管理员反馈。')
    } else {
      Alert.alert(
        '应用发生错误',
        message,
        [{
          text: '关闭',
        }],
      )
    }
  }
  log.error(e.stack)
}

if (process.env.NODE_ENV !== 'development') {
  setJSExceptionHandler(errorHandler)

  setNativeExceptionHandler((errorString) => {
    log.error(errorString)
    console.log('+++++', errorString, '+++++')
  }, false)
}
