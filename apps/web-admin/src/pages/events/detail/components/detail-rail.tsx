import { useEffect, useMemo, useState } from 'react'

import * as S from '../styles'
import { scrollToAnchor } from './scroll-to-anchor'
import { type OutlineItem } from './section-outline.lib'

interface DetailRailProps {
  sections: OutlineItem[]
}

/** 섹션 머리가 이 선(뷰포트 상단에서 px)을 넘어가면 '지금 읽는 중'으로 본다. */
const READING_LINE = 120

/**
 * 목차 — 우측 장부 칼럼(S.Aside) 안의 섹션 내비.
 *
 * sticky·스크롤은 Aside가 소유한다. 여기는 '현재 위치 + 점프' 단일 책무.
 *
 * 번호 단락(배경·전개의 1·2·3)은 그 섹션을 읽는 동안에만 아래로 펼친다 — 한국전쟁의
 * '전개'는 10,800px(약 12화면)인데 목차에는 '전개' 한 줄뿐이라, 그 안에서 지금 몇 번째
 * 단락인지·다음 단락이 무엇인지 알 수 없었다.
 */
export function DetailRail({ sections }: DetailRailProps) {
  /* 문서 순서대로 펼친 앵커 목록 — 부모 다음에 그 단락들. */
  const flatIds = useMemo(
    () =>
      sections.flatMap((section) => [
        section.id,
        ...(section.children ?? []).map((child) => child.id),
      ]),
    [sections],
  )
  const [activeId, setActiveId] = useState<string>(flatIds[0] ?? '')

  useEffect(() => {
    if (flatIds.length === 0) return undefined

    /**
     * 현재 위치 = 머리가 읽는 선을 **마지막으로 넘은** 앵커. 단락은 섹션 안에 들어 있어
     * '가장 위에 있는 것'을 고르면 늘 부모 섹션이 이긴다(예전 판정) — 문서 순서상 가장
     * 뒤의 통과 항목을 고르면 부모·단락이 자연히 갈린다.
     *
     * 이 지면의 스크롤 컨테이너는 window가 아니라 내부 S.Page다. capture로 문서 전체의
     * scroll을 받으면 컨테이너를 몰라도 된다.
     */
    let frame = 0
    const update = () => {
      frame = 0
      let current = flatIds[0]
      for (const id of flatIds) {
        const node = document.getElementById(id)
        if (!node) continue
        if (node.getBoundingClientRect().top <= READING_LINE) current = id
      }
      setActiveId(current)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [flatIds])

  const handleNavClick = (id: string) => scrollToAnchor(id)

  if (sections.length === 0) return null

  return (
    <S.Rail>
      <S.RailGroup>
        <S.RailGroupLabel>목차</S.RailGroupLabel>
        <S.RailNavList aria-label="섹션 목차">
          {sections.map((link) => {
            const children = link.children ?? []
            const childActive = children.some((child) => child.id === activeId)
            const isActive = activeId === link.id || childActive
            return (
              <li key={link.id}>
                <S.RailNavItem
                  type="button"
                  $active={isActive}
                  aria-current={activeId === link.id ? 'location' : undefined}
                  onClick={() => handleNavClick(link.id)}
                >
                  {link.label}
                </S.RailNavItem>
                {isActive && children.length > 0 && (
                  <S.RailSubList aria-label={`${link.label} 단락`}>
                    {children.map((child, index) => (
                      <li key={child.id}>
                        <S.RailSubItem
                          type="button"
                          $active={activeId === child.id}
                          aria-current={
                            activeId === child.id ? 'location' : undefined
                          }
                          title={child.label}
                          onClick={() => handleNavClick(child.id)}
                        >
                          <S.RailSubIndex aria-hidden>{index + 1}</S.RailSubIndex>
                          <S.RailSubLabel>{child.label}</S.RailSubLabel>
                        </S.RailSubItem>
                      </li>
                    ))}
                  </S.RailSubList>
                )}
              </li>
            )
          })}
        </S.RailNavList>
      </S.RailGroup>
    </S.Rail>
  )
}
