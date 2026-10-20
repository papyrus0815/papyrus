/** 사건 ↔ 기업·조직 역할 — 상세 '관련 기업·조직'과 등록 모달 '기업·조직' 칸이 같이 쓴다 */
import type { EventOrganizationRole } from '@/shared/api/events'

export const ORGANIZATION_ROLE_OPTIONS: Array<{ value: EventOrganizationRole; label: string; description: string }> = [
  { value: 'PRINCIPAL', label: '주체', description: '사건을 일으키거나 이끈 조직' },
  { value: 'FOUNDED', label: '설립', description: '이 사건으로 세워진 조직' },
  { value: 'DISSOLVED', label: '해산·폐업', description: '이 사건으로 없어진 조직' },
  { value: 'ACQUIRER', label: '인수', description: '다른 조직을 사들인 쪽' },
  { value: 'ACQUIRED', label: '피인수', description: '팔린 쪽' },
  { value: 'PARTICIPANT', label: '참여', description: '사건에 함께한 조직' },
  { value: 'CONTRACTOR', label: '시공·건설', description: '공사·구축을 맡은 조직' },
  { value: 'BENEFICIARY', label: '수혜', description: '사건으로 이득을 본 조직' },
  { value: 'VICTIM', label: '피해', description: '사건으로 손해를 본 조직' },
  { value: 'OTHER', label: '기타', description: '그 밖의 관계' },
]
