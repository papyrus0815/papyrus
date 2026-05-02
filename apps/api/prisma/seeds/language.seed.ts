import { PrismaService } from '../prisma.service'

interface LanguageData {
  code: string
  name: string
  originalName: string
}

const LANGUAGES: LanguageData[] = [
  { code: 'ko', name: '한국어', originalName: '한국어' },
  { code: 'en', name: '영어', originalName: 'English' },
  { code: 'ja', name: '일본어', originalName: '日本語' },
  { code: 'zh', name: '중국어', originalName: '中文' },
  { code: 'de', name: '독일어', originalName: 'Deutsch' },
  { code: 'fr', name: '프랑스어', originalName: 'Français' },
  { code: 'es', name: '스페인어', originalName: 'Español' },
  { code: 'it', name: '이탈리아어', originalName: 'Italiano' },
  { code: 'pt', name: '포르투갈어', originalName: 'Português' },
  { code: 'ru', name: '러시아어', originalName: 'Русский' },
  { code: 'ar', name: '아랍어', originalName: 'العربية' },
  { code: 'hi', name: '힌디어', originalName: 'हिन्दी' },
  { code: 'id', name: '인도네시아어', originalName: 'Bahasa Indonesia' },
  { code: 'th', name: '태국어', originalName: 'ไทย' },
  { code: 'vi', name: '베트남어', originalName: 'Tiếng Việt' },
  { code: 'tr', name: '튀르키예어', originalName: 'Türkçe' },
  { code: 'nl', name: '네덜란드어', originalName: 'Nederlands' },
  { code: 'sv', name: '스웨덴어', originalName: 'Svenska' },
  { code: 'no', name: '노르웨이어', originalName: 'Norsk' },
  { code: 'da', name: '덴마크어', originalName: 'Dansk' },
  { code: 'pl', name: '폴란드어', originalName: 'Polski' },
  { code: 'fi', name: '핀란드어', originalName: 'Suomi' },
  { code: 'uk', name: '우크라이나어', originalName: 'Українська' },
  { code: 'he', name: '히브리어', originalName: 'עברית' },
  { code: 'el', name: '그리스어', originalName: 'Ελληνικά' },
]

export async function seedLanguages(prisma: PrismaService): Promise<void> {
  console.log('\n🗣️ 언어 시딩 시작...')

  for (const language of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: language.code },
      update: language,
      create: language,
    })
  }

  console.log(`✅ 총 ${LANGUAGES.length}개 언어 시딩 완료!\n`)
}
