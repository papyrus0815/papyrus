/**
 * 콘텐츠 영역의 **단일 셸** — ContentLayout이 렌더한다.
 *
 * 예전에는 지면마다 각자 ContentShell을 열었다. 그러면 라우트를 옮길 때마다 셸 전체가
 * 언마운트/재마운트되고, 좌측 사이드바가 페이지의 일부처럼 매번 새로 만들어졌다.
 * 여기로 올리면 셸 인스턴스는 콘텐츠 영역 안에서 **계속 살아 있고**, 경로에 따라 좌측
 * 내용물만 바뀐다.
 *
 * 규약:
 * - 어느 지면에 어떤 사이드바가 붙는지는 **이 파일 한 곳**에서 정한다.
 * - 사이드바는 자립해야 한다(선택 id는 URL에서, 모달은 자기가 소유). 페이지가 내려주는
 *   props에 의존하면 페이지 언마운트와 함께 죽어 셸을 올린 의미가 없어진다.
 * - 좌측이 없는 지면(수장 비교처럼 자체 좌측 UI를 가진 곳)은 fullScreen으로 통과시킨다.
 * - 현재 지면의 목록 사이드바 폭을 `--list-sidebar-width`로 내려준다. 레일 밖에 fixed로 떠
 *   있는 하단 계정 패널이 자기 폭을 이 값으로 잡는다(사이드바 없으면 0 → 아바타만 남음).
 */
import React from 'react'

import { Outlet, useLocation } from 'react-router-dom'
import { createGlobalStyle } from 'styled-components'

import { ContentShell } from '@/widgets/content-shell'
import { CountrySidebar } from '@/widgets/country/country-list/ui/country-sidebar'
import {
  CompanyListSidebar,
  ContinentListSidebar,
  DynastyListSidebar,
  EthnicityListSidebar,
  MilitaryUnitListSidebar,
  OrganizationListSidebar,
  PersonGroupListSidebar,
} from '@/widgets/domain-sidebars'
import { EventListSidebar } from '@/widgets/event/event-list-sidebar'
import { PersonSidebar } from '@/widgets/person/person-list'

interface SidebarContext {
  collapsed: boolean
  onToggleCollapse: () => void
}

interface DomainSpec {
  /** 접힘 상태 localStorage 키 — 지면마다 분리 */
  storageKey: string
  defaultCollapsed?: boolean
  /** 국가 목록 상태 Provider(현대·역사·대륙 fetch)가 필요한 지면인가 */
  countryListState?: boolean
  render: (context: SidebarContext) => React.ReactNode
}

/** 경로 → 그 지면의 선택된 항목 id. 목록만 보는 중이면 null. */
function idFromPath(pathname: string, base: string, exclude: string[] = []) {
  const matched = new RegExp(`^/${base}/([^/]+)`).exec(pathname)
  if (!matched) return null
  const id = decodeURIComponent(matched[1])
  return exclude.includes(id) ? null : id
}

/**
 * 경로 → 사이드바. 위에서부터 먼저 맞는 것을 쓴다.
 * null을 돌려주면 좌측 없이(fullScreen) 우측만 그린다.
 */
function specFor(pathname: string): DomainSpec | null {
  if (pathname.startsWith('/country')) {
    return {
      storageKey: 'country-list-collapsed',
      countryListState: true,
      render: (context) => <CountrySidebar {...context} />,
    }
  }
  if (pathname.startsWith('/persons-timeline')) {
    return {
      storageKey: 'persons-list-collapsed',
      render: (context) => <PersonSidebar {...context} />,
    }
  }
  if (pathname.startsWith('/events')) {
    return {
      /* 기본 접힘 — 사건 카탈로그는 "목록이 전체 화면을 써야 한다"는 결정으로 캡·중앙정렬을
         걷어낸 지면이라, 사이드바를 기본으로 펼치면 툴바가 3줄로 접히며 그 결정을 되돌린다. */
      storageKey: 'events-list-collapsed',
      defaultCollapsed: true,
      render: (context) => (
        <EventListSidebar
          selectedId={idFromPath(pathname, 'events', ['create'])}
          {...context}
        />
      ),
    }
  }
  if (pathname.startsWith('/companies')) {
    return {
      storageKey: 'companies-list-collapsed',
      render: (context) => (
        <CompanyListSidebar
          selectedId={idFromPath(pathname, 'companies', ['new'])}
          {...context}
        />
      ),
    }
  }
  if (pathname.startsWith('/person-groups')) {
    return {
      storageKey: 'person-groups-list-collapsed',
      render: (context) => (
        <PersonGroupListSidebar
          selectedId={idFromPath(pathname, 'person-groups')}
          {...context}
        />
      ),
    }
  }
  if (pathname.startsWith('/dynasty')) {
    return {
      storageKey: 'dynasty-list-collapsed',
      render: (context) => <DynastyListSidebar {...context} />,
    }
  }
  if (pathname.startsWith('/continents')) {
    return {
      storageKey: 'continents-list-collapsed',
      render: (context) => <ContinentListSidebar {...context} />,
    }
  }
  if (pathname.startsWith('/ethnicity')) {
    return {
      storageKey: 'ethnicity-list-collapsed',
      render: (context) => <EthnicityListSidebar {...context} />,
    }
  }
  if (pathname.startsWith('/legislature')) {
    return {
      storageKey: 'legislature-list-collapsed',
      render: (context) => <OrganizationListSidebar {...context} />,
    }
  }
  if (pathname.startsWith('/military')) {
    return {
      storageKey: 'military-list-collapsed',
      render: (context) => <MilitaryUnitListSidebar {...context} />,
    }
  }
  // 수장 비교(/heads-of-state)는 자체 좌측 UI(핀 편집기)를 가지므로 좌측을 비운다
  return null
}

export function ContentAreaShell() {
  const { pathname } = useLocation()
  const spec = specFor(pathname)

  if (!spec) {
    return (
      <>
        <SidebarWidthVar $width="0px" />
        <ContentShell fullScreen right={<Outlet />} />
      </>
    )
  }

  return (
    <ContentShell
      /* 모바일(≤1024px)에서는 좌측이 숨겨지므로 우측 본문을 반드시 노출해야 한다 */
      mobileDetailVisible
      countryListState={spec.countryListState}
      listCollapsedConfig={{
        storageKey: spec.storageKey,
        defaultCollapsed: spec.defaultCollapsed,
      }}
      left={({ listCollapsed, toggleListCollapsed }) => (
        <>
          {/* 접힘 폭(48px)까지 반영 — 하단 계정 패널이 사이드바와 같이 줄었다 늘었다 한다 */}
          <SidebarWidthVar
            $width={listCollapsed ? '48px' : 'var(--list-sidebar-full, 320px)'}
          />
          {spec.render({
            collapsed: listCollapsed,
            onToggleCollapse: toggleListCollapsed,
          })}
        </>
      )}
      right={<Outlet />}
    />
  )
}

/**
 * 목록 사이드바 폭을 전역 변수로 공개 — 레일 밖 fixed 요소(하단 계정 패널)가 참조한다.
 * 1024px 이하에서는 사이드바가 숨으므로 0.
 */
const SidebarWidthVar = createGlobalStyle<{ $width: string }>`
  :root {
    --list-sidebar-width: ${({ $width }) => $width};
  }
  @media (max-width: 1024px) {
    :root { --list-sidebar-width: 0px; }
  }
`
