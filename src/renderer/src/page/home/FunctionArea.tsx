import { CloseOutlined } from '@ant-design/icons'
import { antdUtils } from '@renderer/utils/antd'
import { loadOriginalPDFScripts } from '@renderer/utils/loadOriginalPDFScripts'
import { Button, Flex, Input, Modal, Space, Switch, Table, Typography } from 'antd'
import dayjs from 'dayjs'
import { RecordItem } from 'src/sharedTypes'
import { useImmer } from 'use-immer'
import * as XLSX from 'xlsx'

interface FunctionAreaProps {
  canPlayVoice: boolean
  setCanPlayVoice: (value: boolean) => void
  records: RecordItem[]
  onRecordClick?: (record: RecordItem) => void
  eventName: string
  setStatisticsModalOpen: (value: boolean) => void
}

export const FunctionArea = (props: FunctionAreaProps): React.JSX.Element => {
  const {
    canPlayVoice,
    setCanPlayVoice,
    records,
    onRecordClick,
    eventName,
    setStatisticsModalOpen
  } = props
  const [searchKeyword, setSearchKeyword] = useImmer('')
  const [searchResults, setSearchResults] = useImmer<RecordItem[]>([])
  const [searchModalOpen, setSearchModalOpen] = useImmer(false)

  const onSearch = (keyword: string): void => {
    if (!keyword.trim()) {
      antdUtils.message?.warning('请输入姓名')
      return
    }
    const results = records.filter((record) =>
      record.name.toLowerCase().includes(keyword.trim().toLowerCase())
    )
    if (results.length === 0) {
      antdUtils.message?.info('未找到相关记录')
      return
    }
    setSearchKeyword(keyword)
    setSearchResults(results)
    setSearchModalOpen(true)
  }

  const headerClassName = 'bg-red-200! dark:bg-gray-200! dark:text-gray-900!'
  const getRowClassName = (index: number): string =>
    index % 2 === 0
      ? 'bg-red-50! dark:bg-gray-50! dark:text-gray-900!'
      : 'bg-red-100! dark:bg-gray-100! dark:text-gray-900!'
  const handleSaveAsPDF = async (): Promise<void> => {
    try {
      await loadOriginalPDFScripts()

      //预加载所有资源为 Uint8Array
      const toUint8Array = async (url: string): Promise<Uint8Array> => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`加载失败: ${url}`)
        return new Uint8Array(await res.arrayBuffer())
      }

      // 可选图片：如果加载失败就传 null
      const toOptionalImage = async (url?: string): Promise<Uint8Array | null> => {
        if (!url) return null
        try {
          return await toUint8Array(url)
        } catch (err) {
          console.warn('图片加载失败（将不显示）:', url)
          return null
        }
      }

      // 并行加载
      const [
        mainFontBytes,
        giftLabelFontBytes,
        formalFontBytes,
        coverImageBytes,
        backCoverImageBytes,
        bgImageBytes
      ] = await Promise.all([
        toUint8Array('/static/MaShanZheng-Regular.ttf'),
        toUint8Array('/static/SourceHanSerifCN-Heavy.ttf'),
        toUint8Array('/static/NotoSansSCMedium-mini.ttf'),
        toOptionalImage('/static/cover1.jpg'),
        toOptionalImage('/static/bg.jpg'), // 封底图（必须 JPG/PNG）
        toOptionalImage('/static/bg.jpg') // 背景图（必须 JPG/PNG，不能 WebP！）
      ])

      const GiftRegistryPDF = (window as any).GiftRegistryPDF
      if (!GiftRegistryPDF) throw new Error('PDF 生成器未加载')

      // 把字节数据直接放进 options（不再传 URL）
      const options = {
        title: '礼金簿',
        giftLabel: '贺礼',
        // 字体和图片全部传字节
        mainFontBytes,
        giftLabelFontBytes,
        formalFontBytes,
        coverImageBytes,
        backCoverImageBytes,
        bgImageBytes,
        itemsPerPage: 12,
        printCover: true,
        printSummary: true,
        printAppendix: true,
        showCoverTitle: true,
        subtitle: new Date().toLocaleDateString('zh-CN'),
        recorder: '电子礼簿系统'
      }

      const generator = new GiftRegistryPDF(options)

      // 直接传原始 records（不要 cleanedRecords！）
      const uint8Array = await generator.generate(records, null, eventName)

      // 下载
      const blob = new Blob([uint8Array.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `礼金簿_${eventName}_(导出时间${dayjs(new Date()).format('YYYY:MM:DD--HH:mm:ss')}).pdf`
      a.click()
      URL.revokeObjectURL(url)

      antdUtils.message?.success('PDF 已下载')
    } catch (err) {
      console.error('PDF 生成失败:', err)
      antdUtils.message?.error('PDF 生成失败')
    }
  }

  // 新增：导出Excel功能 - 按照原版格式
  const handleExportToExcel = (): void => {
    try {
      // 准备导出的数据（按照原版格式）
      const exportData = records.map((record) => {
        // 判断状态：如果有作废理由就是"已作废"，否则"正常"
        const status = record.voided ? '已作废' : '正常'

        // 格式化登记时间（原版格式：YYYY/M/D H:mm:ss）
        const registerTime = record.createdAt
          ? dayjs(record.createdAt).format('YYYY/M/D H:mm:ss')
          : ''

        // 修改日志（简化处理，你可以根据实际需求调整）
        const modifyLog = record.createdAt
          ? `[1] ${dayjs(record.createdAt).format('YYYY/M/D H:mm:ss')}: 记录创建。`
          : ''

        return {
          礼金明细: '', // 第一列为空（原版就是这样）
          姓名: record.name || '',
          金额: record.amount || '', // 纯数字，无¥符号
          收款类型:
            record.payment_type === 1
              ? '现金'
              : record.payment_type === 2
                ? '微信'
                : record.payment_type === 3
                  ? '支付宝'
                  : '其他',
          宾客等级: record.sort === 0 ? '普宾' : `排序 ${record.sort} `,
          备注: record.note || '',
          礼品: record.gift || '',
          关系: record.relationship || '',
          电话: record.telephone || '',
          住址: record.address || '',
          状态: status,
          作废理由: record.voided_reason || '',
          登记时间: registerTime,
          修改日志: modifyLog
        }
      })

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: false })

      // 计算统计信息
      const validRecords = records.filter((r) => !r.voided_reason).length
      const invalidRecords = records.filter((r) => r.voided_reason).length
      const totalRecords = records.length

      // 添加总计行
      const summaryRow = {
        礼金明细: '总计',
        姓名: `${validRecords} 条有效记录, ${invalidRecords} 条作废, 共 ${totalRecords} 条`,
        金额: '',
        收款类型: '',
        宾客等级: '',
        备注: '',
        礼品: '',
        关系: '',
        电话: '',
        住址: '',
        状态: '',
        作废理由: '',
        登记时间: '',
        修改日志: ''
      }

      // 添加总计行到工作表
      XLSX.utils.sheet_add_json(ws, [summaryRow], { skipHeader: true, origin: -1 })

      // 设置列宽（按照原版调整）
      const colWidths = [
        { wch: 12 }, // 礼金明细
        { wch: 15 }, // 姓名
        { wch: 10 }, // 金额
        { wch: 12 }, // 收款类型
        { wch: 15 }, // 宾客等级
        { wch: 20 }, // 备注
        { wch: 15 }, // 礼品
        { wch: 15 }, // 关系
        { wch: 15 }, // 电话
        { wch: 20 }, // 住址
        { wch: 10 }, // 状态
        { wch: 15 }, // 作废理由
        { wch: 20 }, // 登记时间
        { wch: 30 } // 修改日志
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1') // 原版没有自定义sheet名

      // 生成文件名（按照原版格式）
      const fileName = `礼金簿_${eventName}_(导出时间${dayjs(new Date()).format('YYYY:MM:DD--HH:mm:ss')}).xlsx`

      // 导出文件
      XLSX.writeFile(wb, fileName)

      antdUtils.message?.success('Excel 文件已下载')
    } catch (err) {
      console.error('Excel 导出失败:', err)
      antdUtils.message?.error(
        'Excel 导出失败: ' + (err instanceof Error ? err.message : String(err))
      )
    }
  }

  const handleViewStatistics = (): void => {
    setStatisticsModalOpen(true)
  }

  return (
    <Flex vertical className="h-full w-full items-center justify-center">
      <Space.Compact>
        <Space.Addon className="whitespace-nowrap bg-transparent! border-none! text-[#dc2626]! dark:text-[#353637]!">
          姓名查找：
        </Space.Addon>
        <Input.Search
          placeholder="按姓名查找"
          allowClear
          onSearch={onSearch}
          enterButton
          size="large"
        />
      </Space.Compact>
      <Button
        size="large"
        type="primary"
        className="mt-3!"
        onClick={async () => {
          handleSaveAsPDF()
        }}
      >
        另存为PDF
      </Button>
      <Button size="large" type="default" className="mt-3!" onClick={handleExportToExcel}>
        导出为Excel
      </Button>
      <Button size="large" type="primary" className="mt-3!" onClick={handleViewStatistics}>
        查看统计
      </Button>
      <Flex className="mt-3! justify-between bg-gray-100 py-2.5! px-10! rounded-lg!">
        <Typography.Text className="text-[16px]! text-[#dc2626]! dark:text-[#353637]!">
          语音播放
        </Typography.Text>
        <Switch
          checked={canPlayVoice}
          onChange={(value) => {
            setCanPlayVoice?.(value)
          }}
        ></Switch>
      </Flex>

      <Modal
        title={`搜索结果："${searchKeyword}"（共 ${searchResults.length} 条）`}
        open={searchModalOpen}
        classNames={{
          title: 'text-[#dc2626]! dark:text-[#353637]!',
          container: 'dark:bg-gray-100! bg-white!'
        }}
        onCancel={() => setSearchModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setSearchModalOpen(false)}>
            关闭
          </Button>
        ]}
        closeIcon={<CloseOutlined className="text-[#dc2626]! dark:text-[#353637]!" />}
        width={800}
        centered
      >
        <Table
          dataSource={searchResults}
          rowKey="id"
          pagination={{ pageSize: 6 }}
          size="small"
          onRow={(record) => ({
            onClick: () => {
              onRecordClick?.(record)
              setSearchModalOpen(false)
            }
          })}
          classNames={{ pagination: { item: 'dark:bg-gray-100!' } }}
          columns={[
            {
              title: '状态',
              dataIndex: 'voided',
              key: 'voided',
              render: (voided: boolean) => {
                if (voided) {
                  return '已作废'
                } else {
                  return '正常'
                }
              },
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '姓名',
              dataIndex: 'name',
              key: 'name',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '礼金',
              dataIndex: 'amount',
              key: 'amount',
              render: (amount: number) => `¥${amount}`,
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '支付方式',
              dataIndex: 'payment_type',
              key: 'payment_type',
              render: (type: number) => {
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
              },
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '备注',
              dataIndex: 'note',
              key: 'note',
              render: (text: string) => text || '-',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '关系',
              dataIndex: 'relationship',
              key: 'relationship',
              render: (text: string) => text || '-',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '电话',
              dataIndex: 'telephone',
              key: 'telephone',
              render: (text: string) => text || '-',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '礼物',
              dataIndex: 'gift',
              key: 'gift',
              render: (text: string) => text || '-',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            },
            {
              title: '住址',
              dataIndex: 'address',
              key: 'address',
              render: (text: string) => text || '-',
              onHeaderCell: () => ({ className: headerClassName }),
              onCell: (_, index) => ({ className: getRowClassName(index!) })
            }
          ]}
        />
      </Modal>
    </Flex>
  )
}
