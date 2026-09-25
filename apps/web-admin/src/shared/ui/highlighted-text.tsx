/**
 * 검색어와 맞은 부분을 `<mark>`로 짚어 주는 조각 — 자체 검색을 가진 목록 공용.
 *
 * 결과 목록에서 '왜 이 행이 여기 있나'는 행이 스스로 답해야 한다. 사이드바 검색은
 * 제목 밖(분류·관련국·장소·키워드)에서도 걸리기 때문에, 표시를 안 하면 '오스만'으로
 * 25행이 떴는데 그 25행 어디에도 그 말이 안 보이는 일이 생긴다.
 *
 * 원래 가문 목록(widgets/dynasty) 안에 있던 것을 그대로 올렸다 — 사건 사이드바가
 * 두 번째 소비처가 되면서 복사본을 하나 더 만들 이유가 없어졌다.
 * (사건 카탈로그 본문 event-list-item에도 같은 일을 하는 private 사본이 아직 있다.)
 *
 * ⚠️ 정규식 메타 문자는 escape한다 — 검색창에 '('만 쳐도 터지던 종류의 버그.
 */
import { Fragment, type ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  text: string
  query: string
}

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function HighlightedText({ text, query }: Props): ReactNode {
  const term = query.trim()
  if (!term) return text
  const pattern = new RegExp(`(${escapeRegExp(term)})`, 'gi')
  const parts = text.split(pattern)
  return (
    <>
      {parts.map((part, index) =>
        // pattern에 capturing group을 두면 split 결과의 홀수 인덱스가 매치된 토큰
        index % 2 === 1 ? (
          <Mark key={index}>{part}</Mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  )
}

const Mark = styled.mark`
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,213,0,0.32)'
      : 'rgba(255,235,59,0.55)'};
  /*
   * ⚠️ 글자색을 inherit으로 두면 **강조한 글자가 주변보다 안 읽힌다**. 노란 칠은 라이트에서 면을
   * (styled 리터럴 안이라 주석에도 백틱을 쓰지 않는다 — 거기서 템플릿이 닫힌다)
   * 어둡게, 다크에서 밝게 끌어당기는데 글자색은 그대로라 대비가 깎인다 — 실측으로
   * 다크 메타 줄이 5.77 → 3.02:1(AA 미달), 다크 선택 행 제목이 3.26:1, 라이트 메타 줄이
   * 4.29:1이었다. 찾던 낱말이 목록에서 가장 안 읽히는 글자가 되는 셈이다.
   * 칠 위에서는 그 테마의 primary 잉크로 고정한다(전 상태 5.83~13.01:1).
   * 덤으로 매치가 주변보다 **진해져** 강조가 강조답게 된다.
   */
  color: ${({ theme }) => theme.colors.text.primary};
  /*
   * 칠은 글자 밖으로 2px 번지되 **자리는 차지하지 않는다**(padding을 margin으로 상쇄).
   * 그냥 padding만 주면 강조가 글자를 밀어 '오스만-오스트리아 협정'이 검색 중에만
   * '오스만 -오스트리아 협정'으로 벌어진다 — 검색어를 칠했더니 낱말이 갈라져 보였다.
   */
  padding: 0 2px;
  margin: 0 -2px;
  border-radius: 2px;
`
