import { Continent } from './continent.entity'

export interface ContinentRepository {
  findAll(): Promise<Continent[]>
  findById(id: string): Promise<Continent | null>
  findByName(name: string): Promise<Continent | null>
  create(data: Omit<Continent, 'id'>): Promise<Continent>
  update(id: string, data: Partial<Omit<Continent, 'id'>>): Promise<Continent>
  delete(id: string): Promise<void>
}
