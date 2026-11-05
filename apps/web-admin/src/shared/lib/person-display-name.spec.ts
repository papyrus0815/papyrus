/**
 * getPersonDisplayName — 표시 순서 우선순위 + 중간이름(middleName) 규칙.
 * 핵심: 중간이름은 '이름–중간–성' 서양식에서만 자리가 있으므로, 있으면 서양식으로 강제한다
 * (성-우선 순서에서 성 뒤 꼬리로 매달리는 회귀 방지).
 */
import {
  REQUIRED_MESSAGES,
  normalizePersonNamePayloadFields,
  resolveNameRequiredError,
} from '@/shared/ui/person-register-modal/person-register-view.helpers'

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
    const person = { name: '샤를', middleName: '드', surname: '발루아' }
    expect(getPersonDisplayName(person, true)).toBe('샤를 발루아')
    expect(getPersonDisplayName(person)).toBe('샤를 드 발루아')
  })

  it('중간이름이 공백만이면 무시하고 기본 순서 유지', () => {
    expect(
      getPersonDisplayName({ name: '철수', middleName: '   ', surname: '김' }),
    ).toBe('김 철수')
  })
})

describe('getPersonDisplayName — 성이 없는 인물 (단일명·고대/중세 인물)', () => {
  it('surname이 null·undefined·공백이면 앞뒤 공백 없이 이름만 반환한다 (동양식·서양식 무관)', () => {
    expect(
      getPersonDisplayName({
        name: '소크라테스',
        surname: null,
        nameDisplayOrder: 'western',
      }),
    ).toBe('소크라테스')

    expect(
      getPersonDisplayName({
        name: '단군왕검',
        surname: '   ',
        nameDisplayOrder: 'korean',
      }),
    ).toBe('단군왕검')

    expect(
      getPersonDisplayName({
        name: '클레오파트라',
      }),
    ).toBe('클레오파트라')
  })

  it('성이 없지만 중간이름(또는 전치사/수식어)이 있는 경우 이름과 중간이름만 공백으로 이어진다', () => {
    expect(
      getPersonDisplayName({
        name: '레오나르도',
        middleName: '다 빈치',
        surname: null,
      }),
    ).toBe('레오나르도 다 빈치')
  })
})

describe('인물 등록 폼 — 성이 없는 인물 검증·payload 정규화 헬퍼', () => {
  it('이름이 입력되어 있으면 성이 비어 있어도 에러가 없다', () => {
    expect(resolveNameRequiredError('소크라테스', '')).toBeNull()
    expect(resolveNameRequiredError('길동', '홍')).toBeNull()
  })

  it('이름과 성이 모두 비어 있으면 기본 이름 필수 문구를 반환한다', () => {
    expect(resolveNameRequiredError('   ', '')).toBe(REQUIRED_MESSAGES.name)
  })

  it('성에만 단일명을 적고 이름을 비우면 단일명 전용 안내 문구를 반환한다', () => {
    expect(resolveNameRequiredError('', '소크라테스')).toBe(
      REQUIRED_MESSAGES.nameWhenSurnameOnly,
    )
  })

  it('성이 비어 있으면 surname·surnameMeaning·단독 nameDisplayOrder를 모두 null로 정규화한다', () => {
    expect(
      normalizePersonNamePayloadFields({
        name: '  광개토대왕 ',
        surname: '   ',
        middleName: '',
        nameFormat: 'korean',
        originalName: ' 廣開土大王 ',
        surnameMeaning: '고씨 뜻 잔재',
        nameMeaning: '영토를 넓힌 왕',
        middleNameMeaning: '중간이름 뜻 잔재',
      }),
    ).toEqual({
      name: '광개토대왕',
      surname: null,
      middleName: null,
      nameDisplayOrder: null,
      originalName: '廣開土大王',
      surnameMeaning: null,
      nameMeaning: '영토를 넓힌 왕',
      middleNameMeaning: null,
    })
  })

  it('성이 있으면 surname과 surnameMeaning, 수동 nameDisplayOrder를 그대로 유지한다', () => {
    expect(
      normalizePersonNamePayloadFields({
        name: '순신',
        surname: '이',
        middleName: '',
        nameFormat: 'korean',
        originalName: '李舜臣',
        surnameMeaning: '오얏 이',
        nameMeaning: '순임금 순, 신하 신',
        middleNameMeaning: '',
      }),
    ).toEqual({
      name: '순신',
      surname: '이',
      middleName: null,
      nameDisplayOrder: 'korean',
      originalName: '李舜臣',
      surnameMeaning: '오얏 이',
      nameMeaning: '순임금 순, 신하 신',
      middleNameMeaning: null,
    })
  })
})
