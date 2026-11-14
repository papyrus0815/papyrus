import { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiChevronRight, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { RADIUS, ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  type EventSide,
  type SideUnitView,
  type SideWeaponInput,
  type SideWeaponKind,
  type SideWeaponView,
  type WeaponCatalogItem,
  getWeaponCatalog,
  listEventSideWeapons,
  syncEventSideWeapons,
} from '@/shared/api/event-sides'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

import { InlineSelect, InlineText } from './inline'
import { LoadError } from './load-error'

export type DoctrineFieldKey = 'objective' | 'strategy' | 'tactics' | 'intelligence' | 'logistics'

/**
 * 자리표시는 **어느 사건에나 맞는 말**로 — 예전엔 바르바로사 작전의 예시('A-A선 진출', '케셀슐라흐트')가
 * 박혀 있어 1792년 발미 전투의 빈 칸에도 2차대전 문구가 떴다. 글리프(🎯·🧭…)도 쓰지 않는다(장부 언어).
 */
const DOCTRINE_FIELDS: ReadonlyArray<{
  key: DoctrineFieldKey
  label: string
  placeholder: string
}> = [
  { key: 'objective', label: '목표', placeholder: '이루려 한 것 — 차지할 곳, 꺾을 상대, 지킬 선' },
  { key: 'strategy', label: '전략', placeholder: '큰 방침 — 단기 결전, 지구전, 버틴 뒤 반격' },
  { key: 'tactics', label: '전술', placeholder: '싸운 방식 — 포위, 기동, 매복, 공성' },
  { key: 'intelligence', label: '첩보', placeholder: '상대를 얼마나 알았나 — 정찰, 첩보, 오판' },
  { key: 'logistics', label: '보급', placeholder: '보급 사정 — 식량, 탄약, 수송' },
]

const ASSET_KIND_LABEL: Record<SideWeaponKind, string> = {
  GROUND_VEHICLE: '기갑·차량',
  AIRCRAFT: '항공기',
  WEAPON: '화포·보병화기',
  NAVAL_VESSEL: '함선',
}

const ASSET_KIND_OPTIONS = (Object.keys(ASSET_KIND_LABEL) as SideWeaponKind[]).map((kind) => ({
  value: kind,
  label: ASSET_KIND_LABEL[kind],
}))

export interface ColoredSideItem extends EventSide {
  color: string
}

interface SideDoctrineComparisonProps {
  sides: ReadonlyArray<ColoredSideItem>
  disabled?: boolean
  onSaveField: (side: EventSide, field: DoctrineFieldKey, value: string | null) => void
}

/**
 * 진영별 작전 목표 · 전략 · 전술 · 첩보 · 보급 대칭 비교 및 인라인 편집 패널.
 */
export function SideDoctrineComparison({
  sides,
  disabled = false,
  onSaveField,
}: SideDoctrineComparisonProps) {
  const hasAnyFilled = useMemo(
    () =>
      sides.some((side) =>
        DOCTRINE_FIELDS.some((field) => Boolean(side[field.key]?.trim())),
      ),
    [sides],
  )
  const [expanded, setExpanded] = useState(hasAnyFilled)

  if (sides.length === 0) return null

  return (
    <DoctrineContainer>
      <DoctrineHeaderButton
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
        <span>진영별 목표 · 전략 · 전술 · 첩보 · 보급</span>
        {!hasAnyFilled && <DoctrineBadge>아직 없음</DoctrineBadge>}
      </DoctrineHeaderButton>

      {expanded && (
        <DoctrineTableWrap>
          <DoctrineTable>
            <thead>
              <tr>
                <DoctrineAxisTh>항목</DoctrineAxisTh>
                {sides.map((side) => (
                  <DoctrineSideTh key={side.id} $color={side.color}>
                    <SideDot $color={side.color} />
                    {side.name}
                  </DoctrineSideTh>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCTRINE_FIELDS.map((field) => (
                <tr key={field.key}>
                  <DoctrineAxisCell>{field.label}</DoctrineAxisCell>
                  {sides.map((side) => {
                    const currentValue = side[field.key] ?? ''
                    return (
                      <DoctrineValueCell key={`${side.id}-${field.key}`} aria-disabled={disabled}>
                        <InlineText
                          value={currentValue}
                          onSave={(nextText) =>
                            onSaveField(side, field.key, nextText.trim() || null)
                          }
                          placeholder={field.placeholder}
                          multiline
                          multilineEnter
                        />
                      </DoctrineValueCell>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </DoctrineTable>
        </DoctrineTableWrap>
      )}
    </DoctrineContainer>
  )
}

interface SideWeaponsSectionProps {
  eventId: string
  sideId: string
  sideName: string
  sideColor: string
  sideUnits: ReadonlyArray<SideUnitView>
  /** 진영 카드의 '+ 병기·장비'로 막 펼친 경우 — 빈 머리만 보이지 않게 추가 칸을 바로 연다 */
  initialAdding?: boolean
}

/** 저장된 줄 → 동기화 입력(서버 계약: kind·itemId·deployedUnitId·quantity·lost·role·note) */
function toWeaponInput(item: SideWeaponView): SideWeaponInput {
  return {
    kind: item.kind,
    itemId: item.itemId,
    deployedUnitId: item.deployedUnitId,
    quantity: item.quantity,
    lost: item.lost,
    role: item.role,
    note: item.note,
  }
}

/**
 * 진영 및 산하 부대에 투입된 병기·장비(SideWeapon) 도표 및 추가/삭제 편집기.
 */
export function SideWeaponsSection({
  eventId,
  sideId,
  sideName,
  sideColor,
  sideUnits,
  initialAdding = false,
}: SideWeaponsSectionProps) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(initialAdding)
  const [saving, setSaving] = useState(false)
  const [assetKind, setAssetKind] = useState<SideWeaponKind>('GROUND_VEHICLE')
  const [assetId, setAssetId] = useState('')
  const [sideUnitId, setSideUnitId] = useState('')
  const [roleText, setRoleText] = useState('')
  const [deployedText, setDeployedText] = useState('')
  const [lostText, setLostText] = useState('')
  const [noteText, setNoteText] = useState('')

  const sideWeaponsQuery = useQuery({
    queryKey: eventKeys.sideWeapons(eventId),
    /* 실패를 빈 배열로 삼키지 않는다 — '병기 없음'과 '못 불러옴'은 다른 말이다(LoadError) */
    queryFn: () => listEventSideWeapons(eventId),
    staleTime: 30_000,
  })

  const catalogQuery = useQuery<WeaponCatalogItem[]>({
    queryKey: eventKeys.weaponCatalog(),
    queryFn: () => getWeaponCatalog(eventId),
    enabled: adding,
    staleTime: 60_000,
  })

  const weaponsForSide = useMemo(
    () => (sideWeaponsQuery.data ?? []).filter((item) => item.sideId === sideId),
    [sideWeaponsQuery.data, sideId],
  )

  /* 카탈로그는 서버가 한 줄 배열(kind 표지)로 준다 — 고른 분류만 */
  const catalogOptions = useMemo(
    () =>
      (catalogQuery.data ?? [])
        .filter((option) => option.kind === assetKind)
        .map((option) => ({
          value: option.id,
          label: [
            option.categoryLabel ? `${option.name} (${option.categoryLabel})` : option.name,
            option.countryName,
          ]
            .filter(Boolean)
            .join(' · '),
        })),
    [catalogQuery.data, assetKind],
  )
  const unitOptions = useMemo(
    () => sideUnits.map((unitItem) => ({ value: unitItem.id, label: unitItem.unit.name })),
    [sideUnits],
  )

  const refreshWeapons = async () => {
    await queryClient.invalidateQueries({ queryKey: eventKeys.sideWeapons(eventId) })
  }

  const handleAddWeapon = async () => {
    if (!assetId) {
      notify.error('투입할 병기·장비를 선택해 주세요')
      return
    }
    const deployedVal = deployedText.trim() ? Number(deployedText.trim()) : null
    const lostVal = lostText.trim() ? Number(lostText.trim()) : null
    const newEntry: SideWeaponInput = {
      kind: assetKind,
      itemId: assetId,
      deployedUnitId: sideUnitId || null,
      quantity: deployedVal !== null && Number.isFinite(deployedVal) ? deployedVal : null,
      lost: lostVal !== null && Number.isFinite(lostVal) ? lostVal : null,
      role: roleText.trim() || null,
      note: noteText.trim() || null,
    }
    setSaving(true)
    try {
      await syncEventSideWeapons(eventId, sideId, [
        ...weaponsForSide.map(toWeaponInput),
        newEntry,
      ])
      await refreshWeapons()
      setAssetId('')
      setSideUnitId('')
      setRoleText('')
      setDeployedText('')
      setLostText('')
      setNoteText('')
      setAdding(false)
      notify.success('투입 병기·장비를 추가했습니다')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '투입 병기·장비 저장에 실패했습니다',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveWeapon = async (targetId: string) => {
    setSaving(true)
    try {
      const remaining = weaponsForSide
        .filter((item) => item.id !== targetId)
        .map(toWeaponInput)
      await syncEventSideWeapons(eventId, sideId, remaining)
      await refreshWeapons()
      notify.success('투입 병기·장비를 제외했습니다')
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '투입 병기·장비 제외에 실패했습니다',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <WeaponsBox $color={sideColor} aria-label={`${sideName} 투입 병기·장비`}>
      <WeaponsHead>
        <WeaponsTitle>
          투입 병기·장비
          {weaponsForSide.length > 0 && <WeaponsCount>{weaponsForSide.length}</WeaponsCount>}
        </WeaponsTitle>
        {!sideWeaponsQuery.isError && (
          <AddWeaponToggleBtn type="button" onClick={() => setAdding((prev) => !prev)}>
            <FiPlus size={11} /> {adding ? '닫기' : '병기·장비 추가'}
          </AddWeaponToggleBtn>
        )}
      </WeaponsHead>

      {sideWeaponsQuery.isError && (
        <LoadError
          message="투입 병기·장비를 불러오지 못했습니다."
          onRetry={() => void sideWeaponsQuery.refetch()}
          retrying={sideWeaponsQuery.isFetching}
        />
      )}

      {weaponsForSide.length > 0 && (
        <WeaponsList>
          {weaponsForSide.map((item) => {
            return (
              <WeaponRow key={item.id}>
                <WeaponMain>
                  <WeaponKindBadge>{ASSET_KIND_LABEL[item.kind]}</WeaponKindBadge>
                  <WeaponName>{item.name}</WeaponName>
                  {item.categoryLabel && <WeaponCategoryTag>{item.categoryLabel}</WeaponCategoryTag>}
                  {item.deployedUnitName &&
                    (() => {
                      const matchedSideUnit = sideUnits.find(
                        (su) => su.id === item.deployedUnitId,
                      )
                      return matchedSideUnit ? (
                        <WeaponUnitTag
                          as={Link}
                          to={pathKeys.militaryUnitDetail(matchedSideUnit.unit.id)}
                          title={`${item.deployedUnitName} 부대 상세 대시보드 열기`}
                          style={{ textDecoration: 'none' }}
                        >
                          {item.deployedUnitName}
                        </WeaponUnitTag>
                      ) : (
                        <WeaponUnitTag>{item.deployedUnitName}</WeaponUnitTag>
                      )
                    })()}
                  {item.role && <WeaponRoleTag>{item.role}</WeaponRoleTag>}
                </WeaponMain>
                <WeaponStats>
                  {item.quantity != null && (
                    <WeaponStatBadge $tone="deployed">
                      투입 {item.quantity.toLocaleString()}
                    </WeaponStatBadge>
                  )}
                  {item.lost != null && (
                    <WeaponStatBadge $tone="lost">
                      손실 {item.lost.toLocaleString()}
                    </WeaponStatBadge>
                  )}
                  {item.note && <WeaponNote title={item.note}>{item.note}</WeaponNote>}
                  <WeaponRemoveBtn
                    type="button"
                    disabled={saving}
                    onClick={() => void handleRemoveWeapon(item.id)}
                    aria-label={`${item.name} 제외`}
                  >
                    <FiTrash2 size={11} />
                  </WeaponRemoveBtn>
                </WeaponStats>
              </WeaponRow>
            )
          })}
        </WeaponsList>
      )}

      {adding && !sideWeaponsQuery.isError && (
        <AddWeaponForm>
          {/* 고르기는 지면 공용 피커(InlineSelect) — 네이티브 select는 다크 모드·터치에서 따로 논다 */}
          <FormRow>
            <FormPick>
              <FormPickLabel>분류</FormPickLabel>
              <InlineSelect
                value={assetKind}
                options={ASSET_KIND_OPTIONS}
                onSave={(next) => {
                  setAssetKind(next as SideWeaponKind)
                  setAssetId('')
                }}
                label="병기·장비 분류"
                clearable={false}
              />
            </FormPick>

            <FormPick>
              <FormPickLabel>장비</FormPickLabel>
              {catalogQuery.isLoading ? (
                <FormPickNote>목록을 불러오는 중…</FormPickNote>
              ) : catalogQuery.isError ? null : catalogOptions.length === 0 ? (
                <FormPickNote>이 분류에 등록된 장비가 아직 없습니다</FormPickNote>
              ) : (
                <InlineSelect
                  value={assetId}
                  options={catalogOptions}
                  onSave={setAssetId}
                  placeholder={`고르기 (${catalogOptions.length}종)`}
                  label="투입 병기·장비"
                />
              )}
            </FormPick>

            {unitOptions.length > 0 && (
              <FormPick>
                <FormPickLabel>운용 부대</FormPickLabel>
                <InlineSelect
                  value={sideUnitId}
                  options={unitOptions}
                  onSave={setSideUnitId}
                  placeholder="진영 전체"
                  label="운용 부대"
                />
              </FormPick>
            )}
          </FormRow>

          {catalogQuery.isError && (
            <LoadError
              message="장비 목록을 불러오지 못했습니다."
              onRetry={() => void catalogQuery.refetch()}
              retrying={catalogQuery.isFetching}
            />
          )}

          <FormRow>
            <FormInput
              type="number"
              min="0"
              placeholder="투입 수량 (예: 3648)"
              value={deployedText}
              onChange={(changeEvent) => setDeployedText(changeEvent.target.value)}
            />
            <FormInput
              type="number"
              min="0"
              placeholder="손실 수량 (예: 1200)"
              value={lostText}
              onChange={(changeEvent) => setLostText(changeEvent.target.value)}
            />
            <FormInput
              type="text"
              placeholder="역할 (예: 주력 중형전차)"
              value={roleText}
              onChange={(changeEvent) => setRoleText(changeEvent.target.value)}
            />
            <FormInput
              type="text"
              placeholder="전술 비고 (예: 37mm 대전차포로 전면 관통 불가)"
              value={noteText}
              onChange={(changeEvent) => setNoteText(changeEvent.target.value)}
              style={{ flex: '2 1 200px' }}
            />
            <SubmitWeaponBtn
              type="button"
              disabled={saving || !assetId}
              onClick={() => void handleAddWeapon()}
            >
              추가
            </SubmitWeaponBtn>
          </FormRow>
        </AddWeaponForm>
      )}
    </WeaponsBox>
  )
}

interface SubEventSidesRollupPanelProps {
  eventId: string
}

/**
 * 묶음 사건(COLLECTION)에서 하위 전투들의 진영별 참전 국가·지휘관·투입 부대를 한눈에 모아보는 패널.
 */
export function SubEventSidesRollupPanel({ eventId }: SubEventSidesRollupPanelProps) {
  const [open, setOpen] = useState(false)

  const overviewQuery = useQuery({
    queryKey: eventKeys.overview(eventId),
    queryFn: () => getEventOverview(eventId),
    enabled: open,
    staleTime: 30_000,
  })

  const aggregatedGroups = useMemo(() => {
    const descendants = overviewQuery.data?.descendants ?? []
    const bySideName = new Map<
      string,
      {
        sideName: string
        color: string | null
        countries: Map<string, { name: string; flagEmoji: string | null; battleTitles: Set<string> }>
        persons: Map<string, { personId: string; name: string; battleTitles: Set<string> }>
        units: Map<
          string,
          { militaryUnitId: string; name: string; unitType: string | null; battleTitles: Set<string> }
        >
      }
    >()

    for (const node of descendants) {
      const sideById = new Map((node.sides ?? []).map((side) => [side.id, side]))

      for (const side of node.sides ?? []) {
        const key = side.name.trim() || '기타 진영'
        let group = bySideName.get(key)
        if (!group) {
          group = {
            sideName: key,
            color: side.color,
            countries: new Map(),
            persons: new Map(),
            units: new Map(),
          }
          bySideName.set(key, group)
        }
        for (const deployed of side.deployedUnits ?? []) {
          const existingUnit = group.units.get(deployed.militaryUnitId)
          if (existingUnit) {
            existingUnit.battleTitles.add(node.title)
          } else {
            group.units.set(deployed.militaryUnitId, {
              militaryUnitId: deployed.militaryUnitId,
              name: deployed.name,
              unitType: deployed.unitType,
              battleTitles: new Set([node.title]),
            })
          }
        }
      }

      for (const country of node.countries ?? []) {
        const side = country.sideId ? sideById.get(country.sideId) : null
        const sideKey = side?.name.trim() || '진영 미지정'
        let group = bySideName.get(sideKey)
        if (!group) {
          group = {
            sideName: sideKey,
            color: side?.color ?? null,
            countries: new Map(),
            persons: new Map(),
            units: new Map(),
          }
          bySideName.set(sideKey, group)
        }
        const existingCountry = group.countries.get(country.key)
        if (existingCountry) {
          existingCountry.battleTitles.add(node.title)
        } else {
          group.countries.set(country.key, {
            name: country.name,
            flagEmoji: country.flagEmoji,
            battleTitles: new Set([node.title]),
          })
        }
      }

      for (const person of node.persons ?? []) {
        const side = person.sideId ? sideById.get(person.sideId) : null
        const sideKey = side?.name.trim() || '진영 미지정'
        let group = bySideName.get(sideKey)
        if (!group) {
          group = {
            sideName: sideKey,
            color: side?.color ?? null,
            countries: new Map(),
            persons: new Map(),
            units: new Map(),
          }
          bySideName.set(sideKey, group)
        }
        const displayName = [person.name, person.surname].filter(Boolean).join(' ') || '이름 미상'
        const existingPerson = group.persons.get(person.personId)
        if (existingPerson) {
          existingPerson.battleTitles.add(node.title)
        } else {
          group.persons.set(person.personId, {
            personId: person.personId,
            name: displayName,
            battleTitles: new Set([node.title]),
          })
        }
      }
    }

    return [...bySideName.values()]
  }, [overviewQuery.data])

  return (
    <RollupWrap>
      <RollupToggleBtn type="button" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        {open ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
        <span>하위 사건 참전 진영 · 부대 · 지휘관 모아보기</span>
      </RollupToggleBtn>

      {open && (
        <RollupBody>
          {overviewQuery.isLoading ? (
            <RollupEmpty>하위 사건 참전 내역을 집계하는 중…</RollupEmpty>
          ) : overviewQuery.isError ? (
            <LoadError
              message="하위 사건 참전 내역을 불러오지 못했습니다."
              onRetry={() => void overviewQuery.refetch()}
              retrying={overviewQuery.isFetching}
            />
          ) : aggregatedGroups.length === 0 ? (
            <RollupEmpty>하위 사건에 등록된 진영·부대·인물이 아직 없습니다.</RollupEmpty>
          ) : (
            <RollupGrid>
              {aggregatedGroups.map((group) => (
                <RollupSideCard key={group.sideName} $color={group.color}>
                  <RollupSideTitle>
                    <SideDot $color={group.color ?? '#64748b'} />
                    {group.sideName}
                  </RollupSideTitle>

                  {group.units.size > 0 && (
                    <RollupGroupSection>
                      <RollupGroupLabel>하위 전투 투입 부대 ({group.units.size})</RollupGroupLabel>
                      <RollupChipList>
                        {[...group.units.values()].map((unitItem) => (
                          <RollupChipLink
                            key={unitItem.militaryUnitId}
                            to={pathKeys.militaryUnitDetail(unitItem.militaryUnitId)}
                            title={`참전 하위 사건: ${[...unitItem.battleTitles].join(', ')}`}
                          >
                            {unitItem.name}
                            <RollupCountBadge>{unitItem.battleTitles.size}전투</RollupCountBadge>
                          </RollupChipLink>
                        ))}
                      </RollupChipList>
                    </RollupGroupSection>
                  )}

                  {group.persons.size > 0 && (
                    <RollupGroupSection>
                      <RollupGroupLabel>하위 전투 지휘관·인물 ({group.persons.size})</RollupGroupLabel>
                      <RollupChipList>
                        {[...group.persons.values()].map((personItem) => (
                          <RollupChipLink
                            key={personItem.personId}
                            to={pathKeys.personsTimelineDetail(personItem.personId)}
                            title={`참전 하위 사건: ${[...personItem.battleTitles].join(', ')}`}
                          >
                            {personItem.name}
                            <RollupCountBadge>{personItem.battleTitles.size}</RollupCountBadge>
                          </RollupChipLink>
                        ))}
                      </RollupChipList>
                    </RollupGroupSection>
                  )}

                  {group.countries.size > 0 && (
                    <RollupGroupSection>
                      <RollupGroupLabel>참전 국가 ({group.countries.size})</RollupGroupLabel>
                      <RollupChipList>
                        {[...group.countries.values()].map((countryItem) => (
                          <RollupStaticChip
                            key={countryItem.name}
                            title={`참전 하위 사건: ${[...countryItem.battleTitles].join(', ')}`}
                          >
                            {countryItem.flagEmoji ? `${countryItem.flagEmoji} ` : ''}
                            {countryItem.name}
                            <RollupCountBadge>{countryItem.battleTitles.size}</RollupCountBadge>
                          </RollupStaticChip>
                        ))}
                      </RollupChipList>
                    </RollupGroupSection>
                  )}
                </RollupSideCard>
              ))}
            </RollupGrid>
          )}
        </RollupBody>
      )}
    </RollupWrap>
  )
}

const DoctrineContainer = styled.div`
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow: hidden;
`

const DoctrineHeaderButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const DoctrineBadge = styled.span`
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  color: ${metaText};
  background: ${({ theme }) => theme.colors.background.primary};
`

const DoctrineTableWrap = styled.div`
  overflow-x: auto;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const DoctrineTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    vertical-align: top;
    text-align: left;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`

const DoctrineAxisTh = styled.th`
  /* 좁은 폭(390px)에서도 두 진영이 한 화면에 — 예전 110+200×2는 둘째 진영 열이 화면 밖으로 잘렸다 */
  width: 64px;
  min-width: 56px;
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
  background: ${({ theme }) => theme.colors.background.primary};
`

const DoctrineSideTh = styled.th<{ $color: string }>`
  min-width: 132px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border-top: 2px solid ${({ $color }) => $color};
`

const SideDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const DoctrineAxisCell = styled.td`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const DoctrineValueCell = styled.td`
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
`

const WeaponsBox = styled.div<{ $color: string }>`
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 2.5px solid ${({ $color }) => $color};
  background: ${({ theme }) => theme.colors.background.primary};
`

const WeaponsHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const WeaponsTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const WeaponsCount = styled.span`
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10.5px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${metaText};
`

const AddWeaponToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const WeaponsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
`

const WeaponRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  padding: 4px 6px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.secondary};
  font-size: 11.5px;
`

const WeaponMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

const WeaponKindBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${metaText};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const WeaponName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const WeaponCategoryTag = styled.span`
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10.5px;
  color: ${metaText};
  background: ${({ theme }) => theme.colors.background.primary};
`

const WeaponUnitTag = styled.span`
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
`

const WeaponRoleTag = styled.span`
  font-size: 10.5px;
  color: ${metaText};
`

const WeaponStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const WeaponStatBadge = styled.span<{ $tone: 'deployed' | 'lost' }>`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $tone, theme }) =>
    $tone === 'lost' ? '#ef4444' : theme.colors.text.primary};
  background: ${({ $tone }) =>
    $tone === 'lost' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)'};
`

const WeaponNote = styled.span`
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
  color: ${metaText};
`

const WeaponRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: none;
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: #ef4444;
  }
`

const AddWeaponForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed ${({ theme }) => ledgerHairline(theme.mode)};
`

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 고르기 한 칸 — 라벨 + 공용 피커 */
const FormPick = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin-right: 10px;
  font-size: 12px;
`

const FormPickLabel = styled.span`
  flex: none;
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
`

const FormPickNote = styled.span`
  font-size: 11.5px;
  color: ${metaText};
`

const FormInput = styled.input`
  flex: 1 1 110px;
  padding: 4px 7px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 11.5px;
`

const SubmitWeaponBtn = styled.button`
  padding: 4px 10px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.text.primary};
  color: ${({ theme }) => theme.colors.background.primary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const RollupWrap = styled.div`
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const RollupToggleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
`

const RollupBody = styled.div`
  padding: 10px 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const RollupEmpty = styled.div`
  font-size: 12px;
  color: ${metaText};
`

const RollupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
`

const RollupSideCard = styled.div<{ $color: string | null }>`
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-top: 2.5px solid ${({ $color, theme }) => $color ?? theme.colors.border.medium};
  background: ${({ theme }) => theme.colors.background.primary};
`

const RollupSideTitle = styled.div`
  display: flex;
  align-items: center;
  font-size: 12.5px;
  font-weight: 700;
  margin-bottom: 8px;
`

const RollupGroupSection = styled.div`
  margin-top: 6px;
`

const RollupGroupLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
  margin-bottom: 4px;
`

const RollupChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const RollupChipLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const RollupStaticChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.secondary};
`

const RollupCountBadge = styled.span`
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  color: ${metaText};
  background: ${({ theme }) => theme.colors.background.primary};
`
