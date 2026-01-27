// renderer/pages/LoginPage.tsx
import VoiceSelector from '@renderer/components/VoiceSelector'
import { RouterPath } from '@renderer/router/RouterPath'
import { useGlobalStore } from '@renderer/stores/global'
import { antdUtils } from '@renderer/utils/antd'
import {
  Button,
  Card,
  Col,
  Collapse,
  DatePicker,
  Flex,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import React, { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useImmer } from 'use-immer'

const LoginPage = (): React.JSX.Element => {
  const navigate = useNavigate()
  const { darkMode, setDarkMode } = useGlobalStore()

  // 表单状态
  const [eventName, setEventName] = useImmer('')
  const [startDate, setStartDate] = useImmer<Dayjs>(dayjs())
  const [endDate, setEndDate] = useImmer<Dayjs>(dayjs().add(1, 'day'))
  const [password, setPassword] = useImmer('')
  const [recorder, setRecorder] = useImmer('')
  const [selectedVoice, setSelectedVoice] = useImmer<string | null>(null)
  const [existingEvents, setExistingEvents] = useImmer<{ id: string; name: string }[]>([])
  const [selectedEventId, setSelectedEventId] = useImmer<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useImmer({ show: false, password: '' })
  const [selectedFileName, setSelectedFileName] = useImmer<string | null>(null)

  useEffect(() => {
    const loadEvents = async (): Promise<void> => {
      const result = await window.electron.ipcRenderer.invoke('event:list')
      if (result.success) {
        setExistingEvents(result.events.map((e) => ({ id: e.id, name: e.name })))
      }
    }
    loadEvents()
  }, [])
  // 创建事项
  const handleCreateEvent = async (): Promise<void> => {
    if (!eventName.trim() || !password.trim()) {
      antdUtils.message?.error('请填写事项名称和管理密码')
      return
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('event:create', {
        name: eventName,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate ? endDate.toISOString() : null,
        password: password,
        isSolemn: darkMode, // true = 肃穆灰（白事）
        voiceName: selectedVoice,
        recorder: recorder
      })

      if (result.success) {
        console.log('事项创建成功，ID:', result.eventId, typeof result.eventId)
        // antdUtils.message?.success(`创建成功！事项ID: ${result.eventId}`)
        navigate(RouterPath.home, { replace: true, state: { eventId: String(result.eventId) } })
      } else {
        if (result.error.includes('已存在')) {
          antdUtils.message?.error('事项名称重复，请修改名称')
        } else {
          antdUtils.message?.error('创建失败: ' + result.error)
        }
      }
    } catch (err) {
      console.error('IPC 调用失败:', err)
      antdUtils.message?.error('创建失败，请查看控制台')
    }
  }

  const handlePasswordConfirm = async (): Promise<void> => {
    if (!selectedEventId || !showPasswordModal.password.trim()) {
      antdUtils.message?.error('请输入密码')
      return
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('event:verify-password', {
        eventId: selectedEventId,
        password: showPasswordModal.password
      })

      if (result.success) {
        navigate(RouterPath.home, { replace: true, state: { eventId: String(selectedEventId) } })
      } else {
        antdUtils.message?.error('密码错误！')
      }
    } catch (err) {
      console.error('验证失败:', err)
      antdUtils.message?.error('验证失败，请查看控制台')
    } finally {
      setShowPasswordModal({ show: false, password: '' })
      setSelectedEventId(null)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.json')) {
      setSelectedFileName(file.name)
    } else {
      setSelectedFileName(null)
      antdUtils.message?.error('请选择有效的 JSON 备份文件')
    }
  }

  // 3. 恢复函数中读取文件
  const handleRestoreFromBackup = async () => {
    const fileInput = document.getElementById('backup-file-input') as HTMLInputElement
    const file = fileInput?.files?.[0]

    if (!file) {
      antdUtils.message?.error('请先选择文件')
      return
    }

    try {
      const text = await file.text()
      const eventData = JSON.parse(text)

      const result = await window.electron.ipcRenderer.invoke('backup:import-full', { eventData })
      if (result.success) {
        antdUtils.message?.success('数据恢复成功！')
        navigate(RouterPath.home, {
          replace: true,
          state: { eventId: String(result.eventId) }
        })
      } else {
        antdUtils.message?.error('恢复失败: ' + result.error)
      }
    } catch (err) {
      console.error('恢复错误:', err)
      antdUtils.message?.error('文件无效或恢复失败')
    } finally {
      // 清空文件选择（唯一合法的方式）
      if (fileInput) fileInput.value = ''
      setSelectedFileName(null)
    }
  }

  return (
    <Flex className="min-h-screen w-screen bg-[#ec9b9b] dark:bg-[#353637] items-center justify-center">
      <Card
        className={`w-[80vw] max-w-[819px] my-10! shadow-xl box-border bg-white dark:bg-white!`}
        title={
          <Typography.Title
            level={1}
            className={`pt-8! text-[#dc2626]! dark:text-[#353637]! text-center tracking-[0.2em] text-[32px]!`}
          >
            电子礼簿系统
          </Typography.Title>
        }
      >
        <Flex vertical>
          <Typography.Title level={4} className="text-[#dc2626]! dark:text-[#353637]!">
            选择事项
          </Typography.Title>
          <Row className="mt-3!">
            <Col span={20}>
              <Select
                className="w-full dark:bg-gray-200! dark:text-gray-800!"
                placeholder="请选择已有事项"
                size="large"
                value={selectedEventId}
                onChange={(value) => setSelectedEventId(value)}
                options={existingEvents.map((event) => ({
                  value: event.id,
                  label: event.name
                }))}
              />
            </Col>
            <Col offset={1} span={3}>
              <Button
                type="primary"
                className="w-full dark:bg-[#353637]!"
                size="large"
                disabled={!selectedEventId}
                onClick={() => {
                  if (selectedEventId) {
                    setShowPasswordModal({ show: true, password: '' })
                  }
                }}
              >
                进入
              </Button>
            </Col>
          </Row>
          <Typography.Title level={4} className="text-[#dc2626]! dark:text-[#353637]! mt-3!">
            或 从备份文件恢复
          </Typography.Title>
          <Row className="mt-3!">
            <Col span={20}>
              {/* 隐藏原生 input */}
              <input
                id="backup-file-input"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label="选择备份文件"
              />
              <Button
                className="w-full dark:bg-gray-200! dark:text-gray-800!"
                size="large"
                onClick={() => document.getElementById('backup-file-input')?.click()}
              >
                {selectedFileName ? `已选择: ${selectedFileName}` : '选择备份文件 (.json)'}
              </Button>
            </Col>
            <Col offset={1} span={3}>
              <Button
                type="primary"
                className="w-full"
                size="large"
                disabled={!selectedFileName}
                onClick={handleRestoreFromBackup}
              >
                恢复
              </Button>
            </Col>
          </Row>

          <Typography.Title level={4} className="text-[#dc2626]! dark:text-[#353637]! mt-3!">
            或 创建新事项
          </Typography.Title>

          <Input
            placeholder="事项名称（例如：张三李四新婚之喜）"
            size="large"
            value={eventName}
            className="dark:bg-gray-200! dark:text-gray-800!"
            onChange={(e) => setEventName(e.target.value)}
          />
          {/* 时间选择 */}
          <Row className="mt-3!">
            <Col span={11}>
              <Space vertical>
                <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                  开始时间
                </Typography.Text>
                <DatePicker
                  showTime
                  showNow
                  value={startDate}
                  onChange={(date) => date && setStartDate(date)}
                  size="large"
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Space>
            </Col>
            <Col span={11} offset={1}>
              <Space vertical>
                <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                  结束时间
                </Typography.Text>
                <DatePicker
                  showTime
                  showNow
                  value={endDate}
                  onChange={(date) => date && setEndDate(date)}
                  size="large"
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Space>
            </Col>
          </Row>

          <Typography.Text className="text-[#dc2626]! dark:text-[#353637]! mt-3!">
            设置管理密码，请牢记
          </Typography.Text>
          <Input
            className="mt-3! dark:bg-gray-200! dark:text-gray-800!"
            placeholder="设置管理密码，请牢记"
            size="large"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* 更多设置（Collapse） */}
          <Collapse
            className="mt-3!"
            items={[
              {
                key: '1',
                showArrow: true,
                label: '更多设置',
                classNames: {
                  header: 'w-30 text-[#dc2626]! dark:text-[#353637]!',
                  body: 'px-10!'
                },
                children: (
                  <Flex vertical>
                    {/* 界面风格 */}
                    <Typography.Text className="text-[#dc2626]! dark:text-[#353637]! font-bold">
                      界面风格
                    </Typography.Text>
                    <Select
                      className="w-full mt-3! dark:bg-gray-200! dark:text-gray-800!"
                      value={darkMode ? 2 : 1}
                      size="large"
                      options={[
                        { value: 1, label: '喜庆红（喜事）' },
                        { value: 2, label: '肃穆灰（白事）' }
                      ]}
                      onSelect={(value) => {
                        setDarkMode(value === 2)
                      }}
                    />
                    {/* 语音音色 */}
                    <Typography.Text className="mt-3! text-[#dc2626]! dark:text-[#353637]! font-bold">
                      语音播报音色
                    </Typography.Text>
                    <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
                    {/* 记账人 */}
                    <Typography.Text className="mt-3! text-[#dc2626]! dark:text-[#353637]! font-bold">
                      记账人
                    </Typography.Text>
                    <Input
                      className="mt-3! dark:bg-gray-200! dark:text-gray-800!"
                      size="large"
                      placeholder="记账人（例如：王五，选填）"
                      value={recorder}
                      onChange={(e) => setRecorder(e.target.value)}
                    />
                  </Flex>
                )
              }
            ]}
            ghost
            expandIconPlacement="end"
          />

          {/* 创建按钮 */}
          <Button type="primary" size="large" className="mt-6!" onClick={handleCreateEvent}>
            创建并进入
          </Button>
        </Flex>
      </Card>
      <Modal
        open={showPasswordModal.show}
        title="请输入管理密码"
        okText="确认"
        cancelText="取消"
        onOk={handlePasswordConfirm}
        onCancel={() => setShowPasswordModal({ show: false, password: '' })}
        destroyOnHidden={true}
        centered
        classNames={{
          title: 'text-[#dc2626]! dark:text-[#353637]!',
          container: 'dark:bg-gray-100! bg-white!'
        }}
      >
        <Input
          size="large"
          autoFocus
          type="password"
          placeholder="管理密码"
          value={showPasswordModal.password}
          className="dark:bg-gray-200! dark:text-gray-800!"
          onChange={(e) =>
            setShowPasswordModal((draft) => {
              draft.password = e.target.value
            })
          }
          onPressEnter={handlePasswordConfirm}
        />
      </Modal>
    </Flex>
  )
}

export default memo(LoginPage)
