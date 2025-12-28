export interface CreateReligionDto {
  /** 종교명 */
  name: string
  /** 설명 */
  description?: string
  /** 종교 시작일 */
  foundationDate?: string
}
