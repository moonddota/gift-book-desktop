import { CloseOutlined } from '@ant-design/icons'
import { antdUtils } from '@renderer/utils/antd'
import { convertToChineseAmount } from '@renderer/utils/convertToChineseAmount'
import { Button, Col, Flex, Form, Input, Modal, Row, Space, Typography } from 'antd'
import { useEffect } from 'react'
import { RecordItem } from 'src/sharedTypes'
import { useImmer } from 'use-immer'

interface ConfirmModalProps {
  confirmModalData: {
    open: boolean
    data: RecordItem
    isDuplicateName: boolean
    eventId: string
  }
  setConfirmModalData: (value: any) => void
  addSuccess: (record: any, data: any) => void
}
export const ConfirmModal = (prpos: ConfirmModalProps): React.JSX.Element => {
  const { confirmModalData, setConfirmModalData, addSuccess } = prpos
  const { open, data, isDuplicateName, eventId } = confirmModalData
  const [form] = Form.useForm()
  const [showverifyPassword, setShowverifyPassword] = useImmer(false)

  const handlePasswordSubmit = async (): Promise<void> => {
    let extraFields: Partial<RecordItem> = {}

    if (isDuplicateName) {
      const value = form.getFieldsValue()
      extraFields = {
        note: value.note ?? data.note,
        gift: value.gift ?? data.gift,
        relationship: value.relationship ?? data.relationship,
        telephone: value.telephone ?? data.telephone,
        address: value.address ?? data.address
      }
    }

    const newData = {
      ...data,
      ...extraFields
    }

    const result = await window.electron.ipcRenderer.invoke('record:add', {
      eventId: eventId,
      newItem: newData
    })

    if (result.success) {
      addSuccess(result.event.record, newData)
    } else {
      console.log(result)
      antdUtils.message?.error(result.message)
    }
  }

  useEffect(() => {
    if (isDuplicateName) {
      form.setFields([
        { name: 'note', value: data.note ?? '' },
        { name: 'gift', value: data.gift ?? '' },
        { name: 'relationship', value: data.relationship ?? '' },
        { name: 'telephone', value: data.telephone ?? '' },
        { name: 'address', value: data.address ?? '' }
      ])
    }
  }, [isDuplicateName])

  return (
    <Modal
      open={open}
      classNames={{ title: 'text-center text-[20px]! font-bold!' }}
      title={isDuplicateName ? '重复信息确认' : '请确认录入信息'}
      cancelText="返回修改"
      okText="确认"
      onOk={() => {
        setShowverifyPassword(true)
      }}
      onCancel={() =>
        setConfirmModalData({
          open: false,
          data: {} as RecordItem,
          eventId: '',
          isDuplicateName: false
        })
      }
      destroyOnHidden={true}
      centered
      maskClosable={false}
    >
      <Space vertical className="w-full! h-full! pl-5!">
        {isDuplicateName && (
          <Flex vertical className="bg-[rgba(255,0,0,0.05)] dark:bg-[#e5e6e7]! rounded-lg p-3!">
            <Typography.Text className="text-[16px]!">警告：</Typography.Text>
            <Typography.Text className="text-[14px]!">
              系统中已存在“相同姓名”的记录，为避免重复录入，请仔细核对。
            </Typography.Text>
          </Flex>
        )}

        <Row className="items-center">
          <Col span={4}>
            <Typography.Text className="text-[16px]!">来宾姓名: </Typography.Text>
          </Col>
          <Col offset={1} span={19}>
            <Typography.Text className="text-[20px]! font-bold!">{data.name}</Typography.Text>
          </Col>
        </Row>
        <Row className="items-center">
          <Col span={4}>
            <Typography.Text className="text-[16px]!">数字金额: </Typography.Text>
          </Col>
          <Col offset={1} span={19}>
            <Typography.Text className="text-[20px]! font-bold! text-[#dc2626]! dark:text-[#353637]!">{`¥${data.amount}`}</Typography.Text>
          </Col>
        </Row>
        <Row className="items-center">
          <Col span={4}>
            <Typography.Text className="text-[16px]!">大写金额: </Typography.Text>
          </Col>
          <Col offset={1} span={19}>
            <Typography.Text className="text-[20px]! font-bold! text-[#dc2626]! dark:text-[#353637]!">{`${convertToChineseAmount(
              Math.floor(data.amount)
            )}`}</Typography.Text>
          </Col>
        </Row>
        {isDuplicateName && (
          <Form
            form={form}
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 18 }}
            classNames={{ label: `text-start! w-full! text-[16px]!` }}
          >
            <Form.Item>如非重复，建议填写备注(选填)</Form.Item>
            <Form.Item label="备注：" name="note">
              <Input.TextArea rows={3} placeholder="填写备注" />
            </Form.Item>
            <Form.Item label="礼品：" name="gift">
              <Input placeholder="请输入礼品" type="text" />
            </Form.Item>
            <Form.Item label="关系：" name="relationship">
              <Input placeholder="请输入关系" type="text" />
            </Form.Item>
            <Form.Item label="手机号：" name="telephone">
              <Input placeholder="请输入手机号" type="text" />
            </Form.Item>
            <Form.Item label="地址：" name="address">
              <Input placeholder="请输入地址" type="text" />
            </Form.Item>
          </Form>
        )}
      </Space>

      <Modal
        title="操作密码确认"
        open={showverifyPassword}
        destroyOnHidden={true}
        centered
        footer={null}
        closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
        onCancel={() => {
          setShowverifyPassword(false)
        }}
      >
        <Form
          onFinish={async (value) => {
            const res = await window.electron.ipcRenderer.invoke('event:verify-password', {
              eventId: eventId,
              password: value.password
            })
            if (res.success) {
              setShowverifyPassword(false)
              handlePasswordSubmit()
            } else {
              antdUtils.message?.error(res.error)
            }
          }}
        >
          <Form.Item name="password" rules={[{ required: true }]} className="mt-3!">
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item className="text-end">
            <Button type="primary" htmlType="submit">
              确认
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  )
}
