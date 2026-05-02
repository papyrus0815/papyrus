import { ApiProperty } from '@nestjs/swagger'

export class LanguageResponseDto {
  @ApiProperty({ description: '언어 ID' })
  id!: string

  @ApiProperty({ description: '언어 코드 (예: en, ko)' })
  code!: string

  @ApiProperty({ description: '언어명' })
  name!: string

  @ApiProperty({ description: '원어명', required: false })
  originalName?: string | null
}
