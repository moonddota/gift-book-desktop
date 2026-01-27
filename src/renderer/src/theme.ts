import { theme, ThemeConfig } from 'antd'

export const lightColors = {
  primary: '#dc2626' // 主色 - 高亮科技蓝
}

export const darkColors = {
  primary: '#353637' // 主色（提亮一点）
}
// 风格（比如 box-shadow 等）
export const lightStyle = {
  primaryShadow: '0 2px 0 rgb(42 121 255 / 10%)',
  dangerShadow: '0 2px 0 rgb(245 34 45 / 10%)', // 危险按钮阴影
  itemActiveBg: '#F2F6FC' // 菜单项激活背景色 - 浅灰白
}
export const darkStyle = {
  primaryShadow: '0 2px 0 rgb(92 156 255 / 10%)',
  dangerShadow: '0 2px 0 rgb(245 34 45 / 10%)', // 危险按钮阴影
  itemActiveBg: '#1d3466' // 菜单项激活背景色 - 深蓝黑
}

export const getThemeConfig = (isDark: boolean): ThemeConfig => {
  const colors = isDark ? darkColors : lightColors
  // const styles = isDark ? darkStyle : lightStyle;
  const algorithm = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm
  return {
    token: {
      // 全局 Design Token 配置
      colorPrimary: colors['primary']
    },
    cssVar: { prefix: 'ant' },
    hashed: false, // 根据官方文档，如果应用中只存在一个版本的 antd，可以选择关闭 hash 来进一步减小样式体积
    algorithm: algorithm,
    components: {
      Radio: {
        buttonCheckedBg: colors['primary'],
        buttonCheckedBgDisabled: colors['primary'],
        buttonCheckedColorDisabled: colors['primary'],
        buttonSolidCheckedActiveBg: colors['primary'],
        buttonSolidCheckedBg: colors['primary']
      }
    }
  }
}
