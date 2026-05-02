import { Controller, Get, Param } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { LanguageService } from '../application/language.service'
import { LanguageResponseDto } from './dto/language.response'
import { Language } from '../domain/language.entity'

@ApiTags('languages')
@Controller('languages')
export class LanguageController {
  constructor(private readonly languageService: LanguageService) {}

  /**
   * 모든 언어 조회
   *
   * @returns 언어 목록
   * @tag languages
   */
  @Get()
  async getAllLanguages(): Promise<LanguageResponseDto[]> {
    const languages = await this.languageService.getAllLanguages()
    return languages.map((language) => this.toResponseDto(language))
  }

  /**
   * 언어 상세 조회
   *
   * @param id 언어 ID
   * @returns 언어 정보
   * @tag languages
   */
  @Get(':id')
  async getLanguageById(
    @Param('id') id: string,
  ): Promise<LanguageResponseDto> {
    const language = await this.languageService.getLanguageById(id)
    return this.toResponseDto(language)
  }

  private toResponseDto(language: Language): LanguageResponseDto {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      originalName: language.originalName,
    }
  }
}
