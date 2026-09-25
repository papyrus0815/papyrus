/**
 * 배경·전개 번호 단락의 **순수 로직** — 분류·직렬화·서버 동기화.
 *
 * UI(narrative-sections.tsx)와 분리한 이유: 조판 파일은 rich-text 에디터까지 끌고 와
 * 단위 테스트에서 로드할 수 없다(detail-network.lib.ts와 같은 분리).
 */

/**
 * 배경 단락의 sectionType — eventSections 한 배열 안에서 배경/전개를 가르는 태그.
 * 나머지(전개)는 레거시 값이 'content'·'narrative'·null로 섞여 있어 *배경이 아닌 것*
 * 전부를 전개로 본다(새로 만드는 전개 단락만 'narrative'로 기록).
 */
export const BACKGROUND_TYPE = 'background'
export const NARRATIVE_TYPE = 'narrative'

export const isBackgroundSection = (sectionType?: string | null) =>
  sectionType === BACKGROUND_TYPE

export interface SectionRow {
  /** 클라이언트 임시 키 — React 리스트 식별·child 컴포넌트 인스턴스 보존용. */
  key: string
  /**
   * 마지막으로 매핑된 서버 row id(있다면). 서버는 delete-and-recreate이라 PUT마다
   * id가 새로 발급되지만, 한 응답 사이클 안에서는 같은 id가 같은 row를 가리킴
   * — race 동안 위치 join의 보조 시그널로 사용.
   */
  serverId?: string
  title: string
  content: string
  sectionType?: string
}

/**
 * server 응답과 로컬 rows를 매핑한다. 핵심 목표는 **child 컴포넌트 키 보존**
 * — InlineText/InlineRichText는 자체 draft state를 들고 있어 key가 바뀌면 input이
 * unmount/remount되며 IME·커서·미저장 입력이 끊어진다.
 *
 * 매핑 전략(우선순위 순):
 *  1) **길이가 같을 때**: positional join. server[i] ↔ prev[i] 키 그대로 가져가고
 *     content/title은 *prev가 server보다 새로우면 prev 우선* — 즉, 사용자가 막 친
 *     값이 in-flight 응답(이전 상태 반영)으로 덮이지 않도록 한다. 동일성은
 *     "serverId가 같거나 prev의 serverId가 없으면 prev가 더 최신"으로 판정.
 *  2) **길이가 다를 때**: content-aware fallback. 동일한 (title, content, sectionType)
 *     이 있으면 키 보존. 아니면 새 row.
 *  3) 매칭 못한 prev row(아직 commit 안 된 빈 tail 등)는 끝에 append — 사용자 입력
 *     손실 방지.
 */
export function syncRowsWithServer(
  prev: SectionRow[],
  server: Array<{
    id: string
    title?: string | null
    content?: string | null
    sectionType?: string | null
  }>,
  nextKey: () => string,
): SectionRow[] {
  // (1) 같은 길이 — positional join (race-safe).
  if (prev.length === server.length) {
    return server.map((section, index) => {
      const prevRow = prev[index]
      const serverTitle = section.title ?? ''
      const serverContent = section.content ?? ''
      const serverType = section.sectionType ?? undefined

      // prev가 in-flight 상태(아직 새 serverId 미수령)거나, 사용자가 친 값이 더 새
      // 보이면 prev 값을 유지. 그렇지 않으면 server 값 채택.
      const prevIsAhead =
        prevRow.serverId === undefined ||
        (prevRow.serverId !== section.id &&
          (prevRow.title !== serverTitle ||
            prevRow.content !== serverContent ||
            prevRow.sectionType !== serverType))

      if (prevIsAhead) {
        // prev 값 그대로 두고 serverId만 새로 발급된 id로 갱신.
        return { ...prevRow, serverId: section.id }
      }
      // server 값 채택 — 키 보존.
      return {
        key: prevRow.key,
        serverId: section.id,
        title: serverTitle,
        content: serverContent,
        sectionType: serverType,
      }
    })
  }

  // (2) 길이 불일치 — content-aware fallback.
  const prevUsed = new Array<boolean>(prev.length).fill(false)
  const next: SectionRow[] = []

  for (const section of server) {
    const serverTitle = section.title ?? ''
    const serverContent = section.content ?? ''
    const serverType = section.sectionType ?? undefined
    // 우선 동일 serverId — drop-and-recreate라 보통 안 맞지만, 같은 응답 사이클에서
    // 이미 매핑된 row가 있다면 그쪽 우선.
    let matchedIdx = prev.findIndex(
      (row, index) => !prevUsed[index] && row.serverId === section.id,
    )
    if (matchedIdx < 0) {
      for (let index = 0; index < prev.length; index++) {
        if (prevUsed[index]) continue
        const row = prev[index]
        if (
          row.title === serverTitle &&
          row.content === serverContent &&
          row.sectionType === serverType
        ) {
          matchedIdx = index
          break
        }
      }
    }
    if (matchedIdx >= 0) {
      prevUsed[matchedIdx] = true
      next.push({ ...prev[matchedIdx], serverId: section.id })
    } else {
      next.push({
        key: nextKey(),
        serverId: section.id,
        title: serverTitle,
        content: serverContent,
        sectionType: serverType,
      })
    }
  }

  for (let index = 0; index < prev.length; index++) {
    if (!prevUsed[index]) next.push(prev[index])
  }

  return next
}

/**
 * 배경·전개 두 묶음을 **하나의 eventSections 배열**로 직렬화한다.
 *
 * 서버는 PUT마다 eventSections를 통째로 delete-and-recreate하므로, 한쪽 묶음만 보내면
 * 다른 쪽이 통째로 사라진다 — 어떤 변경이든 항상 두 묶음을 합쳐 보낸다.
 * order는 배경 → 전개 순 통산이고, 이 순서가 다음 GET의 분리·정렬을 되돌린다.
 *
 * 빈 row(title·content 모두 비어 있음)는 제외 — 사용자가 "+추가"만 누르고 아직 채우지
 * 않은 로컬 row가 서버로 새지 않게 한다. 반대로 title이 비어 있어도 content가 있으면
 * 그대로 보낸다(빈 제목을 placeholder 문자열로 강제 치환하지 않는다).
 */
export function mergeSectionPayload(
  backgroundRows: SectionRow[],
  narrativeRows: SectionRow[],
): Array<{ title: string; content: string; order: number; sectionType: string }> {
  const serialize = (rows: SectionRow[], fallbackType: string) =>
    rows
      .filter((row) => row.title.trim() || row.content.trim())
      .map((row) => ({
        title: row.title.trim(),
        content: row.content,
        sectionType: row.sectionType ?? fallbackType,
      }))

  return [
    ...serialize(backgroundRows, BACKGROUND_TYPE),
    ...serialize(narrativeRows, NARRATIVE_TYPE),
  ].map((section, index) => ({ ...section, order: index }))
}

