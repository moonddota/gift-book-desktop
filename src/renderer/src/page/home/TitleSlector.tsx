import { DownOutlined } from '@ant-design/icons'
import { RouterPath } from '@renderer/router/RouterPath'
import { Button, Dropdown, MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'

export const TitleSlector = ({
  title,
  onOpenSecondaryDisplay,
  setOpenDeleteEventConfirmModal,
  setEditEventModalOpen
}: {
  title: string
  onOpenSecondaryDisplay: () => void
  setOpenDeleteEventConfirmModal: (isDelete: boolean) => void
  setEditEventModalOpen: (isOpen: boolean) => void
}): React.JSX.Element => {
  const navigate = useNavigate()
  const items: MenuProps['items'] = [
    { key: '1', label: '切换/创建事项' },
    { key: '2', label: '进入副屏' },
    { key: '3', label: '设置此事项' },
    { key: '4', label: '删除此事项' }
  ]

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    switch (e.key) {
      case '1':
        {
          navigate(RouterPath.login, { replace: true })
        }
        break
      case '2':
        onOpenSecondaryDisplay()
        break
      case '3':
        setEditEventModalOpen(true)
        break
      case '4':
        setOpenDeleteEventConfirmModal(true)
        break
    }
  }

  // 替换整个 return 部分
  return (
    <Dropdown
      menu={{ items, onClick: handleMenuClick }}
      classNames={{
        item: 'py-2! px-4! text-[#dc2626]! dark:bg-gray-200! dark:text-gray-800! dark:text-[#353637]! hover:bg-red-50! dark:hover:bg-gray-100!'
      }}
      trigger={['click']}
    >
      <Button
        icon={<DownOutlined className="text-[16px]!" />}
        iconPlacement="end"
        type="text"
        size="large"
        className="text-[#dc2626]! dark:text-[#353637]! w-min font-bold! p-0! text-[24px]!"
      >
        {title}
      </Button>
    </Dropdown>
  )
}
