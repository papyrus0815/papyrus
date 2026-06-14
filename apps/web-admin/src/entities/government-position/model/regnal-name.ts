/**
 * 레거시 `왕명: X` notes 인코딩에서 왕명을 추출하는 단일 출처.
 *
 * 군주 재위는 예전에 전용 `regnalName` 필드가 없어 notes에 `왕명: 세종` 식으로 박아 두었다.
 * 여러 화면이 제각각 정규식을 복붙해 파싱하던 것을 한 곳으로 모은다. 통합 컴포넌트·정규화가
 * 모두 이 함수를 거치게 해, notes를 보존·해석하는 규칙을 하나로 유지한다.
 */
const LEGACY_REGNAL_NOTE_RE = /왕명\s*:\s*([^\n]+)/i

/** notes에서 `왕명:` 줄의 값을 추출. 없으면 null. */
export function regnalNameFromNotes(
  notes: string | null | undefined,
): string | null {
  if (!notes) return null
  const matched = notes.match(LEGACY_REGNAL_NOTE_RE)
  const value = matched?.[1]?.trim()
  return value && value.length > 0 ? value : null
}
