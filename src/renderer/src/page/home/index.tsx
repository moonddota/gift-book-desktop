import { RouterPath } from '@renderer/router/RouterPath'
import { useGlobalStore } from '@renderer/stores/global'
import { antdUtils } from '@renderer/utils/antd'
import { expectedOrder, playVoice } from '@renderer/utils/convertToChineseAmount'
import { useMount, useUnmount } from 'ahooks'
import { Button, Card, Col, Divider, Flex, Form, Input, Radio, Row, Space, Typography } from 'antd'
import React, { memo, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useImmer } from 'use-immer'
import { RecordItem } from '../../../../sharedTypes'
import { ConfirmModal } from './ConfirmModal'
import DeleteEventConfirmModal from './DeleteEventConfirmModal'
import { DisplayBoard } from './DisplayBoard'
import { EditEventModal } from './EditEventModal'
import { FunctionArea } from './FunctionArea'
import { RecordDetailModal } from './RecordDetailModal '
import { StatisticsModal } from './StatisticsModal'
import { TitleSlector } from './TitleSlector'

const HomePage = (): React.JSX.Element => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const leftColRef = useRef<HTMLDivElement>(null)
  const rightColRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const { setDarkMode } = useGlobalStore()
  const [eventData, setEventData] = useImmer({
    id: '',
    isSolemn: false,
    name: '',
    recorder: '',
    voiceName: '',
    startDateTime: '',
    endDateTime: ''
  })
  const [formList, setFormList] = useImmer<string[]>([])
  const [records, setRecords] = useImmer<RecordItem[]>([])
  const [canPlayVoice, setCanPlayVoice] = useImmer(true)

  const [confirmModalData, setConfirmModalData] = useImmer<{
    open: boolean
    data: RecordItem
    isDuplicateName: boolean
    eventId: string
  }>({
    open: false,
    data: {} as RecordItem,
    isDuplicateName: false,
    eventId: ''
  })
  const [editingRecord, setEditingRecord] = useImmer<RecordItem | null>(null)
  const [statisticsModalOpen, setStatisticsModalOpen] = useImmer(false)
  const [openDeleteEventConfirmModal, setOpenDeleteEventConfirmModal] = useImmer(false)
  const [editEventModalOpen, setEditEventModalOpen] = useImmer(false)

  useMount(() => {
    window.electron.ipcRenderer
      .invoke('event:get-detail', location.state.eventId)
      .then((res) => {
        if (res.success) {
          const { isSolemn, id, name, recorder, voiceName, startDateTime, endDateTime } = res.data
          setDarkMode(isSolemn)
          setEventData({
            id: id,
            isSolemn: isSolemn,
            name: name,
            recorder: recorder,
            voiceName: voiceName,
            startDateTime: startDateTime,
            endDateTime: endDateTime
          })
          setRecords(res.data.record || [])

          antdUtils.modal?.warning({
            title: '请及时导出数据',
            content: (
              <Space vertical>
                <Typography.Text>
                  当前事项已结束，为确保数据安全，强烈建议您尽快通过【导出为Excel】或【打印/另存为PDF】功能，将礼金数据完整备份至您的电脑或者微信。
                </Typography.Text>
                <Typography.Text>
                  原因：时间长了，存储空间可能会因浏览器清理、缓存清除等操作被重置，导致数据意外丢失。
                </Typography.Text>
              </Space>
            ),
            cancelText: '知道了',
            centered: true
          })
        } else {
          console.log(res)
          antdUtils.message?.error(res)
        }
      })
      .catch((err) => {
        console.log(err)
        antdUtils.message?.error(err)
      })
  })

  useUnmount(() => {
    window.electron.ipcRenderer.invoke('secondary-display:close')
  })

  useEffect(() => {
    const left = leftColRef.current
    const right = rightColRef.current

    if (!left || !right) return

    const syncHeight = (): void => {
      if (left.offsetHeight >= 800) {
        right.style.height = `${left.offsetHeight}px`
      } else {
        right.style.height = `900px`
      }
    }

    syncHeight()

    const resizeObserver = new ResizeObserver(syncHeight)
    resizeObserver.observe(left)

    const handleResize = (): void => syncHeight()
    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [records])

  const addFormItem = (item: string): void => {
    const currentList = [...formList]
    const index = currentList.indexOf(item)
    if (index !== -1) {
      currentList.splice(index, 1)
      setFormList(currentList)
      return
    }
    const position = expectedOrder.indexOf(item)
    if (position !== -1) {
      currentList.splice(position, 0, item)
    }
    const validItems = expectedOrder.filter((i) => currentList.includes(i))
    setFormList(validItems)
  }

  const entryGiftMoney = async (values: any): Promise<void> => {
    // console.log('entryGiftMoney', values)

    const newItem: RecordItem = {
      name: values.name,
      amount: values.amount,
      payment_type: values.payment_type,
      sort: 0
    }
    if (values.note) {
      newItem.note = values.note
    }
    if (values.gift) {
      newItem.gift = values.gift
    }
    if (values.relationship) {
      newItem.relationship = values.relationship
    }
    if (values.telephone) {
      newItem.telephone = values.telephone
    }
    if (values.address) {
      newItem.address = values.address
    }
    setConfirmModalData({
      open: true,
      data: newItem,
      eventId: location.state.eventId,
      isDuplicateName: records.some((record) => record.name === values.name) ? true : false
    })
  }

  const handleRecordUpdate = async (
    id: string,
    updatedData: Partial<RecordItem>
  ): Promise<boolean> => {
    const result = await window.electron.ipcRenderer.invoke('record:update', {
      eventId: location.state.eventId,
      id,
      partial: updatedData
    })

    if (result.success) {
      setRecords(result.event.record || [])
      return true
    } else {
      antdUtils.message?.error(result.error || '更新失败')
      return false
    }
  }

  useEffect(() => {
    const pageSize = 12
    const currentPage = 1
    const totalPages = Math.ceil(records.length / pageSize)
    const validRecords = records.filter((r) => !r.voided)
    // 注意：currentPageValidRecords 不再需要提前计算，副屏自己算
    const data = {
      records: [...records], //   传递完整列表！
      currentPage,
      totalPages,
      validRecords,
      eventName: location.state?.eventName || '礼金登记'
    }
    window.electron.ipcRenderer.invoke('secondary-display:update-data', data)
  }, [records, location.state])

  const secondaryDisplayData = useMemo(() => {
    const pageSize = 12
    const currentPage = 1
    const totalPages = Math.ceil(records.length / pageSize)
    const validRecords = records.filter((r) => !r.voided)
    return {
      records: [...records], //   完整列表
      currentPage,
      totalPages,
      validRecords,
      eventName: location.state?.eventName || '礼金登记'
    }
  }, [records, location.state])

  const handleOpenSecondary = async (): Promise<void> => {
    try {
      await window.electron.ipcRenderer.invoke('secondary-display:open', secondaryDisplayData)
    } catch (err) {
      console.error('打开副屏失败:', err)
    }
  }

  const handleDeleteEvent = async (): Promise<void> => {
    // 1. 弹出密码输入框（复用你已有的密码验证逻辑）
    const password = await new Promise<string | null>((resolve) => {
      antdUtils.modal?.confirm({
        title: '请输入管理密码以确认删除',
        content: <Input.Password autoFocus placeholder="管理密码" id="delete-password-input" />,
        okText: '确认删除',
        cancelText: '取消',
        onOk: () => {
          const input = document.getElementById('delete-password-input') as HTMLInputElement
          resolve(input?.value || '')
        },
        onCancel: () => resolve(null)
      })
    })

    if (!password) return

    // 2. 验证密码是否正确
    const verifyRes = await window.electron.ipcRenderer.invoke('event:verify-password', {
      eventId: eventData.id,
      password
    })

    if (!verifyRes.success) {
      antdUtils.message?.error('密码错误，无法删除')
      return
    }

    // 3. 执行删除
    const deleteRes = await window.electron.ipcRenderer.invoke('event:delete', {
      eventId: eventData.id
    })
    if (deleteRes.success) {
      antdUtils.message?.success('事项已成功删除')
      navigate(RouterPath.login, { replace: true })
    } else {
      antdUtils.message?.error(deleteRes.error || '删除失败')
    }
  }

  const handleSaveEventSettings = async (updateData: any): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('event:update', {
        eventId: eventData.id,
        updateData
      })
      if (result.success) {
        // 更新本地状态
        setEventData((draft) => {
          draft.name = result.data.name
          draft.isSolemn = result.data.isSolemn
          draft.recorder = result.data.recorder
          draft.voiceName = result.data.voiceName
          draft.startDateTime = result.data.startDateTime
          draft.endDateTime = result.data.endDateTime
        })
        setDarkMode(result.data.isSolemn)
        antdUtils.message?.success('事项设置已更新')
        setEditEventModalOpen(false)
        window.electron.ipcRenderer.invoke('secondary-display:theme-update', result.data.isSolemn)
      } else {
        antdUtils.message?.error('更新失败: ' + result.error)
      }
    } catch (err) {
      console.error('更新事项错误:', err)
      antdUtils.message?.error('更新失败，请查看控制台')
    }
  }

  return (
    <Flex
      className="min-h-screen w-screen bg-[rgba(255,0,0,0.05)] dark:bg-[#e5e6e7]! p-3!"
      vertical
    >
      <TitleSlector
        title={eventData.name}
        onOpenSecondaryDisplay={handleOpenSecondary}
        setOpenDeleteEventConfirmModal={setOpenDeleteEventConfirmModal}
        setEditEventModalOpen={setEditEventModalOpen}
      />
      <Flex className="p-4! h-full w-full" vertical>
        <Row gutter={[14, 14]} className="h-full">
          <Col xs={24} lg={8} ref={leftColRef} className="flex flex-col">
            <Card
              className="bg-white dark:bg-gray-200! rounded-lg shadow-xl box-border flex-grow"
              title={
                <Typography.Title
                  level={3}
                  className="!text-center !mb-0 mt-3! text-[#dc2626]! dark:text-[#353637]!"
                >
                  礼金录入
                </Typography.Title>
              }
            >
              <Form
                form={form}
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 19, offset: 1 }}
                onFinish={entryGiftMoney}
                classNames={{ label: 'text-[#000]! dark:text-[#353637]!' }}
              >
                <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                  <Input
                    type="text"
                    size="large"
                    placeholder="姓名"
                    className="dark:bg-gray-200! dark:text-gray-800!"
                  />
                </Form.Item>
                <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
                  <Input
                    type="number"
                    size="large"
                    placeholder="金额（元）"
                    className="dark:bg-gray-200! dark:text-gray-800!"
                  />
                </Form.Item>
                <Form.Item
                  name="payment_type"
                  label="收款类型"
                  rules={[{ required: true, message: '请选择收款类型' }]}
                >
                  <Radio.Group
                    value={1}
                    options={[
                      {
                        value: 1,
                        label: (
                          <Typography.Text className="dark:text-gray-800!">现金</Typography.Text>
                        )
                      },
                      {
                        value: 2,
                        label: (
                          <Typography.Text className="dark:text-gray-800!">微信</Typography.Text>
                        )
                      },
                      {
                        value: 3,
                        label: (
                          <Typography.Text className="dark:text-gray-800!">支付宝</Typography.Text>
                        )
                      },
                      {
                        value: 4,
                        label: (
                          <Typography.Text className="dark:text-gray-800!">其他</Typography.Text>
                        )
                      }
                    ]}
                  />
                </Form.Item>
                <Form.Item name="note" label="备注">
                  <Input.TextArea
                    rows={3}
                    placeholder="备注内容（选填）"
                    className="dark:bg-gray-200! dark:text-gray-800!"
                  />
                </Form.Item>
                <Form.Item label="更多备注">
                  <Space size="middle" wrap>
                    {expectedOrder.map((item) => (
                      <Button
                        key={item}
                        type={formList.includes(item) ? 'primary' : 'default'}
                        onClick={() => {
                          addFormItem(item)
                        }}
                        className="dark:bg-gray-600!"
                      >
                        {item}
                      </Button>
                    ))}
                  </Space>
                </Form.Item>
                {formList.map((item: string) => {
                  return (
                    <Form.Item
                      key={item}
                      label={item}
                      name={
                        item === '礼品'
                          ? 'gift'
                          : item === '关系'
                            ? 'relationship'
                            : item === '电话'
                              ? 'telephone'
                              : item === '住址'
                                ? 'address'
                                : ''
                      }
                    >
                      <Input
                        placeholder={item}
                        size="large"
                        className="dark:bg-gray-200! dark:text-gray-800!"
                      />
                    </Form.Item>
                  )
                })}
                <Form.Item className="text-center">
                  <Button size="large" type="primary" htmlType="submit" className="w-full!">
                    确认录入
                  </Button>
                </Form.Item>
              </Form>
              <Divider />
              <Typography.Title level={3} className="text-[#dc2626]! dark:text-[#353637]!">
                功能区
              </Typography.Title>
              <FunctionArea
                canPlayVoice={canPlayVoice}
                setCanPlayVoice={setCanPlayVoice}
                records={records}
                onRecordClick={setEditingRecord}
                eventName={eventData.name}
                setStatisticsModalOpen={setStatisticsModalOpen}
              />
            </Card>
          </Col>
          <Col xs={24} lg={16} ref={rightColRef} className="flex flex-col">
            <DisplayBoard records={records} onRecordClick={setEditingRecord} />
          </Col>
        </Row>
      </Flex>
      <ConfirmModal
        confirmModalData={confirmModalData}
        setConfirmModalData={setConfirmModalData}
        addSuccess={(record, data) => {
          setRecords(record || [])
          // console.log(result.event.record)
          playVoice(canPlayVoice, eventData.voiceName, data.amount, data.name)
          setConfirmModalData({
            open: false,
            data: {} as RecordItem,
            isDuplicateName: false,
            eventId: ''
          })
          form.resetFields()
          setFormList([])
        }}
      />
      {editingRecord && (
        <RecordDetailModal
          open={!!editingRecord}
          record={editingRecord}
          eventId={location.state.eventId}
          onClose={() => setEditingRecord(null)}
          onSave={handleRecordUpdate}
        />
      )}

      <StatisticsModal
        open={statisticsModalOpen}
        onClose={() => setStatisticsModalOpen(false)}
        records={records}
      />
      <DeleteEventConfirmModal
        open={openDeleteEventConfirmModal}
        setOpen={setOpenDeleteEventConfirmModal}
        onConfirm={handleDeleteEvent}
        eventId={location.state.eventId}
      />

      <EditEventModal
        open={editEventModalOpen}
        onClose={() => setEditEventModalOpen(false)}
        onSave={handleSaveEventSettings}
        initialData={{
          name: eventData.name,
          startDateTime: eventData.startDateTime,
          endDateTime: eventData.endDateTime,
          recorder: eventData.recorder || '',
          isSolemn: eventData.isSolemn,
          voiceName: eventData.voiceName
        }}
        eventId={eventData.id}
      />
    </Flex>
  )
}

export default memo(HomePage)
