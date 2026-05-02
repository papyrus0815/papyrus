import { Currency } from './currency.entity'

export interface CurrencyRepository {
  findAll(): Promise<Currency[]>
  findById(id: string): Promise<Currency | null>
}
