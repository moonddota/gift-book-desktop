import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { RecordItem } from '../../sharedTypes.js'
import * as eventRepo from '../database/repositories/eventRepository.js'
import { verifyPassword } from '../utils/crypto.js'

// 定义 IPC 返回类型（可选但推荐）
type CreateEventResponse = { success: true; eventId: string } | { success: false; error: string }

type ListEventsResponse =
  | { success: true; events: Awaited<ReturnType<typeof eventRepo.listEvents>> }
  | { success: false; error: string }

export function registerEventHandlers(): void {
  ipcMain.handle(
    'event:create',
    async (
      _event: IpcMainInvokeEvent,
      payload: eventRepo.CreateEventData
    ): Promise<CreateEventResponse> => {
      try {
        const saved = await eventRepo.createEvent(payload)
        return { success: true, eventId: saved.id }
      } catch (err) {
        console.error('创建事项失败:', err)
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('event:list', async (): Promise<ListEventsResponse> => {
    try {
      const events = await eventRepo.listEvents()
      return { success: true, events }
    } catch (err) {
      console.error('获取事项列表失败:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('event:get-detail', async (_, eventId: string) => {
    try {
      const event = await eventRepo.findEventById(eventId)
      if (!event) {
        return { success: false, error: 'Event not found' }
      }

      return {
        success: true,
        data: {
          id: event.id,
          name: event.name,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          isSolemn: event.isSolemn,
          voiceName: event.voiceName,
          recorder: event.recorder,
          record: event.record
        }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'event:verify-password',
    async (_, { eventId, password }: { eventId: string; password: string }) => {
      try {
        if (!password) {
          return { success: false, error: '密码不能为空' }
        }

        // 从数据库查询完整事件（含 password hash）
        const event = await eventRepo.findEventById(eventId)
        if (!event) {
          return { success: false, error: '事项不存在' }
        }

        // 验证密码
        const isValid = verifyPassword(password, event.adminPasswordHash)
        if (!isValid) {
          return { success: false, error: '密码错误' }
        }

        return { success: true }
      } catch (err) {
        console.error('密码验证失败:', err)
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'record:add',
    async (_, { eventId, newItem }: { eventId: string; newItem: RecordItem }) => {
      try {
        const updatedEvent = await eventRepo.addRecord(eventId, newItem)
        return { success: true, event: updatedEvent }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'record:delete',
    async (_, { eventId, index }: { eventId: string; index: number }) => {
      try {
        const updatedEvent = await eventRepo.deleteRecord(eventId, index)
        return { success: true, event: updatedEvent }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'record:update',
    async (
      _,
      { eventId, id, partial }: { eventId: string; id: string; partial: Partial<RecordItem> }
    ) => {
      try {
        const updatedEvent = await eventRepo.updateRecord(eventId, id, partial)
        return { success: true, event: updatedEvent }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'record:get-history',
    async (_, { eventId, index }: { eventId: string; index: number }) => {
      try {
        const history = await eventRepo.getRecordHistory(eventId, index)
        return { success: true, history }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'record:void',
    async (_, { eventId, id, reason }: { eventId: string; id: string; reason?: string }) => {
      try {
        const updatedEvent = await eventRepo.voidRecord(eventId, id, reason)
        return { success: true, event: updatedEvent }
      } catch (err) {
        console.error('作废记录失败:', err)
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // ===== 新增：全量备份与恢复 =====
  ipcMain.handle('backup:export-full', async (_, { eventId }: { eventId: string }) => {
    try {
      const event = await eventRepo.findEventById(eventId)
      if (!event) {
        return { success: false, error: '事项不存在' }
      }
      // 返回完整 EventWithRecord（含 id 和所有字段）
      return { success: true, data: event }
    } catch (err) {
      console.error('全量导出失败:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('backup:import-full', async (_, { eventData }: { eventData: unknown }) => {
    try {
      // 运行时验证数据结构
      if (
        !eventData ||
        typeof eventData !== 'object' ||
        !('id' in eventData) ||
        !('name' in eventData) ||
        typeof eventData.id !== 'string' ||
        typeof eventData.name !== 'string'
      ) {
        return { success: false, error: '备份数据无效：缺少必要字段' }
      }

      // 转为 plain object（确保无原型污染）
      const plainEvent = JSON.parse(JSON.stringify(eventData))

      // 直接保存原始事件数据（覆盖或插入）
      const saved = await eventRepo.saveEventRaw(plainEvent)
      return { success: true, eventId: saved.id }
    } catch (err) {
      console.error('全量恢复失败:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('event:delete', async (_, { eventId }: { eventId: string }) => {
    try {
      await eventRepo.deleteEvent(eventId)
      return { success: true }
    } catch (err) {
      console.error('删除事项失败:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'event:update',
    async (_, { eventId, updateData }: { eventId: string; updateData: any }) => {
      try {
        // 清洗日期字段（防止传入 Date 对象）
        const cleanData = { ...updateData }
        if (cleanData.startDateTime && !(typeof cleanData.startDateTime === 'string')) {
          cleanData.startDateTime = new Date(cleanData.startDateTime).toISOString()
        }
        if (cleanData.endDateTime && !(typeof cleanData.endDateTime === 'string')) {
          cleanData.endDateTime = new Date(cleanData.endDateTime).toISOString()
        }

        const updated = await eventRepo.updateEvent(eventId, cleanData)
        return { success: true, data: updated }
      } catch (err) {
        console.error('更新事项失败:', err)
        return { success: false, error: (err as Error).message }
      }
    }
  )
}
