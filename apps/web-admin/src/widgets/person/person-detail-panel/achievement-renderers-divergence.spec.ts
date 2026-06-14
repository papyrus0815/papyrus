/**
 * 특성화(characterization) 테스트 — 업적 렌더러 2벌을 하나로 통합하기 전 안전망.
 *
 * 같은 업적 데이터를 두 화면이 *다르게* 렌더한다:
 *  - 행정부 타임라인: cabinets-section.helpers (가로 카드, startDate 정렬, YYYY.MM.DD, HTML 요약)
 *  - 인물 상세    : person-detail-panel/helpers + 인라인 (세로 리스트, orderNum 정렬, YYYY년 M월 D일)
 *
 * 통합 컴포넌트(variant)가 아래 동작들을 *그대로* 재현하는지 회귀로 잡기 위해,
 * 분기의 핵심인 순수 함수들의 현재 동작을 못 박는다. (렌더러 자체는 personCareerApi의
 * import.meta 사용 때문에 ts-jest에서 마운트 불가 → 순수 로직으로 특성화)
 */
import {
  compareTenureAchievementsChronological,
  formatDate,
  getTenureAchievementDisplayBody,
  isLinkagePeerAchievement,
  stripHtmlToPlain,
  tenureAchievementPrimaryYearLabel,
} from '@/widgets/country/country-detail/ui/cabinets-section.helpers'
import {
  compareTenureAchievementsByOrder,
  formatIsoDateKo,
} from '@/widgets/person/person-detail-panel/helpers'

describe('업적 렌더러 분기 특성화 (행정부 타임라인 ↔ 인물 상세)', () => {
  describe('정렬 기준 분기', () => {
    it('행정부: startDate만 보고 오름차순, 날짜 없는 항목은 맨 뒤', () => {
      const input = [
        { id: 'late', startDate: '2020-01-01', orderNum: 0 },
        { id: 'early', startDate: '2019-06-01', orderNum: 9 },
        { id: 'undated', startDate: null, orderNum: 1 },
      ]
      const ordered = [...input]
        .sort(compareTenureAchievementsChronological)
        .map((item) => item.id)
      expect(ordered).toEqual(['early', 'late', 'undated'])
    })

    it('인물: orderNum 오름차순, 동률이면 startDate', () => {
      const input = [
        { id: 'second', orderNum: 2, startDate: '2000-01-01' },
        { id: 'first', orderNum: 1, startDate: '2025-01-01' },
        { id: 'tieB', orderNum: 1, startDate: '2025-12-01' },
      ]
      const ordered = [...input]
        .sort(compareTenureAchievementsByOrder)
        .map((item) => item.id)
      // orderNum 1 묶음이 먼저(startDate로 tie-break: 01월 < 12월), 그 다음 orderNum 2
      expect(ordered).toEqual(['first', 'tieB', 'second'])
    })

    it('같은 입력이라도 두 정렬 기준의 결과가 다르다 (의도된 분기)', () => {
      const input = [
        { id: 'a', orderNum: 0, startDate: '2021-01-01' },
        { id: 'b', orderNum: 1, startDate: '1990-01-01' },
      ]
      const byDate = [...input]
        .sort(compareTenureAchievementsChronological)
        .map((item) => item.id)
      const byOrder = [...input]
        .sort(compareTenureAchievementsByOrder)
        .map((item) => item.id)
      expect(byDate).toEqual(['b', 'a']) // 1990 먼저
      expect(byOrder).toEqual(['a', 'b']) // orderNum 0 먼저
      expect(byDate).not.toEqual(byOrder)
    })
  })

  describe('날짜 포맷 분기', () => {
    it('행정부 formatDate: YYYY.MM.DD (월·일 zero-pad)', () => {
      expect(formatDate(new Date(2023, 4, 9))).toBe('2023.05.09')
    })

    it('행정부 formatDate: 빈 값·파싱 불가는 "—"', () => {
      expect(formatDate(null)).toBe('—')
      expect(formatDate(undefined)).toBe('—')
      expect(formatDate('not-a-date')).toBe('—')
    })

    it('인물 formatIsoDateKo: YYYY년 M월 D일 (zero-pad 없음)', () => {
      expect(formatIsoDateKo('2023-05-09')).toBe('2023년 5월 9일')
    })

    it('인물 formatIsoDateKo: 빈 값은 빈 문자열', () => {
      expect(formatIsoDateKo(null)).toBe('')
      expect(formatIsoDateKo('')).toBe('')
    })

    it('인물 formatIsoDateKo: BC 날짜는 "기원전" 접두사', () => {
      expect(formatIsoDateKo('-0221-03-15')).toBe('기원전 221년 3월 15일')
    })

    it('행정부 formatDate는 BC 안전하지 않다 — 통합 시 세로 variant는 era 인식 포맷터 필수', () => {
      // 네이티브 Date는 음수 연도 부호를 떼 BC를 잘못 파싱 → "기원전"이 절대 나오지 않음
      expect(formatDate('-0221-03-15')).not.toContain('기원전')
    })

    it('같은 날짜라도 두 포맷의 출력 모양이 다르다 (의도된 분기)', () => {
      expect(formatDate(new Date(2023, 4, 9))).not.toBe(
        formatIsoDateKo('2023-05-09'),
      )
    })
  })

  describe('본문/요약 분기 (행정부 전용 HTML 처리)', () => {
    it('stripHtmlToPlain: 태그 제거 + 공백 정규화', () => {
      expect(stripHtmlToPlain('<p>대동법  <b>시행</b></p>', 140)).toBe(
        '대동법 시행',
      )
      expect(stripHtmlToPlain('a\n\n  b', 140)).toBe('a b')
    })

    it('stripHtmlToPlain: maxLen 초과 시 잘라내고 "…" 추가', () => {
      const truncated = stripHtmlToPlain('x'.repeat(200), 140)
      expect(truncated.length).toBe(141)
      expect(truncated.endsWith('…')).toBe(true)
      expect(truncated.startsWith('x'.repeat(140))).toBe(true)
    })

    it('getTenureAchievementDisplayBody: 한쪽만 있으면 그쪽', () => {
      expect(getTenureAchievementDisplayBody({ description: '로컬' })).toBe(
        '로컬',
      )
      expect(
        getTenureAchievementDisplayBody({
          description: '',
          event: { description: '사건' },
        }),
      ).toBe('사건')
    })

    it('getTenureAchievementDisplayBody: 둘 다 글이면 재임 칸(로컬) 우선', () => {
      expect(
        getTenureAchievementDisplayBody({
          description: '로컬 글',
          event: { description: '사건 글' },
        }),
      ).toBe('로컬 글')
    })

    it('getTenureAchievementDisplayBody: 사건에만 이미지가 있으면 사건 우선', () => {
      expect(
        getTenureAchievementDisplayBody({
          description: '로컬 글',
          event: { description: '<img src="x.png" /> 사건' },
        }),
      ).toBe('<img src="x.png" /> 사건')
    })

    it('getTenureAchievementDisplayBody: 로컬에 이미지가 있으면 로컬 유지', () => {
      expect(
        getTenureAchievementDisplayBody({
          description: '<img src="y.png" /> 로컬',
          event: { description: '사건 글' },
        }),
      ).toBe('<img src="y.png" /> 로컬')
    })
  })

  describe('묶음(linkage) 배지 — 행정부 전용', () => {
    it('컨텍스트 재임과 같은 tenureId면 피어 아님', () => {
      expect(isLinkagePeerAchievement({ tenureId: 'ctx' }, 'ctx')).toBe(false)
    })
    it('다른 tenureId면 피어(묶음 연동)', () => {
      expect(isLinkagePeerAchievement({ tenureId: 'other' }, 'ctx')).toBe(true)
    })
    it('tenureId 없음/공백이면 피어 아님', () => {
      expect(isLinkagePeerAchievement({ tenureId: null }, 'ctx')).toBe(false)
      expect(isLinkagePeerAchievement({ tenureId: '   ' }, 'ctx')).toBe(false)
    })
  })

  describe('연도 배지 — 행정부 전용', () => {
    it('시작일의 4자리 연도', () => {
      expect(tenureAchievementPrimaryYearLabel('2023-05-09T00:00:00Z')).toBe(
        '2023',
      )
    })
    it('시작일 없음 → "기간 미정"', () => {
      expect(tenureAchievementPrimaryYearLabel(null)).toBe('기간 미정')
    })
    it('연도 형식이 아니면 "기간"', () => {
      expect(tenureAchievementPrimaryYearLabel('bad-date')).toBe('기간')
    })
  })
})
