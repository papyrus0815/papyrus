import { useEffect, useId, useRef, useState } from 'react'

import styled from 'styled-components'

export interface SectionHelpInfo {
  title: string
  /** 이 섹션이 보여주는 핵심 정보 */
  summary: string
  /** 데이터가 표시되기 위한 연동 조건 및 입력 경로 */
  condition: string
  /** 작성·활용 팁 */
  tip?: string
}

export type DashboardSectionHelpKey =
  | 'lineage'
  | 'politicalSystem'
  | 'cabinet'
  | 'records'
  | 'calendar'
  | 'activity'
  | 'companies'
  | 'pyramid'
  | 'trends'
  | 'bonds'
  | 'trade'
  | 'indicatorsHub'
  | 'overview'
  | 'founding'
  | 'rulers'

export const DASHBOARD_SECTION_HELP: Record<
  DashboardSectionHelpKey,
  SectionHelpInfo
> = {
  lineage: {
    title: '계보 (역사적 시간축)',
    summary:
      '이 국가로 이어진 전신·후신 역사 국가들의 시간 흐름과 변천 맥락을 세기 축 위에 시각화합니다.',
    condition:
      '「과거국가」 또는 「계승」 탭에서 역사 국가를 연결하고, 국가 간 전신·후신(계승/분열/통합) 관계를 등록하면 자동으로 흐름도가 그려집니다.',
    tip: '노드를 클릭하면 해당 역사 국가의 상세 대시보드로 바로 이동합니다.',
  },
  politicalSystem: {
    title: '정체 (헌법·통치 체제)',
    summary:
      '대통령제·의원내각제·입헌군주제 등 정부 형태와 의회 구조(단원제/양원제), 국가원수·정부수반 직함을 요약합니다.',
    condition:
      '우측 「+ 정체 등록」 또는 「행정조직 > 정체」 탭에서 헌법 체제와 시행 기간을 입력하면 현행 체제와 과거 체제 변천사가 함께 표시됩니다.',
    tip: '정체를 먼저 등록해 두면 국가원수·정부수반의 공식 직함과 실권 여부가 명확해집니다.',
  },
  cabinet: {
    title: '행정부 (정권 · 수반 · 각료)',
    summary:
      '역대 정권(내각) 카드를 시간순으로 탐색하고, 선택한 정권의 국가원수·정부수반 및 부처별 각료 명단을 한눈에 보여줍니다.',
    condition:
      '① 「행정조직 > 부처 편제」에서 중앙부처를 등록하고, ② 「인물」 또는 「행정조직 > 수반·내각」에서 인물의 재임(Tenure) 이력을 연결하면 카드가 채워집니다.',
    tip: '상단 정권 슬라이더에서 과거 내각 카드를 클릭하면 당시 각료 진용과 정당 구성을 비교할 수 있습니다.',
  },
  records: {
    title: '기록 현황 · 완성도',
    summary:
      '국가에 축적된 모든 아카이브(인물·사건·행정조직·선거·조약·법령 등)의 건수 비교 막대와 전체 기록 완성도를 통합 표시합니다.',
    condition:
      '각 도메인 탭에 데이터가 1건 이상 등록되면 막대 그래프가 활성화되며, 아직 0건인 도메인은 하단 「미등록 기록 바로가기」 칩으로 표시됩니다.',
    tip: '막대 행이나 미등록 칩을 클릭하면 해당 도메인 탭으로 즉시 이동합니다.',
  },
  calendar: {
    title: '사건 캘린더',
    summary:
      '연·월·일이 기록된 역사적 사건들을 월별 달력과 연도 타임라인 위에서 탐색합니다.',
    condition:
      '「사건」 탭에서 시작일(연·월·일 또는 연도)이 포함된 사건을 1건 이상 등록하면 자동으로 노출됩니다.',
    tip: '날짜 칸의 사건을 클릭하면 현재 화면을 벗어나지 않고 미니 프리뷰 모달로 내용을 확인할 수 있습니다.',
  },
  activity: {
    title: '최근 활동',
    summary:
      '이 국가에 최근 새로 등록되거나 갱신된 인물·사건 내역을 시간순으로 추적합니다.',
    condition:
      '인물이나 사건 데이터가 등록되면 최근 생성 순(인물·사건 균등 배분)으로 최대 10건이 자동 집계됩니다.',
  },
  companies: {
    title: '주요 기업',
    summary:
      '이 국가에 본사를 둔 주요 기업·상단의 설립 연도, 산업 분야, 티커 및 시가총액 요약을 보여줍니다.',
    condition:
      '「+ 기업 등록」 버튼 또는 「기업」 탭에서 소속 국가가 이 나라로 지정된 기업을 추가하면 표시됩니다.',
  },
  pyramid: {
    title: '인구 피라미드',
    summary:
      '연도별 연령대(5세 단위) × 성별 인구 구조를 좌우 대칭 막대와 기준 연도 윤곽선으로 비교합니다.',
    condition:
      '「인구 피라미드 등록」 또는 「경제·통계」 탭에서 연령대별 남녀 인구가 포함된 인구 지표를 입력하면 활성화됩니다.',
    tip: '2개 이상의 연도를 등록하면 가장 이른 연도의 윤곽선이 겹쳐져 고령화·저출산 추이를 직관적으로 비교할 수 있습니다.',
  },
  trends: {
    title: '지표 추이 (경제·인구·발전)',
    summary:
      'GDP, 경제성장률, 물가, 실업률, 합계출산율, 기대수명, HDI 등 23종 핵심 지표의 시계열 추이를 보여줍니다.',
    condition:
      '「연도별 지표 등록」 모달에서 경제·인구·발전 지표를 입력하면 항목별 추이 차트가 자동 생성됩니다.',
    tip: '동일 지표를 2개 연도 이상 입력하면 전년 대비 증감과 꺾은선 추이가 함께 계산됩니다.',
  },
  bonds: {
    title: '국채 금리 · 수익률 곡선',
    summary:
      '만기별(3개월~30년) 국채 수익률 곡선(Yield Curve)과 대표 만기(10년물) 금리 추이, 장단기 금리차(스프레드)를 시각화합니다.',
    condition:
      '「국채 금리 등록」 모달에서 연도 및 만기별 수익률(%)을 입력하면 곡선과 추이 차트가 생성됩니다.',
    tip: '한 연도에 단기(2년물)와 장기(10년물) 금리를 함께 입력하면 장단기 금리 역전 여부를 바로 확인할 수 있습니다.',
  },
  trade: {
    title: '교역 (수출입 · 품목 · 상대국)',
    summary:
      '연도별 수출·수입 총액과 무역수지, 주요 교역 품목 구성비(트리맵), 주요 교역 상대국을 입체적으로 보여줍니다.',
    condition:
      '「교역 자료 등록」 또는 「교역」 탭에서 연도별 수출입 총액이나 품목·상대국 명세를 등록하면 표시됩니다.',
  },
  indicatorsHub: {
    title: '경제 · 인구 · 교역 · 기업 지표',
    summary:
      '국가의 거시경제, 인구 구조, 국채 수익률, 무역 수지, 주요 기업을 시각화하는 5대 지표 영역입니다.',
    condition:
      '아래 빠른 등록 버튼으로 어느 한 분야라도 데이터를 입력하면 해당 차트 섹션이 즉시 활성화됩니다.',
    tip: '우측 「빈 섹션 개별 펼치기」를 누르면 5개 지표 섹션의 개별 안내 카드를 모두 펼쳐 볼 수 있습니다.',
  },
  overview: {
    title: '국가 개요 · 국호 유래',
    summary:
      '역사 국가의 핵심 성격, 시대적 위상, 국호 유래 및 전체 역사 서술을 정리하는 도입부입니다.',
    condition:
      '우측 「+ 작성」 또는 「수정」 버튼을 눌러 리치 텍스트 편집기로 서술을 저장할 수 있습니다.',
  },
  founding: {
    title: '건국·멸망 / 성립·종료',
    summary:
      '국가가 언제·어떻게 성립(건국)했고 어떤 계기로 종료(멸망/해체)되었는지 양 끝의 사건·인물·배경을 대조합니다.',
    condition:
      '각 카드의 「+ 배경 메모」 및 사건·인물 연결 버튼을 통해 건국자/마지막 수반과 핵심 사건을 지정할 수 있습니다.',
  },
  rulers: {
    title: '역대 수반 재위 연표',
    summary:
      '존속 기간 전체 시간축 위에 역대 군주·국가원수·정부수반의 재위 기간을 띠 그래프와 카드로 배열합니다.',
    condition:
      '「역대 수반」 탭에서 수반 재임(Tenure) 기록과 시작·종료 연도를 등록하면 시간축에 배치됩니다.',
    tip: '존속 기간을 벗어난 연도의 재임 기록이 있으면 상단에 「기간 밖 N건」 진단 배지가 표시됩니다.',
  },
}

interface SectionHelpPopoverProps {
  sectionKey?: DashboardSectionHelpKey
  info?: SectionHelpInfo
}

export function SectionHelpPopover({
  sectionKey,
  info,
}: SectionHelpPopoverProps) {
  const resolved = info ?? (sectionKey ? DASHBOARD_SECTION_HELP[sectionKey] : null)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement | null>(null)
  const popoverId = useId()

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!resolved) return null

  return (
    <Wrap ref={wrapRef}>
      <Trigger
        type="button"
        aria-label={`${resolved.title} 도움말`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        $open={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((previous) => !previous)
        }}
      >
        ?
      </Trigger>
      {open && (
        <Popover id={popoverId} role="dialog" aria-label={`${resolved.title} 안내`}>
          <PopoverHeader>
            <PopoverTitle>{resolved.title}</PopoverTitle>
            <CloseBtn
              type="button"
              aria-label="도움말 닫기"
              onClick={() => setOpen(false)}
            >
              ×
            </CloseBtn>
          </PopoverHeader>
          <PopoverSummary>{resolved.summary}</PopoverSummary>
          <MetaBlock>
            <MetaLabel>연동 및 표시 조건</MetaLabel>
            <MetaText>{resolved.condition}</MetaText>
          </MetaBlock>
          {resolved.tip && (
            <TipBlock>
              <TipBadge>TIP</TipBadge>
              <TipText>{resolved.tip}</TipText>
            </TipBlock>
          )}
        </Popover>
      )}
    </Wrap>
  )
}

const Wrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid
    ${({ theme, $open }) =>
      $open
        ? '#6366f1'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.16)'
          : 'rgba(15,23,42,0.16)'};
  background: ${({ theme, $open }) =>
    $open
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.24)'
        : 'rgba(99,102,241,0.12)'
      : 'transparent'};
  color: ${({ theme, $open }) =>
    $open
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4f46e5'
      : theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: #6366f1;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : 'rgba(99,102,241,0.08)'};
  }
`

const Popover = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  width: 320px;
  max-width: min(320px, calc(100vw - 40px));
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1e2028' : '#ffffff'};
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  font-weight: 400;
  white-space: normal;
`

const PopoverHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PopoverTitle = styled.strong`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 16px;
  line-height: 1;
  padding: 2px 4px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PopoverSummary = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'};
`

const MetaLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.primary};
`

const TipBlock = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const TipBadge = styled.span`
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: rgba(99, 102, 241, 0.14);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
`

const TipText = styled.span`
  word-break: keep-all;
`
