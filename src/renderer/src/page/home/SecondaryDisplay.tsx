// SecondaryDisplay.tsx
import { LeftCircleFilled, RightCircleFilled } from '@ant-design/icons'
import { useGlobalStore } from '@renderer/stores/global'
import { convertToChineseAmount } from '@renderer/utils/convertToChineseAmount'
import { Button, Flex, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { RecordItem } from 'src/sharedTypes'

interface SecondaryDisplayData {
  records: RecordItem[]
  currentPage: number
  totalPages: number
  validRecords: RecordItem[]
  currentPageValidRecords: RecordItem[]
  eventName: string
}

export const SecondaryDisplay = (): React.JSX.Element => {
  const [data, setData] = useState<SecondaryDisplayData | null>(null)
  const [currentPage, setCurrentPage] = useState(1) // 新增本地分页状态
  const { setDarkMode } = useGlobalStore()

  useEffect(() => {
    const initHandler = (_: unknown, payload: SecondaryDisplayData): void => {
      setData(payload)
      setCurrentPage(payload.currentPage) // 同步初始页码
    }
    const updateHandler = (_: unknown, payload: SecondaryDisplayData): void => {
      setData(payload)
      setCurrentPage(payload.currentPage) // 外部更新时同步
    }

    const themeUpdateHandler = (_: unknown, isSolemn: boolean): void => {
      setDarkMode(isSolemn)
    }

    window.electron.ipcRenderer.on('secondary-display:init-data', initHandler)
    window.electron.ipcRenderer.on('secondary-display:update-data', updateHandler)
    window.electron.ipcRenderer.on('secondary-display:theme-update', themeUpdateHandler)

    return () => {
      window.electron.ipcRenderer.removeListener('secondary-display:init-data', initHandler)
      window.electron.ipcRenderer.removeListener('secondary-display:update-data', updateHandler)
      window.electron.ipcRenderer.removeListener(
        'secondary-display:theme-update',
        themeUpdateHandler
      )
    }
  }, [])

  if (!data) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        加载中...
      </div>
    )
  }

  const { records, totalPages, validRecords } = data
  const pageSize = 12

  // 根据 currentPage 计算当前页数据（关键改动）
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentRecords = records.slice(startIndex, endIndex)

  // 填充到12条（使用 currentRecords 而不是原始 records）
  const filledRecords = [...currentRecords]
  while (filledRecords.length < pageSize) {
    filledRecords.push({
      id: `placeholder-${filledRecords.length}`,
      name: '',
      amount: 0,
      payment_type: 1,
      sort: 0
    })
  }

  // 重新计算当前页小计（因为 records 变了）
  const pageTotal = currentRecords
    .filter((r) => !r.voided)
    .reduce((sum, r) => sum + (parseFloat(r.amount as any) || 0), 0)
  const grandTotal = validRecords.reduce((sum, r) => sum + (parseFloat(r.amount as any) || 0), 0)

  // 分页控制函数
  const goToPreviousPage = (): void => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = (): void => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <Flex
      vertical
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(255, 0, 0, 0.05)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        padding: '16px 0'
      }}
      className="dark:bg-[#e5e6e7]!"
    >
      <Flex
        style={{
          padding: '16px',
          borderBottom: '4px solid #dc2626',
          backgroundColor: 'white',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '5px'
        }}
        className="dark:border-[#353637]!"
      >
        <Space>
          <Typography.Text
            style={{ fontSize: 18, marginRight: 8 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            本页小计:
          </Typography.Text>
          <Typography.Text
            strong
            style={{ fontSize: 26, marginRight: 16 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            {`¥${pageTotal.toFixed(2)}`}
          </Typography.Text>
          <Typography.Text
            style={{ fontSize: 18, marginRight: 8 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            总金额:
          </Typography.Text>
          <Typography.Text
            strong
            style={{ fontSize: 26, marginRight: 16 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            {`¥${grandTotal.toFixed(2)}`}
          </Typography.Text>
          <Typography.Text
            style={{ fontSize: 18, marginRight: 8 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            总人数:
          </Typography.Text>
          <Typography.Text
            strong
            style={{ fontSize: 26 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            {validRecords.length}
          </Typography.Text>
        </Space>
        <Space>
          <Button
            icon={<LeftCircleFilled />}
            size="large"
            type="text"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="dark:text-gray-500!"
          />
          <Typography.Text
            style={{ fontSize: 18, marginRight: 8 }}
            className="text-[#dc2626]! dark:text-[#353637]!"
          >
            第 {currentPage} / {totalPages || 1} 页
          </Typography.Text>
          <Button
            icon={<RightCircleFilled />}
            size="large"
            type="text"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="dark:text-gray-500!"
          />
        </Space>
      </Flex>
      {/* 礼金展示区（完全保留你原有的 grid 结构） */}
      <div
        style={{
          flex: 1,
          padding: '0 5px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 0,
          borderRadius: 8,
          height: 'calc(100% - 60px)',
          margin: '5px'
        }}
        className="border-[#dc2626]! dark:border-[#353637]! border-1!"
      >
        {filledRecords.map((item, index) => {
          const isPlaceholder = item.name === '' && item.amount === 0
          const hasNote =
            item.note || item.gift || item.relationship || item.telephone || item.address
          const isVoided = item.voided
          const amountNum =
            typeof item.amount === 'number' ? item.amount : parseFloat(item.amount as string) || 0
          const chineseAmount = convertToChineseAmount(amountNum)
          return (
            <Flex
              key={item.id}
              style={{
                flexDirection: 'column',
                height: '100%',
                borderRight: index < 11 ? `1px solid #dc2626` : 'none',
                opacity: isVoided ? 0.6 : 1,
                filter: isVoided ? 'grayscale(100%)' : 'none',
                position: 'relative'
              }}
              className={
                index < 11 ? `border-[#dc2626]! dark:border-[#353637]! border-r-1!` : `border-none!`
              }
            >
              {!isPlaceholder ? (
                <>
                  <Flex
                    style={{
                      flex: 4,
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Typography.Text
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        textAlign: 'center',
                        flex: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '26px',
                        fontWeight: 'bold',
                        letterSpacing: '0.3em'
                      }}
                      className="text-[#dc2626]! dark:text-[#353637]!"
                    >
                      {item.name}
                    </Typography.Text>
                    <Space style={{ flex: 1, marginBottom: '16px' }} vertical>
                      {hasNote && (
                        <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                          已备注
                        </Typography.Text>
                      )}
                      {isVoided && (
                        <Typography.Text className="text-[#dc2626]! dark:text-[#353637]!">
                          已作废
                        </Typography.Text>
                      )}
                      {!hasNote && !isVoided && <div style={{ height: '1em' }}></div>}
                    </Space>
                  </Flex>
                  <Typography.Text
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      letterSpacing: '0.3em'
                    }}
                    className="text-[#dc2626]! dark:text-[#353637]! border-t-1! border-b-1! border-[#dc2626]! dark:border-[#353637]!"
                  >
                    礼金
                  </Typography.Text>
                  <Flex
                    style={{
                      flex: 4,
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Typography.Text
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        textAlign: 'center',
                        flex: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        letterSpacing: '0.3em'
                      }}
                      className="text-[#dc2626]! dark:text-[#353637]!"
                    >
                      {chineseAmount}
                    </Typography.Text>
                    <Typography.Text
                      style={{ flex: 1, marginBottom: '10px' }}
                      className="text-[#dc2626]! dark:text-[#353637]!"
                    >{`￥${item.amount}`}</Typography.Text>
                  </Flex>
                </>
              ) : (
                <>
                  <div style={{ flex: 4 }}></div>
                  <Typography.Text
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      fontWeight: 'bold',
                      fontSize: '20px',
                      letterSpacing: '0.3em'
                    }}
                    className="border-t-1! border-b-1! border-[#dc2626]! dark:border-[#353637]!"
                  >
                    礼金
                  </Typography.Text>
                  <div style={{ flex: 4 }}></div>
                </>
              )}
            </Flex>
          )
        })}
      </div>
    </Flex>
  )
}
