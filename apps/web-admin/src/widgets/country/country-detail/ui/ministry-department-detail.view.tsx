/**
 * 중앙부처·국가기관 상세 뷰
 * - 가로형 기관 아이덴티티 카드 + 상하 위계·전신후신·군부대 매트릭스 + 개요·메타 + 재임·사건 슬롯
 */
import type { ReactNode } from 'react'
import {
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiEdit2,
  FiGlobe,
  FiLayers,
  FiPlus,
  FiShield,
  FiTrash2,
} from 'react-icons/fi'

import {
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
import { getUploadImageUrl } from '@/shared/api/upload'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import {
  hasDefenseExtensionContent,
  parseDepartmentDescription,
} from '@/shared/lib/ministry-department/ministry-department-utils'

import * as S from './ministry-department-detail.styles'

type MinistryDepartmentDetailViewProps = {
  department: AdministrationDepartment
  allDepartments?: AdministrationDepartment[]
  isDark: boolean
  categoryLabel?: string | null
  isDefenseRelated?: boolean
  embeddedInSplitView?: boolean
  /** 국가·행정조직 컨텍스트에서 군부대 등록 */
  onRegisterMilitaryUnit?: () => void
  /** 연결된 군부대 편제·상세 보기(군사 조직 탭 이동) */
  onInspectMilitaryUnit?: (unitId: string) => void
  /** 연결된 군부대 수정(모달) */
  onEditMilitaryUnit?: (unitId: string) => void
  /** 상위·하위·전신·후신 기관 클릭 시 해당 기관 상세로 이동 */
  onSelectDepartment?: (departmentId: string) => void
  tenuresSlot: ReactNode
  eventsSlot: ReactNode
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddChild: () => void
  onGoToPositions: () => void
}

const DEPT_KIND_LABEL_KO: Record<string, string> = DEPARTMENT_KIND_LABEL

const TRANSITION_KIND_LABEL_KO: Record<string, string> = {
  RENAME: '개칭',
  REORGANIZE: '개편',
  SPLIT: '분할',
  MERGE: '통합',
  ABSORBED: '흡수',
  ABSORB: '흡수',
}

function formatTransitionYearLabel(lineage: {
  era?: 'BC' | 'AD' | null
  year?: number | null
  month?: number | null
}): string | null {
  if (typeof lineage.year !== 'number' || lineage.year <= 0) return null
  const eraPrefix = lineage.era === 'BC' ? 'BC ' : ''
  const monthSuffix =
    typeof lineage.month === 'number' && lineage.month >= 1
      ? `.${String(lineage.month).padStart(2, '0')}`
      : ''
  return `${eraPrefix}${lineage.year}${monthSuffix}`
}

function formatDeptDate(
  parts: AdministrationDepartment['established'] | undefined,
  iso: string | null | undefined,
): string | null {
  if (parts && typeof parts.year === 'number' && parts.year > 0) {
    const prefix = parts.era === 'BC' ? 'BC ' : ''
    const monthStr =
      parts.month != null ? `.${String(parts.month).padStart(2, '0')}` : ''
    const dayStr =
      parts.month != null && parts.day != null
        ? `.${String(parts.day).padStart(2, '0')}`
        : ''
    return `${prefix}${parts.year}${monthStr}${dayStr}`
  }
  if (!iso) return null
  if (iso.startsWith('-')) {
    const bcMatch = iso.match(/^-(\d{1,6})-(\d{2})-(\d{2})/)
    if (bcMatch) {
      return `BC ${Number(bcMatch[1])}`
    }
  }
  return iso.slice(0, 10).replace(/-/g, '.')
}

export function MinistryDepartmentDetailView({
  department,
  allDepartments = [],
  isDark: _isDark,
  categoryLabel,
  isDefenseRelated = false,
  embeddedInSplitView = false,
  onRegisterMilitaryUnit,
  onInspectMilitaryUnit,
  onEditMilitaryUnit,
  onSelectDepartment,
  tenuresSlot,
  eventsSlot,
  onBack,
  onEdit,
  onDelete,
  onAddChild,
  onGoToPositions,
}: MinistryDepartmentDetailViewProps) {
  const { cleanDescription, defense } = parseDepartmentDescription(
    department.description,
  )
  const hasDefense = Boolean(defense && hasDefenseExtensionContent(defense))
  const primaryMission =
    department.primaryMission?.trim() || defense?.missionScope?.trim() || ''
  const headquarters =
    department.headquarters?.trim() || defense?.headquarters?.trim() || ''
  const orgStructure =
    department.orgStructure?.trim() || defense?.orgStructure?.trim() || ''
  const budgetNote =
    department.budgetNote?.trim() || defense?.budgetOrForcesNote?.trim() || ''
  const hasStructuredMeta = Boolean(
    primaryMission || headquarters || orgStructure || budgetNote,
  )
  const militaryUnits = department.militaryUnits ?? []
  const milSuccessors = (department.militaryUnitSuccessors ?? []).filter(
    (succLineage) => Boolean(succLineage.militaryUnit?.id),
  )
  const est = formatDeptDate(department.established, department.establishedDate)
  const abol = formatDeptDate(department.abolished, department.abolishedDate)
  const isAbolished = Boolean(abol)

  const parentDept = department.parentId
    ? (allDepartments.find((deptItem) => deptItem.id === department.parentId) ??
      (department as { parent?: { id: string; name: string } | null }).parent ??
      null)
    : null
  const childDepts = allDepartments.filter(
    (deptItem) => deptItem.parentId === department.id,
  )
  const predecessors = (department.predecessors ?? []).filter(
    (lineage) => lineage.department?.id && lineage.department?.name,
  )
  const successors = (department.successors ?? []).filter(
    (lineage) => lineage.department?.id && lineage.department?.name,
  )

  const dateBits: string[] = []
  if (est) dateBits.push(`설립 ${est}`)
  if (abol) dateBits.push(`폐지 ${abol}`)

  const subNameBits = [
    department.nameLocal?.trim(),
    department.nameEn?.trim() ||
      (hasDefense ? defense?.officialNameEn?.trim() : undefined),
  ].filter(Boolean)

  const kindLabel = department.kind
    ? DEPT_KIND_LABEL_KO[department.kind]
    : DEPT_KIND_LABEL_KO.MINISTRY

  const hasRelationsMatrix = Boolean(
    parentDept ||
      childDepts.length > 0 ||
      predecessors.length > 0 ||
      successors.length > 0 ||
      milSuccessors.length > 0 ||
      militaryUnits.length > 0,
  )

  const renderEmblemIcon = () => {
    if (isDefenseRelated || militaryUnits.length > 0) {
      return <FiShield size={28} />
    }
    if (department.kind === 'ROYAL_HOUSEHOLD') {
      return <FiAward size={28} />
    }
    if (department.kind === 'COLONIAL_GOVERNMENT') {
      return <FiGlobe size={28} />
    }
    if (department.kind === 'AGENCY') {
      return <FiLayers size={28} />
    }
    return <FiBriefcase size={28} />
  }

  return (
    <S.DetailRoot>
      {/* 상단 브레드크럼 & 통합 액션 바 */}
      <S.DeptDetailTopBar>
        <S.DeptDetailTopLeft>
          <S.DeptDetailBackBtn type="button" onClick={onBack}>
            <FiChevronLeft size={13} />
            {embeddedInSplitView ? '선택 해제' : '부처 목록'}
          </S.DeptDetailBackBtn>
          <S.DeptBreadcrumbSep>/</S.DeptBreadcrumbSep>
          <S.DeptCrumbTitle title={department.name}>
            {department.name}
          </S.DeptCrumbTitle>
        </S.DeptDetailTopLeft>

        <S.DeptDetailTopBarRight>
          <S.DeptDetailActionsGroup role="group" aria-label="기관 편집 및 관리">
            <S.DeptTopGhostBtn onClick={onAddChild}>
              <FiPlus size={13} />
              산하 추가
            </S.DeptTopGhostBtn>
            {onRegisterMilitaryUnit ? (
              <S.DeptTopTealBtn onClick={onRegisterMilitaryUnit}>
                <FiShield size={13} />
                직할 군부대 등록
              </S.DeptTopTealBtn>
            ) : null}
            <S.DeptTopGhostBtn onClick={onGoToPositions}>
              <FiLayers size={13} />
              직위 정의
            </S.DeptTopGhostBtn>
            <S.DeptTopEditBtn onClick={onEdit}>
              <FiEdit2 size={13} />
              수정
            </S.DeptTopEditBtn>
            <S.DeptTopDeleteBtn onClick={onDelete}>
              <FiTrash2 size={13} />
              삭제
            </S.DeptTopDeleteBtn>
          </S.DeptDetailActionsGroup>
        </S.DeptDetailTopBarRight>
      </S.DeptDetailTopBar>

      {/* 가로형 기관 아이덴티티 카드 */}
      <S.DeptIdentityCard>
        <S.DeptIdentityMain>
          <S.DeptEmblemFrame
            $isDefense={isDefenseRelated || militaryUnits.length > 0}
          >
            {department.thumbnailUrl ? (
              <img
                src={getUploadImageUrl(department.thumbnailUrl)}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              renderEmblemIcon()
            )}
          </S.DeptEmblemFrame>

          <S.DeptIdentityBody>
            <S.DeptBadgeStrip>
              <S.DeptStatusBadge $abolished={isAbolished}>
                <S.DeptStatusDot $abolished={isAbolished} />
                {isAbolished ? '폐지·개편' : '현존 기관'}
              </S.DeptStatusBadge>
              {department.historicalCountry?.name ? (
                <S.DeptCategoryBadge>
                  🏛️ {department.historicalCountry.name}
                </S.DeptCategoryBadge>
              ) : null}
              {kindLabel ? (
                <S.DeptCategoryBadge>{kindLabel}</S.DeptCategoryBadge>
              ) : null}
              {categoryLabel ? (
                <S.DeptCategoryBadge>{categoryLabel}</S.DeptCategoryBadge>
              ) : null}
              {isDefenseRelated ? (
                <S.DefenseBadge>
                  <FiShield size={11} aria-hidden />
                  국방·군정
                </S.DefenseBadge>
              ) : null}
            </S.DeptBadgeStrip>

            <S.DeptProfileName>
              {department.name}
              {department.abbreviation?.trim() ? (
                <S.DeptAbbrSpan>
                  ({department.abbreviation.trim()})
                </S.DeptAbbrSpan>
              ) : null}
            </S.DeptProfileName>

            <S.DeptSubMetaRow>
              {subNameBits.length > 0 ? (
                <S.DeptPosBadge>{subNameBits.join(' · ')}</S.DeptPosBadge>
              ) : null}
              <S.DeptTenureDates>
                <FiCalendar size={11} />
                {dateBits.length > 0 ? dateBits.join(' · ') : '설립·폐지일 미등록'}
              </S.DeptTenureDates>
            </S.DeptSubMetaRow>
          </S.DeptIdentityBody>
        </S.DeptIdentityMain>

        {hasRelationsMatrix ? (
          <S.DeptRelationsMatrix>
            {(parentDept || childDepts.length > 0) && (
              <S.DeptRelationRow>
                <S.UnitsLabel>상하 위계</S.UnitsLabel>
                <S.UnitsChipList>
                  {parentDept ? (
                    <S.UnitChip
                      key={`parent-${parentDept.id}`}
                      role={onSelectDepartment ? 'button' : undefined}
                      tabIndex={onSelectDepartment ? 0 : undefined}
                      onClick={() => onSelectDepartment?.(parentDept.id)}
                      onKeyDown={(event) => {
                        if (
                          !onSelectDepartment ||
                          (event.key !== 'Enter' && event.key !== ' ')
                        ) {
                          return
                        }
                        event.preventDefault()
                        onSelectDepartment(parentDept.id)
                      }}
                      style={{
                        cursor: onSelectDepartment ? 'pointer' : undefined,
                      }}
                    >
                      <span style={{ opacity: 0.65, fontWeight: 500 }}>상위</span>
                      {parentDept.name}
                    </S.UnitChip>
                  ) : null}
                  {childDepts.map((childDept) => (
                    <S.UnitChip
                      key={`child-${childDept.id}`}
                      role={onSelectDepartment ? 'button' : undefined}
                      tabIndex={onSelectDepartment ? 0 : undefined}
                      onClick={() => onSelectDepartment?.(childDept.id)}
                      onKeyDown={(event) => {
                        if (
                          !onSelectDepartment ||
                          (event.key !== 'Enter' && event.key !== ' ')
                        ) {
                          return
                        }
                        event.preventDefault()
                        onSelectDepartment(childDept.id)
                      }}
                      style={{
                        cursor: onSelectDepartment ? 'pointer' : undefined,
                      }}
                    >
                      <span style={{ opacity: 0.65, fontWeight: 500 }}>산하</span>
                      {childDept.name}
                    </S.UnitChip>
                  ))}
                </S.UnitsChipList>
              </S.DeptRelationRow>
            )}

            {(predecessors.length > 0 || successors.length > 0) && (
              <S.DeptRelationRow>
                <S.UnitsLabel>역사 계보</S.UnitsLabel>
                <S.UnitsChipList>
                  {predecessors.map((lineage) => {
                    const predId = lineage.department.id
                    const kindLabelKo = lineage.kind
                      ? TRANSITION_KIND_LABEL_KO[lineage.kind]
                      : null
                    const yearLabel = formatTransitionYearLabel(lineage)
                    const metaSuffix = [
                      kindLabelKo,
                      yearLabel ? `(${yearLabel})` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <S.UnitChip
                        key={`pred-${lineage.transitionId ?? predId}`}
                        title={lineage.note ?? undefined}
                        role={onSelectDepartment ? 'button' : undefined}
                        tabIndex={onSelectDepartment ? 0 : undefined}
                        onClick={() => onSelectDepartment?.(predId)}
                        onKeyDown={(event) => {
                          if (
                            !onSelectDepartment ||
                            (event.key !== 'Enter' && event.key !== ' ')
                          ) {
                            return
                          }
                          event.preventDefault()
                          onSelectDepartment(predId)
                        }}
                        style={{
                          cursor: onSelectDepartment ? 'pointer' : undefined,
                        }}
                      >
                        <span style={{ opacity: 0.65, fontWeight: 500 }}>
                          전신
                        </span>
                        {lineage.department.name}
                        {metaSuffix ? (
                          <span style={{ opacity: 0.72, fontWeight: 500 }}>
                            · {metaSuffix}
                          </span>
                        ) : null}
                      </S.UnitChip>
                    )
                  })}
                  {successors.map((lineage) => {
                    const succId = lineage.department.id
                    const kindLabelKo = lineage.kind
                      ? TRANSITION_KIND_LABEL_KO[lineage.kind]
                      : null
                    const yearLabel = formatTransitionYearLabel(lineage)
                    const metaSuffix = [
                      kindLabelKo,
                      yearLabel ? `(${yearLabel})` : null,
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <S.UnitChip
                        key={`succ-${lineage.transitionId ?? succId}`}
                        title={lineage.note ?? undefined}
                        role={onSelectDepartment ? 'button' : undefined}
                        tabIndex={onSelectDepartment ? 0 : undefined}
                        onClick={() => onSelectDepartment?.(succId)}
                        onKeyDown={(event) => {
                          if (
                            !onSelectDepartment ||
                            (event.key !== 'Enter' && event.key !== ' ')
                          ) {
                            return
                          }
                          event.preventDefault()
                          onSelectDepartment(succId)
                        }}
                        style={{
                          cursor: onSelectDepartment ? 'pointer' : undefined,
                        }}
                      >
                        <span style={{ opacity: 0.65, fontWeight: 500 }}>
                          후신
                        </span>
                        {lineage.department.name}
                        {metaSuffix ? (
                          <span style={{ opacity: 0.72, fontWeight: 500 }}>
                            · {metaSuffix}
                          </span>
                        ) : null}
                      </S.UnitChip>
                    )
                  })}
                </S.UnitsChipList>
              </S.DeptRelationRow>
            )}

            {milSuccessors.length > 0 && (
              <S.DeptRelationRow>
                <S.UnitsLabel>군 사령부 개편</S.UnitsLabel>
                <S.UnitsChipList>
                  {milSuccessors.map((succLineage) => {
                    const targetUnit = succLineage.militaryUnit
                    const handleUnitClick =
                      onInspectMilitaryUnit ?? onEditMilitaryUnit
                    const kindLabelKo = succLineage.kind
                      ? TRANSITION_KIND_LABEL_KO[succLineage.kind]
                      : null
                    const yearLabel = formatTransitionYearLabel(succLineage)
                    return (
                      <S.UnitChip
                        key={`mil-succ-${succLineage.transitionId}`}
                        $tone="military"
                        title={
                          succLineage.note ??
                          `${targetUnit.name} — 군사 탭에서 편제·지휘관 보기`
                        }
                        role={handleUnitClick ? 'button' : undefined}
                        tabIndex={handleUnitClick ? 0 : undefined}
                        onClick={() => handleUnitClick?.(targetUnit.id)}
                        onKeyDown={(keyEvent) => {
                          if (
                            !handleUnitClick ||
                            (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')
                          ) {
                            return
                          }
                          keyEvent.preventDefault()
                          handleUnitClick(targetUnit.id)
                        }}
                        style={{
                          cursor: handleUnitClick ? 'pointer' : undefined,
                        }}
                      >
                        <FiShield size={11} />
                        → {targetUnit.name}
                        {targetUnit.abbreviation
                          ? ` (${targetUnit.abbreviation})`
                          : ''}
                        <span style={{ opacity: 0.75, fontWeight: 500 }}>
                          · {militaryUnitTypeLabelKo(targetUnit.unitType)}
                          {kindLabelKo ? ` · ${kindLabelKo}` : ''}
                          {yearLabel ? ` (${yearLabel})` : ''}
                        </span>
                      </S.UnitChip>
                    )
                  })}
                </S.UnitsChipList>
              </S.DeptRelationRow>
            )}

            {militaryUnits.length > 0 && (
              <S.DeptRelationRow>
                <S.UnitsLabel>소관 군부대</S.UnitsLabel>
                <S.UnitsChipList>
                  {militaryUnits.map((unitRef) => {
                    const handleUnitClick =
                      onInspectMilitaryUnit ?? onEditMilitaryUnit
                    return (
                      <S.UnitChip
                        key={unitRef.id}
                        $tone="military"
                        title={
                          onInspectMilitaryUnit
                            ? `${unitRef.name} — 군사 조직 편제·상세 보기`
                            : unitRef.id
                        }
                        role={handleUnitClick ? 'button' : undefined}
                        tabIndex={handleUnitClick ? 0 : undefined}
                        onClick={() => handleUnitClick?.(unitRef.id)}
                        onKeyDown={(keyEvent) => {
                          if (
                            !handleUnitClick ||
                            (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')
                          ) {
                            return
                          }
                          keyEvent.preventDefault()
                          handleUnitClick(unitRef.id)
                        }}
                        style={{
                          cursor: handleUnitClick ? 'pointer' : undefined,
                        }}
                      >
                        <FiShield size={11} />
                        {unitRef.name}
                        <span style={{ opacity: 0.75, fontWeight: 500 }}>
                          · {militaryUnitTypeLabelKo(unitRef.unitType)}
                        </span>
                      </S.UnitChip>
                    )
                  })}
                </S.UnitsChipList>
              </S.DeptRelationRow>
            )}
          </S.DeptRelationsMatrix>
        ) : null}
      </S.DeptIdentityCard>

      {isDefenseRelated && militaryUnits.length === 0 ? (
        <S.DeptInfoSection>
          <S.DeptInfoSectionTitle>
            <S.DeptInfoDot $color="#0d9488" />
            국방·군정 기관 안내
          </S.DeptInfoSectionTitle>
          <S.DeptInfoText style={{ fontSize: 12 }}>
            행정 조직도상의 청·실·국은 상단「산하 추가」로, 사령부·야전군·사단 등
            군사 편제는「직할 군부대 등록」으로 연결해 등록합니다.
          </S.DeptInfoText>
        </S.DeptInfoSection>
      ) : null}

      {cleanDescription.trim() ? (
        <S.DeptInfoSection>
          <S.DeptInfoSectionTitle>
            <S.DeptInfoDot $color="#6366f1" />
            기관 개요
          </S.DeptInfoSectionTitle>
          <S.DeptInfoText>{cleanDescription.trim()}</S.DeptInfoText>
        </S.DeptInfoSection>
      ) : null}

      {hasStructuredMeta ? (
        <S.MetaGrid>
          {primaryMission ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>주요 임무·관할</S.MetaPanelLabel>
              <S.MetaPanelBody>{primaryMission}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {headquarters ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>청사·본부 소재지</S.MetaPanelLabel>
              <S.MetaPanelBody>{headquarters}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {orgStructure ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>산하 조직·편제</S.MetaPanelLabel>
              <S.MetaPanelBody>{orgStructure}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {budgetNote ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>예산·정원·참고</S.MetaPanelLabel>
              <S.MetaPanelBody>{budgetNote}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
        </S.MetaGrid>
      ) : null}

      {tenuresSlot}
      {eventsSlot}
    </S.DetailRoot>
  )
}
