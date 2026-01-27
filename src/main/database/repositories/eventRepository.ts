import { RecordItem } from '../../../sharedTypes'
import { hashPassword } from '../../utils/crypto'
import { snowFlake } from '../../utils/snow.flake'
import { AppDataSource } from '../dataSource'
import { Event } from '../entities/Event'

//  序列化/反序列化工具函数
const serializeRecord = (record: RecordItem[]): string => JSON.stringify(record)
const deserializeRecord = (record: string): RecordItem[] => JSON.parse(record) as RecordItem[]

//   EventWithRecord 类型
export type EventWithRecord = Omit<Event, 'record'> & { record: RecordItem[] }

export type CreateEventData = {
  name: string
  startDateTime: string
  endDateTime: string | null
  password: string
  isSolemn: boolean
  voiceName: string | null
  recorder: string
}

export async function createEvent(payload: CreateEventData): Promise<Event> {
  const repo = AppDataSource.getRepository(Event)
  const existing = await repo.findOneBy({ name: payload.name })
  if (existing) {
    throw new Error('事项名称已存在，请换一个名称')
  }
  const saved = await repo.save({
    id: snowFlake.nextId(),
    name: payload.name,
    startDateTime: new Date(payload.startDateTime),
    endDateTime: payload.endDateTime ? new Date(payload.endDateTime) : null,
    adminPasswordHash: hashPassword(payload.password),
    isSolemn: payload.isSolemn,
    voiceName: payload.voiceName,
    recorder: payload.recorder || ''
  })
  return saved
}

export async function listEvents(): Promise<EventWithRecord[]> {
  const repo = AppDataSource.getRepository(Event)
  const events = await repo.find({
    select: ['id', 'name', 'startDateTime', 'endDateTime', 'isSolemn', 'record'],
    order: { id: 'DESC' }
  })

  //  ：返回 EventWithRecord 类型
  return events.map((event) => ({
    ...event,
    record: deserializeRecord(event.record)
  })) as EventWithRecord[]
}

export async function findEventById(snowflakeId: string): Promise<EventWithRecord | null> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: snowflakeId })

  if (event) {
    // 返回 EventWithRecord 类型
    return {
      ...event,
      record: deserializeRecord(event.record)
    } as EventWithRecord
  }

  return null
}

export async function addRecord(eventId: string, newItem: RecordItem): Promise<EventWithRecord> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: eventId })
  if (!event) throw new Error('Event not found')

  //  反序列化
  const currentRecords = deserializeRecord(event.record)
  newItem.id = snowFlake.nextId()
  newItem.createdAt = new Date().toISOString() //设置创建时间
  currentRecords.push(newItem)

  //  序列化
  const updatedEvent = { ...event, record: serializeRecord(currentRecords) }
  const savedEvent = await repo.save(updatedEvent)

  // ：返回 EventWithRecord 类型
  return {
    ...savedEvent,
    record: deserializeRecord(savedEvent.record)
  } as EventWithRecord
}

export async function deleteRecord(eventId: string, index: number): Promise<EventWithRecord> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: eventId })
  if (!event) throw new Error('Event not found')

  //  ：反序列化
  const currentRecords = deserializeRecord(event.record)

  if (index < 0 || index >= currentRecords.length) {
    throw new Error('Invalid record index')
  }

  currentRecords.splice(index, 1)

  //  序列化
  const updatedEvent = { ...event, record: serializeRecord(currentRecords) }
  const savedEvent = await repo.save(updatedEvent)

  //  返回 EventWithRecord 类型
  return {
    ...savedEvent,
    record: deserializeRecord(savedEvent.record)
  } as EventWithRecord
}

export async function updateRecord(
  eventId: string,
  recordId: string,
  partial: Partial<RecordItem>
): Promise<EventWithRecord> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: eventId })
  if (!event) throw new Error('Event not found')

  const currentRecords = deserializeRecord(event.record)
  const targetIndex = currentRecords.findIndex((r) => r.id === recordId)
  if (targetIndex === -1) {
    throw new Error('Record not found')
  }

  const oldRecord = currentRecords[targetIndex]

  // --- 新增工具函数（如果尚未定义）---
  const fieldLabels: Record<string, string> = {
    name: '姓名',
    amount: '金额',
    payment_type: '收款类型',
    gift: '礼品',
    relationship: '关系',
    telephone: '电话',
    address: '住址',
    note: '备注'
  }

  const paymentTypeMap: Record<number, string> = {
    1: '现金',
    2: '微信',
    3: '支付宝',
    4: '其他'
  }

  const normalizeValue = (value: any): string | null => {
    if (value == null || value === '') return null
    return String(value)
  }

  const formatFieldValue = (key: string, value: any): string => {
    const normalized = normalizeValue(value)
    if (normalized === null) return '（空）'
    if (key === 'payment_type') {
      return paymentTypeMap[Number(value)] || String(value)
    }
    return String(value)
  }
  // --- 工具函数结束 ---

  const changes: string[] = []
  const updatedFields: Partial<RecordItem> = {}

  for (const key in partial) {
    if (!Object.prototype.hasOwnProperty.call(partial, key)) continue

    const k = key as keyof RecordItem
    const oldValue = oldRecord[k]
    const newValue = partial[k]

    const oldNorm = normalizeValue(oldValue)
    const newNorm = normalizeValue(newValue)

    if (oldNorm !== newNorm) {
      ;(updatedFields as any)[k] = newValue
      const label = fieldLabels[key] || key
      const formattedOld = formatFieldValue(key, oldValue)
      const formattedNew = formatFieldValue(key, newValue)

      // 关键修改：使用自然语言描述
      changes.push(`将${label}由 ${formattedOld} 修改为 ${formattedNew}`)
    }
  }

  if (changes.length === 0) {
    return { ...event, record: currentRecords } as EventWithRecord
  }

  const revisionText = changes.join('； ')

  const newRecord = { ...oldRecord, ...updatedFields }

  const historyEntry = {
    revision: revisionText,
    history: JSON.stringify(oldRecord),
    timestamp: new Date()
  }

  const updatedRecord = {
    ...newRecord,
    revision_history: [...(newRecord.revision_history || []), historyEntry]
  }

  currentRecords[targetIndex] = updatedRecord

  const updatedEvent = { ...event, record: serializeRecord(currentRecords) }
  const savedEvent = await repo.save(updatedEvent)

  return { ...savedEvent, record: deserializeRecord(savedEvent.record) } as EventWithRecord
}
export async function getRecordHistory(
  eventId: string,
  index: number
): Promise<{ revision: string; history: RecordItem; timestamp: Date }[]> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: eventId })
  if (!event) throw new Error('Event not found')

  //  反序列化
  const currentRecords = deserializeRecord(event.record)

  if (index < 0 || index >= currentRecords.length) {
    throw new Error('Invalid record index')
  }

  const history = currentRecords[index].revision_history || []
  return history.map((entry) => ({
    revision: entry.revision,
    history: JSON.parse(entry.history) as RecordItem,
    timestamp: entry.timestamp
  }))
}

export async function voidRecord(
  eventId: string,
  recordId: string,
  reason?: string
): Promise<EventWithRecord> {
  const repo = AppDataSource.getRepository(Event)
  const event = await repo.findOneBy({ id: eventId })
  if (!event) throw new Error('Event not found')

  const currentRecords = deserializeRecord(event.record)

  const targetIndex = currentRecords.findIndex((r) => r.id === recordId)
  if (targetIndex === -1) {
    throw new Error('Record not found')
  }

  const updatedRecord = {
    ...currentRecords[targetIndex],
    voided: true,
    voided_reason: reason || undefined
  }

  currentRecords[targetIndex] = updatedRecord

  const updatedEvent = { ...event, record: serializeRecord(currentRecords) }
  const savedEvent = await repo.save(updatedEvent)

  return { ...savedEvent, record: deserializeRecord(savedEvent.record) } as EventWithRecord
}

export async function saveEventRaw(rawEvent: any): Promise<Event> {
  // 深度清洗数据：确保所有字段都是 SQLite 兼容类型
  const cleanEvent = {
    id: rawEvent.id,
    name: rawEvent.name,
    adminPasswordHash: rawEvent.adminPasswordHash,
    // 关键：将 Date 转为 ISO 字符串
    startDateTime:
      rawEvent.startDateTime instanceof Date
        ? rawEvent.startDateTime.toISOString()
        : typeof rawEvent.startDateTime === 'string'
          ? rawEvent.startDateTime
          : new Date(rawEvent.startDateTime).toISOString(),
    endDateTime: rawEvent.endDateTime
      ? rawEvent.endDateTime instanceof Date
        ? rawEvent.endDateTime.toISOString()
        : typeof rawEvent.endDateTime === 'string'
          ? rawEvent.endDateTime
          : new Date(rawEvent.endDateTime).toISOString()
      : null,
    isSolemn: Boolean(rawEvent.isSolemn), // 转 boolean → SQLite 存为 0/1
    voiceName: rawEvent.voiceName || null,
    recorder: rawEvent.recorder || null,
    // 确保 record 是字符串
    record:
      typeof rawEvent.record === 'string' ? rawEvent.record : JSON.stringify(rawEvent.record || [])
  }

  const repo = AppDataSource.getRepository(Event)
  return await repo.save(cleanEvent)
}

export async function deleteEvent(eventId: string): Promise<void> {
  const repo = AppDataSource.getRepository(Event)
  const result = await repo.delete(eventId)
  if (result.affected === 0) {
    throw new Error('事项不存在')
  }
}

export async function updateEvent(eventId: string, updateData: Partial<Event>): Promise<Event> {
  const repo = AppDataSource.getRepository(Event)
  // 先获取原事件
  const existing = await repo.findOneBy({ id: eventId })
  if (!existing) throw new Error('事项不存在')

  // 合并更新（保留未修改字段）
  Object.assign(existing, updateData)

  // 确保 record 字段不变（只更新元信息）
  return await repo.save(existing)
}
