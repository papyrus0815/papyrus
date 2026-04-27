/**
 * 좌측 사이드바 네비.
 *
 * - 섹션 목록 표시 (작성 여부 dot)
 * - 클릭 시 본문의 anchor 영역으로 부드럽게 스크롤
 * - 본문 스크롤에 따라 active 섹션을 강조 (IntersectionObserver)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as S from './styles'
import type {
  EventEditorSectionDef,
  EventEditorSectionId,
} from '../model/section-config'
import type { EventEditorFormValues } from '../model/schema'
import type { FieldErrors } from 'react-hook-form'

interface Props {
  sections: EventEditorSectionDef[]
  values: EventEditorFormValues
  errors: FieldErrors<EventEditorFormValues>
  onJump: (id: EventEditorSectionId) => void
  /** 본문 스크롤 컨테이너 — IntersectionObserver root */
  scrollRoot: HTMLElement | null
}

/** zod 에러 키 → 섹션 매핑 (sidebar 빨간 표시) */
const ERROR_TO_SECTION: Record<string, EventEditorSectionId> = {
  title: 'basic',
  description: 'basic',
  startDate: 'basic',
  endDate: 'basic',
  location: 'basic',
  categoryId: 'basic',
  keywords: 'relations',
  background: 'content',
  aftermath: 'content',
  eventSections: 'content',
  eventImages: 'images',
  cityId: 'location',
  administrativeDivisionId: 'location',
  historicalCountryId: 'location',
  relatedPersons: 'relations',
  relatedCountryIds: 'relations',
  relatedHistoricalCountryIds: 'relations',
  childEventIds: 'relations',
  militaryEvent: 'military',
  conferenceEvent: 'conference',
}

export function SidebarNav({
  sections,
  values,
  errors,
  onJump,
  scrollRoot,
}: Props) {
  const [active, setActive] = useState<EventEditorSectionId>(
    sections[0]?.id ?? 'basic',
  )
  const observerRef = useRef<IntersectionObserver | null>(null)

  const errorSections = useMemo(() => {
    const set = new Set<EventEditorSectionId>()
    for (const key of Object.keys(errors)) {
      const sid = ERROR_TO_SECTION[key]
      if (sid) set.add(sid)
    }
    return set
  }, [errors])

  useEffect(() => {
    if (!scrollRoot) return
    observerRef.current?.disconnect()

    const targets = sections
      .map((s) => document.getElementById(`event-section-${s.id}`))
      .filter((el): el is HTMLElement => Boolean(el))

    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 위쪽에서 보이는 섹션을 active 로
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          )
        if (visible[0]) {
          const id = visible[0].target.id.replace(
            'event-section-',
            '',
          ) as EventEditorSectionId
          setActive(id)
        }
      },
      {
        root: scrollRoot,
        rootMargin: '-20% 0px -65% 0px',
        threshold: 0,
      },
    )

    targets.forEach((t) => observer.observe(t))
    observerRef.current = observer
    return () => observer.disconnect()
  }, [sections, scrollRoot])

  return (
    <>
      <S.SidebarSectionLabel>섹션</S.SidebarSectionLabel>
      <S.SidebarNavList>
        {sections.map((s) => {
          const filled = s.isFilled(values)
          const hasError = errorSections.has(s.id)
          return (
            <S.SidebarNavItem
              key={s.id}
              type="button"
              $active={active === s.id}
              $hasError={hasError}
              onClick={() => onJump(s.id)}
              aria-current={active === s.id ? 'true' : undefined}
            >
              <S.SidebarNavDot $filled={filled} />
              <span>{s.label}</span>
            </S.SidebarNavItem>
          )
        })}
      </S.SidebarNavList>
    </>
  )
}
