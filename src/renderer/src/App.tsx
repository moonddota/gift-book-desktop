import { useGlobalStore } from '@renderer/stores/global'
import { getThemeConfig } from '@renderer/theme'
import { App as AntdApp, ConfigProvider, Flex } from 'antd'
import 'antd/dist/reset.css'
import enUS from 'antd/locale/en_US'
import zhCN from 'antd/locale/zh_CN'
import { Suspense, useEffect } from 'react'
import { useImmer } from 'use-immer'
import { EventBusProvider } from '@renderer/utils/EventBus'
import Router from '@renderer/router'

function App(): React.JSX.Element {
  const { darkMode, lang } = useGlobalStore()
  const [is_dark, set_is_dark] = useImmer(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      document.documentElement.dataset.theme = 'dark'
      set_is_dark(true)
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.dataset.theme = 'light'
      set_is_dark(false)
    }
  }, [darkMode, set_is_dark])

  return (
    <Suspense
      fallback={
        <Flex className="!bg-[var(--color-layout-bg)] text-[white] !w-[100vw] !h-[100vh]">
          loding
        </Flex>
      }
    >
      <ConfigProvider locale={lang === 'zh' ? zhCN : enUS} theme={getThemeConfig(is_dark)}>
        <AntdApp>
          <EventBusProvider>
            <Router />
          </EventBusProvider>
        </AntdApp>
      </ConfigProvider>
    </Suspense>
  )
}

export default App
