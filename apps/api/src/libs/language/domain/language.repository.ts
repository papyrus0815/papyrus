import { Language } from './language.entity'

export interface LanguageRepository {
  findAll(): Promise<Language[]>
  findById(id: string): Promise<Language | null>
}
