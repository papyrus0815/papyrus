import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { LanguageRepository } from '../domain/language.repository'
import { Language } from '../domain/language.entity'

@Injectable()
export class LanguageService {
  constructor(
    @Inject('LanguageRepository')
    private readonly languages: LanguageRepository,
  ) {}

  async getAllLanguages(): Promise<Language[]> {
    return this.languages.findAll()
  }

  async getLanguageById(id: string): Promise<Language> {
    const language = await this.languages.findById(id)
    if (!language) {
      throw new NotFoundException(`Language with id ${id} not found`)
    }
    return language
  }
}
