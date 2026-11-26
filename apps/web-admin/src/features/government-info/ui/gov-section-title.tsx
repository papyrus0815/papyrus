/**
 * 정부·행정 지면의 구역 제목 한 줄.
 *
 *   행정부·내각 19                                          [⋯]
 *
 * 구역을 고르는 일은 국가 상세 머리 탭('정부·행정')의 2차 메뉴가 맡는다. 예전엔 이 제목도 ▾ 메뉴라
 * 같은 고르기가 머리와 본문 두 곳에 섰다 — 이제 여기는 지금 어느 구역인지만 말한다.
 * 제목 모양은 다른 탭의 구역 제목(SectionSubNav의 SectionHeading)과 같은 부품.
 */
import React from 'react'

import styled from 'styled-components'

import { SectionHeading } from '@/shared/ui/section-sub-nav/section-sub-nav'

interface GovSectionTitleProps {
  label: string
  count?: number | null
  hint?: string
  /** 오른쪽 도구(⋯ 등) */
  actions?: React.ReactNode
}

export function GovSectionTitle({ label, count, hint, actions }: GovSectionTitleProps) {
  return (
    <Row>
      <SectionHeading label={label} count={count} hint={hint} />
      {actions ? <Actions>{actions}</Actions> : null}
    </Row>
  )
}

/*
 * 아래 여백 — 국가 탭 줄과 이 줄 사이가 20px인데 아래 본문(구역 무대의 위 여백 16px 포함)까지는 30px라
 * 줄이 위로 붙어 보였다. 4px + 16px = 위와 같은 20px.
 */
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 31px;
  margin: 0 0 4px;
  min-width: 0;
`

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`
