import { SecondaryDisplay } from '@renderer/page/home/SecondaryDisplay'
import { antdUtils } from '@renderer/utils/antd'
import { App } from 'antd'
import React, { useEffect } from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { RouterPath } from './RouterPath'

const LoginPage = React.lazy(() => import('@renderer/page/login'))
const HomePage = React.lazy(() => import('@renderer/page/home'))

const ProtectedRoute = (): React.JSX.Element => {
  return <Outlet></Outlet>
}

const router = createHashRouter([
  { path: RouterPath.sd, element: <SecondaryDisplay /> },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'home', element: <HomePage /> }
    ]
  },
  { path: '*', element: <Navigate to={RouterPath.login} replace /> }
])

const Router = (): React.JSX.Element => {
  const { notification, message, modal } = App.useApp()

  useEffect(() => {
    antdUtils.setMessageInstance(message)
    antdUtils.setNotificationInstance(notification)
    antdUtils.setModalInstance(modal)
  }, [notification, message, modal])

  return <RouterProvider router={router} />
}

export default Router
