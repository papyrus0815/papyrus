const LABELS: Record<string, string> = {
  MENTOR: '스승',
  TEACHER: '스승',
  STUDENT: '제자',
  FRIEND: '친구',
  RIVAL: '경쟁자',
  ALLY: '동맹',
  ENEMY: '적대',
  COLLEAGUE: '동료',
  SUBORDINATE: '상관/부하',
  SUPERIOR: '상관',
  PATRON: '후원자',
  PROTEGE: '피후견인',
  RELATIVE: '친척',
  COUSIN: '사촌',
  STEPFATHER: '의붓아버지',
  STEPMOTHER: '의붓어머니',
  ADOPTED_PARENT: '양부모',
  ADOPTED_CHILD: '양자',
  HALF_SIBLING: '이복형제',
  STEP_SIBLING: '의붓형제',
}

export function relationshipLabel(type?: string | null): string {
  if (!type) return '관계'
  if (LABELS[type]) return LABELS[type]
  return type
    .split('_')
    .map((s) => s.charAt(0) + s.slice(1).toLowerCase())
    .join(' ')
}
