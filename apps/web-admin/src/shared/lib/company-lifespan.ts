import type { Company } from '@/shared/api/company'

import { parseIsoDateParts } from './iso-date'

type LifespanInput = Pick<Company, 'foundedAt' | 'dissolvedAt' | 'status'>

/**
 * 기업 존속 햇수 라벨 — 해산이면 '191년 존속', 활동 중이면 '43년째'.
 * 끝을 모르면(해산·합병 상태인데 해산일 미상) null. 서력에는 0년이 없으므로 BC→AD를 건너면 1을 뺀다.
 * 목록 '존속' 열과 상세 사실 띠가 같은 값을 보여야 해서 여기 한 곳에 둔다.
 */
export function companyLifespanLabel(
  company: LifespanInput,
  currentYear = new Date().getFullYear(),
): string | null {
  const start = parseIsoDateParts(company.foundedAt)?.year
  if (start == null) return null
  const dissolved = parseIsoDateParts(company.dissolvedAt)?.year
  const ongoing =
    dissolved == null && (!company.status || company.status === 'ACTIVE')
  const end = dissolved ?? (ongoing ? currentYear : null)
  if (end == null) return null
  const years = end - start - (start < 0 && end > 0 ? 1 : 0)
  if (years < 0) return null
  return ongoing ? `${years}년째` : `${years}년 존속`
}
