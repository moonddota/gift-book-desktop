import { antdUtils } from '@renderer/utils/antd'
import { Button, Checkbox, Flex, Modal, Typography } from 'antd'
import dayjs from 'dayjs'
import { saveAs } from 'file-saver' // 需要安装: pnpm add file-saver
import { memo } from 'react'
import { useImmer } from 'use-immer'

interface DeleteEventConfirmModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  onConfirm: () => void
  eventId: string
}

const DeleteEventConfirmModal = (props: DeleteEventConfirmModalProps): React.JSX.Element => {
  const { open, setOpen, onConfirm, eventId } = props
  const [checked, setChecked] = useImmer(false)

  // 导出备份
  const handleExportBackup = async (): Promise<void> => {
    const res = await window.electron.ipcRenderer.invoke('backup:export-full', { eventId })
    if (res.success) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      console.log(res.data)

      saveAs(
        blob,
        `数据备份_${res.data.name}_导出时间${dayjs(res.exportTime).format('YYYY-MM-DD HH:mm:ss')}.json`
      )
      antdUtils.message?.success('导出成功')
    } else {
      antdUtils.message?.error(res.error || '导出失败')
    }
  }

  return (
    <Modal
      title="删除事项"
      open={open}
      footer={null}
      closeIcon={null}
      destroyOnHidden
      classNames={{
        title: 'text-[#dc2626]! dark:text-[#353637]! text-center text-[24px]!',
        container: 'dark:bg-gray-100! bg-white! px-auto!'
      }}
    >
      <Flex vertical>
        {/* 主要修改点：为 Typography.Text 添加 className */}
        <Typography.Text strong className="text-[#dc2626]! dark:text-[#353637]! text-[16px]!">
          为了确保您的数据安全，删除事项前必须先导出数据备份。
        </Typography.Text>
        <Typography.Text className="pl-5! pt-2! text-[#dc2626]! dark:text-[#353637]!">
          1. 点击下方“导出备份”按钮，下载并保存到您的电脑。
        </Typography.Text>
        <Typography.Text className="pl-5! text-[#dc2626]! dark:text-[#353637]!">
          2. 确认已成功导出后，勾选“我已成功导出备份”。
        </Typography.Text>
        <Typography.Text className="pl-5! text-[#dc2626]! dark:text-[#353637]!">
          3. 系统会要求输入管理密码后才会执行删除。
        </Typography.Text>
        <Checkbox
          className="rounded-lg mt-2! pl-5! py-2! bg-red-50!  hover:bg-red-100! dark:bg-gray-100! dark:hover:bg-gray-200! dark:text-[black]!"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        >
          我已成功导出数据备份
        </Checkbox>
        <Flex className="my-5! justify-around">
          <Button size="large" onClick={() => setOpen(false)}>
            关闭
          </Button>
          <Button size="large" onClick={handleExportBackup}>
            导出备份
          </Button>
          <Button type="primary" size="large" disabled={!checked} onClick={onConfirm}>
            已导出备份，继续删除
          </Button>
        </Flex>
      </Flex>
    </Modal>
  )
}

export default memo(DeleteEventConfirmModal)
