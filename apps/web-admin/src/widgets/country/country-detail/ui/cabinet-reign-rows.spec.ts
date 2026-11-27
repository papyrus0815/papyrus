import type { CabinetListItemDto } from '@/shared/api/person-career'

import {
  buildReignRowCabinets,
  cabinetHeadDisplayName,
  isMonarchicalHead,
  isReignRowId,
  reignTenureIdOfRow,
} from './cabinet-reign-rows'

const IVAN_IV = {
  id: 't-ivan4',
  isMonarchical: true,
  regnalName: '이반 4세 (뇌제)',
  historicalCountryId: 'hc-tsardom',
  historicalCountry: { id: 'hc-tsardom', name: '러시아 차르국' },
  startDate: '1547-01-16T00:00:00.000Z',
  endDate: '1584-03-28T00:00:00.000Z',
  startEra: 'AD',
  startYear: 1547,
  startMonth: 1,
  startDay: 16,
  endEra: 'AD',
  endYear: 1584,
  endMonth: 3,
  endDay: 28,
  person: { id: 'p-ivan', name: '이반', surname: '류리크', nameDisplayOrder: 'western' },
}

const WITTE = {
  id: 't-witte',
  isMonarchical: false,
  startDate: '1905-11-06T00:00:00.000Z',
  person: { id: 'p-witte', name: '세르게이', surname: '비테' },
}

describe('buildReignRowCabinets — 행정부 목록의 군주 행', () => {
  it('내각 없는 재위만 가상 내각 행(reign:<id>)으로 — 총리 재임은 손대지 않는다', () => {
    const rows = buildReignRowCabinets([], [IVAN_IV, WITTE])
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('reign:t-ivan4')
    expect(isReignRowId(rows[0].id)).toBe(true)
    expect(reignTenureIdOfRow(rows[0].id)).toBe('t-ivan4')
    expect(rows[0].headTenureId).toBe('t-ivan4')
    expect(rows[0].historicalCountryId).toBe('hc-tsardom')
    // 기간은 구조화 칸이 진실 — 목록 날짜 파서가 읽는 부호 있는 날짜 문자열
    expect(rows[0].startDate).toBe('1547-01-16')
    expect(rows[0].endDate).toBe('1584-03-28')
    expect(rows[0].headTenure?.startDate).toBe('1547-01-16')
  })

  it('그 재위를 수반으로 둔 실제 내각이 있으면 가상 행을 만들지 않는다(실제 내각이 대신)', () => {
    const realCabinet = { id: 'cab-1', headTenureId: 't-ivan4', headTenure: null } as unknown as CabinetListItemDto
    expect(buildReignRowCabinets([realCabinet], [IVAN_IV])).toHaveLength(0)
  })

  it('기원전 재위 — DATETIME이 비어도 구조화 칸으로 부호 있는 날짜를 만든다', () => {
    const augustus = {
      id: 't-augustus',
      isMonarchical: true,
      regnalName: '아우구스투스',
      startDate: null,
      startEra: 'BC',
      startYear: 27,
      startMonth: 1,
      startDay: 16,
      endEra: 'AD',
      endYear: 14,
      endMonth: 8,
      endDay: 19,
    }
    const [row] = buildReignRowCabinets([], [augustus])
    expect(row.startDate).toBe('-0027-01-16')
    expect(row.endDate).toBe('0014-08-19')
  })

  it('시작을 모르는 재위는 줄 세울 수 없어 빼고, 월을 모르면 일도 버린다', () => {
    const undated = { id: 't-x', isMonarchical: true, startDate: null }
    const yearOnly = { id: 't-y', isMonarchical: true, startYear: 1605, startDay: 20, startDate: null }
    const rows = buildReignRowCabinets([], [undated, yearOnly])
    expect(rows.map((row) => row.id)).toEqual(['reign:t-y'])
    expect(rows[0].startDate).toBe('1605-01-01')
  })
})

describe('cabinetHeadDisplayName · isMonarchicalHead', () => {
  it('군주는 왕명, 아니면 인물 이름', () => {
    expect(cabinetHeadDisplayName(IVAN_IV as never)).toBe('이반 4세 (뇌제)')
    expect(cabinetHeadDisplayName({ ...WITTE, regnalName: '무시됨' } as never)).not.toBe('무시됨')
  })

  it('내각 응답의 수반은 군주 여부가 직위 정의에 실린다', () => {
    expect(isMonarchicalHead({ positionDefinition: { isMonarchical: true } })).toBe(true)
    expect(isMonarchicalHead({ isMonarchical: false, positionDefinition: { isMonarchical: false } })).toBe(false)
    expect(isMonarchicalHead(null)).toBe(false)
  })
})
