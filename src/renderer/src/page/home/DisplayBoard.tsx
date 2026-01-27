import { LeftCircleFilled, RightCircleFilled } from '@ant-design/icons'
import { convertToChineseAmount } from '@renderer/utils/convertToChineseAmount'
import { Button, Card, Col, Flex, Row, Space, Typography } from 'antd'
import { RecordItem } from 'src/sharedTypes'
import { useImmer } from 'use-immer'

interface DisplayBoardProps {
  records?: RecordItem[]
  onRecordClick?: (record: RecordItem) => void
}

export const DisplayBoard = (props: DisplayBoardProps): React.JSX.Element => {
  const { records = [], onRecordClick } = props

  // 分页配置
  const pageSize = 12
  const [currentPage, setCurrentPage] = useImmer(1)

  // 计算总页数
  const totalPages = Math.ceil(records.length / pageSize)

  // 获取当前页的数据
  const getCurrentPageRecords = (): RecordItem[] => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return records.slice(startIndex, endIndex)
  }

  // 填充当前页到12条
  const currentPageRecords = getCurrentPageRecords()
  const filledRecords = [...currentPageRecords]

  // 如果当前页数据不足12条，填充空数据
  while (filledRecords.length < pageSize) {
    filledRecords.push({
      id: `placeholder-${filledRecords.length}`,
      name: '',
      amount: 0,
      payment_type: 1,
      sort: 0
    })
  }

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

  const handleViewDetail = (record: RecordItem): void => {
    onRecordClick?.(record)
  }

  const validRecords = records.filter((r) => !r.voided)
  const currentPageValidRecords = currentPageRecords.filter((r) => !r.voided)

  return (
    <Card
      className="h-full! bg-[rgba(255,0,0,0.05)]! dark:bg-[#e5e6e7]! rounded-lg shadow-xl box-border flex-grow border-4! border-[#dc2626]! dark:border-[#353637]!"
      title={
        <Row className="items-center h-full!">
          <Col span={16}>
            <Space>
              <Typography.Text className="!m-0 !leading-none text-[#dc2626]! dark:text-[#353637]!">
                本页小计:
              </Typography.Text>
              <Typography.Text className="!m-0 !leading-none font-bold! text-[20px]! text-[#dc2626]! dark:text-[#353637]!">
                {`¥${currentPageValidRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toFixed(2)}`}
              </Typography.Text>
              <Typography.Text className="!m-0 !leading-none text-[#dc2626]! dark:text-[#353637]!">
                总金额:
              </Typography.Text>
              <Typography.Text className="!m-0 !leading-none font-bold! text-[20px]! text-[#dc2626]! dark:text-[#353637]!">
                {`¥${validRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toFixed(2)}`}
              </Typography.Text>
              <Typography.Text className="!m-0 !leading-none text-[#dc2626]! dark:text-[#353637]!">
                总人数:
              </Typography.Text>
              <Typography.Text className="!m-0 !leading-none font-bold! text-[20px]! text-[#dc2626]! dark:text-[#353637]!">
                {validRecords.length}
              </Typography.Text>
            </Space>
          </Col>
          <Col span={8} className="text-end!">
            <Space>
              <Button
                icon={<LeftCircleFilled />}
                size="large"
                type="text"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="dark:text-gray-500!"
              />
              <Typography.Text className="text-[black]! dark:text-[#353637]!">{`第 ${currentPage} / ${totalPages || 1} 页`}</Typography.Text>
              <Button
                icon={<RightCircleFilled />}
                size="large"
                type="text"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="dark:text-gray-500!"
              />
            </Space>
          </Col>
        </Row>
      }
      styles={{
        body: {
          height: `calc(100% - 40px)`,
          margin: 0,
          paddingTop: 0,
          paddingLeft: '5px',
          paddingRight: '5px'
        }
      }}
    >
      <Row className="w-full! h-full! border-1 border-[#dc2626]! dark:border-gray-600! rounded-lg! ">
        {filledRecords.map((item, index) => {
          const isPlaceholder = item.name === '' && item.amount === 0
          return (
            <Col
              span={2}
              key={item.id}
              className={`w-full! h-full! flex! flex-col justify-center! items-center! ${
                index <= 10 ? 'border-r border-[#dc2626] dark:border-r dark:border-gray-600' : ''
              } ${item.voided ? 'opacity-60 grayscale' : ''}`}
            >
              {!isPlaceholder ? (
                <>
                  <Flex
                    vertical
                    className="flex-4 items-center! justify-center! hover:bg-red-200! dark:hover:bg-gray-300! w-full!"
                    onClick={() => !isPlaceholder && handleViewDetail(item)}
                  >
                    <Typography.Title
                      level={4}
                      className="text-center flex flex-col justify-center tracking-[0.3em] mt-auto! flex-6 w-full! h-full! dark:text-[black]!"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      {item.name}
                    </Typography.Title>
                    <Flex vertical className="mt-auto! mb-4! flex-1">
                      {(item.note ||
                        item.gift ||
                        item.relationship ||
                        item.telephone ||
                        item.address) && (
                        <Typography.Text type="secondary" className="dark:text-[black]!">
                          已备注
                        </Typography.Text>
                      )}
                      {item.voided && (
                        <Typography.Text type="danger" className="dark:text-[black]!">
                          已作废
                        </Typography.Text>
                      )}
                      {!(
                        item.note ||
                        item.gift ||
                        item.relationship ||
                        item.telephone ||
                        item.address ||
                        item.voided
                      ) && <div className="h-[1em]"></div>}
                    </Flex>
                  </Flex>
                  <Typography.Title
                    level={4}
                    className="m-0! w-full! text-center flex flex-col justify-center flex-1 tracking-[0.3em] border-t-1 border-b-1 border-[#dc2626]! dark:border-gray-600! hover:bg-red-200! dark:hover:bg-gray-300! text-[#dc2626]! dark:text-[black]!"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    礼金
                  </Typography.Title>
                  <Flex
                    vertical
                    className="flex-4 hover:bg-red-200! dark:hover:bg-gray-300! w-full! h-full! items-center!"
                  >
                    <Typography.Title
                      level={4}
                      className="text-center flex flex-col justify-center tracking-[0.3em] mt-auto! flex-8 dark:text-[black]!"
                      style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                    >
                      {convertToChineseAmount(Math.floor(item.amount))}
                    </Typography.Title>
                    <Typography.Text className="mt-auto! mb-4! flex-1 dark:text-[black]!">{`￥${item.amount}`}</Typography.Text>
                  </Flex>
                </>
              ) : (
                <>
                  <Space className="flex-4! h-full! ">{''}</Space>
                  <Typography.Title
                    level={4}
                    className="m-0! w-full! text-center flex flex-col justify-center flex-1 tracking-[0.3em] border-t-1 border-b-1 border-[#dc2626]! dark:border-gray-600! hover:bg-red-200! dark:hover:bg-gray-300! text-[#dc2626]! dark:text-[black]!"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    礼金
                  </Typography.Title>
                  <Space className="flex-4! h-full! ">{''}</Space>
                </>
              )}
            </Col>
          )
        })}
      </Row>
    </Card>
  )
}
