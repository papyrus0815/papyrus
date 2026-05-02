import { useEffect, useState } from 'react'

import * as S from '../styles'

interface SectionLink {
  id: string
  label: string
}

interface DetailRailProps {
  sections: SectionLink[]
}

/**
 * Sticky 좌측 레일 — *섹션 nav 전용*.
 *
 * 인물/국가 사이드 칼럼은 본문 actors 섹션과 중복이라 이번 정리에서 제거.
 * Rail은 본문 흐름에서 시선을 빼앗지 않는 단일 책무(현재 위치 + 점프).
 */
export function DetailRail({ sections }: DetailRailProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')

  useEffect(() => {
    if (sections.length === 0) return undefined

    /* 보이는 섹션 중 *가장 위에 있는* 섹션을 active로 결정.
     * - IntersectionObserver의 threshold 0 + rootMargin으로 viewport 상단 1/3에
     *   걸친 섹션만 후보. 후보 중 boundingClientRect.top이 가장 작은(=상단에 가까운)
     *   섹션을 active로 고정.
     * - 짧은 섹션도 후보가 됨. 여러 entry가 동시에 와도 결정적. */
    const observer = new IntersectionObserver(
      () => {
        let bestId: string | null = null
        let bestTop = Number.POSITIVE_INFINITY
        for (const link of sections) {
          const node = document.getElementById(link.id)
          if (!node) continue
          const rect = node.getBoundingClientRect()
          const headerOffset = 80
          // 섹션 상단이 viewport headerOffset 위에 있어도 살짝 (-200 이내) 보이면 후보
          if (rect.bottom < headerOffset) continue
          if (rect.top > window.innerHeight * 0.5) continue
          // 후보 중 top이 가장 작은(가장 위) 항목 우선
          if (rect.top < bestTop) {
            bestTop = rect.top
            bestId = link.id
          }
        }
        if (bestId) setActiveId(bestId)
      },
      { rootMargin: '0px', threshold: [0, 0.1, 0.5, 1] },
    )

    for (const link of sections) {
      const node = document.getElementById(link.id)
      if (node) observer.observe(node)
    }

    return () => observer.disconnect()
  }, [sections])

  const handleNavClick = (id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    /* Page가 내부 scroll container — scrollIntoView가 nearest scrollable ancestor를
       자동 인식. CSS의 scroll-margin-top이 오프셋 보정. */
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  /* 섹션이 5개 미만이면 page 스크롤이 짧아 nav 가치가 거의 없음 — rail 자체를 숨김.
     본문 max-width가 줄지 않도록 main 그리드 컬럼은 페이지 단에서 처리. */
  if (sections.length < 5) return null

  return (
    <S.Rail>
      <S.RailGroup>
        <S.RailGroupLabel>목차</S.RailGroupLabel>
        <S.RailNavList aria-label="섹션 목차">
          {sections.map((link) => {
            const isActive = activeId === link.id
            return (
              <li key={link.id}>
                <S.RailNavItem
                  type="button"
                  $active={isActive}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => handleNavClick(link.id)}
                >
                  {link.label}
                </S.RailNavItem>
              </li>
            )
          })}
        </S.RailNavList>
      </S.RailGroup>
    </S.Rail>
  )
}
