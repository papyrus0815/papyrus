import { z } from 'zod'

/**
 * 국가 데이터 검증 스키마
 */
export const countrySchema = z.object({
  name: z
    .string()
    .min(1, '국가명을 입력하세요')
    .max(100, '국가명은 100자 이내여야 합니다'),
  localName: z
    .string()
    .max(100, '로컬명은 100자 이내여야 합니다')
    .transform((val) => val || undefined)
    .optional(),
  isoCode: z
    .string()
    .transform((val) => val.toUpperCase())
    .refine(
      (val) => !val || /^[A-Z]{2,3}$/.test(val),
      'ISO 코드는 2-3자의 대문자여야 합니다',
    )
    .transform((val) => val || undefined)
    .optional(),
  flagEmoji: z
    .string()
    .transform((val) => val || undefined)
    .optional(),
  flagImageUrl: z
    .string()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      '유효한 URL을 입력하세요',
    )
    .transform((val) => val || undefined)
    .optional(),
  capital: z
    .string()
    .max(100, '수도명은 100자 이내여야 합니다')
    .transform((val) => val || undefined)
    .optional(),
  continentId: z.string().min(1, '대륙을 선택하세요'),
  population: z
    .number()
    .int('정수를 입력하세요')
    .positive('양수를 입력하세요')
    .optional()
    .or(z.nan())
    .transform((val) => (isNaN(val as number) ? undefined : val)),
  areaSqKm: z
    .number()
    .positive('양수를 입력하세요')
    .optional()
    .or(z.nan())
    .transform((val) => (isNaN(val as number) ? undefined : val)),
  gdpUsdBn: z
    .number()
    .positive('양수를 입력하세요')
    .optional()
    .or(z.nan())
    .transform((val) => (isNaN(val as number) ? undefined : val)),
  thumbnailUrl: z
    .string()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      '유효한 URL을 입력하세요',
    )
    .transform((val) => val || undefined)
    .optional(),
  currencyId: z
    .string()
    .max(10, '화폐 ID는 10자 이내여야 합니다')
    .transform((val) => val || undefined)
    .optional(),
  languageId: z
    .string()
    .max(10, '언어 ID는 10자 이내여야 합니다')
    .transform((val) => val || undefined)
    .optional(),
})

export type CountryFormData = z.infer<typeof countrySchema>

