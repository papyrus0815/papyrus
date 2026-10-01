import { fixEarlyYearDatetimes } from '../../../../prisma/early-year-safe-mariadb'

/** 어댑터가 하는 변환 그대로 — `new Date(`${value}Z`)` */
const adapterParse = (value: string) => new Date(`${value}Z`).toISOString()

describe('fixEarlyYearDatetimes — 서기 1~99년 DATETIME 읽기 보정', () => {
  const run = (rows: unknown[][], types: string[]) => {
    const result = Object.assign(rows, { meta: types.map((type) => ({ type })) })
    return fixEarlyYearDatetimes(result) as unknown[][]
  }

  it('보정 전: 어댑터 방식으로 읽으면 44년이 2044년이 된다', () => {
    expect(adapterParse('0044-03-15 00:00:00')).toBe('2044-03-15T00:00:00.000Z')
  })

  it('보정 후: 44년은 44년으로, 100년 이후·다른 칸은 그대로', () => {
    const [row] = run(
      [['0044-03-15 00:00:00', '0742-04-02 00:00:00', '1850-01-01 00:00:00.000', '0044-03-15 x', null]],
      ['DATETIME', 'DATETIME', 'TIMESTAMP', 'VAR_STRING', 'DATETIME'],
    )
    expect(adapterParse(row[0] as string)).toBe('0044-03-15T00:00:00.000Z')
    expect(row[1]).toBe('0742-04-02 00:00:00')
    expect(row[2]).toBe('1850-01-01 00:00:00.000')
    expect(row[3]).toBe('0044-03-15 x')
    expect(row[4]).toBeNull()
  })

  it('행 배열이 아닌 결과(INSERT 등)는 손대지 않는다', () => {
    const okPacket = { affectedRows: 1 }
    expect(fixEarlyYearDatetimes(okPacket)).toBe(okPacket)
  })
})
