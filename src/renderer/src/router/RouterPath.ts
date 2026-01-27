import { NavigateFunction } from 'react-router-dom'

export const RouterPath = {
  login: '/app/login',
  home: '/app/home',
  sd: '/app/secondary-display' // 副屏
}

export const toLoginPage = (navigate: NavigateFunction): void => {
  navigate(RouterPath.login)
}

export const toHomePage = (navigate: NavigateFunction): void => {
  navigate(RouterPath.home)
}
