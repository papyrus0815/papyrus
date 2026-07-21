import { Event } from './event.entity'

export interface EventRepository {
  findAll(): Promise<Event[]>
  findById(id: string): Promise<Event | null>
  findByTitle(title: string, createdById?: string): Promise<Event | null>
  findByParentEventId(parentEventId: string): Promise<Event[]>
  create(data: Omit<Event, 'id'>): Promise<Event>
  update(id: string, data: Partial<Omit<Event, 'id'>>): Promise<Event>
  delete(id: string): Promise<void>
}

