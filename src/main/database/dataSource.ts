import { app } from 'electron'
import { join } from 'path'
import { DataSource } from 'typeorm'
import { Event } from './entities/Event.js'

const dbPath = join(app.getPath('userData'), 'gift-book.sqlite')

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: dbPath,
  entities: [Event], // ← 放类引用
  synchronize: true,
  logging: false
})
