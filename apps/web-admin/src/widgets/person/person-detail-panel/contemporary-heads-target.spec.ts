/**
 * 「동시대 수장 비교」 딥링크 파생 로직 — 게이트(수장급만)·BC 부호·종료일 미입력 캡·
 * 다국가 dedup을 못 박는다. 이 값들은 pathKeys.headsOfState(year, {range, pins})로
 * 그대로 실려 수장비교 페이지의 URL 파서(?year/?range/?pins)와 계약을 이룬다.
 */
import { deriveContemporaryHeadsTarget } from '@/widgets/person/person-detail-panel/contemporary-heads-target'
import type { TenureLikeRecord } from '@/widgets/person/person-detail-panel/types'

const NOW = 2026

function tenure(partial: Partial<TenureLikeRecord>): TenureLikeRecord {
  return { id: partial.id ?? 'record', ...partial }
}

describe('deriveContemporaryHeadsTarget', () => {
  describe('게이트 — 수장급 기록이 없으면 null (CTA 미노출)', () => {
    it('재임·재위가 전혀 없으면 null', () => {
      expect(
        deriveContemporaryHeadsTarget({ tenures: [], reigns: [], nowYear: NOW }),
      ).toBeNull()
    })

    it('수장급이 아닌 재임(장관·의원)만 있으면 null', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({ positionType: 'CABINET_MINISTER', startDate: '1990-01-01' }),
          tenure({ positionType: 'LEGISLATOR', startDate: '1995-01-01' }),
        ],
        reigns: [],
        nowYear: NOW,
      })
      expect(result).toBeNull()
    })

    it('수장급이어도 시작일이 없거나 파싱 불가면 null', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [tenure({ positionType: 'HEAD_OF_STATE', startDate: null })],
        reigns: [tenure({ startDate: 'unknown' })],
        nowYear: NOW,
      })
      expect(result).toBeNull()
    })

    it('재위(SovereignReign)는 positionType 없이도 전량 수장으로 간주', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [
          tenure({ startDate: '1567-07-01', endDate: '1608-03-01' }),
        ],
        nowYear: NOW,
      })
      expect(result).not.toBeNull()
    })
  })

  describe('대표 연도·범위', () => {
    it('대표 연도는 병합 스팬의 중앙값, 범위는 스팬+패딩(최소 8년)', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '1418-08-01', endDate: '1450-02-01' })],
        nowYear: NOW,
      })!
      expect(result.year).toBe(1434) // (1418+1450)/2
      // span 32년 → 패딩 max(round(32*0.12), 8) = 8
      expect(result.range).toEqual({ startYear: 1410, endYear: 1458 })
      // 목적지 파서 계약: endYear > startYear 아니면 통째로 무시됨
      expect(result.range.endYear).toBeGreaterThan(result.range.startYear)
    })

    it('단년 재위(스팬 0)도 패딩으로 endYear > startYear 보장', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '1506-09-02', endDate: '1506-09-02' })],
        nowYear: NOW,
      })!
      expect(result.range.endYear).toBeGreaterThan(result.range.startYear)
    })

    it('여러 수장급 기록은 병합 스팬(min 시작~max 종료)으로 계산', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: '1940-05-10',
            endDate: '1945-07-26',
          }),
          tenure({
            positionType: 'HEAD_OF_GOVERNMENT',
            startDate: '1951-10-26',
            endDate: '1955-04-05',
          }),
        ],
        reigns: [],
        nowYear: NOW,
      })!
      expect(result.year).toBe(Math.round((1940 + 1955) / 2))
      expect(result.range.startYear).toBeLessThan(1940)
      expect(result.range.endYear).toBeGreaterThan(1955)
    })
  })

  describe('종료일 미입력 캡 — 「재임 중」과 「미입력」의 구분 불가 방어', () => {
    it('사망 연도가 있으면 열린 종료를 사망 연도로 캡 (올해가 아니라)', () => {
      // 종료일 미입력 15세기 왕: 캡이 없으면 스팬이 올해까지 늘어나
      // 대표 연도가 ~1722년(엉뚱한 시대)로 밀린다.
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '1418-08-01', endDate: null })],
        deathSignedYear: 1450,
        nowYear: NOW,
      })!
      expect(result.year).toBe(1434)
    })

    it('생존 인물(사망 없음)의 열린 종료는 올해로 캡', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({ positionType: 'HEAD_OF_STATE', startDate: '2022-05-10' }),
        ],
        reigns: [],
        nowYear: NOW,
      })!
      expect(result.year).toBe(2024) // (2022+2026)/2
    })

    it('사망 연도가 시작 연도보다 앞서는 데이터 오류는 시작 연도로 클램프', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '1418-08-01', endDate: null })],
        deathSignedYear: 1400,
        nowYear: NOW,
      })!
      expect(result.year).toBe(1418)
    })

    it('사망 확정 + 연도 미상이면 열린 종료를 올해가 아닌 시작 연도로 잘라낸다', () => {
      // 사망은 확실한데 사망 연도조차 없는 중세 왕: 올해 캡이면 대표 연도가
      // ~1722년(수백 년 뒤)로 밀린다 — 시작 연도로 잘라 그 시대 안에 머문다.
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '1400-01-01', endDate: null })],
        deceasedWithUnknownDeathYear: true,
        nowYear: NOW,
      })!
      expect(result.year).toBe(1400)
    })
  })

  describe('BC 부호 (era 기반 — 스키마가 BC 재위를 허용하게 되면 그대로 동작)', () => {
    it('BC 시작일은 음수 연도로 변환된다', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '-0247-01-01', endDate: '-0210-07-01' })],
        nowYear: NOW,
      })!
      expect(result.year).toBe(Math.round((-247 + -210) / 2))
      expect(result.range.startYear).toBeLessThan(-247)
    })

    it('중앙값이 0년이 되면 1년으로 보정 (연도 0은 존재하지 않음)', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [],
        reigns: [tenure({ startDate: '-0010-01-01', endDate: '0010-01-01' })],
        nowYear: NOW,
      })!
      expect(result.year).toBe(1)
    })
  })

  describe('핀 국가 파생', () => {
    it('역사국가(H) 우선, 없으면 현대국가(C), 재위 시작순 + dedup', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({
            positionType: 'HEAD_OF_STATE',
            startDate: '1980-01-01',
            endDate: '1985-01-01',
            country: { id: 'kr', name: '대한민국' },
          }),
        ],
        reigns: [
          tenure({
            startDate: '1567-07-01',
            endDate: '1608-03-01',
            historicalCountry: { id: 'joseon', name: '조선' },
            country: { id: 'kr', name: '대한민국' },
          }),
          tenure({
            startDate: '1600-01-01',
            endDate: '1605-01-01',
            historicalCountry: { id: 'joseon', name: '조선' },
          }),
        ],
        nowYear: NOW,
      })!
      expect(result.pins).toEqual([
        { kind: 'H', id: 'joseon' },
        { kind: 'C', id: 'kr' },
      ])
    })

    it('국가 정보가 전혀 없는 기록(교황 등)은 핀 없이 연도만 산출', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({ positionType: 'HEAD_OF_STATE', startDate: '1503-11-01', endDate: '1513-02-21' }),
        ],
        reigns: [],
        nowYear: NOW,
      })!
      expect(result.pins).toEqual([])
      expect(result.year).toBe(1508)
    })

    it('수장급이 아닌 재임의 국가는 핀에 포함되지 않는다', () => {
      const result = deriveContemporaryHeadsTarget({
        tenures: [
          tenure({
            positionType: 'CABINET_MINISTER',
            startDate: '1970-01-01',
            country: { id: 'fr', name: '프랑스' },
          }),
          tenure({
            positionType: 'HEAD_OF_STATE',
            startDate: '1981-05-21',
            endDate: '1995-05-17',
            country: { id: 'fr2', name: '프랑스 제5공화국' },
          }),
        ],
        reigns: [],
        nowYear: NOW,
      })!
      expect(result.pins).toEqual([{ kind: 'C', id: 'fr2' }])
    })
  })
})
