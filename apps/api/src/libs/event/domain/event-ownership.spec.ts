import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'

import { assertEventOwnership, ensureEventOwnership } from './event-ownership'

const live = { createdById: 'me', deletedAt: null }
const deleted = { createdById: 'me', deletedAt: new Date('2026-01-01') }

describe('ensureEventOwnership', () => {
  it('없는 사건은 404', () => {
    expect(() => ensureEventOwnership(null, 'me', { action: '조회' })).toThrow(
      NotFoundException,
    )
  })

  it('남의 사건은 403 — 문구에 동작이 들어간다', () => {
    expect(() =>
      ensureEventOwnership({ ...live, createdById: 'other' }, 'me', { action: '수정' }),
    ).toThrow(new ForbiddenException('본인이 등록한 사건만 수정할 수 있습니다.'))
  })

  it('소유권 검사가 삭제 검사보다 먼저 — 남의 삭제된 사건에 409로 존재를 흘리지 않는다', () => {
    expect(() =>
      ensureEventOwnership({ ...deleted, createdById: 'other' }, 'me', {
        action: '수정',
        deleted: 'conflict',
      }),
    ).toThrow(ForbiddenException)
  })

  it.each([
    ['allow', null],
    ['conflict', ConflictException],
    ['not-found', NotFoundException],
  ] as const)('삭제된 사건 + deleted=%s', (mode, expected) => {
    const run = () => ensureEventOwnership(deleted, 'me', { action: '수정', deleted: mode })
    if (expected) expect(run).toThrow(expected)
    else expect(run()).toBe(deleted)
  })
})

describe('assertEventOwnership', () => {
  it('id로 읽어 같은 규칙을 적용한다', async () => {
    const prisma = {
      event: { findUnique: jest.fn().mockResolvedValue(deleted) },
    } as unknown as Parameters<typeof assertEventOwnership>[0]
    await expect(
      assertEventOwnership(prisma, 'E', 'me', { action: '수정', deleted: 'conflict' }),
    ).rejects.toThrow(ConflictException)
    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: 'E' },
      select: { createdById: true, deletedAt: true },
    })
  })
})
