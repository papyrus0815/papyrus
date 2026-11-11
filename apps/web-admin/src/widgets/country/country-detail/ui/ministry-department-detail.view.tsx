/**
 * 중앙부처 상세 — 행정부 상세(`cabinets-section`)와 동일 레이아웃:
 * CabDetailTopBar + HeadProfileBlock + HeadTenureInfoSection + ProfileSection
 */
import type { ReactNode } from 'react'
import {
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiEdit2,
  FiLayers,
  FiPlus,
  FiShield,
  FiTrash2,
} from 'react-icons/fi'

import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type AdministrationDepartment,
  DEPARTMENT_KIND_LABEL,
} from '@/shared/api/administration-department'
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
  const militaryUnits = department.militaryUnits ?? []
  const est = formatDeptDate(department.established, department.establishedDate)
  const abol = formatDeptDate(department.abolished, department.abolishedDate)
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
  const kindLabel =
    department.kind && department.kind !== 'MINISTRY'
      ? DEPT_KIND_LABEL_KO[department.kind]
      : null

  return (
    <S.DetailRoot>
      {/* 행정부 상세 CabDetailTopBar 와 동일 구조 */}
      <S.DeptDetailTopBar>
        <S.DeptDetailTopLeft>
          <S.DeptDetailBackBtn type="button" onClick={onBack}>
            <FiChevronLeft size={14} />
            {embeddedInSplitView ? '선택 해제' : '부처 목록'}
          </S.DeptDetailBackBtn>
          <S.DeptBreadcrumbSep>/</S.DeptBreadcrumbSep>
          <S.DeptCrumbTitle title={department.name}>
            {department.name}
          </S.DeptCrumbTitle>
        </S.DeptDetailTopLeft>
        <S.DeptDetailTopBarRight>
          {isDefenseRelated ? (
            <S.DefenseBadge>
              <FiShield size={13} aria-hidden />
              국방·군사
            </S.DefenseBadge>
          ) : null}
          <S.DeptDetailActionsGroup role="group" aria-label="부처 편집">
            <S.DeptTopEditBtn onClick={onAddChild}>
              <FiPlus size={14} />
              산하 기관 추가
            </S.DeptTopEditBtn>
            {onRegisterMilitaryUnit ? (
              <S.DeptTopEditBtn onClick={onRegisterMilitaryUnit}>
                <FiShield size={14} />
                직할 군부대 등록
              </S.DeptTopEditBtn>
            ) : null}
            <S.DeptTopEditBtn onClick={onEdit}>
              <FiEdit2 size={14} />
              수정
            </S.DeptTopEditBtn>
            <S.DeptTopDeleteBtn onClick={onDelete}>
              <FiTrash2 size={14} />
              삭제
            </S.DeptTopDeleteBtn>
          </S.DeptDetailActionsGroup>
        </S.DeptDetailTopBarRight>
      </S.DeptDetailTopBar>

      {/* 수반 HeadProfileBlock 과 동일 */}
      <S.DeptProfileBlock>
        <S.DeptProfileAvatar>
          {department.thumbnailUrl ? (
            <img
              src={getUploadImageUrl(department.thumbnailUrl)}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
              }}
            />
          ) : (
            <FiBriefcase size={40} color="#c0cad8" />
          )}
        </S.DeptProfileAvatar>
        <S.DeptProfileMeta>
          <S.DeptProfileNameRow>
            {department.historicalCountry?.name ? (
              <S.DeptCategoryBadge>
                {department.historicalCountry.name}
              </S.DeptCategoryBadge>
            ) : null}
            {kindLabel ? (
              <S.DeptCategoryBadge>{kindLabel}</S.DeptCategoryBadge>
            ) : null}
            {categoryLabel ? (
              <S.DeptCategoryBadge>{categoryLabel}</S.DeptCategoryBadge>
            ) : null}
            <S.DeptProfileName>
              {department.name}
              {department.abbreviation?.trim()
                ? ` (${department.abbreviation.trim()})`
                : ''}
            </S.DeptProfileName>
          </S.DeptProfileNameRow>
          {subNameBits.length > 0 ? (
            <S.DeptPosBadge style={{ alignSelf: 'center' }}>
              {subNameBits.join(' · ')}
            </S.DeptPosBadge>
          ) : null}
          <S.DeptTenureRow>
            {dateBits.length > 0 ? (
              <S.DeptTenureDates>
                <FiCalendar size={10} />
                {dateBits.join(' · ')}
              </S.DeptTenureDates>
            ) : (
              <S.DeptTenureDates>
                <FiCalendar size={10} />
                날짜 미등록
              </S.DeptTenureDates>
            )}
          </S.DeptTenureRow>
          {(parentDept || childDepts.length > 0) && (
            <S.UnitsRow>
              {parentDept ? (
                <>
                  <S.UnitsLabel>상위 기관</S.UnitsLabel>
                  <S.UnitChip
                    key={`parent-${parentDept.id}`}
                    role={onSelectDepartment ? 'button' : undefined}
                    tabIndex={onSelectDepartment ? 0 : undefined}
                    onClick={() => onSelectDepartment?.(parentDept.id)}
                    onKeyDown={(event) => {
                      if (
                        !onSelectDepartment ||
                        (event.key !== 'Enter' && event.key !== ' ')
                      )
                        return
                      event.preventDefault()
                      onSelectDepartment(parentDept.id)
                    }}
                    style={{
                      cursor: onSelectDepartment ? 'pointer' : undefined,
                    }}
                  >
                    {parentDept.name}
                  </S.UnitChip>
                </>
              ) : null}
              {childDepts.length > 0 ? (
                <>
                  <S.UnitsLabel>산하 기관</S.UnitsLabel>
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
                        )
                          return
                        event.preventDefault()
                        onSelectDepartment(childDept.id)
                      }}
                      style={{
                        cursor: onSelectDepartment ? 'pointer' : undefined,
                      }}
                    >
                      {childDept.name}
                    </S.UnitChip>
                  ))}
                </>
              ) : null}
            </S.UnitsRow>
          )}
          {(predecessors.length > 0 || successors.length > 0) && (
            <S.UnitsRow>
              {predecessors.length > 0 ? (
                <>
                  <S.UnitsLabel>전신</S.UnitsLabel>
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
                          )
                            return
                          event.preventDefault()
                          onSelectDepartment(predId)
                        }}
                        style={{
                          cursor: onSelectDepartment ? 'pointer' : undefined,
                        }}
                      >
                        {lineage.department.name}
                        {metaSuffix ? (
                          <span style={{ opacity: 0.75, fontWeight: 500 }}>
                            · {metaSuffix}
                          </span>
                        ) : null}
                      </S.UnitChip>
                    )
                  })}
                </>
              ) : null}
              {successors.length > 0 ? (
                <>
                  <S.UnitsLabel>후신</S.UnitsLabel>
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
                          )
                            return
                          event.preventDefault()
                          onSelectDepartment(succId)
                        }}
                        style={{
                          cursor: onSelectDepartment ? 'pointer' : undefined,
                        }}
                      >
                        {lineage.department.name}
                        {metaSuffix ? (
                          <span style={{ opacity: 0.75, fontWeight: 500 }}>
                            · {metaSuffix}
                          </span>
                        ) : null}
                      </S.UnitChip>
                    )
                  })}
                </>
              ) : null}
            </S.UnitsRow>
          )}
          {(department.militaryUnitSuccessors?.length ?? 0) > 0 ? (
            <S.UnitsRow>
              <S.UnitsLabel>군 사령부 개편·이관</S.UnitsLabel>
              {(department.militaryUnitSuccessors ?? []).map((succLineage) => {
                const handleUnitClick =
                  onInspectMilitaryUnit ?? onEditMilitaryUnit
                const yearText = succLineage.year
                  ? `${succLineage.era === 'BC' ? 'BC ' : ''}${succLineage.year}년`
                  : null
                return (
                  <S.UnitChip
                    key={`mil-succ-${succLineage.transitionId}`}
                    title={
                      succLineage.note ??
                      `${succLineage.unit.name} — 군사 탭에서 편제·지휘관 보기`
                    }
                    role={handleUnitClick ? 'button' : undefined}
                    tabIndex={handleUnitClick ? 0 : undefined}
                    onClick={() => handleUnitClick?.(succLineage.unit.id)}
                    onKeyDown={(keyEvent) => {
                      if (
                        !handleUnitClick ||
                        (keyEvent.key !== 'Enter' && keyEvent.key !== ' ')
                      )
                        return
                      keyEvent.preventDefault()
                      handleUnitClick(succLineage.unit.id)
                    }}
                    style={{
                      cursor: handleUnitClick ? 'pointer' : undefined,
                    }}
                  >
                    → {succLineage.unit.name}
                    {succLineage.unit.abbreviation
                      ? ` (${succLineage.unit.abbreviation})`
                      : ''}
                    <span style={{ opacity: 0.75, fontWeight: 500 }}>
                      · {militaryUnitTypeLabelKo(succLineage.unit.unitType)}
                      {yearText ? ` · ${yearText}` : ''}
                    </span>
                  </S.UnitChip>
                )
              })}
            </S.UnitsRow>
          ) : null}
          {militaryUnits.length > 0 ? (
            <S.UnitsRow>
              <S.UnitsLabel>연결 군부대</S.UnitsLabel>
              {militaryUnits.map((unitRef) => {
                const handleUnitClick =
                  onInspectMilitaryUnit ?? onEditMilitaryUnit
                return (
                  <S.UnitChip
                    key={unitRef.id}
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
                      )
                        return
                      keyEvent.preventDefault()
                      handleUnitClick(unitRef.id)
                    }}
                    style={{
                      cursor: handleUnitClick ? 'pointer' : undefined,
                    }}
                  >
                    {unitRef.name}
                    <span style={{ opacity: 0.75, fontWeight: 500 }}>
                      · {militaryUnitTypeLabelKo(unitRef.unitType)}
                    </span>
                  </S.UnitChip>
                )
              })}
            </S.UnitsRow>
          ) : isDefenseRelated ? (
            <S.DeptInfoText
              style={{
                fontSize: 12,
                marginTop: 4,
                textAlign: 'center',
                maxWidth: 420,
              }}
            >
              연결된 군부대 없음 — 아래「군부대 등록」에서 이 중앙부처와 연결해
              등록할 수 있습니다.
            </S.DeptInfoText>
          ) : null}
        </S.DeptProfileMeta>
        <S.DeptProfileActions>
          <S.DeptProfileActionsRow>
            <S.DeptActionBtnPrimary type="button" onClick={onAddChild}>
              <FiPlus size={14} />
              하위 기관 추가
            </S.DeptActionBtnPrimary>
            {onRegisterMilitaryUnit ? (
              <S.DeptActionBtnTeal
                type="button"
                onClick={onRegisterMilitaryUnit}
              >
                <FiShield size={13} />
                군부대 등록
              </S.DeptActionBtnTeal>
            ) : null}
          </S.DeptProfileActionsRow>
          <S.DeptProfileActionsRow>
            <S.DeptActionBtn type="button" onClick={onGoToPositions}>
              <FiLayers size={14} />
              직위 정의
            </S.DeptActionBtn>
          </S.DeptProfileActionsRow>
        </S.DeptProfileActions>
      </S.DeptProfileBlock>

      {isDefenseRelated ? (
        <S.DeptInfoSection style={{ marginTop: 12 }}>
          <S.DeptInfoSectionTitle>
            <S.DeptInfoDot $color="#f59e0b" />
            군 부대 vs 행정 기관
          </S.DeptInfoSectionTitle>
          <S.DeptInfoText>
            위「하위 행정 기관 추가」는 정부 조직도상의 또 다른 기관(청·실·국 등)
            을 만듭니다. 사단·여단·함대 등{' '}
            <strong>군사 부대</strong>는「군부대 등록」으로 추가하며, 이
            중앙부처와 자동 연결됩니다. 상위 부대(parentUnitId)는 등록 폼에서
            지정할 수 있습니다. 부대 자체가 부처가 되는 것은 아닙니다.
          </S.DeptInfoText>
        </S.DeptInfoSection>
      ) : null}

      {cleanDescription.trim() ? (
        <S.DeptInfoSection style={{ marginTop: 12 }}>
          <S.DeptInfoSectionTitle>
            <S.DeptInfoDot $color="#6366f1" />
            개요
          </S.DeptInfoSectionTitle>
          <S.DeptInfoText>{cleanDescription.trim()}</S.DeptInfoText>
        </S.DeptInfoSection>
      ) : null}

      {hasDefense && defense ? (
        <S.MetaGrid style={{ marginTop: 14 }}>
          {defense.missionScope?.trim() ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>주요 임무·관할</S.MetaPanelLabel>
              <S.MetaPanelBody>{defense.missionScope.trim()}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {defense.headquarters?.trim() ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>본부·거점</S.MetaPanelLabel>
              <S.MetaPanelBody>{defense.headquarters.trim()}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {defense.orgStructure?.trim() ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>지휘·산하</S.MetaPanelLabel>
              <S.MetaPanelBody>{defense.orgStructure.trim()}</S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
          {defense.budgetOrForcesNote?.trim() ? (
            <S.MetaPanel>
              <S.MetaPanelLabel>국방비·병력·참고</S.MetaPanelLabel>
              <S.MetaPanelBody>
                {defense.budgetOrForcesNote.trim()}
              </S.MetaPanelBody>
            </S.MetaPanel>
          ) : null}
        </S.MetaGrid>
      ) : null}

      <S.ProfileSection>
        <S.ProfileSectionLabel>역대 재임 · 장관</S.ProfileSectionLabel>
        {tenuresSlot}
      </S.ProfileSection>

      <S.ProfileSection>
        <S.ProfileSectionLabel>기관 사건 · 정책</S.ProfileSectionLabel>
        {eventsSlot}
      </S.ProfileSection>
    </S.DetailRoot>
  )
}
