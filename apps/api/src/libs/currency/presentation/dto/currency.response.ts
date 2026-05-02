import { ApiProperty } from '@nestjs/swagger'

export class CurrencyResponseDto {
  @ApiProperty({ description: '화폐 ID' })
  id!: string

  @ApiProperty({ description: '화폐 코드 (예: USD, KRW)' })
  code!: string

  @ApiProperty({ description: '화폐명' })
  name!: string

  @ApiProperty({ description: '심볼' })
  symbol!: string

  @ApiProperty({ description: '썸네일 URL', required: false })
  thumbnailUrl?: string | null
}
