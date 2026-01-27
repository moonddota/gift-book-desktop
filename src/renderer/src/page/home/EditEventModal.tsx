import { CloseOutlined } from '@ant-design/icons'
import VoiceSelector from '@renderer/components/VoiceSelector'
import { antdUtils } from '@renderer/utils/antd'
import { Button, DatePicker, Form, Input, Modal, Select, Space, Typography } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useImmer } from 'use-immer'

interface EditEventModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  initialData: {
    name: string
    startDateTime: string
    endDateTime: string | null
    recorder: string
    isSolemn: boolean
    voiceName: string | null
  }
  eventId: string
}

export const EditEventModal: React.FC<EditEventModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  eventId
}) => {
  const [name, setName] = useImmer(initialData.name)
  const [startDate, setStartDate] = useImmer<Dayjs>(dayjs(initialData.startDateTime))
  const [endDate, setEndDate] = useImmer<Dayjs | null>(
    initialData.endDateTime ? dayjs(initialData.endDateTime) : null
  )
  const [recorder, setRecorder] = useImmer(initialData.recorder)
  const [darkMode, setDarkMode] = useImmer(initialData.isSolemn)
  const [selectedVoice, setSelectedVoice] = useImmer<string | null>(initialData.voiceName)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initialData.name)
      setStartDate(dayjs(initialData.startDateTime))
      setEndDate(initialData.endDateTime ? dayjs(initialData.endDateTime) : null)
      setRecorder(initialData.recorder)
      setDarkMode(initialData.isSolemn)
      setSelectedVoice(initialData.voiceName)
    }
  }, [
    open,
    initialData.name,
    initialData.startDateTime,
    initialData.endDateTime,
    initialData.recorder,
    initialData.isSolemn,
    initialData.voiceName
  ])

  const handleFinalSave = async (): Promise<void> => {
    if (!name.trim()) {
      antdUtils.message?.error('请填写事项名称')
      return
    }
    await onSave({
      name,
      startDateTime: startDate.toISOString(),
      endDateTime: endDate?.toISOString() || null,
      recorder,
      isSolemn: darkMode,
      voiceName: selectedVoice
    })
    setPasswordModalOpen(false)
  }

  const handleSave = (): void => {
    setPasswordModalOpen(true)
  }

  const handlePasswordSubmit = async (values: any) => {
    const password = values.password
    if (!password) {
      antdUtils.message?.error('请输入密码')
      return
    }

    setConfirmLoading(true)
    try {
      const verifyRes = await window.electron.ipcRenderer.invoke('event:verify-password', {
        eventId,
        password
      })

      if (verifyRes.success) {
        setPasswordModalOpen(false)
        await handleFinalSave()
      } else {
        antdUtils.message?.error(verifyRes.error || '密码错误')
      }
    } catch (err) {
      console.error('密码验证失败:', err)
      antdUtils.message?.error('验证失败，请重试')
    } finally {
      setConfirmLoading(false)
    }
  }

  return (
    <>
      <Modal
        title="修改事项设置"
        open={open}
        onCancel={onClose}
        onOk={handleSave}
        okText="保存"
        cancelText="取消"
        width={600}
        centered
        destroyOnHidden={true}
        closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
        classNames={{
          title: 'text-[#dc2626]! dark:text-[#353637]! text-center text-[24px]!',
          container: 'dark:bg-gray-100! bg-white! px-auto!'
        }}
      >
        <Space orientation="vertical" className="w-full">
          <Typography.Text strong className="text-[#dc2626]! dark:text-[#353637]!">
            事项名称
          </Typography.Text>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：张三李四新婚之喜"
            className="dark:bg-gray-200! dark:text-gray-800!"
          />
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Space orientation="vertical" className="w-full">
              <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                开始时间
              </Typography.Text>
              <DatePicker
                showTime
                value={startDate}
                onChange={(date) => date && setStartDate(date)}
                className="w-full dark:bg-gray-200! dark:text-gray-800!"
              />
            </Space>
            <Space orientation="vertical" className="w-full">
              <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                结束时间
              </Typography.Text>
              <DatePicker
                showTime
                value={endDate}
                onChange={(date) => setEndDate(date)}
                className="w-full dark:bg-gray-200! dark:text-gray-800!"
              />
            </Space>
          </div>
          <Typography.Text strong className="mt-2 text-[#dc2626]! dark:text-[#353637]!">
            记账人
          </Typography.Text>
          <Input
            value={recorder}
            onChange={(e) => setRecorder(e.target.value)}
            placeholder="选填"
            className="dark:bg-gray-200! dark:text-gray-800!"
          />
          <Typography.Text strong className="mt-2 text-[#dc2626]! dark:text-[#353637]!">
            界面风格
          </Typography.Text>
          <Select
            value={darkMode ? 2 : 1}
            options={[
              { value: 1, label: '喜庆红（喜事）' },
              { value: 2, label: '肃穆灰（白事）' }
            ]}
            onSelect={(value) => setDarkMode(value === 2)}
            className="w-full dark:bg-gray-200! dark:text-gray-800!"
          />
          <Typography.Text strong className="mt-2 text-[#dc2626]! dark:text-[#353637]!">
            语音播报音色
          </Typography.Text>
          <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
        </Space>
      </Modal>

      <Modal
        title="请输入管理密码"
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        footer={null}
        centered
        destroyOnHidden={true}
        closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
        classNames={{
          title: 'text-[#dc2626]! dark:text-[#353637]! text-[20px]!',
          container: 'dark:bg-gray-100! bg-white! px-auto!'
        }}
      >
        <Form onFinish={handlePasswordSubmit} autoComplete="off">
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入管理密码!' }]}
            className="mb-4"
          >
            <Input.Password
              size="large"
              placeholder="管理密码"
              autoFocus
              className="dark:bg-gray-200! dark:text-gray-800!"
            />
          </Form.Item>
          <Form.Item className="text-center mb-0">
            <Space>
              <Button onClick={() => setPasswordModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                确认
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
