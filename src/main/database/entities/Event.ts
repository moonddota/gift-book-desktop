import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('Event')
export class Event {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  @Column({ type: 'datetime' })
  startDateTime!: Date

  @Column({ type: 'datetime', nullable: true })
  endDateTime?: Date | null

  @Column({ type: 'varchar', length: 255 })
  adminPasswordHash!: string

  @Column({ type: 'boolean', default: false })
  isSolemn!: boolean

  @Column({ type: 'varchar', length: 255, nullable: true })
  voiceName?: string | null

  @Column({ type: 'varchar', length: 255, default: '' })
  recorder!: string

  @Column({ type: 'text', default: '[]' })
  record!: string
}
