import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { CurrencyService } from '../application/currency.service'
import { CurrencyResponseDto } from './dto/currency.response'
import { Currency } from '../domain/currency.entity'

@ApiTags('currencies')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * 모든 화폐 조회
   *
   * @returns 화폐 목록
   * @tag currencies
   */
  @Get()
  async getAllCurrencies(): Promise<CurrencyResponseDto[]> {
    const currencies = await this.currencyService.getAllCurrencies()
    return currencies.map((currency) => this.toResponseDto(currency))
  }

  /**
   * 화폐 상세 조회
   *
   * @param id 화폐 ID
   * @returns 화폐 정보
   * @tag currencies
   */
  @Get(':id')
  async getCurrencyById(
    @Param('id') id: string,
  ): Promise<CurrencyResponseDto> {
    const currency = await this.currencyService.getCurrencyById(id)
    return this.toResponseDto(currency)
  }

  private toResponseDto(currency: Currency): CurrencyResponseDto {
    return {
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      thumbnailUrl: currency.thumbnailUrl,
    }
  }
}
