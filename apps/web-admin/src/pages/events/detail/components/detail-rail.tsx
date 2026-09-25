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
 * 목차 — 우측 장부 칼럼(S.Aside) 안의 섹션 내비.
 *
 * sticky·스크롤은 Aside가 소유한다. 여기는 '현재 위치 + 점프' 단일 책무.
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

  /**
   * 예전엔 섹션 5개 미만이면 레일을 통째로 숨겼다 — 좌측 200px가 목차뿐이라 비면
   * 빈 칸만 남았기 때문이다. 이제 이 칼럼은 사실 장부가 채우고 목차는 그 아래 블록이라,
   * 숨길 이유가 없다(섹션이 적어도 '이 문서에 무엇이 있는지'는 여전히 목차가 말한다).
   */
  if (sections.length === 0) return null

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
