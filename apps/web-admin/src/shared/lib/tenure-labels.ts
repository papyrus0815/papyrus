/**
 * 재임·재위 공통 enum 라벨/옵션 — 등록 폼(드롭다운)과 상세 표시에서 공유하는 단일 출처.
 */

/** 취임/즉위(임명) 방식 enum → 한국어 라벨 (AppointmentMethod) */
export const APPOINTMENT_METHOD_LABELS: Record<string, string> = {
  DIRECT_ELECTION: '직접 선거',
  INDIRECT_ELECTION: '간접 선거',
  PARLIAMENTARY_ELECTION: '의회 선출',
  APPOINTMENT: '임명',
  HEREDITARY: '세습',
  ELECTIVE_MONARCHY: '선거군주제 선출',
  CONQUEST: '정복',
  RESTORATION: '복위',
  COUP: '쿠데타 / 혁명',
  OTHER: '기타',
}

/** 재임/재위 종료 사유 enum → 한국어 라벨 (TenureEndReason) */
export const TENURE_END_REASON_LABELS: Record<string, string> = {
  TERM_COMPLETED: '임기 만료',
  RESIGNATION: '사임 / 사퇴',
  ABDICATION: '자진 퇴위',
  SUCCESSION_TRANSFER: '양위 / 선위',
  REMOVAL: '폐위 / 해임',
  IMPEACHMENT: '탄핵',
  DEATH_IN_OFFICE: '재임 중 사망',
  OVERTHROWN: '쿠데타 / 혁명으로 축출',
  WAR_DEFEAT: '전쟁 패배',
  STATE_DISSOLVED: '국가 멸망',
  OTHER: '기타',
}

export type LabelOption = { value: string; label: string }

const toOptions = (labels: Record<string, string>): LabelOption[] =>
  Object.entries(labels).map(([value, label]) => ({ value, label }))

export const APPOINTMENT_METHOD_OPTIONS: LabelOption[] = toOptions(
  APPOINTMENT_METHOD_LABELS,
)
export const TENURE_END_REASON_OPTIONS: LabelOption[] = toOptions(
  TENURE_END_REASON_LABELS,
)
