import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  FiArrowLeft,
  FiBriefcase,
  FiExternalLink,
  FiSliders,
  FiTrash2,
} from 'react-icons/fi'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import type { UpdateCompanyInput } from '@/shared/api/company'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { getUploadImageUrl } from '@/shared/api/upload'
import { companyLifespanLabel } from '@/shared/lib/company-lifespan'
import { companyApi } from '@/shared/api/company'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { COMPANY_STATUS_META, CompanyRegisterModal } from '@/widgets/company-form'
import { SmartErrorBoundary } from '@/shared/ui/error-handler/smart-error-boundary'
import {
  InlineDateRange,
  InlineEditProvider,
  InlineRichText,
  InlineSelect,
  type InlineSelectOption,
  InlineText,
} from '@/shared/ui/inline-edit'

import { CompanyCategoriesModule } from './company-categories-module'
import * as S from './company-detail.styles'
import { CompanyAnalystModule } from './company-analyst-module'
import { CompanyFacilitiesModule } from './company-facilities-module'
import { CompanyHistorySection } from './company-history-section'
import { CompanyOutlookModule } from './company-outlook-module'
import { CompanyProductsModule } from './company-products-module'
import { CompanyStockModule } from './company-stock-module'
import { CompanySaveStatus } from './company-save-status'
import { CompanySummaryCard } from './company-summary-card'
import {
  CompanyFoundingSection,
  CompanyRecentHistory,
  CompanyRelatedEventsSection,
} from './company-overview-extras'
import {
  useCompanyDetail,
  useCompanyMutation,
  useCompanyRelatedEvents,
} from './use-company-detail'

const STATUS_OPTIONS: InlineSelectOption[] = [
  { value: 'ACTIVE', label: '활동 중' },
  { value: 'DISSOLVED', label: '해산' },
  { value: 'MERGED', label: '합병' },
  { value: 'SUSPENDED', label: '중단' },
  { value: 'OTHER', label: '기타' },
]

/** 8개 섹션을 주제 그룹(탭)으로 묶어 한 번에 한 그룹만 — 세로 스크롤 절감 + 전체폭 활용. */
const GROUPS = [
  { id: 'overview', label: '개요', hint: '회사 소개' },
  { id: 'business', label: '사업', hint: '연혁 · 제품' },
  { id: 'finance', label: '재무', hint: '주가 · 목표주가 · 전망' },
  { id: 'ops', label: '운영', hint: '시설 · 업종' },
] as const

type GroupId = (typeof GROUPS)[number]['id']

const CompanyDetailPage = () => {
  const { id } = useParams<{ id: string }>()

  if (!id) {
    return (
      <S.Page>
        <S.PageInner>
          <S.StateBox>
            <S.ErrorText>잘못된 접근입니다.</S.ErrorText>
            <S.BackLink to={pathKeys.companies.root()}>
              <FiArrowLeft /> 목록으로
            </S.BackLink>
          </S.StateBox>
        </S.PageInner>
      </S.Page>
    )
  }

  return (
    <SmartErrorBoundary key={id} FallbackComponent={CompanyDetailError}>
      <Suspense fallback={<CompanyDetailLoading />}>
        <CompanyDetailContent companyId={id} />
      </Suspense>
    </SmartErrorBoundary>
  )
}

function CompanyDetailContent({ companyId }: { companyId: string }) {
  const company = useCompanyDetail(companyId)
  useDocumentTitle(company.name)

  const navigate = useNavigate()
  const mutation = useCompanyMutation(companyId)
  /* 기본 정보 수정 — 옛 /companies/:id/edit 페이지 대신 모달 */
  const [editOpen, setEditOpen] = useState(false)
  const relatedEvents = useCompanyRelatedEvents(companyId)
  const foundingEvents = useMemo(
    () => (relatedEvents.data ?? []).filter((event) => event.role === 'FOUNDED'),
    [relatedEvents.data],
  )

  /* 삭제 — 목록에만 있던 동작을 상세에도. 인물 경력이 걸려 있으면 서버가 409로 막는다. */
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const handleDelete = async () => {
    if (deleting) return
    const ok = await confirm({
      title: '기업 삭제',
      message: `'${company.name}'을(를) 삭제합니다. 연혁·제품·주가·시설 기록도 함께 지워지며 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true,
    })
    if (!ok) return
    setDeleting(true)
    try {
      await companyApi.delete(companyId)
      queryClient.removeQueries({ queryKey: ['companies', 'detail', companyId] })
      void queryClient.invalidateQueries({ queryKey: ['companies'] })
      notify.success(`'${company.name}'을(를) 삭제했습니다.`)
      navigate(pathKeys.companies.root())
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '삭제에 실패했습니다.')
      setDeleting(false)
    }
  }
  const onPatch = useCallback(
    (patch: UpdateCompanyInput) => mutation.mutate(patch),
    [mutation],
  )

  /* 마지막 저장 성공 시각 — SaveStatus "방금 저장됨" 플래시 트리거. */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const lastHandledRef = useRef(0)
  useEffect(() => {
    if (mutation.isSuccess && mutation.submittedAt !== lastHandledRef.current) {
      lastHandledRef.current = mutation.submittedAt
      setLastSavedAt(Date.now())
    }
  }, [mutation.isSuccess, mutation.submittedAt])

  const onPersonClick = useCallback(
    (personId: string) => navigate(pathKeys.personsTimelineDetail(personId)),
    [navigate],
  )

  const [activeGroup, setActiveGroup] = useState<GroupId>('overview')
  /*
   * 탭 바는 sticky라 길게 내려 읽다가 탭을 바꾸면 새 패널의 *중간*이 보인다.
   * 탭이 붙어 있는 상태(앵커가 탭 위로 지나감)일 때만 앵커로 되감아 패널을 처음부터 보여 준다 —
   * 붙지 않았으면 히어로가 보이는 자리 그대로 둔다.
   */
  const tabsAnchorRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const isFirstGroupRef = useRef(true)
  useEffect(() => {
    if (isFirstGroupRef.current) {
      isFirstGroupRef.current = false
      return
    }
    const anchor = tabsAnchorRef.current
    const tabs = tabsRef.current
    if (!anchor || !tabs) return
    if (anchor.getBoundingClientRect().top < tabs.getBoundingClientRect().top - 1) {
      anchor.scrollIntoView({ block: 'start' })
    }
  }, [activeGroup])

  const country = company.country ?? company.historicalCountry ?? null
  const websiteUrl = company.websiteUrl ?? ''
  const logoSrc = getUploadImageUrl(company.logoUrl)
  const lifespan = companyLifespanLabel(company)
  const statusTone = company.status
    ? COMPANY_STATUS_META[company.status].tone
    : null
  /* 탭 옆 건수 — 어느 탭에 기록이 있는지 열어 보기 전에 알 수 있게 */
  const groupCounts: Record<GroupId, number> = {
    overview: 0,
    business: (company.histories?.length ?? 0) + (company.products?.length ?? 0),
    finance:
      (company.stockPoints?.length ?? 0) +
      (company.analystRatings?.length ?? 0) +
      (company.outlooks?.length ?? 0),
    ops: (company.facilities?.length ?? 0) + (company.categories?.length ?? 0),
  }

  const overviewSection = useMemo(
    () => (
      <S.Section id="company-overview">
        <S.SectionHeader>
          <S.SectionTitle>개요</S.SectionTitle>
        </S.SectionHeader>
        <S.SectionBody>
          <InlineRichText
            value={company.description ?? ''}
            onSave={(next) => onPatch({ description: next })}
            placeholder="회사의 성격·사업·역사적 의의를 자유롭게 적어보세요. 인물·사건을 인라인으로 링크할 수 있습니다."
            onPersonClick={onPersonClick}
            label="개요"
          />
        </S.SectionBody>
      </S.Section>
    ),
    [company.description, onPatch, onPersonClick],
  )

  return (
    <InlineEditProvider imageCategory="attachments">
      <S.Page>
        <S.PageInner>
          <CompanySaveStatus
            isPending={mutation.isPending}
            lastSavedAt={lastSavedAt}
            isError={mutation.isError}
            errorMessage={
              mutation.error instanceof Error ? mutation.error.message : null
            }
          />

          <S.Breadcrumb aria-label="위치">
            <S.BackLink to={pathKeys.companies.root()}>
              <FiArrowLeft /> 기업
            </S.BackLink>
          </S.Breadcrumb>

          <S.Hero>
            <S.HeroIdentity>
              <S.Logo $hasLogo={!!logoSrc}>
                {logoSrc ? (
                  <img src={logoSrc} alt="" />
                ) : (
                  company.name.trim().charAt(0).toUpperCase() || (
                    <FiBriefcase aria-hidden />
                  )
                )}
              </S.Logo>
              <S.HeroNameRow>
                <S.HeroTitleLine>
                  <S.HeroName>
                    <InlineText
                      value={company.name}
                      onSave={(next) => onPatch({ name: next })}
                      placeholder="회사명"
                      label="회사명"
                      validate={(val) => (val.trim() ? null : '회사명은 필수입니다')}
                    />
                  </S.HeroName>
                  <S.StatusPill $tone={statusTone}>
                    <InlineSelect
                      value={company.status ?? ''}
                      options={STATUS_OPTIONS}
                      onSave={(next) =>
                        onPatch({
                          status: (next || null) as UpdateCompanyInput['status'],
                        })
                      }
                      placeholder="상태"
                      label="상태"
                    />
                  </S.StatusPill>
                </S.HeroTitleLine>
                <S.HeroSubName>
                  <InlineText
                    value={company.shortName ?? ''}
                    onSave={(next) => onPatch({ shortName: next })}
                    placeholder="약칭·티커"
                    label="약칭"
                  />
                  <InlineText
                    value={company.localName ?? ''}
                    onSave={(next) => onPatch({ localName: next })}
                    placeholder="원어명"
                    label="원어명"
                  />
                </S.HeroSubName>
              </S.HeroNameRow>
              <S.HeroActions>
                <S.EditBasicsBtn type="button" onClick={() => setEditOpen(true)}>
                  <FiSliders aria-hidden /> 기본 정보 수정
                </S.EditBasicsBtn>
                <S.DeleteBtn
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  aria-label={`${company.name} 삭제`}
                  title="기업 삭제"
                >
                  <FiTrash2 aria-hidden />
                </S.DeleteBtn>
              </S.HeroActions>
            </S.HeroIdentity>

            {/* 사실 띠 — 흩어져 있던 메타 3줄을 라벨·값 칸으로 한 줄에.
                관계 FK(국가·본사·창립자)는 인라인 편집이 없어 '기본 정보 수정' 모달에서 고친다. */}
            <S.FactStripFrame>
            <S.FactStrip>
              <S.Fact>
                <dt>설립 · 해산</dt>
                <dd>
                  <InlineDateRange
                    startDate={company.foundedAt}
                    endDate={company.dissolvedAt}
                    onSave={(patch) => {
                      const next: UpdateCompanyInput = {}
                      if ('startDate' in patch)
                        next.foundedAt = patch.startDate || null
                      if ('endDate' in patch)
                        next.dissolvedAt = patch.endDate || null
                      onPatch(next)
                    }}
                    emptyLabel="설립일 미입력"
                    startPlaceholder="설립일"
                    endPlaceholder="해산일 (선택)"
                    label="설립·해산일"
                    blockBc
                  />
                </dd>
              </S.Fact>
              <S.Fact>
                <dt>존속</dt>
                <dd>{lifespan ?? <S.FactEmpty>—</S.FactEmpty>}</dd>
              </S.Fact>
              <S.Fact>
                <dt>국가</dt>
                <dd>
                  {country ? (
                    <>
                      {country.name}
                      {!company.country && <S.FactNote>역사 국가</S.FactNote>}
                    </>
                  ) : (
                    <S.FactEmpty>—</S.FactEmpty>
                  )}
                </dd>
              </S.Fact>
              <S.Fact>
                <dt>본사</dt>
                <dd>
                  {company.headquartersCity?.name ?? <S.FactEmpty>—</S.FactEmpty>}
                </dd>
              </S.Fact>
              <S.Fact>
                <dt>창립자</dt>
                <dd>
                  {company.founder ? (
                    <S.FactLink
                      type="button"
                      onClick={() => onPersonClick(company.founder!.id)}
                    >
                      {company.founder.name}
                    </S.FactLink>
                  ) : (
                    <S.FactEmpty>—</S.FactEmpty>
                  )}
                </dd>
              </S.Fact>
              <S.Fact>
                <dt>웹사이트</dt>
                <dd>
                  <InlineText
                    value={websiteUrl}
                    onSave={(next) => onPatch({ websiteUrl: next })}
                    placeholder="미입력"
                    label="웹사이트"
                    validate={(value) =>
                      !value.trim() || /^https?:\/\//i.test(value.trim())
                        ? null
                        : 'http:// 또는 https:// 로 시작하는 주소만 가능합니다'
                    }
                  />
                  {websiteUrl && (
                    <S.ExternalLink
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="웹사이트 새 창으로 열기"
                      title="새 창으로 열기"
                    >
                      <FiExternalLink />
                    </S.ExternalLink>
                  )}
                </dd>
              </S.Fact>
            </S.FactStrip>
            </S.FactStripFrame>
          </S.Hero>

          <div ref={tabsAnchorRef} />
          <S.TabBar ref={tabsRef} role="tablist" aria-label="기업 정보 보기">
            {GROUPS.map((group) => {
              const count = groupCounts[group.id]
              return (
                <S.Tab
                  key={group.id}
                  type="button"
                  role="tab"
                  id={`company-tab-${group.id}`}
                  aria-controls={`company-panel-${group.id}`}
                  $active={activeGroup === group.id}
                  aria-selected={activeGroup === group.id}
                  title={group.hint}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {group.label}
                  {count > 0 && <S.TabCount>{count}</S.TabCount>}
                </S.Tab>
              )
            })}
          </S.TabBar>

          <S.Body>
            <S.Main>
              <S.GroupPanel
                $active={activeGroup === 'overview'}
                role="tabpanel"
                id="company-panel-overview"
                aria-labelledby="company-tab-overview"
              >
                <S.GroupGrid $aside>
                  <S.GridCell>
                    <S.OverviewStack>
                      {overviewSection}
                      <CompanyFoundingSection
                        value={company.foundingBackground ?? null}
                        onSave={(next) => onPatch({ foundingBackground: next })}
                        onPersonClick={onPersonClick}
                        foundingEvents={foundingEvents}
                      />
                      <CompanyRelatedEventsSection
                        events={relatedEvents.data}
                        isLoading={relatedEvents.isLoading}
                        isError={relatedEvents.isError}
                        onRetry={() => void relatedEvents.refetch()}
                      />
                      <CompanyRecentHistory
                        histories={company.histories ?? []}
                        onShowAll={() => setActiveGroup('business')}
                      />
                    </S.OverviewStack>
                  </S.GridCell>
                  <S.GridCell $sticky>
                    <CompanySummaryCard company={company} />
                  </S.GridCell>
                </S.GroupGrid>
              </S.GroupPanel>

              <S.GroupPanel
                $active={activeGroup === 'business'}
                role="tabpanel"
                id="company-panel-business"
                aria-labelledby="company-tab-business"
              >
                <S.GroupGrid $reading>
                  <S.GridCell $card>
                    <CompanyHistorySection
                      histories={company.histories ?? []}
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                  <S.GridCell $card>
                    <CompanyProductsModule
                      products={company.products ?? []}
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                </S.GroupGrid>
              </S.GroupPanel>

              <S.GroupPanel
                $active={activeGroup === 'finance'}
                role="tabpanel"
                id="company-panel-finance"
                aria-labelledby="company-tab-finance"
              >
                <S.GroupGrid>
                  <S.GridCell $wide $card>
                    <CompanyStockModule
                      stockPoints={company.stockPoints ?? []}
                      financialCommentary={company.financialCommentary ?? null}
                      forecastBand={(() => {
                        const bandOf = (entry: (typeof company.outlooks)[number]) => {
                          // 범위는 시나리오(비관/낙관) 우선, 없으면 예상 하단/상단.
                          const bear = entry.scenarios?.find(
                            (scn) => scn.kind === 'BEAR',
                          )?.targetPrice
                          const bull = entry.scenarios?.find(
                            (scn) => scn.kind === 'BULL',
                          )?.targetPrice
                          const low = bear ?? entry.expectedLow
                          const high = bull ?? entry.expectedHigh
                          return low != null && high != null
                            ? {
                                low,
                                high,
                                target: entry.targetPrice,
                                stance: entry.stance,
                              }
                            : null
                        }
                        for (const entry of company.outlooks ?? []) {
                          const band = bandOf(entry)
                          if (band) return band
                        }
                        return null
                      })()}
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                  <S.GridCell $card>
                    <CompanyAnalystModule
                      analystRatings={company.analystRatings ?? []}
                      currentPrice={
                        [...(company.stockPoints ?? [])]
                          .reverse()
                          .find((point) => point.price != null)?.price ?? null
                      }
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                  <S.GridCell $card>
                    <CompanyOutlookModule
                      outlooks={company.outlooks ?? []}
                      currentPrice={
                        [...(company.stockPoints ?? [])]
                          .reverse()
                          .find((point) => point.price != null)?.price ?? null
                      }
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                </S.GroupGrid>
              </S.GroupPanel>

              <S.GroupPanel
                $active={activeGroup === 'ops'}
                role="tabpanel"
                id="company-panel-ops"
                aria-labelledby="company-tab-ops"
              >
                <S.GroupGrid>
                  <S.GridCell $wide $card>
                    <CompanyCategoriesModule
                      categories={company.categories ?? []}
                      onPatch={onPatch}
                    />
                  </S.GridCell>
                  <S.GridCell $wide $card>
                    <CompanyFacilitiesModule
                      facilities={company.facilities ?? []}
                      onPatch={onPatch}
                      onPersonClick={onPersonClick}
                    />
                  </S.GridCell>
                </S.GroupGrid>
              </S.GroupPanel>
            </S.Main>
          </S.Body>
        </S.PageInner>
      </S.Page>
      <CompanyRegisterModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        companyId={companyId}
      />
    </InlineEditProvider>
  )
}

function CompanyDetailLoading() {
  return (
    <S.Page>
      <S.PageInner>
        <S.StateBox>
          <S.Spinner />
          <S.HelperText>기업 정보를 불러오는 중…</S.HelperText>
        </S.StateBox>
      </S.PageInner>
    </S.Page>
  )
}

function CompanyDetailError({ error }: { error: Error }) {
  const notFound = (error as { status?: number }).status === 404
  return (
    <S.Page>
      <S.PageInner>
        <S.StateBox>
          <S.ErrorText>
            {notFound ? '기업을 찾을 수 없습니다' : '기업을 불러오지 못했습니다.'}
          </S.ErrorText>
          {error.message && <S.HelperText>{error.message}</S.HelperText>}
          <S.BackLink to={pathKeys.companies.root()}>
            <FiArrowLeft /> 목록으로
          </S.BackLink>
        </S.StateBox>
      </S.PageInner>
    </S.Page>
  )
}

export { CompanyDetailPage }
export default CompanyDetailPage
