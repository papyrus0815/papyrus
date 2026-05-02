import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { CurrencyRepository } from '../domain/currency.repository'
import { Currency } from '../domain/currency.entity'

@Injectable()
export class CurrencyService {
  constructor(
    @Inject('CurrencyRepository')
    private readonly currencies: CurrencyRepository,
  ) {}

  async getAllCurrencies(): Promise<Currency[]> {
    return this.currencies.findAll()
  }

  async getCurrencyById(id: string): Promise<Currency> {
    const currency = await this.currencies.findById(id)
    if (!currency) {
      throw new NotFoundException(`Currency with id ${id} not found`)
    }
    return currency
  }
}
