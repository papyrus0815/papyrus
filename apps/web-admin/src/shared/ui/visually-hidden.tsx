import styled from 'styled-components'

/**
 * 시각적으로는 숨기고 스크린리더에는 남기는 텍스트.
 *
 * `display:none`·`visibility:hidden`은 낭독에서도 사라지므로 쓰면 안 된다.
 *
 * ⚠️ 항상 **자식 엘리먼트**로 둘 것. testing-library의 getNodeText는 직계 텍스트 노드만
 * 결합하므로, 값 앞에 이 컴포넌트를 접두로 넣어도 `getByText('프랑스 왕국')` 류의
 * 기존 단언이 깨지지 않는다.
 *
 * (repo 안에 SrOnly 국소 복제가 몇 군데 더 있다 — select-modal·window-list·sparkline 등.
 *  새 코드는 이 공용을 쓰고, 기존 복제는 손대는 김에 하나씩 흡수할 것.)
 */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`
