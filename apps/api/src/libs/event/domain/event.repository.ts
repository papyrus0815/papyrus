import { Prisma } from '@prisma/client'
import { Event } from './event.entity'

export interface EventRepository {
  findAll(): Promise<Event[]>
  findById(id: string): Promise<Event | null>
  findByTitle(title: string, createdById?: string): Promise<Event | null>
  findByParentEventId(parentEventId: string): Promise<Event[]>
  create(data: Omit<Event, 'id'>): Promise<Event>
  /** tx를 주면 해당 트랜잭션 안에서 쓴다 — 계층(엣지·FK) 쓰기와 본체 update의 원자화용 */
  update(
    id: string,
    data: Partial<Omit<Event, 'id'>>,
    tx?: Prisma.TransactionClient,
  ): Promise<Event>
  /** tx를 주면 해당 트랜잭션 안에서 지운다 — 완전삭제의 엣지 승격 처리와 원자화용 */
  delete(id: string, tx?: Prisma.TransactionClient): Promise<void>
}
