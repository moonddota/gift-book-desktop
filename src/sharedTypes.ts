export interface RecordItem {
  id?: string
  createdAt?: string // ISO 8601 时间字符串
  name: string // 宾客名字
  amount: number // 礼金
  payment_type: number // 1  现金  2 微信 3 支付宝  4 其他
  sort: number // 0 普宾  1-100 排序
  note?: string //备注
  gift?: string // 礼物
  relationship?: string //关系
  telephone?: string // 手机号
  address?: string // 地址
  voided?: boolean // 是否作废
  voided_reason?: string // 作废理由
  revision_history?: {
    revision: string //  修改内容
    history: string // 对应的历史快照
    timestamp: Date
  }[] // 修改记录
}
