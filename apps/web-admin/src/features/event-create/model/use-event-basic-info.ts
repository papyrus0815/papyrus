/**
 * 사건 본문 단락(편집 폼) 타입
 * FSD: features/event-create/model
 *
 * (예전 이 파일의 useEventBasicInfo 훅은 소비처가 없는 채 카테고리 상태·DB 카테고리 목록을 들고 있어
 *  분야 enum 전환 때 지웠다 — 폼 상태의 정본은 features/event-form/model/useBasicInfoForm.ts.)
 */
import type { MentionEntityType } from '@/shared/lib/mention/mention-system'

export interface EventSection {
  id: string
  title: string
  content: string
  /**
   * 서버 EventSection.sectionType — 이 폼은 '전개' 단락만 편집하지만, 편집 모드에서
   * 읽어온 단락이 **배경 단락('background')일 수 있다**. 사건 상세가 배경/전개를
   * 같은 eventSections 배열의 sectionType으로 가르므로, 여기서 값을 떨어뜨리면
   * 저장 한 번에 배경 단락이 전개로 옮겨 붙는다. 신규 단락은 undefined(→ 'content').
   */
  sectionType?: string
  mentions: Array<{
    type: MentionEntityType
    id: string
    name: string
    startIndex: number
    endIndex: number
  }>
}
