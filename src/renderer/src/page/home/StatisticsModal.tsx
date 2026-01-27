import { CloseOutlined } from '@ant-design/icons'
import { Badge, Button, Col, Flex, Modal, Row, Select, Space, Table, Typography } from 'antd'
import dayjs from 'dayjs'
import React, { useMemo, useState } from 'react'
import { RecordItem } from '../../../../sharedTypes'

interface StatisticsModalProps {
  open: boolean
  onClose: () => void
  records: RecordItem[]
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ open, onClose, records }) => {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const getPaymentTypeText = (type: number): string => {
    switch (type) {
      case 1:
        return '现金'
      case 2:
        return '微信'
      case 3:
        return '支付宝'
      default:
        return '其他'
    }
  }

  const parseAmount = (amount: any): number => {
    if (typeof amount === 'number' && !isNaN(amount)) {
      return amount
    }
    if (typeof amount === 'string' && amount.trim() !== '') {
      const parsed = parseFloat(amount.trim())
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const filteredRecords = useMemo(() => {
    const recordsWithNumericAmount = records.map((record) => {
      let numAmount: number | null = null
      const rawAmount = record.amount

      if (rawAmount != null) {
        if (typeof rawAmount === 'number' && !isNaN(rawAmount)) {
          numAmount = rawAmount
        } else if (typeof rawAmount === 'string') {
          const trimmed = (rawAmount as string).trim()
          if (trimmed !== '') {
            const parsed = parseFloat(trimmed)
            if (!isNaN(parsed)) {
              numAmount = parsed
            }
          }
        }
      }

      return { ...record, _numericAmount: numAmount }
    })

    const validAmounts = recordsWithNumericAmount
      .map((r) => r._numericAmount)
      .filter((amount): amount is number => amount !== null)

    return recordsWithNumericAmount
      .filter((record) => {
        switch (activeFilter) {
          case 'all':
            return true
          case 'max_amount': {
            if (validAmounts.length === 0) return false
            const maxAmount = Math.max(...validAmounts)
            return record._numericAmount === maxAmount
          }
          case 'min_amount': {
            if (validAmounts.length === 0) return false
            const minAmount = Math.min(...validAmounts)
            return record._numericAmount === minAmount
          }
          case 'has_note':
            return !!record.note?.trim()
          case 'has_gift':
            return !!record.gift?.trim()
          case 'voided':
            return !!record.voided
          case 'payment_1':
            return record.payment_type === 1
          case 'payment_2':
            return record.payment_type === 2
          case 'payment_3':
            return record.payment_type === 3
          case 'payment_4':
            return record.payment_type === 4
          default:
            return true
        }
      })
      .map(({ _numericAmount, ...rest }) => rest)
  }, [records, activeFilter])

  const validRecords = records.filter((r) => !r.voided)
  const voidedRecords = records.filter((r) => r.voided)
  const validTotalAmount = validRecords.reduce((sum, r) => sum + parseAmount(r.amount), 0)
  const voidedTotalAmount = voidedRecords.reduce((sum, r) => sum + parseAmount(r.amount), 0)

  const paymentStats = validRecords.reduce(
    (acc, record) => {
      const type = record.payment_type
      acc[type] = (acc[type] || 0) + parseAmount(record.amount)
      return acc
    },
    {} as Record<number, number>
  )

  const headerClassName = 'bg-red-200! dark:bg-gray-200! dark:text-gray-900!'
  const getRowClassName = (index: number): string =>
    index % 2 === 0
      ? 'bg-red-50! dark:bg-gray-50! dark:text-gray-900!'
      : 'bg-red-100! dark:bg-gray-100! dark:text-gray-900!'

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 80,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: any) => `¥${parseAmount(amount)}`,
      width: 70,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '收款方式',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (type: number) => getPaymentTypeText(type),
      width: 80,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '状态',
      dataIndex: 'voided',
      key: 'voided',
      render: (voided: boolean) => (
        <Badge
          status={voided ? 'error' : 'success'}
          text={
            <Typography.Text className="dark:text-[black]!">
              {voided ? '已作废' : '正常'}
            </Typography.Text>
          }
        />
      ),
      width: 100,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (text: string) => text || '-',
      width: 100,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '礼品',
      dataIndex: 'gift',
      key: 'gift',
      render: (text: string) => text || '-',
      width: 100,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '修改记录',
      dataIndex: 'revision_history',
      key: 'revision_history',
      render: (history: any[]) => {
        if (!history || history.length === 0) return '-'
        return `${history.length}次修改`
      },
      width: 80,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    },
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time: string) => (time ? dayjs(time).format('MM-DD HH:mm') : '-'),
      width: 100,
      onHeaderCell: () => ({ className: headerClassName }),
      onCell: (_, index) => ({ className: getRowClassName(index!) })
    }
  ]

  const filterOptions = [
    { value: 'all', label: '全部记录' },
    { value: 'max_amount', label: '礼金最多' },
    { value: 'min_amount', label: '礼金最少' },
    { value: 'has_note', label: '有备注' },
    { value: 'has_gift', label: '有礼品' },
    { value: 'voided', label: '已作废' },
    { value: 'payment_1', label: '现金' },
    { value: 'payment_2', label: '微信' },
    { value: 'payment_3', label: '支付宝' },
    { value: 'payment_4', label: '其他' }
  ]

  return (
    <Modal
      title={`礼金统计详情`}
      className="w-[1100px]!"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
      centered
      classNames={{
        title: 'text-[#dc2626]! dark:text-[#353637]! text-center text-[24px]! font-bold!',
        container: 'dark:bg-gray-100! bg-white! px-auto!'
      }}
    >
      <Row className="w-full! h-full!">
        <Col span={19}>
          <Space className="mb-4! items-center justify-end! flex w-full!">
            <Typography.Text className="dark:text-gray-800!">筛选条件:</Typography.Text>
            <Select
              value={activeFilter}
              onChange={setActiveFilter}
              options={filterOptions}
              style={{ width: 160, backgroundColor: '#f0f0f0', color: '#333' }}
              classNames={{
                popup: { root: 'dark:bg-white!', listItem: 'dark:text-gray-800! dark:bg-white!' }
              }}
            />
          </Space>
          <Table
            dataSource={filteredRecords.map((record, index) => ({
              ...record,
              key: record.id || index
            }))}
            columns={columns}
            pagination={{ pageSize: 8 }}
            size="small"
            scroll={{ y: 600 }}
            classNames={{ pagination: { item: 'dark:bg-gray-100!' } }}
          />
        </Col>
        <Col className="pl-3! py-auto! w-full! h-full!" span={5}>
          <Space vertical>
            <Flex className="justify-between bg-[#f0fdf4]! p-2!">
              {/* 有效记录 */}
              <Typography.Text className="dark:text-gray-800!">有效记录人数:</Typography.Text>
              <Typography.Text className="font-bold! dark:text-gray-800!">
                {validRecords.length}人
              </Typography.Text>
            </Flex>
            <Flex className="justify-between bg-[#f0fdf4] p-2!">
              <Typography.Text className="dark:text-gray-800!">有效金额:</Typography.Text>
              <Typography.Text className="font-bold! dark:text-gray-800!">
                ¥{validTotalAmount.toLocaleString()}{' '}
              </Typography.Text>
            </Flex>
            <Flex className="justify-between bg-[#fef2f2]! p-2!">
              <Typography.Text className="dark:text-gray-800!">作废记录:</Typography.Text>
              <Typography.Text className="font-bold! dark:text-gray-800!">
                {voidedRecords.length}条
              </Typography.Text>
            </Flex>
            <Flex className="justify-between bg-[#fef2f2]! p-2!">
              <Typography.Text className="dark:text-gray-800!">作废金额:</Typography.Text>
              <Typography.Text className="font-bold! dark:text-gray-800!">
                ¥{voidedTotalAmount.toLocaleString()}{' '}
              </Typography.Text>
            </Flex>
            <Space vertical>
              <Typography.Text className="font-bold! text-[14px]! dark:text-gray-800!">
                按收款方式统计（有效记录）
              </Typography.Text>
              <Flex className="justify-between px-2!">
                <Typography.Text className="dark:text-gray-800!">现金:</Typography.Text>
                <Typography.Text className="font-bold! dark:text-gray-800!">
                  ¥{(paymentStats[1] || 0).toLocaleString()}{' '}
                </Typography.Text>
              </Flex>
              <Flex className="justify-between px-2!">
                <Typography.Text className="dark:text-gray-800!">微信:</Typography.Text>
                <Typography.Text className="font-bold! dark:text-gray-800!">
                  ¥{(paymentStats[2] || 0).toLocaleString()}{' '}
                </Typography.Text>
              </Flex>
              <Flex className="justify-between px-2!">
                <Typography.Text className="dark:text-gray-800!">支付宝:</Typography.Text>
                <Typography.Text className="font-bold! dark:text-gray-800!">
                  ¥{(paymentStats[3] || 0).toLocaleString()}{' '}
                </Typography.Text>
              </Flex>
              <Flex className="justify-between px-2!">
                <Typography.Text className="dark:text-gray-800!">其他:</Typography.Text>
                <Typography.Text className="font-bold! dark:text-gray-800!">
                  ¥{(paymentStats[4] || paymentStats[0] || 0).toLocaleString()}{' '}
                </Typography.Text>
              </Flex>
            </Space>
          </Space>
        </Col>
      </Row>
    </Modal>
  )
}
