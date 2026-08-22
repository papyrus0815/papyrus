import React from 'react'

import styled from 'styled-components'

import { ContentAreaShell } from '@/widgets/content-area-shell'

/**
 * ContentLayout — 콘텐츠 영역(국가·사건·인물·가문·…)의 최외곽 레이아웃.
 *
 * 두 가지를 준다:
 * 1. 전역 헤더 높이만큼의 오프셋과 내부 스크롤 컨테이너. 좌측 사이드바가 헤더 뒤로 들어가지
 *    않으려면 이 오프셋 안에 있어야 한다.
 * 2. **단일 ContentAreaShell**. 예전엔 지면마다 각자 ContentShell을 열어서 라우트를 옮길
 *    때마다 셸과 좌측 사이드바가 통째로 재마운트됐다. 여기로 올려 하나만 두면 콘텐츠 영역
 *    안을 오가는 동안 셸이 살아 있고, 좌측은 내용물만 바뀐다.
 */
export default function ContentLayout() {
  return (
    <Root>
      <Content>
        <ContentAreaShell />
      </Content>
    </Root>
  )
}

const Root = styled.div`
  width: 100%;
  min-height: 100vh;
  display: block;
  padding: var(--header-height) 0 0;
  background: ${({ theme }) => theme.colors.background.primary};
`

const Content = styled.div`
  min-width: 0;
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  overflow-x: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
  padding: 0;
  -webkit-overflow-scrolling: touch;
`
