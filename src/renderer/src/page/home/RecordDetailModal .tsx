import {
  CloseOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useGlobalStore } from '@renderer/stores/global'
import { antdUtils } from '@renderer/utils/antd'
import { Button, Flex, Form, Input, Modal, Radio, Space, Timeline, Typography } from 'antd'
import React, { useEffect, useRef } from 'react'
import { useImmer } from 'use-immer'
import type { RecordItem } from '../../../../sharedTypes'

const { Title, Text } = Typography

interface RecordDetailModalProps {
  open: boolean
  record: RecordItem | null
  onClose: () => void
  onSave: (id: string, updatedData: Partial<RecordItem>) => Promise<boolean>
  eventId: string
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  open,
  record,
  onClose,
  onSave,
  eventId
}) => {
  const [form] = Form.useForm()
  const allValues = Form.useWatch([], form)
  const { darkMode } = useGlobalStore()

  const [loading, setLoading] = useImmer(false)
  const [passwordModalOpen, setPasswordModalOpen] = useImmer(false)
  const [timelineItems, setTimelineItems] = useImmer<
    { label: string; children: React.ReactNode }[]
  >([])
  const [isEditing, setIsEditing] = useImmer(false) // 新增：是否处于纠错模式
  const initialFormValuesRef = useRef<Record<string, any> | null>(null)

  const hasChanged = React.useMemo(() => {
    if (!initialFormValuesRef.current) return false
    // 深比较（简单场景可用 JSON.stringify）
    return JSON.stringify(allValues) !== JSON.stringify(initialFormValuesRef.current)
  }, [allValues])

  useEffect(() => {
    if (!record) return

    const items: { label: string; children: React.ReactNode }[] = []

    //  1. 添加“创建记录”节点
    if (record.createdAt) {
      items.push({
        label: new Date(record.createdAt).toLocaleString('zh-CN'),
        children: (
          <Flex className="text-sm">
            <Text type="success" strong>
              创建记录
            </Text>
          </Flex>
        )
      })
    }

    // 2. 添加后续修改历史
    let voidTimestamp: string | undefined
    let voidReason: string | undefined
    void voidReason

    if (record.revision_history?.length) {
      record.revision_history.forEach((entry) => {
        try {
          const history = JSON.parse(entry.history)
          if (history.voided) {
            voidTimestamp = new Date(entry.timestamp).toLocaleString('zh-CN')
            voidReason = history.revision
          } else {
            items.push({
              label: new Date(entry.timestamp).toLocaleString('zh-CN'),
              children: (
                <div className="text-sm">
                  <Text className="text-[black]!">修改内容：</Text>
                  {entry.revision}
                </div>
              )
            })
          }
        } catch (e) {
          console.warn('Failed to parse history', e)
        }
      })
    }

    // 3. 添加作废节点（如果已作废）
    if (record.voided) {
      items.push({
        label: voidTimestamp
          ? new Date(voidTimestamp).toLocaleString('zh-CN')
          : new Date().toLocaleString('zh-CN'),
        children: (
          <div>
            <Text type="danger" strong>
              此记录已被作废
            </Text>
            {record.voided_reason && (
              <div className="mt-1 text-sm">
                <Text strong className="text-[black]!">
                  作废理由：
                </Text>
                {record.voided_reason}
              </div>
            )}
          </div>
        )
      })
    }

    setTimelineItems(items)
  }, [record])

  // 初始化表单值 & 缓存初始值
  useEffect(() => {
    if (record && open) {
      const initialValues = {
        name: record.name || '',
        amount: record.amount || '',
        payment_type: record.payment_type ?? 1,
        gift: record.gift || '',
        relationship: record.relationship || '',
        telephone: record.telephone || '',
        address: record.address || '',
        note: record.note || ''
      }
      form.setFieldsValue(initialValues)
      initialFormValuesRef.current = initialValues
      setIsEditing(false)
    }
  }, [record, open, form])

  const handleEditToggle = (): void => {
    if (isEditing) {
      // 取消纠错：还原表单
      if (initialFormValuesRef.current) {
        form.setFieldsValue(initialFormValuesRef.current)
      }
      setIsEditing(false)
    } else {
      // 开始纠错
      setIsEditing(true)
    }
  }

  const handleSaveClick = (): void => {
    // 不再需要手动 validate 或 hasFormChanged
    form.validateFields().then(() => {
      setPasswordModalOpen(true)
    })
  }

  const handlePasswordConfirm = async (password: string): Promise<void> => {
    const res = await window.electron.ipcRenderer.invoke('event:verify-password', {
      eventId,
      password
    })
    if (!res.success) {
      antdUtils.message?.error(res.error || '密码错误')
      return
    }

    const values = form.getFieldsValue()
    setLoading(true)
    try {
      const success = await onSave(record!.id ?? '', values)
      if (success) {
        onClose()
        antdUtils.message?.success('修改成功')
      }
    } finally {
      setLoading(false)
      setPasswordModalOpen(false)
    }
  }

  const handleVoidRecord = async (): Promise<void> => {
    if (!record || record.voided) return

    const reason = await new Promise<string | null>((resolve) => {
      antdUtils.modal?.confirm({
        title: '作废记录',
        icon: <ExclamationCircleOutlined />,
        content: (
          <Input.TextArea
            placeholder="请输入作废原因（可选）"
            autoSize={{ minRows: 2 }}
            id="void-reason"
          />
        ),
        okText: '确认作废',
        cancelText: '取消',
        centered: true,
        onOk() {
          resolve(
            (document.getElementById('void-reason') as HTMLTextAreaElement)?.value.trim() || ''
          )
        },
        onCancel() {
          resolve(null)
        }
      })
    })

    if (reason === null || reason.length === 0) {
      antdUtils.message?.error('必须输入作废原因')
      return
    }

    const password = await new Promise<string | null>((resolve) => {
      antdUtils.modal?.confirm({
        title: '密码验证',
        content: <Input.Password placeholder="请输入操作密码" id="void-password" />,
        okText: '确认',
        cancelText: '取消',
        centered: true,
        onOk() {
          resolve((document.getElementById('void-password') as HTMLInputElement)?.value || null)
        },
        onCancel() {
          resolve(null)
        }
      })
    })

    if (!password || password.length === 0) {
      antdUtils.message?.error('必须输入密码')
      return
    }

    const verifyRes = await window.electron.ipcRenderer.invoke('event:verify-password', {
      eventId,
      password
    })
    if (!verifyRes.success) {
      antdUtils.message?.error(verifyRes.error || '密码错误')
      return
    }

    const voidRes = await window.electron.ipcRenderer.invoke('record:void', {
      eventId,
      id: record.id,
      reason: reason || undefined
    })
    if (voidRes.success) {
      antdUtils.message?.success('记录已作废')
      onClose()
      onSave(record.id ?? '', { voided: true, voided_reason: reason })
    } else {
      antdUtils.message?.error(voidRes.error || '作废失败')
    }
  }

  const PasswordConfirmModal = (): React.ReactElement => (
    <Modal title="请输入操作密码" open={passwordModalOpen} footer={null} closable={false}>
      <Form
        onFinish={async (values) => {
          await handlePasswordConfirm(values.password)
        }}
      >
        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="密码" />
        </Form.Item>
        <Form.Item className="text-right">
          <Space>
            <Button onClick={() => setPasswordModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认修改
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )

  const isFormDisabled = record?.voided || !isEditing

  const primaryColor = darkMode ? '#353637' : '#dc2626'

  // 未选中时的边框色（必须比主色浅！）
  const unCheckedBorderColor = darkMode ? '#ced4da' : '#d9d9d9'

  // 文字颜色
  const textColor = isFormDisabled
    ? darkMode
      ? '#6c757d'
      : '#bfbfbf'
    : darkMode
      ? '#353637'
      : '#dc2626'

  useEffect(() => {
    const styleId = 'record-detail-modal-radio-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
    .record-detail-modal .radio-theme .ant-radio .ant-radio-inner {
      border-color:  $ {unCheckedBorderColor} !important;
    }
    .record-detail-modal .radio-theme .ant-radio-checked .ant-radio-inner {
      border-color: white !important;
    }
    .record-detail-modal .radio-theme .ant-radio-checked .ant-radio-inner::after {
      background-color: white !important;
    }
    .record-detail-modal .radio-theme .ant-radio:not(.ant-radio-checked):hover .ant-radio-inner {
      border-color:  $ {primaryColor} !important;
    }
    .record-detail-modal .radio-theme .ant-radio-disabled .ant-radio-inner {
      border-color:  $ {darkMode ? '#e9ecef' : '#d9d9d9'} !important;
      background-color: #f5f5f5 !important;
    }
    .record-detail-modal .radio-theme .ant-radio-disabled.ant-radio-checked .ant-radio-inner::after {
      background-color:  $ {darkMode ? '#adb5bd' : '#bfbfbf'} !important;
    }
  `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [unCheckedBorderColor, primaryColor, darkMode])

  if (!record) return null

  return (
    <>
      <Modal
        className="record-detail-modal"
        title={
          <Flex vertical>
            <Typography.Title level={3} className="m-0! dark:text-[black]!">
              {`${record.name}的礼金详情`}
            </Typography.Title>
            {record.voided && (
              <Typography.Text className="m-0!" type="warning">
                （警告：此宾客数据存在修改，请自行验证数据真实性！）
              </Typography.Text>
            )}
          </Flex>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        width={timelineItems.length > 0 ? 800 : 500}
        destroyOnHidden
        closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
        classNames={{
          title: 'text-center',
          container: 'dark:bg-gray-100! bg-white!'
        }}
      >
        <Flex gap="large">
          <Flex className="flex-1 overflow-y-auto pr-2!" vertical>
            {timelineItems.length > 0 && (
              <Title level={4} className="dark:text-[black]!">
                当前记录信息
              </Title>
            )}
            <Form
              form={form}
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              initialValues={{
                name: record.name || '',
                amount: record.amount || '',
                payment_type: record.payment_type ?? 1,
                gift: record.gift || '',
                relationship: record.relationship || '',
                telephone: record.telephone || '',
                address: record.address || '',
                note: record.note || ''
              }}
              classNames={{ label: 'dark:text-[black]!' }}
            >
              {record.voided && (
                <Form.Item
                  className="w-full! bg-red-50 border-red-500 border-1 p-3! rounded-lg"
                  colon={false}
                  label=""
                >
                  <WarningOutlined className="text-red-800!" />
                  <Text strong className="text-red-800!">
                    此记录已作废。
                  </Text>
                </Form.Item>
              )}

              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input
                  type="text"
                  placeholder="姓名"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
                <Input
                  type="number"
                  placeholder="金额（元）"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item
                name="payment_type"
                label="收款类型"
                rules={[{ required: true, message: '请选择收款类型' }]}
                className="radio-theme"
              >
                <Radio.Group
                  size="small"
                  disabled={isFormDisabled}
                  options={[
                    { value: 1, label: <span style={{ color: textColor }}>现金</span> },
                    { value: 2, label: <span style={{ color: textColor }}>微信</span> },
                    { value: 3, label: <span style={{ color: textColor }}>支付宝</span> },
                    { value: 4, label: <span style={{ color: textColor }}>其他</span> }
                  ]}
                />
              </Form.Item>

              <Form.Item name="gift" label="礼品">
                <Input
                  type="text"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item name="relationship" label="关系">
                <Input
                  type="text"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item name="telephone" label="电话">
                <Input
                  type="text"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item name="address" label="住址">
                <Input
                  type="text"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              <Form.Item name="note" label="备注">
                <Input.TextArea
                  rows={3}
                  placeholder="备注内容（选填）"
                  readOnly={isFormDisabled}
                  className="dark:bg-gray-200! dark:text-gray-800!"
                />
              </Form.Item>

              {/* 纠错保存按钮：仅在编辑模式且有修改时显示 */}
              {isEditing && (
                <Form.Item className="text-center">
                  <Button
                    type="primary"
                    onClick={handleSaveClick}
                    disabled={!hasChanged}
                    loading={loading}
                  >
                    纠错保存
                  </Button>
                </Form.Item>
              )}
            </Form>
            <Flex justify="space-between">
              {!record.voided && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleVoidRecord}
                  disabled={record.voided}
                  className="dark:bg-[white]!"
                >
                  作废此条记录
                </Button>
              )}

              {/* 纠错 / 取消纠错 按钮 */}
              {!record.voided && (
                <Button onClick={handleEditToggle}>{isEditing ? '取消纠错' : '纠错'}</Button>
              )}
            </Flex>
          </Flex>

          {timelineItems.length > 0 && (
            <Flex className="flex-1 overflow-y-auto pl-2!" vertical>
              <Title level={4} className="dark:text-[black]!">
                操作历史
              </Title>
              <Timeline
                items={timelineItems}
                mode="left"
                classNames={{ itemTitle: 'text-[black]!', itemContent: 'text-[black]!' }}
              />
            </Flex>
          )}
        </Flex>
      </Modal>

      <PasswordConfirmModal />
    </>
  )
}
