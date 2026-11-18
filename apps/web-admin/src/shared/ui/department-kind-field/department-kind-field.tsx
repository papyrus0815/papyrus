import React, { useState } from 'react'

import {
  FiAward,
  FiBriefcase,
  FiCheck,
  FiCompass,
  FiGlobe,
  FiLayers,
  FiMoreHorizontal,
} from 'react-icons/fi'
import styled from 'styled-components'

import type { AdministrationDepartmentKind } from '@/shared/api/administration-department'
import {
  ChoiceChips,
  type ChoiceChipOption,
  kitC,
} from '@/shared/ui/register-form-kit/register-form-kit'

export interface DepartmentKindGuideItem {
  value: AdministrationDepartmentKind
  label: string
  shortBadge: string
  icon: React.ReactNode
  summary: string
  criteria: string
  examples: string
}

export const DEPARTMENT_KIND_GUIDE_LIST: ReadonlyArray<DepartmentKindGuideItem> =
  [
    {
      value: 'MINISTRY',
      label: '중앙부처',
      shortBadge: '장관급 부·성·조',
      icon: <FiBriefcase size={13.5} />,
      summary:
        '내각·행정부를 구성하는 장관(대신·상서·판서)급 본부 부처와 전근대 핵심 중앙 관서입니다.',
      criteria:
        '국무위원·장관이 수장인 정식 부처 및 6조·6부·성(省)·원(院) 등 핵심 국정 분장 기관',
      examples: '외교부 · 국무부 · 외무성 · 기획재정부 · 이조·병조 · 전쟁성',
    },
    {
      value: 'AGENCY',
      label: '외청·위원회',
      shortBadge: '청·독립위원회·정보',
      icon: <FiLayers size={13.5} />,
      summary:
        '부처 산하의 독립 외청(廳)·국이나 특정 행정·정보·규제 사무를 전담하는 위원회·기구입니다.',
      criteria:
        '차관·청장급 실무 집행 외청, 합의제 행정위원회, 정보·수사·조세·치안 전담 기구',
      examples:
        '검찰청 · 국세청 · 경찰청 · 국가정보원 · CIA · 공정거래위원회',
    },
    {
      value: 'ROYAL_HOUSEHOLD',
      label: '원수직속·궁내',
      shortBadge: '비서실·자문·황실',
      icon: <FiAward size={13.5} />,
      summary:
        '국가원수·대통령을 직접 보좌하는 직속 참모기구 및 군주·황실 사무 전담 관서입니다.',
      criteria:
        '내각 밖에서 원수·군주를 보좌하는 비서실·안보실·자문원 및 궁내부·승정원류 기구',
      examples: '대통령비서실 · 국가안보실 · 궁내성 · 승정원 · 추밀원 · 내각관방',
    },
    {
      value: 'COLONIAL_GOVERNMENT',
      label: '총독부·점령청',
      shortBadge: '식민·보호령·군정',
      icon: <FiGlobe size={13.5} />,
      summary:
        '식민지·속령·점령지 통치를 위해 본국이나 점령군이 설치한 최고 통치 기구입니다.',
      criteria:
        '총독·고등판무관·군정장관이 관할하는 식민 통치부·민정청 및 그 직속 관서',
      examples: '조선총독부 · 대만총독부 · 인도 정청 · 미군정청 · 총독 관방',
    },
    {
      value: 'OTHER',
      label: '헌법·사법·입법·기타',
      shortBadge: '사법·감사·선관·의회',
      icon: <FiCompass size={13.5} />,
      summary:
        '행정부로부터 독립된 사법부·헌법재판·선거·감사 기구 및 입법부 사무처 등 헌법기관입니다.',
      criteria:
        '삼권분립상 사법·입법 영역이거나 헌법으로 독립성이 보장된 최고 감독·심판 기구',
      examples:
        '대법원 · 헌법재판소 · 감사원 · 중앙선거관리위원회 · 국회사무처 · 사헌부',
    },
  ]

const KIND_CHIP_OPTIONS: ChoiceChipOption<AdministrationDepartmentKind>[] =
  DEPARTMENT_KIND_GUIDE_LIST.map((guideItem) => ({
    value: guideItem.value,
    label: guideItem.label,
    title: `${guideItem.summary} (예: ${guideItem.examples})`,
  }))

export interface DepartmentKindFieldProps {
  value: AdministrationDepartmentKind
  onChange: (nextKind: AdministrationDepartmentKind) => void
  ariaLabel?: string
  guideOpen?: boolean
  onGuideOpenChange?: (nextOpen: boolean) => void
}

export const DepartmentKindField: React.FC<DepartmentKindFieldProps> = ({
  value,
  onChange,
  ariaLabel = '기관 구분 선택',
  guideOpen: controlledGuideOpen,
  onGuideOpenChange,
}) => {
  const [internalGuideOpen, setInternalGuideOpen] = useState(false)
  const guideOpen = controlledGuideOpen ?? internalGuideOpen

  const toggleGuide = () => {
    const nextOpen = !guideOpen
    if (controlledGuideOpen === undefined) {
      setInternalGuideOpen(nextOpen)
    }
    onGuideOpenChange?.(nextOpen)
  }

  const activeGuide =
    DEPARTMENT_KIND_GUIDE_LIST.find((guideItem) => guideItem.value === value) ??
    DEPARTMENT_KIND_GUIDE_LIST[0]

  return (
    <KindFieldRoot>
      <ChipsAndMoreRow>
        <ChipsFlexWrap>
          <ChoiceChips
            value={value}
            options={KIND_CHIP_OPTIONS}
            ariaLabel={ariaLabel}
            onChange={(nextKind) => {
              if (!nextKind) return
              onChange(nextKind)
            }}
          />
        </ChipsFlexWrap>

        <MoreGuideIconBtn
          type="button"
          $open={guideOpen}
          aria-label="구분 기준 안내"
          aria-expanded={guideOpen}
          title={
            guideOpen
              ? '구분 기준 비교 안내 닫기'
              : '기관 구분 기준 · 대표 사례 비교 보기'
          }
          onClick={toggleGuide}
        >
          <FiMoreHorizontal size={15} aria-hidden />
        </MoreGuideIconBtn>
      </ChipsAndMoreRow>

      <QuietKindCaption data-testid="active-department-kind-callout">
        <strong>{activeGuide.label}</strong>
        <span className="sep" aria-hidden="true">
          ·
        </span>
        <span>{activeGuide.summary}</span>
      </QuietKindCaption>

      {guideOpen ? (
        <FullGuidePanel role="region" aria-label="기관 구분 전체 기준 안내">
          <GuidePanelHeader>
            <span>5대 기관 구분 기준 — 클릭하면 바로 선택됩니다</span>
          </GuidePanelHeader>

          <GuideCardsGrid>
            {DEPARTMENT_KIND_GUIDE_LIST.map((guideItem) => {
              const isSelected = guideItem.value === value
              return (
                <GuideOptionCard
                  key={guideItem.value}
                  type="button"
                  $selected={isSelected}
                  onClick={() => {
                    onChange(guideItem.value)
                  }}
                >
                  <GuideCardTop>
                    <GuideCardTitleGroup>
                      <GuideSmallIcon $selected={isSelected}>
                        {guideItem.icon}
                      </GuideSmallIcon>
                      <strong>{guideItem.label}</strong>
                      <GuideBadge>{guideItem.shortBadge}</GuideBadge>
                    </GuideCardTitleGroup>
                    {isSelected ? (
                      <SelectedCheckTag>
                        <FiCheck size={11} />
                        선택됨
                      </SelectedCheckTag>
                    ) : null}
                  </GuideCardTop>
                  <GuideCriteriaText>{guideItem.criteria}</GuideCriteriaText>
                  <GuideExampleLine>예: {guideItem.examples}</GuideExampleLine>
                </GuideOptionCard>
              )
            })}
          </GuideCardsGrid>

          <BoundaryTipBar>
            <span className="tip-badge">등록 위치 참고</span>
            <span>
              야전군·사령부·사단 등 <strong>군사 부대</strong>는 국가 상세
              「군사」 탭에, <strong>제N공화국·내각 자체</strong>는
              「행정부·내각」 탭에 등록합니다.
            </span>
          </BoundaryTipBar>
        </FullGuidePanel>
      ) : null}
    </KindFieldRoot>
  )
}

const KindFieldRoot = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
`

const ChipsAndMoreRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
`

const ChipsFlexWrap = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`

const MoreGuideIconBtn = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid
    ${({ $open, theme }) =>
      $open ? kitC(theme).focus : kitC(theme).border};
  background: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.2)'
        : 'rgba(99, 102, 241, 0.08)'
      : kitC(theme).content};
  color: ${({ $open, theme }) =>
    $open
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
  cursor: pointer;
  flex-shrink: 0;
  transition:
    border-color 0.14s ease,
    color 0.14s ease,
    background-color 0.14s ease;

  &:hover {
    border-color: ${({ theme }) => kitC(theme).focus};
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const QuietKindCaption = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textMuted};

  strong {
    font-weight: 600;
    color: ${({ theme }) => kitC(theme).textSecondary};
  }

  .sep {
    opacity: 0.55;
  }
`

const FullGuidePanel = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 2px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => kitC(theme).border};
  border-radius: 10px;
  background: ${({ theme }) => kitC(theme).content};
`

const GuidePanelHeader = styled.div`
  padding: 7px 12px;
  border-bottom: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const GuideCardsGrid = styled.div`
  display: flex;
  flex-direction: column;
`

const GuideOptionCard = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.05)'};
  background: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.06)'
      : 'transparent'};
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.13s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.18)'
          : 'rgba(99, 102, 241, 0.09)'
        : kitC(theme).section};
  }
`

const GuideCardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const GuideCardTitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;

  strong {
    font-size: 12.5px;
    font-weight: 700;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`

const GuideSmallIcon = styled.span<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $selected, theme }) =>
    $selected
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : kitC(theme).textSecondary};
`

const GuideBadge = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => kitC(theme).textMuted};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.05)'};
`

const SelectedCheckTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#c7d2fe' : '#4338ca'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.24)'
      : 'rgba(99, 102, 241, 0.12)'};
`

const GuideCriteriaText = styled.span`
  font-size: 12px;
  line-height: 1.44;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const GuideExampleLine = styled.span`
  font-size: 11px;
  line-height: 1.4;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const BoundaryTipBar = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid ${({ theme }) => kitC(theme).border};
  background: ${({ theme }) => kitC(theme).section};
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => kitC(theme).textSecondary};

  .tip-badge {
    padding: 1px 7px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    flex-shrink: 0;
    color: ${({ theme }) =>
      theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.18)'
        : 'rgba(59, 130, 246, 0.1)'};
  }

  strong {
    font-weight: 700;
    color: ${({ theme }) => kitC(theme).textPrimary};
  }
`
