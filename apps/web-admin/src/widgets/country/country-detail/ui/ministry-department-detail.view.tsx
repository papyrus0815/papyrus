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
import type { AdministrationDepartment } from '@/shared/api/administration-department'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'

import {
  hasDefenseExtensionContent,
  parseDepartmentDescription,
} from '@/shared/lib/ministry-department/ministry-department-utils'
import * as S from './ministry-department-detail.styles'

type MinistryDepartmentDetailViewProps = {
  department: AdministrationDepartment
  isDark: boolean
  categoryLabel?: string | null
  isDefenseRelated?: boolean
  /** 국가·행정조직 컨텍스트에서 군부대 등록 */
  onRegisterMilitaryUnit?: () => void
  /** 연결된 군부대 수정(모달) */
  onEditMilitaryUnit?: (unitId: string) => void
  tenuresSlot: ReactNode
  eventsSlot: ReactNode
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddChild: () => void
  onGoToPositions: () => void
}

function formatDeptDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  return iso.slice(0, 10).replace(/-/g, '.')
}

export function MinistryDepartmentDetailView({
  department,
  isDark: _isDark,
  categoryLabel,
  isDefenseRelated = false,
  onRegisterMilitaryUnit,
  onEditMilitaryUnit,
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
  const hasDefense = Boolean(
    isDefenseRelated && defense && hasDefenseExtensionContent(defense),
  )
  const militaryUnits = department.militaryUnits ?? []
  const est = formatDeptDate(department.establishedDate)
  const abol = formatDeptDate(department.abolishedDate)
  const successorName = department.successor?.name

  const dateBits: string[] = []
  if (est) dateBits.push(`설립 ${est}`)
  if (abol) dateBits.push(`폐지 ${abol}`)
  if (successorName) dateBits.push(`후신 ${successorName}`)

  return (
    <S.DetailRoot>
      {/* 행정부 상세 CabDetailTopBar 와 동일 구조 */}
      <S.DeptDetailTopBar>
        <S.DeptDetailTopLeft>
          <S.DeptDetailBackBtn type="button" onClick={onBack}>
            <FiChevronLeft size={14} />
            부처 목록
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
          <S.DeptTopDeleteBtn type="button" onClick={onDelete}>
            <FiTrash2 size={12} />
            삭제
          </S.DeptTopDeleteBtn>
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
            {categoryLabel ? (
              <S.DeptCategoryBadge>{categoryLabel}</S.DeptCategoryBadge>
            ) : null}
            <S.DeptProfileName>{department.name}</S.DeptProfileName>
          </S.DeptProfileNameRow>
          {hasDefense && defense?.officialNameEn?.trim() ? (
            <S.DeptPosBadge style={{ alignSelf: 'center' }}>
              {defense.officialNameEn.trim()}
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
          {militaryUnits.length > 0 ? (
            <S.UnitsRow>
              <S.UnitsLabel>연결 군부대</S.UnitsLabel>
              {militaryUnits.map((u) => (
                <S.UnitChip
                  key={u.id}
                  title={u.id}
                  role={onEditMilitaryUnit ? 'button' : undefined}
                  tabIndex={onEditMilitaryUnit ? 0 : undefined}
                  onClick={() => onEditMilitaryUnit?.(u.id)}
                  onKeyDown={(e) => {
                    if (
                      !onEditMilitaryUnit ||
                      (e.key !== 'Enter' && e.key !== ' ')
                    )
                      return
                    e.preventDefault()
                    onEditMilitaryUnit(u.id)
                  }}
                  style={{
                    cursor: onEditMilitaryUnit ? 'pointer' : undefined,
                  }}
                >
                  {u.name}
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>
                    · {militaryUnitTypeLabelKo(u.unitType)}
                  </span>
                </S.UnitChip>
              ))}
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
            {isDefenseRelated && onRegisterMilitaryUnit ? (
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
            <S.DeptActionBtn type="button" onClick={onEdit}>
              <FiEdit2 size={14} />
              정보 수정
            </S.DeptActionBtn>
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
