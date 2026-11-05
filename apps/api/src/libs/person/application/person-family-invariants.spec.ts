import { BadRequestException } from '@nestjs/common'
import { asOfficeHolding } from '../infrastructure/office-holding.query'
import { PersonPrismaRepository } from '../infrastructure/person.prisma.repository'
import { Era, MarriageEndReason, MarriageRank } from '../presentation/dto/create-person.dto'
import { PersonService } from './person.service'

describe('PersonService — 가족 관계 도메인 불변식 및 원자적 가족 API', () => {
  const createHarness = (initialPersons: Record<string, any> = {}) => {
    const persons = new Map<string, any>(Object.entries(initialPersons))
    const updates: Array<{ id: string; data: any }> = []
    const createdSpouses: any[] = []

    const prismaMock: any = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
      personSpouse: {
        findMany: jest.fn(async ({ where }: any = {}) => {
          const orClauses: any[] = where?.OR ?? []
          if (orClauses.length === 0) return createdSpouses
          return createdSpouses.filter((row) =>
            orClauses.some((clause) => {
              const pMatch =
                clause.personId === undefined
                  ? true
                  : clause.personId?.in != null
                    ? clause.personId.in.includes(row.personId)
                    : clause.personId === row.personId
              const sMatch =
                clause.spouseId === undefined
                  ? true
                  : clause.spouseId?.in != null
                    ? clause.spouseId.in.includes(row.spouseId)
                    : clause.spouseId === row.spouseId
              return pMatch && sMatch
            }),
          )
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const orClauses: any[] = where?.OR ?? []
          const match = createdSpouses.find((row) =>
            orClauses.some((clause) => {
              const pMatch =
                clause.personId === undefined
                  ? true
                  : clause.personId?.in != null
                    ? clause.personId.in.includes(row.personId)
                    : clause.personId === row.personId
              const sMatch =
                clause.spouseId === undefined
                  ? true
                  : clause.spouseId?.in != null
                    ? clause.spouseId.in.includes(row.spouseId)
                    : clause.spouseId === row.spouseId
              return pMatch && sMatch
            }),
          )
          return match ? { id: match.id } : null
        }),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `marriage-${createdSpouses.length + 1}`, ...data }
          createdSpouses.push(row)
          return row
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = createdSpouses.findIndex((r) => r.id === where.id)
          if (idx >= 0) {
            createdSpouses[idx] = { ...createdSpouses[idx], ...data }
            return createdSpouses[idx]
          }
          return { id: where.id, ...data }
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          const idsToDelete: string[] = where?.id?.in ?? []
          if (idsToDelete.length > 0) {
            for (let i = createdSpouses.length - 1; i >= 0; i--) {
              if (idsToDelete.includes(createdSpouses[i].id)) {
                createdSpouses.splice(i, 1)
              }
            }
          }
          return { count: idsToDelete.length }
        }),
      },
      person: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0
          for (const p of persons.values()) {
            if (where?.parentMarriageId?.in && where.parentMarriageId.in.includes(p.parentMarriageId)) {
              Object.assign(p, data)
              count++
            }
          }
          return { count }
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const ids: string[] = where?.id?.in ?? []
          const orClauses: any[] = where?.OR ?? []
          const match = [...persons.values()].find((p) => {
            if (ids.length > 0 && !ids.includes(p.id)) return false
            if (orClauses.length > 0) {
              return orClauses.some((clause) =>
                Object.entries(clause).every(([k, v]) => p[k] === v),
              )
            }
            return false
          })
          return match ? { id: match.id } : null
        }),
        findMany: jest.fn(async ({ where }: any) => {
          const ids: string[] = where?.id?.in ?? []
          const orClauses: any[] = where?.OR ?? []
          return [...persons.values()]
            .filter((p) => {
              if (ids.length > 0) return ids.includes(p.id)
              if (orClauses.length > 0) {
                return orClauses.some((clause) =>
                  Object.entries(clause).every(([k, v]) => p[k] === v),
                )
              }
              return false
            })
            .map((p) => ({
              id: p.id,
              name: p.name ?? p.id,
              surname: p.surname ?? null,
              nameDisplayOrder: p.nameDisplayOrder ?? null,
              gender: p.gender ?? null,
              birthEra: p.birthEra ?? 'AD',
              birthDate:
                p.birthDate ??
                (p.birthYear != null ? new Date(Date.UTC(Math.abs(p.birthYear), 0, 1)) : null),
              birthYear: p.birthYear ?? null,
              deathEra: p.deathEra ?? 'AD',
              deathDate:
                p.deathDate ??
                (p.deathYear != null ? new Date(Date.UTC(Math.abs(p.deathYear), 0, 1)) : null),
              deathYear: p.deathYear ?? null,
              fatherId: p.fatherId ?? null,
              motherId: p.motherId ?? null,
              adoptiveFatherId: p.adoptiveFatherId ?? null,
              adoptiveMotherId: p.adoptiveMotherId ?? null,
              country: null,
            }))
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const p = persons.get(where.id)
          if (!p) return null
          return {
            id: p.id,
            name: p.name ?? p.id,
            surname: p.surname ?? null,
            nameDisplayOrder: p.nameDisplayOrder ?? null,
            gender: p.gender ?? null,
            birthEra: p.birthEra ?? 'AD',
            birthYear: p.birthYear ?? null,
            fatherId: p.fatherId ?? null,
            motherId: p.motherId ?? null,
            adoptiveFatherId: p.adoptiveFatherId ?? null,
            adoptiveMotherId: p.adoptiveMotherId ?? null,
            country: null,
          }
        }),
      },
    }

    const personRepositoryMock: any = {
      findById: jest.fn(async (id: string) => {
        const p = persons.get(id)
        if (!p) return null
        return {
          accountId: p.accountId ?? 'acc-1',
          ...p,
          spouseRelations: p.spouseRelations ?? [],
        }
      }),
      findByIdWithRelations: jest.fn(async (id: string) => {
        const p = persons.get(id)
        if (!p) return null
        return {
          accountId: p.accountId ?? 'acc-1',
          ...p,
          spouseRelations: p.spouseRelations ?? [],
        }
      }),
      update: jest.fn(async (id: string, data: any) => {
        updates.push({ id, data })
        const existing = persons.get(id) ?? { id, accountId: 'acc-1' }
        const merged = { ...existing, ...data }
        if (data.spouseRelations !== undefined) {
          merged.spouseRelations = data.spouseRelations.map((rel: any) => ({
            ...rel,
            spouse: persons.get(rel.spouseId) ?? { id: rel.spouseId, name: rel.spouseId },
          }))
        }
        persons.set(id, merged)
        return merged
      }),
    }

    const notificationServiceMock: any = {
      notify: jest.fn(),
      notifyPerson: jest.fn(),
    }
    const uploadServiceMock: any = {}
    const pointServiceMock: any = {
      grant: jest.fn(),
      awardForCreate: jest.fn(),
      awardCompletenessBonus: jest.fn(),
    }

    const service = new PersonService(
      personRepositoryMock,
      notificationServiceMock,
      prismaMock,
      uploadServiceMock,
      pointServiceMock,
    )

    return { service, persons, updates, createdSpouses, personRepositoryMock }
  }

  describe('Pillar 3 — 부모·양부모 순환, 슬롯 중복, 성별 정합성, 출생연도 역전, 배우자 불변식', () => {
    it('자기 자신을 친부모 또는 양부모로 지정하면 BadRequestException 발생', async () => {
      const { service } = createHarness({
        ego: { id: 'ego', name: '고종', gender: 'MALE', accountId: 'acc-1' },
      })

      await expect(
        service.linkFamilyMember('ego', { kind: 'adoptiveFather', targetId: 'ego' }, 'acc-1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('동일 인물을 친부(fatherId)와 양부(adoptiveFatherId) 두 슬롯에 중복 지정하면 차단', async () => {
      const { service } = createHarness({
        ego: {
          id: 'ego',
          name: '선조',
          gender: 'MALE',
          fatherId: 'deokheung',
          accountId: 'acc-1',
        },
        deokheung: { id: 'deokheung', name: '덕흥대원군', gender: 'MALE', accountId: 'acc-1' },
      })

      await expect(
        service.linkFamilyMember(
          'ego',
          { kind: 'adoptiveFather', targetId: 'deokheung' },
          'acc-1',
        ),
      ).rejects.toThrow(/생부모와 양부모를 같은 인물로 중복 지정할 수 없습니다/)
    })

    it('생가·양가 혼합 계보에서 순환(자손을 양부로 지정)이 발생하면 차단', async () => {
      const { service } = createHarness({
        grandfather: { id: 'grandfather', name: '조부', gender: 'MALE', accountId: 'acc-1' },
        father: {
          id: 'father',
          name: '부친',
          gender: 'MALE',
          fatherId: 'grandfather',
          accountId: 'acc-1',
        },
        son: {
          id: 'son',
          name: '아들',
          gender: 'MALE',
          adoptiveFatherId: 'father',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember(
          'grandfather',
          { kind: 'adoptiveFather', targetId: 'son' },
          'acc-1',
        ),
      ).rejects.toThrow(/순환/)
    })

    it('여성 인물을 아버지/양부 슬롯에, 남성 인물을 어머니/양모 슬롯에 지정하면 차단', async () => {
      const { service } = createHarness({
        ego: { id: 'ego', name: '본인', gender: 'MALE', accountId: 'acc-1' },
        femalePerson: {
          id: 'femalePerson',
          name: '여성인물',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        malePerson: { id: 'malePerson', name: '남성인물', gender: 'MALE', accountId: 'acc-1' },
      })

      await expect(
        service.linkFamilyMember('ego', { kind: 'father', targetId: 'femalePerson' }, 'acc-1'),
      ).rejects.toThrow(/여성 인물을 아버지/)

      await expect(
        service.linkFamilyMember(
          'ego',
          { kind: 'adoptiveMother', targetId: 'malePerson' },
          'acc-1',
        ),
      ).rejects.toThrow(/남성 인물을 양모/)
    })

    it('친생 부모의 출생연도가 자녀보다 같거나 늦으면 차단하되, 양부모(출계·입양)는 연대 제약을 강제하지 않음', async () => {
      const { service } = createHarness({
        ego: {
          id: 'ego',
          name: '자녀',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1500,
          accountId: 'acc-1',
        },
        youngerBioFather: {
          id: 'youngerBioFather',
          name: '젊은친부',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1510,
          accountId: 'acc-1',
        },
        youngerAdoptFather: {
          id: 'youngerAdoptFather',
          name: '사후양부',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1505,
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember(
          'ego',
          { kind: 'father', targetId: 'youngerBioFather' },
          'acc-1',
        ),
      ).rejects.toThrow(/친부모의 출생 연도/)

      await expect(
        service.linkFamilyMember(
          'ego',
          { kind: 'adoptiveFather', targetId: 'youngerAdoptFather' },
          'acc-1',
        ),
      ).resolves.toBeDefined()
    })

    it('이미 아버지/어머니로 등록된 인물의 성별이나 출생연도를 사후 수정할 때도 역방향(Parent → Children) 불변식을 검증한다', async () => {
      const { service } = createHarness({
        father: {
          id: 'father',
          name: '부친',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1450,
          accountId: 'acc-1',
        },
        child: {
          id: 'child',
          name: '자녀',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1480,
          fatherId: 'father',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.update('father', { gender: 'FEMALE' as any }, 'acc-1'),
      ).rejects.toThrow(/이미 아버지\(친부 또는 양부\)로 등록된 자녀가 있어 성별을 여성으로 변경할 수 없습니다/)

      await expect(
        service.update(
          'father',
          {
            birthDate: new Date(Date.UTC(1490, 0, 1)),
            birthEra: Era.AD,
          },
          'acc-1',
        ),
      ).rejects.toThrow(/친부모의 출생 연도는 기존 친자녀의 출생 연도보다 앞서야 합니다/)
    })

    it('혼인 시작연도가 종료연도보다 늦거나 직계 부모·자녀를 배우자로 등록하면 차단', async () => {
      const { service } = createHarness({
        ego: {
          id: 'ego',
          name: '본인',
          gender: 'MALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
        father: { id: 'father', name: '부친', gender: 'MALE', accountId: 'acc-1' },
        spouseCandidate: {
          id: 'spouseCandidate',
          name: '배우자후보',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember('ego', { kind: 'spouse', targetId: 'father' }, 'acc-1'),
      ).rejects.toThrow(/부모\(양부모 포함\)를 배우자로 지정할 수 없습니다/)

      await expect(
        service.linkFamilyMember(
          'ego',
          {
            kind: 'spouse',
            targetId: 'spouseCandidate',
            marriageStart: { era: Era.AD, year: 1450 },
            marriageEnd: { era: Era.AD, year: 1440 },
          },
          'acc-1',
        ),
      ).rejects.toThrow(/혼인 시작 연도/)
    })

    it('이미 배우자로 등록된 인물을 사후에 부모(양부모 포함) 또는 자녀로 지정하려 하면 양방향 불변식으로 차단한다', async () => {
      const { service } = createHarness({
        husband: { id: 'husband', name: '남편', gender: 'MALE', accountId: 'acc-1' },
        wife: { id: 'wife', name: '아내', gender: 'FEMALE', accountId: 'acc-1' },
      })

      await service.linkFamilyMember(
        'husband',
        { kind: 'spouse', targetId: 'wife', marriageRank: MarriageRank.PRIMARY },
        'acc-1',
      )

      await expect(
        service.linkFamilyMember('husband', { kind: 'mother', targetId: 'wife' }, 'acc-1'),
      ).rejects.toThrow(/이미 배우자로 등록된 인물을 부모.*또는 자녀로 지정할 수 없습니다/)

      await expect(
        service.linkFamilyMember('husband', { kind: 'child', targetId: 'wife' }, 'acc-1'),
      ).rejects.toThrow(/이미 배우자로 등록된 인물을 부모.*또는 자녀로 지정할 수 없습니다/)
    })
  })

  describe('Pillar 4 — 원자적 가족 관계 API 동작 검증', () => {
    it('배우자 추가 시 rankHolderId를 대상 배우자(targetId)로 기록하고, 혼인 해소 사유(marriageEndReason)를 보존한다', async () => {
      const { service, createdSpouses } = createHarness({
        king: {
          id: 'king',
          name: '숙종',
          gender: 'MALE',
          accountId: 'acc-1',
          spouseRelations: [],
        },
        consort: {
          id: 'consort',
          name: '희빈 장씨',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'king',
        {
          kind: 'spouse',
          targetId: 'consort',
          marriageRank: MarriageRank.CONCUBINE,
          marriageEndReason: MarriageEndReason.DEPOSED,
        },
        'acc-1',
      )

      expect(createdSpouses).toEqual([
        expect.objectContaining({
          personId: 'consort',
          spouseId: 'king',
          marriageRank: MarriageRank.CONCUBINE,
          marriageEndReason: MarriageEndReason.DEPOSED,
          rankHolderId: 'consort',
        }),
      ])
    })

    it('자녀를 입양(isAdoptive: true)으로 연결하면 친부모(fatherId)를 덮어쓰지 않고 양부(adoptiveFatherId)와 성별 서열(genderBirthOrder)을 기록한다', async () => {
      const { service, persons } = createHarness({
        adoptFather: {
          id: 'adoptFather',
          name: '문조',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        child: {
          id: 'child',
          name: '고종',
          gender: 'MALE',
          fatherId: 'heungseon',
          motherId: 'yeoheung',
          accountId: 'acc-1',
        },
        heungseon: {
          id: 'heungseon',
          name: '흥선대원군',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        yeoheung: {
          id: 'yeoheung',
          name: '여흥부대부인',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'adoptFather',
        {
          kind: 'child',
          targetId: 'child',
          isAdoptive: true,
          genderBirthOrder: 2,
        },
        'acc-1',
      )

      const updatedChild = persons.get('child')
      // 본생 부모(fatherId/motherId)가 그대로 보존되면서 양부(adoptiveFatherId)가 함께 기록됨
      expect(updatedChild.fatherId).toBe('heungseon')
      expect(updatedChild.motherId).toBe('yeoheung')
      expect(updatedChild.adoptiveFatherId).toBe('adoptFather')
      expect(updatedChild.genderBirthOrder).toBe(2)
    })

    it('형제 연결 시 siblingLineage(PATERNAL_HALF / MATERNAL_HALF / FULL)에 따라 공유 축만 정확히 연결한다', async () => {
      const { service, persons } = createHarness({
        ego: {
          id: 'ego',
          name: '태종',
          gender: 'MALE',
          fatherId: 'taejo',
          motherId: 'sinui',
          accountId: 'acc-1',
        },
        taejo: { id: 'taejo', name: '태조', gender: 'MALE', accountId: 'acc-1' },
        sinui: { id: 'sinui', name: '신의왕후', gender: 'FEMALE', accountId: 'acc-1' },
        sindeok: { id: 'sindeok', name: '신덕왕후', gender: 'FEMALE', accountId: 'acc-1' },
        bangseok: {
          id: 'bangseok',
          name: '의안대군 방석',
          gender: 'MALE',
          fatherId: null,
          motherId: 'sindeok',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'ego',
        {
          kind: 'sibling',
          targetId: 'bangseok',
          siblingLineage: 'PATERNAL_HALF',
        },
        'acc-1',
      )

      const updatedBangseok = persons.get('bangseok')
      expect(updatedBangseok.fatherId).toBe('taejo')
      // 이복형제 연결이므로 기존 어머니(신덕왕후)가 덮어써지지 않고 보존됨!
      expect(updatedBangseok.motherId).toBe('sindeok')
    })

    it('배우자 연결 시 혼인 시작/종료일과 메모를 누락 없이 저장하고, 양자녀 연결 및 수정 시 반대편 양부모(adoptiveMotherId)를 보존한다', async () => {
      const { service, persons, createdSpouses } = createHarness({
        adoptFather: {
          id: 'adoptFather',
          name: '문조',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        adoptMother: {
          id: 'adoptMother',
          name: '신정왕후',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        adoptMother2: {
          id: 'adoptMother2',
          name: '효정왕후',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        adoptedChild: {
          id: 'adoptedChild',
          name: '고종',
          gender: 'MALE',
          fatherId: 'heungseon',
          accountId: 'acc-1',
        },
        heungseon: {
          id: 'heungseon',
          name: '흥선대원군',
          gender: 'MALE',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'adoptFather',
        {
          kind: 'spouse',
          targetId: 'adoptMother',
          marriageRank: MarriageRank.PRIMARY,
          marriageStart: { era: Era.AD, year: 1819, month: 10 },
          note: '세자빈 책봉',
        },
        'acc-1',
      )

      expect(createdSpouses[0]).toEqual(
        expect.objectContaining({
          marriageStartEra: Era.AD,
          marriageStartYear: 1819,
          marriageStartMonth: 10,
          note: '세자빈 책봉',
        }),
      )

      await service.linkFamilyMember(
        'adoptFather',
        {
          kind: 'child',
          targetId: 'adoptedChild',
          isAdoptive: true,
          otherParentId: 'adoptMother',
        },
        'acc-1',
      )

      expect(persons.get('adoptedChild').fatherId).toBe('heungseon')
      expect(persons.get('adoptedChild').adoptiveFatherId).toBe('adoptFather')
      expect(persons.get('adoptedChild').adoptiveMotherId).toBe('adoptMother')

      await service.updateChildFamilyMeta(
        'adoptFather',
        'adoptedChild',
        { otherParentId: 'adoptMother2' },
        'acc-1',
      )
      expect(persons.get('adoptedChild').adoptiveMotherId).toBe('adoptMother2')
      expect(persons.get('adoptedChild').motherId).toBeUndefined()
    })

    it('형제 연결 시 대상 인물에게 다른 부모가 이미 등록되어 있어도 기준 인물의 부모로 갱신하고, 입양형제(ADOPTIVE) 연결을 지원한다', async () => {
      const { service, persons } = createHarness({
        ego: {
          id: 'ego',
          name: '기준인물',
          gender: 'MALE',
          fatherId: 'trueFather',
          adoptiveFatherId: 'adoptiveDad',
          accountId: 'acc-1',
        },
        trueFather: { id: 'trueFather', name: '진부친', gender: 'MALE', accountId: 'acc-1' },
        wrongFather: { id: 'wrongFather', name: '오입력부친', gender: 'MALE', accountId: 'acc-1' },
        adoptiveDad: { id: 'adoptiveDad', name: '양부친', gender: 'MALE', accountId: 'acc-1' },
        siblingWithWrongFather: {
          id: 'siblingWithWrongFather',
          name: '형제A',
          gender: 'MALE',
          fatherId: 'wrongFather',
          accountId: 'acc-1',
        },
        adoptiveSiblingCandidate: {
          id: 'adoptiveSiblingCandidate',
          name: '입양형제후보',
          gender: 'MALE',
          fatherId: 'wrongFather',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'ego',
        {
          kind: 'sibling',
          targetId: 'siblingWithWrongFather',
          siblingLineage: 'PATERNAL_HALF',
        },
        'acc-1',
      )
      expect(persons.get('siblingWithWrongFather').fatherId).toBe('trueFather')

      await service.linkFamilyMember(
        'ego',
        {
          kind: 'sibling',
          targetId: 'adoptiveSiblingCandidate',
          siblingLineage: 'ADOPTIVE',
        },
        'acc-1',
      )
      expect(persons.get('adoptiveSiblingCandidate').adoptiveFatherId).toBe('adoptiveDad')
      expect(persons.get('adoptiveSiblingCandidate').fatherId).toBe('wrongFather')
    })

    it('다세대 직계 존속(조부모 등) 및 직계 비속(손자녀 등)을 배우자로 등록하거나 부모 변경으로 직계 혼인이 발생하면 차단한다', async () => {
      const { service } = createHarness({
        grandmother: {
          id: 'grandmother',
          name: '조모',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        father: {
          id: 'father',
          name: '부친',
          gender: 'MALE',
          motherId: 'grandmother',
          accountId: 'acc-1',
        },
        ego: {
          id: 'ego',
          name: '본인',
          gender: 'MALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
        son: {
          id: 'son',
          name: '아들',
          gender: 'MALE',
          fatherId: 'ego',
          accountId: 'acc-1',
        },
        granddaughter: {
          id: 'granddaughter',
          name: '손녀',
          gender: 'FEMALE',
          fatherId: 'son',
          accountId: 'acc-1',
        },
      })

      // 2세대 위 조모를 배우자로 지정 → 차단
      await expect(
        service.linkFamilyMember('ego', { kind: 'spouse', targetId: 'grandmother' }, 'acc-1'),
      ).rejects.toThrow(/직계 존속/)

      // 2세대 아래 손녀를 배우자로 지정 → 차단
      await expect(
        service.linkFamilyMember('ego', { kind: 'spouse', targetId: 'granddaughter' }, 'acc-1'),
      ).rejects.toThrow(/직계 비속/)
    })

    it('여성 인물(왕비·후궁) 시점에서 남성 배우자(왕)를 비대칭 서열(PRIMARY/CONCUBINE)로 추가할 때 rankHolderId가 여성 본인에게 귀속된다', async () => {
      const { service, createdSpouses } = createHarness({
        queen: {
          id: 'queen',
          name: '희빈장씨',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        king: {
          id: 'king',
          name: '숙종',
          gender: 'MALE',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'queen',
        {
          kind: 'spouse',
          targetId: 'king',
          marriageRank: MarriageRank.CONCUBINE,
        },
        'acc-1',
      )

      expect(createdSpouses).toHaveLength(1)
      expect(createdSpouses[0].marriageRank).toBe(MarriageRank.CONCUBINE)
      expect(createdSpouses[0].rankHolderId).toBe('queen')
    })

    it('입양형제(ego의 양부가 상대의 친부인 경우 등) 연결 해제 시 상대의 친생 부모(fatherId/motherId)를 훼손하지 않고 양부모(adoptiveFatherId/adoptiveMotherId)만 해제한다', async () => {
      const { service, persons } = createHarness({
        adoptDad: {
          id: 'adoptDad',
          name: '양부(큰아버지)',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        bioDad: {
          id: 'bioDad',
          name: '생부(작은아버지)',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        ego: {
          id: 'ego',
          name: '입양된본인',
          gender: 'MALE',
          fatherId: 'bioDad',
          adoptiveFatherId: 'adoptDad',
          accountId: 'acc-1',
        },
        adoptFatherBioSon: {
          id: 'adoptFatherBioSon',
          name: '양부의친아들',
          gender: 'MALE',
          fatherId: 'adoptDad',
          accountId: 'acc-1',
        },
      })

      await service.unlinkFamilyMember(
        'ego',
        'sibling',
        'adoptFatherBioSon',
        'acc-1',
      )

      // 양부의 친아들(adoptFatherBioSon)의 친부(fatherId)는 절대 삭제되지 않아야 함!
      expect(persons.get('adoptFatherBioSon').fatherId).toBe('adoptDad')
      // 대신 ego의 입양 연결(adoptiveFatherId)이 해제됨
      expect(persons.get('ego').adoptiveFatherId).toBeNull()
      expect(persons.get('ego').fatherId).toBe('bioDad')
    })

    it('updateSpouseRelation 호출 시 양방향 중복 PersonSpouse 레거시 행이 있으면 정준 쌍(personId < spouseId)으로 병합·정규화하고 자녀의 parentMarriageId를 이관한다', async () => {
      const { service, persons, createdSpouses } = createHarness({
        'b-husband': {
          id: 'b-husband',
          name: '남편',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        'a-wife': {
          id: 'a-wife',
          name: '아내',
          gender: 'FEMALE',
          accountId: 'acc-1',
        },
        child1: {
          id: 'child1',
          name: '아들',
          gender: 'MALE',
          fatherId: 'b-husband',
          motherId: 'a-wife',
          parentMarriageId: 'legacy-reverse-row',
          accountId: 'acc-1',
        },
      })

      // 레거시 역방향 행(b-husband -> a-wife)과 정준 행(a-wife -> b-husband)이 중복 존재하는 상태 시뮬레이션
      createdSpouses.push(
        {
          id: 'canonical-row',
          personId: 'a-wife',
          spouseId: 'b-husband',
          marriageRank: null,
          rankHolderId: null,
          note: null,
          marriageStartYear: 1400,
          marriageStartEra: Era.AD,
        },
        {
          id: 'legacy-reverse-row',
          personId: 'b-husband',
          spouseId: 'a-wife',
          marriageRank: MarriageRank.PRIMARY,
          rankHolderId: 'a-wife',
          note: '레거시 메모',
          marriageStartYear: null,
          marriageStartEra: Era.AD,
        },
      )

      await service.updateSpouseRelation(
        'b-husband',
        'a-wife',
        {
          marriageEndReason: MarriageEndReason.DEATH,
        },
        'acc-1',
      )

      // 중복 행이 제거되어 정준 행 1개만 남고, 레거시 행의 서열/메모와 정준 행의 혼인연도가 병합 보존됨
      expect(createdSpouses).toHaveLength(1)
      expect(createdSpouses[0].id).toBe('canonical-row')
      expect(createdSpouses[0].personId).toBe('a-wife')
      expect(createdSpouses[0].spouseId).toBe('b-husband')
      expect(createdSpouses[0].marriageRank).toBe(MarriageRank.PRIMARY)
      expect(createdSpouses[0].note).toBe('레거시 메모')
      expect(createdSpouses[0].marriageStartYear).toBe(1400)
      expect(createdSpouses[0].marriageEndReason).toBe(MarriageEndReason.DEATH)
      // 자녀의 parentMarriageId도 정준 행 ID로 안전하게 이관됨
      expect(persons.get('child1').parentMarriageId).toBe('canonical-row')
    })
  })

  describe('PersonPrismaRepository.findFamilyTree — 보조 노드(supportOnly)와 방계 친족/출계 자녀 양부모 정합성', () => {
    const createTreeRepo = (personRecords: Record<string, any>) => {
      const records = new Map<string, any>(Object.entries(personRecords))
      const prismaMock: any = {
        person: {
          findMany: jest.fn(async ({ where }: any) => {
            const ids: string[] | undefined = where?.id?.in
            const notIds: string[] = where?.NOT?.id?.in ?? []
            const orClauses: any[] = where?.OR ?? []
            return [...records.values()]
              .filter((p) => {
                if (notIds.includes(p.id)) return false
                if (ids) return ids.includes(p.id)
                if (orClauses.length > 0) {
                  return orClauses.some((clause) =>
                    Object.entries(clause).every(([k, v]) => p[k] === v),
                  )
                }
                return false
              })
              .map((p) => ({
                id: p.id,
                name: p.name ?? p.id,
                surname: p.surname ?? null,
                middleName: null,
                nameDisplayOrder: 'korean',
                gender: p.gender ?? 'MALE',
                birthDate: p.birthDate ?? null,
                birthEra: p.birthEra ?? 'AD',
                birthDatePrecision: null,
                deathDate: null,
                deathEra: null,
                deathDatePrecision: null,
                isAlive: false,
                isBirthDateUnknown: true,
                isBirthDateApproximate: false,
                isDeathDateUnknown: true,
                isDeathDateApproximate: false,
                floruitStartYear: null,
                floruitEndYear: null,
                floruitEra: null,
                illegitimate: false,
                birthOrder: p.birthOrder ?? null,
                genderBirthOrder: p.genderBirthOrder ?? null,
                profileImageUrl: null,
                fatherId: p.fatherId ?? null,
                motherId: p.motherId ?? null,
                adoptiveFatherId: p.adoptiveFatherId ?? null,
                adoptiveMotherId: p.adoptiveMotherId ?? null,
                parentMarriageId: null,
                country: null,
                historicalCountry: null,
                countryAffiliations: [],
                dynasty: null,
                foundedDynasties: [],
                GovernmentTenures: [],
                nicknames: [],
                spouseRelationsAsPerson: p.spouseRelationsAsPerson ?? [],
                spouseRelationsAsSpouse: p.spouseRelationsAsSpouse ?? [],
              }))
          }),
        },
      }
      return new PersonPrismaRepository(prismaMock)
    }

    it('양자녀의 생부가 동시에 기준 인물(ego)의 백숙부(Step 7b 방계)인 경우 supportOnly로 격하되지 않아 숙모(배우자)와 혼인 간선이 정상 보존된다', async () => {
      const repo = createTreeRepo({
        grandfather: { id: 'grandfather', name: '조부', gender: 'MALE' },
        father: { id: 'father', name: '부친', gender: 'MALE', fatherId: 'grandfather' },
        uncle: {
          id: 'uncle',
          name: '숙부(양자의 생부)',
          gender: 'MALE',
          fatherId: 'grandfather',
          spouseRelationsAsPerson: [
            {
              id: 'm-uncle',
              spouseId: 'aunt',
              marriageRank: 'PRIMARY',
              rankHolderId: 'uncle',
            },
          ],
        },
        aunt: { id: 'aunt', name: '숙모(양자의 생모)', gender: 'FEMALE' },
        ego: { id: 'ego', name: '본인', gender: 'MALE', fatherId: 'father' },
        adoptedSon: {
          id: 'adoptedSon',
          name: '양자',
          gender: 'MALE',
          fatherId: 'uncle',
          motherId: 'aunt',
          adoptiveFatherId: 'ego',
        },
      })

      const tree = await repo.findFamilyTree('ego', undefined, { includeCollaterals: true })
      const nodeIds = new Set(tree.nodes.map((n) => n.id))

      // 숙부·숙모가 모두 트리에 포함되고 숙부-숙모 부부 간선이 유지되어야 함
      expect(nodeIds.has('uncle')).toBe(true)
      expect(nodeIds.has('aunt')).toBe(true)
      expect(
        tree.edges.some(
          (e) =>
            e.type === 'spouse' &&
            ((e.source === 'uncle' && e.target === 'aunt') ||
              (e.source === 'aunt' && e.target === 'uncle')),
        ),
      ).toBe(true)
    })

    it('기준 인물(ego)의 친생자가 외부 가문/인물에게 출계(adoptiveFatherId)된 경우 그 양부모도 보조 노드로 수집되어 이름 해소가 가능하다', async () => {
      const repo = createTreeRepo({
        ego: { id: 'ego', name: '흥선대원군', gender: 'MALE' },
        outAdoptedSon: {
          id: 'outAdoptedSon',
          name: '고종',
          gender: 'MALE',
          fatherId: 'ego',
          adoptiveFatherId: 'cheoljong',
          adoptiveMotherId: 'sinjeong-queen',
        },
        cheoljong: { id: 'cheoljong', name: '철종', gender: 'MALE' },
        'sinjeong-queen': { id: 'sinjeong-queen', name: '신정왕후', gender: 'FEMALE' },
      })

      const tree = await repo.findFamilyTree('ego', undefined, { includeCollaterals: true })
      const nodeIds = new Set(tree.nodes.map((n) => n.id))

      expect(nodeIds.has('outAdoptedSon')).toBe(true)
      expect(nodeIds.has('cheoljong')).toBe(true)
      expect(nodeIds.has('sinjeong-queen')).toBe(true)
    })
  })

  describe('Round 6 — 2촌 형제자매 혼인 차단 및 rankHolderId 부부 당사자 정규화', () => {
    it('친형제·이복형제·입양형제를 배우자로 연결하려 하면 BadRequestException으로 차단한다', async () => {
      const { service } = createHarness({
        father: { id: 'father', name: '부친', gender: 'MALE', accountId: 'acc-1' },
        adoptFather: { id: 'adoptFather', name: '양부', gender: 'MALE', accountId: 'acc-1' },
        ego: {
          id: 'ego',
          name: '본인',
          gender: 'MALE',
          fatherId: 'father',
          adoptiveFatherId: 'adoptFather',
          accountId: 'acc-1',
        },
        halfSister: {
          id: 'halfSister',
          name: '이복여동생',
          gender: 'FEMALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
        adoptSister: {
          id: 'adoptSister',
          name: '입양여동생',
          gender: 'FEMALE',
          adoptiveFatherId: 'adoptFather',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember('ego', { kind: 'spouse', targetId: 'halfSister' }, 'acc-1'),
      ).rejects.toThrow(/형제자매/)

      await expect(
        service.linkFamilyMember('ego', { kind: 'spouse', targetId: 'adoptSister' }, 'acc-1'),
      ).rejects.toThrow(/형제자매/)
    })

    it('이미 배우자인 두 인물 중 한쪽의 부모를 상대 배우자의 부모와 동일하게 지정하거나 형제로 연결하려 하면 차단한다', async () => {
      const { service, createdSpouses } = createHarness({
        father: { id: 'father', name: '장인', gender: 'MALE', accountId: 'acc-1' },
        ego: { id: 'ego', name: '남편', gender: 'MALE', accountId: 'acc-1' },
        wife: {
          id: 'wife',
          name: '아내',
          gender: 'FEMALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
      })
      createdSpouses.push({
        id: 'm-ego-wife',
        personId: 'ego',
        spouseId: 'wife',
        marriageRank: 'PRIMARY',
        rankHolderId: 'wife',
      })

      await expect(
        service.linkFamilyMember('ego', { kind: 'father', targetId: 'father' }, 'acc-1'),
      ).rejects.toThrow(/형제자매/)

      await expect(
        service.linkFamilyMember('ego', { kind: 'sibling', targetId: 'wife' }, 'acc-1'),
      ).rejects.toThrow(/이미 배우자로 등록된 인물을 형제자매로 연결할 수 없습니다/)
    })

    it('배우자 변경 등으로 제3자(이전 배우자)의 rankHolderId가 전달되면 부부 당사자 ID로 정규화한다', async () => {
      const { service, createdSpouses } = createHarness({
        king: { id: 'king', name: '국왕', gender: 'MALE', accountId: 'acc-1' },
        oldQueen: { id: 'oldQueen', name: '전임왕비', gender: 'FEMALE', accountId: 'acc-1' },
        newQueen: { id: 'newQueen', name: '계비', gender: 'FEMALE', accountId: 'acc-1' },
      })

      await service.linkFamilyMember(
        'king',
        {
          kind: 'spouse',
          targetId: 'newQueen',
          marriageRank: MarriageRank.SECONDARY,
          // 이전 배우자(oldQueen)의 stale UUID가 잘못 전달된 케이스
          rankHolderId: 'oldQueen',
        },
        'acc-1',
      )

      expect(createdSpouses).toHaveLength(1)
      expect(createdSpouses[0].rankHolderId).toBe('newQueen')
    })
  })

  describe('Round 7 — 다세대 친생 직계 연대·친부모 몰년(유복자 포함)·혼인 기간–부부 생몰년 양방향 불변식', () => {
    it('중간 세대(아버지)의 출생 연도가 미상(null)이어도 조부의 출생 연도가 손자의 출생 연도보다 같거나 늦으면 차단한다', async () => {
      const { service } = createHarness({
        grandfather: {
          id: 'grandfather',
          name: '조부',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1500,
          accountId: 'acc-1',
        },
        fatherUnknownBirth: {
          id: 'fatherUnknownBirth',
          name: '부(생년미상)',
          gender: 'MALE',
          birthYear: null,
          fatherId: 'grandfather',
          accountId: 'acc-1',
        },
        grandson: {
          id: 'grandson',
          name: '손자',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1480,
          accountId: 'acc-1',
        },
      })

      // 1) 손자를 생년미상 아버지의 친자녀로 연결할 때 조부(1500) >= 손자(1480) 역전 차단
      await expect(
        service.linkFamilyMember(
          'grandson',
          { kind: 'father', targetId: 'fatherUnknownBirth' },
          'acc-1',
        ),
      ).rejects.toThrow(/조부모 등 직계 존속/)

      // 2) 역방향: 이미 손자(1520)가 연결된 상태에서 조부의 출생 연도를 1530으로 수정하면 차단
      const { service: service2 } = createHarness({
        grandfather: {
          id: 'grandfather',
          name: '조부',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1450,
          accountId: 'acc-1',
        },
        fatherUnknownBirth: {
          id: 'fatherUnknownBirth',
          name: '부(생년미상)',
          gender: 'MALE',
          birthYear: null,
          fatherId: 'grandfather',
          accountId: 'acc-1',
        },
        grandson: {
          id: 'grandson',
          name: '손자',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1520,
          fatherId: 'fatherUnknownBirth',
          accountId: 'acc-1',
        },
      })

      await expect(
        service2.update(
          'grandfather',
          { birthDate: new Date(Date.UTC(1530, 0, 1)), birthEra: 'AD' },
          'acc-1',
        ),
      ).rejects.toThrow(/손자녀 등 직계 비속/)
    })

    it('친모 사망 연도 이후 출생 자녀 및 친부 사망 +1년(유복자 범위) 초과 출생 자녀를 차단하고, 유복자(+1년)는 허용한다', async () => {
      const { service } = createHarness({
        fatherDied1500: {
          id: 'fatherDied1500',
          name: '친부',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1460,
          deathEra: 'AD',
          deathYear: 1500,
          accountId: 'acc-1',
        },
        motherDied1500: {
          id: 'motherDied1500',
          name: '친모',
          gender: 'FEMALE',
          birthEra: 'AD',
          birthYear: 1465,
          deathEra: 'AD',
          deathYear: 1500,
          accountId: 'acc-1',
        },
        posthumousChild1501: {
          id: 'posthumousChild1501',
          name: '유복자(1501)',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1501,
          accountId: 'acc-1',
        },
        impossibleChild1502: {
          id: 'impossibleChild1502',
          name: '불가능자녀(1502)',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1502,
          accountId: 'acc-1',
        },
      })

      // 친부 사망(1500) + 1년 유복자(1501)는 허용
      await expect(
        service.linkFamilyMember(
          'posthumousChild1501',
          { kind: 'father', targetId: 'fatherDied1500' },
          'acc-1',
        ),
      ).resolves.toBeDefined()

      // 친부 사망(1500) + 2년 뒤 출생(1502)은 차단
      await expect(
        service.linkFamilyMember(
          'impossibleChild1502',
          { kind: 'father', targetId: 'fatherDied1500' },
          'acc-1',
        ),
      ).rejects.toThrow(/친부의 사망 연도/)

      // 친모 사망(1500) 이후 출생(1501)은 차단
      await expect(
        service.linkFamilyMember(
          'posthumousChild1501',
          { kind: 'mother', targetId: 'motherDied1500' },
          'acc-1',
        ),
      ).rejects.toThrow(/친모의 사망 연도/)

      // 역방향: 이미 1501년생 친자녀가 있는 친모의 사망 연도를 1500년으로 수정하면 차단
      const { service: serviceRev } = createHarness({
        mother: {
          id: 'mother',
          name: '친모',
          gender: 'FEMALE',
          birthEra: 'AD',
          birthYear: 1470,
          accountId: 'acc-1',
        },
        child1501: {
          id: 'child1501',
          name: '자녀',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1501,
          motherId: 'mother',
          accountId: 'acc-1',
        },
      })

      await expect(
        serviceRev.update(
          'mother',
          { deathDate: new Date(Date.UTC(1500, 0, 1)), deathEra: 'AD' },
          'acc-1',
        ),
      ).rejects.toThrow(/친모의 사망 연도/)
    })

    it('혼인 시작·종료 연도가 부부 당사자의 출생 이전이거나 사망 이후이면 양방향 모두 차단한다', async () => {
      const { service, createdSpouses } = createHarness({
        husband: {
          id: 'husband',
          name: '남편',
          gender: 'MALE',
          birthEra: 'AD',
          birthYear: 1500,
          deathEra: 'AD',
          deathYear: 1560,
          accountId: 'acc-1',
        },
        wife: {
          id: 'wife',
          name: '아내',
          gender: 'FEMALE',
          birthEra: 'AD',
          birthYear: 1505,
          deathEra: 'AD',
          deathYear: 1550,
          accountId: 'acc-1',
        },
      })

      // 아내 출생(1505) 이전인 1502년 혼인 시작 → 차단
      await expect(
        service.linkFamilyMember(
          'husband',
          {
            kind: 'spouse',
            targetId: 'wife',
            marriageStart: { era: Era.AD, year: 1502 },
          },
          'acc-1',
        ),
      ).rejects.toThrow(/혼인 시작·종료 연도는 부부 당사자의 출생 연도보다 이전일 수 없습니다/)

      // 아내 사망(1550) 이후인 1555년 혼인 종료 → 차단
      await expect(
        service.linkFamilyMember(
          'husband',
          {
            kind: 'spouse',
            targetId: 'wife',
            marriageStart: { era: Era.AD, year: 1525 },
            marriageEnd: { era: Era.AD, year: 1555 },
          },
          'acc-1',
        ),
      ).rejects.toThrow(/혼인 시작·종료 연도는 부부 당사자의 사망 연도보다 이후일 수 없습니다/)

      // 정상 범위(1525~1545) 혼인 연결 성공
      await service.linkFamilyMember(
        'husband',
        {
          kind: 'spouse',
          targetId: 'wife',
          marriageStart: { era: Era.AD, year: 1525 },
          marriageEnd: { era: Era.AD, year: 1545 },
        },
        'acc-1',
      )
      expect(createdSpouses).toHaveLength(1)

      // 역방향: 남편의 사망 연도를 혼인 종료(1545) 이전인 1540년으로 수정하려 하면 차단
      await expect(
        service.update(
          'husband',
          { deathDate: new Date(Date.UTC(1540, 0, 1)), deathEra: 'AD' },
          'acc-1',
        ),
      ).rejects.toThrow(/사망 연도는 기존 혼인 관계의 시작·종료 연도보다 이전일 수 없습니다/)
    })
  })

  describe('Round 9 — 입양형제(ADOPTIVE)·이복/이부형제(PATERNAL_HALF/MATERNAL_HALF) 계보 충돌 차단 및 손자녀 추정 배우자 수집', () => {
    it('이미 동일한 친부모로만 연결된 형제를 입양형제(ADOPTIVE)로 중복 지정하려 하면 생부모↔양부모 중복 금지 규칙으로 차단한다', async () => {
      const { service } = createHarness({
        father: { id: 'father', name: '친부', gender: 'MALE', accountId: 'acc-1' },
        ego: {
          id: 'ego',
          name: '형',
          gender: 'MALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
        brother: {
          id: 'brother',
          name: '동생',
          gender: 'MALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember(
          'ego',
          {
            kind: 'sibling',
            targetId: 'brother',
            siblingLineage: 'ADOPTIVE',
          },
          'acc-1',
        ),
      ).rejects.toThrow(/입양형제로 중복 지정할 수 없습니다/)
    })

    it('이미 동일한 어머니(친모)를 공유하는 인물을 이복형제(PATERNAL_HALF)로 연결하거나 동일한 아버지(친부)를 공유하는 인물을 이부형제(MATERNAL_HALF)로 연결하려 하면 차단한다', async () => {
      const { service } = createHarness({
        father: { id: 'father', name: '친부', gender: 'MALE', accountId: 'acc-1' },
        mother: { id: 'mother', name: '친모', gender: 'FEMALE', accountId: 'acc-1' },
        ego: {
          id: 'ego',
          name: '본인',
          gender: 'MALE',
          fatherId: 'father',
          motherId: 'mother',
          accountId: 'acc-1',
        },
        sameMotherSib: {
          id: 'sameMotherSib',
          name: '동모형제',
          gender: 'MALE',
          motherId: 'mother',
          accountId: 'acc-1',
        },
        sameFatherSib: {
          id: 'sameFatherSib',
          name: '동부형제',
          gender: 'MALE',
          fatherId: 'father',
          accountId: 'acc-1',
        },
      })

      await expect(
        service.linkFamilyMember(
          'ego',
          {
            kind: 'sibling',
            targetId: 'sameMotherSib',
            siblingLineage: 'PATERNAL_HALF',
          },
          'acc-1',
        ),
      ).rejects.toThrow(/이미 동일한 어머니\(친모\)를 공유하는 인물은 이복형제/)

      await expect(
        service.linkFamilyMember(
          'ego',
          {
            kind: 'sibling',
            targetId: 'sameFatherSib',
            siblingLineage: 'MATERNAL_HALF',
          },
          'acc-1',
        ),
      ).rejects.toThrow(/이미 동일한 아버지\(친부\)를 공유하는 인물은 이부형제/)
    })

    it('update에서 잘못 등록된 기존 배우자를 spouseRelations에서 제거함과 동시에 부모로 지정하면 구 DB 행 오탐 없이 허용된다', async () => {
      const { service, createdSpouses, personRepositoryMock } = createHarness({
        parentCandidate: {
          id: 'parentCandidate',
          name: '실제친부',
          gender: 'MALE',
          accountId: 'acc-1',
        },
        ego: {
          id: 'ego',
          name: '본인',
          gender: 'MALE',
          accountId: 'acc-1',
        },
      })
      createdSpouses.push({ id: 'sp-1', personId: 'ego', spouseId: 'parentCandidate' })

      await expect(
        service.update(
          'ego',
          {
            fatherId: 'parentCandidate',
            spouseRelations: [],
          },
          'acc-1',
        ),
      ).resolves.toBeDefined()
      expect(personRepositoryMock.update).toHaveBeenCalledWith(
        'ego',
        expect.objectContaining({
          fatherId: 'parentCandidate',
          spouseRelations: [],
        }),
      )
    })

    it('linkFamilyMember(spouse)에서 기준 인물의 성별이 미지정(null)이고 상대 배우자가 남성(MALE)일 때 비대칭 서열(PRIMARY)의 rankHolderId는 비남성인 기준 인물에게 귀속된다', async () => {
      const { service, createdSpouses } = createHarness({
        egoUnknown: {
          id: 'egoUnknown',
          name: '성별미상배필',
          gender: null,
          accountId: 'acc-1',
        },
        husband: {
          id: 'husband',
          name: '남편',
          gender: 'MALE',
          accountId: 'acc-1',
        },
      })

      await service.linkFamilyMember(
        'egoUnknown',
        {
          kind: 'spouse',
          targetId: 'husband',
          marriageRank: MarriageRank.PRIMARY,
        },
        'acc-1',
      )

      expect(createdSpouses).toHaveLength(1)
      expect(createdSpouses[0].rankHolderId).toBe('egoUnknown')
    })
  })

  describe('연보(PersonLifeEvent) 및 재임·재위(asOfficeHolding) 날짜·정밀도·정렬 불변식', () => {
    it('asOfficeHolding은 BC 및 AD < 1000(DateTime=null) 기록의 startDate/endDate를 구조화 컬럼에서 부호 있는 ISO 문자열로 복원한다', () => {
      const bcReign = asOfficeHolding(
        {
          id: 'reign-augustus',
          startDate: null,
          startEra: 'BC',
          startYear: 27,
          startMonth: 1,
          startDay: 16,
          endDate: null,
          endEra: 'AD',
          endYear: 14,
          endMonth: 8,
          endDay: 19,
          positionDefinition: { isMonarchical: true, title: '프린켑스' },
        },
        true,
      )
      expect(bcReign.startDate).toBe('-0027-01-16')
      expect(bcReign.endDate).toBe('0014-08-19')
    })

    it('addPersonLifeEvent 및 updatePersonLifeEvent에서 종료일이 시작일보다 앞서면 BadRequestException을 던진다', async () => {
      const repo = new PersonPrismaRepository({
        personLifeEvent: {
          findUnique: jest.fn(async () => ({
            id: 'le-1',
            personId: 'p-1',
            startEra: 'AD',
            startYear: 1950,
            startMonth: 6,
            startDay: 25,
            startDatePrecision: 'day',
            endEra: null,
            endYear: null,
            endMonth: null,
            endDay: null,
            endDatePrecision: null,
          })),
        },
      } as any)

      await expect(
        repo.addPersonLifeEvent(
          {
            personId: 'p-1',
            title: '역전 연보',
            startDate: '1953-07-27',
            endDate: '1950-06-25',
          },
          'acc-1',
        ),
      ).rejects.toThrow(BadRequestException)

      await expect(
        repo.updatePersonLifeEvent('le-1', {
          endDate: '1949-12-31',
        }),
      ).rejects.toThrow(/종료일이 시작일보다 앞설 수 없습니다/)
    })

    it('updatePersonLifeEvent에서 startDatePrecision만 단독 수정해도 기존 구조화 날짜와 병합해 월/일을 정규화한다', async () => {
      let capturedUpdateData: any = null
      const repo = new PersonPrismaRepository({
        personLifeEvent: {
          findUnique: jest.fn(async () => ({
            id: 'le-2',
            personId: 'p-1',
            startEra: 'AD',
            startYear: 1980,
            startMonth: 5,
            startDay: 18,
            startDatePrecision: 'day',
            endEra: null,
            endYear: null,
            endMonth: null,
            endDay: null,
            endDatePrecision: null,
          })),
          update: jest.fn(async ({ data }: any) => {
            capturedUpdateData = data
            return {
              id: 'le-2',
              personId: 'p-1',
              ...data,
              event: null,
            }
          }),
        },
      } as any)

      const updated = await repo.updatePersonLifeEvent('le-2', {
        startDatePrecision: 'year',
      })

      expect(capturedUpdateData.startDatePrecision).toBe('year')
      expect(capturedUpdateData.startYear).toBe(1980)
      expect(capturedUpdateData.startMonth).toBeNull()
      expect(capturedUpdateData.startDay).toBeNull()
      expect(updated.startDate).toBe('1980-01-01')
    })

    it('findPersonLifeEventsByPersonId는 동일자 연보를 sortOrder 오름차순으로 정렬하고 연결 사건의 BC 날짜를 부호 있는 문자열로 합성한다', async () => {
      const repo = new PersonPrismaRepository({
        personLifeEvent: {
          findMany: jest.fn(async () => [
            {
              id: 'le-b',
              personId: 'p-1',
              title: '두 번째 사건',
              startEra: 'BC',
              startYear: 44,
              startMonth: 3,
              startDay: 15,
              startDatePrecision: 'day',
              sortOrder: 2,
              createdAt: new Date('2026-01-01T00:00:00Z'),
              event: {
                id: 'ev-1',
                title: '카이사르 암살',
                startDate: new Date('0044-03-15T00:00:00Z'),
                startEra: 'BC',
                startYear: 44,
                startMonth: 3,
                startDay: 15,
                startDatePrecision: 'day',
              },
            },
            {
              id: 'le-a',
              personId: 'p-1',
              title: '첫 번째 사건',
              startEra: 'BC',
              startYear: 44,
              startMonth: 3,
              startDay: 15,
              startDatePrecision: 'day',
              sortOrder: 1,
              createdAt: new Date('2026-01-02T00:00:00Z'),
              event: null,
            },
          ]),
        },
      } as any)

      const result = await repo.findPersonLifeEventsByPersonId('p-1')
      expect(result.map((r: any) => r.id)).toEqual(['le-a', 'le-b'])
      expect(result[1].event.startDate).toBe('-0044-03-15')
    })

    it('시작일이 구체 일자(day)이고 종료일이 같은 해의 연도 정밀도(year)일 때 역전 오류로 오판하지 않으며, 실제 역전(예: 5월 시작 ~ 3월 종료)은 거부한다', async () => {
      const repo = new PersonPrismaRepository({
        personLifeEvent: {
          create: jest.fn(async ({ data }: any) => ({
            id: 'le-mixed',
            ...data,
            event: null,
          })),
        },
      } as any)

      // 1920-03-15 (day) ~ 1920년 (year, 입력 문자열 '1920-01-01') → 정상 허용
      const created = await repo.addPersonLifeEvent(
        {
          personId: 'p-1',
          title: '파리 체류',
          startDate: '1920-03-15',
          startDatePrecision: 'day',
          endDate: '1920-01-01',
          endDatePrecision: 'year',
        },
        'acc-1',
      )
      expect(created.startDate).toBe('1920-03-15')
      expect(created.endDate).toBe('1920-01-01')

      // 1920-05-01 (day) ~ 1920년 3월 (month) → 실제 역전이므로 거부
      await expect(
        repo.addPersonLifeEvent(
          {
            personId: 'p-1',
            title: '역전 구간',
            startDate: '1920-05-01',
            startDatePrecision: 'day',
            endDate: '1920-03-01',
            endDatePrecision: 'month',
          },
          'acc-1',
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('인간관계 근거 사건(PersonHumanRelationshipSource.lifeEvent) 조회 시 DATETIME이 null인 기원전·연단위 연보의 구조화 날짜와 기원전 상대 인물의 부호 생몰일을 복원한다', async () => {
      const { service } = createHarness({
        'p-caesar': {
          id: 'p-caesar',
          name: '카이사르',
          gender: 'MALE',
          accountId: 'acc-1',
        },
      })
      ;(service as any).prisma.personHumanRelationship = {
        findMany: jest.fn(async () => [
          {
            id: 'rel-1',
            fromPersonId: 'p-caesar',
            toPersonId: 'p-brutus',
            relationshipType: 'GENERAL',
            isMutual: true,
            affinityLevel: -2,
            trustLevel: -2,
            powerDynamic: 1,
            formality: 0,
            startDate: null,
            endDate: null,
            note: '원로원 암살',
            fromPerson: {
              id: 'p-caesar',
              name: '카이사르',
              surname: '율리우스',
              middleName: null,
              nameDisplayOrder: 'western',
              country: null,
              profileImageUrl: null,
              birthDate: new Date('0100-07-12T00:00:00.000Z'),
              birthEra: 'BC',
              deathDate: new Date('0044-03-15T00:00:00.000Z'),
              deathEra: 'BC',
            },
            toPerson: {
              id: 'p-brutus',
              name: '브루투스',
              surname: '유니우스',
              middleName: null,
              nameDisplayOrder: 'western',
              country: null,
              profileImageUrl: null,
              birthDate: new Date('0085-01-01T00:00:00.000Z'),
              birthEra: 'BC',
              deathDate: new Date('0042-10-23T00:00:00.000Z'),
              deathEra: 'BC',
            },
            tags: [{ tag: 'RIVAL' }],
            sources: [
              {
                id: 'src-1',
                lifeEventId: 'le-bc44',
                note: '암살 당일',
                lifeEvent: {
                  id: 'le-bc44',
                  personId: 'p-caesar',
                  title: '카이사르 암살',
                  startDate: null,
                  startEra: 'BC',
                  startYear: 44,
                  startMonth: 3,
                  startDay: 15,
                  startDatePrecision: 'day',
                  endDate: null,
                  endEra: null,
                  endYear: null,
                  endMonth: null,
                  endDay: null,
                  endDatePrecision: null,
                },
              },
            ],
            phases: [],
          },
        ]),
      }

      const rels = await service.findHumanRelationshipsForDetail('p-caesar')
      expect(rels).toHaveLength(1)
      expect(rels[0].otherPerson.birthDate).toBe('-0085-01-01')
      expect(rels[0].otherPerson.deathDate).toBe('-0042-10-23')
      expect(rels[0].sources[0].lifeEvent.startDate).toBe('-0044-03-15')
      expect(rels[0].sources[0].lifeEvent.startDatePrecision).toBe('day')
    })

    it('분야별 경력·학력 생성 및 부분 수정 시 종료일이 시작일보다 앞서면 BadRequestException으로 거부하고, 상세 조회 educations select에 studentNumber를 포함하고 PersonEducation에 없는 showPositionInfo는 넣지 않는다', async () => {
      const findFirstMock = jest.fn(async (_args?: any) => null)
      const repo = new PersonPrismaRepository({
        person: {
          findFirst: findFirstMock,
        },
        militaryCareer: {
          create: jest.fn(),
          findUnique: jest.fn(async () => ({
            id: 'mc-1',
            startDate: new Date('2020-05-01T00:00:00.000Z'),
            endDate: null,
          })),
          update: jest.fn(),
        },
        personEducation: {
          create: jest.fn(),
          findUnique: jest.fn(async () => ({
            id: 'edu-1',
            startDate: new Date('2015-03-02T00:00:00.000Z'),
            endDate: new Date('2019-02-20T00:00:00.000Z'),
          })),
          update: jest.fn(),
        },
      } as any)

      // 1) 경력 생성 시 역전 날짜 거부
      await expect(
        repo.addMilitaryCareer({
          personId: 'ego',
          branch: '육군',
          startDate: '2022-01-01',
          endDate: '2021-12-31',
        } as any),
      ).rejects.toThrow('종료일이 시작일보다 앞설 수 없습니다.')

      // 2) 경력 부분 수정(endDate만 전달) 시 기존 DB startDate와 비교해 역전 거부
      await expect(
        repo.updateMilitaryCareer('mc-1', {
          endDate: '2019-01-01',
        }),
      ).rejects.toThrow('종료일이 시작일보다 앞설 수 없습니다.')

      // 3) 학력 생성 시 역전 날짜 거부
      await expect(
        repo.addEducation({
          personId: 'ego',
          organizationId: 'org-1',
          startDate: '2020-03-01',
          endDate: '2018-02-01',
        } as any),
      ).rejects.toThrow('종료일이 시작일보다 앞설 수 없습니다.')

      // 4) 학력 부분 수정(startDate만 기존 endDate보다 뒤로 변경) 시 역전 거부
      await expect(
        repo.updateEducation('edu-1', {
          startDate: '2020-03-01',
        }),
      ).rejects.toThrow('종료일이 시작일보다 앞설 수 없습니다.')

      // 5) findByIdWithRelations 호출 시 educations.select에 studentNumber 포함·showPositionInfo 미포함 확인
      //    (PersonEducation 모델엔 showPositionInfo 컬럼이 없어 select하면 PrismaClientValidationError로 상세 500)
      let capturedInclude: any = null
      findFirstMock.mockImplementationOnce(async (args: any) => {
        capturedInclude = args.include
        return null
      })
      await repo.findByIdWithRelations('ego', 'acc-1')
      expect(capturedInclude?.educations?.select?.studentNumber).toBe(true)
      expect(capturedInclude?.educations?.select?.showPositionInfo).toBeUndefined()
    })
  })
})
