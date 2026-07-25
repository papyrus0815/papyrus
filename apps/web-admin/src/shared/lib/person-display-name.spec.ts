/**
 * getPersonDisplayName — 표시 순서 우선순위 + 중간이름(middleName) 규칙.
 * 핵심: 중간이름은 '이름–중간–성' 서양식에서만 자리가 있으므로, 있으면 서양식으로 강제한다
 * (성-우선 순서에서 성 뒤 꼬리로 매달리는 회귀 방지).
 */
import { getPersonDisplayName } from './person-display-name'

describe('getPersonDisplayName — 순서 우선순위', () => {
  it('개인 오버라이드가 국가 기본보다 우선', () => {
    expect(
      getPersonDisplayName({
        name: '철수',
        surname: '김',
        nameDisplayOrder: 'western',
        country: { defaultNameDisplayOrder: 'korean' },
      }),
    ).toBe('철수 김')
  })

  it('오버라이드 없으면 국가 기본을 따른다', () => {
    expect(
      getPersonDisplayName({
        name: 'John',
        surname: 'Kennedy',
        country: { defaultNameDisplayOrder: 'western' },
      }),
    ).toBe('John Kennedy')
  })

  it('아무 것도 없으면 동양식(성+이름) 폴백', () => {
    expect(getPersonDisplayName({ name: '철수', surname: '김' })).toBe('김 철수')
  })
})

describe('getPersonDisplayName — 중간이름은 항상 이름과 성 사이', () => {
  it('중간이름이 있으면 국가/개인 순서가 korean이어도 서양식으로 표시', () => {
    // 실데이터: 프랑스 발루아가 (성-우선 override로 "발루아 샤를 드"로 깨지던 사례)
    expect(
      getPersonDisplayName({
        name: '샤를',
        middleName: '드',
        surname: '발루아',
        nameDisplayOrder: 'korean',
        country: { defaultNameDisplayOrder: 'western' },
      }),
    ).toBe('샤를 드 발루아')
  })

  it('von 전치사도 성 앞에 온다', () => {
    expect(
      getPersonDisplayName({
        name: '루돌프',
        middleName: '폰',
        surname: '합스부르크',
        country: { defaultNameDisplayOrder: 'korean' },
      }),
    ).toBe('루돌프 폰 합스부르크')
  })

  it('영미권 미들 이니셜', () => {
    expect(
      getPersonDisplayName({
        name: '해리',
        middleName: 'S.',
        surname: '트루먼',
        nameDisplayOrder: 'western',
      }),
    ).toBe('해리 S. 트루먼')
  })

  it('omitMiddleName=true면 중간이름은 빼되 성 위치(서양식)는 유지 — 뷰 간 일관성', () => {
    const p = { name: '샤를', middleName: '드', surname: '발루아' }
    expect(getPersonDisplayName(p, true)).toBe('샤를 발루아')
    expect(getPersonDisplayName(p)).toBe('샤를 드 발루아')
  })

  it('중간이름이 공백만이면 무시하고 기본 순서 유지', () => {
    expect(
      getPersonDisplayName({ name: '철수', middleName: '   ', surname: '김' }),
    ).toBe('김 철수')
  })
})
