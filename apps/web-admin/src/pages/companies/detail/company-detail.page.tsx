import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  FiArrowLeft,
  FiBriefcase,
  FiExternalLink,
  FiGlobe,
  FiMapPin,
  FiSliders,
  FiUser,
} from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'

import type { UpdateCompanyInput } from '@/shared/api/company'
import { useDocumentTitle } from '@/shared/hooks/use-document-title.hook'
import { pathKeys } from '@/shared/router'
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
import { useCompanyDetail, useCompanyMutation } from './use-company-detail'

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
    (personId: string) => navigate(pathKeys.persons.detail(personId)),
    [navigate],
  )

  /* Rail 현재 섹션 — viewport 상단에 가장 가까운 섹션을 active로. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeGroup, setActiveGroup] = useState<GroupId>('overview')
  // 그룹 전환 시 본문 상단부터 보이도록 스크롤 컨테이너를 위로.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeGroup])

  const country = company.country ?? company.historicalCountry ?? null
  const websiteUrl = company.websiteUrl ?? ''

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
      <S.Page ref={scrollRef}>
        <S.PageInner>
          <CompanySaveStatus
            isPending={mutation.isPending}
            lastSavedAt={lastSavedAt}
            isError={mutation.isError}
            errorMessage={
              mutation.error instanceof Error ? mutation.error.message : null
            }
          />

          <S.TopBar>
            <S.BackLink to={pathKeys.companies.root()}>
              <FiArrowLeft /> 목록으로
            </S.BackLink>
          </S.TopBar>

          <S.Hero>
            <S.HeroIdentity>
              <S.Logo>
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" />
                ) : (
                  <FiBriefcase aria-hidden />
                )}
              </S.Logo>
              <S.HeroNameRow>
                <S.HeroName>
                  <InlineText
                    value={company.name}
                    onSave={(next) => onPatch({ name: next })}
                    placeholder="회사명"
                    label="회사명"
                    validate={(val) => (val.trim() ? null : '회사명은 필수입니다')}
                  />
                </S.HeroName>
                <S.HeroSubName>
                  <span>
                    <S.HeroMetaLabel>약칭</S.HeroMetaLabel>
                    <InlineText
                      value={company.shortName ?? ''}
                      onSave={(next) => onPatch({ shortName: next })}
                      placeholder="약칭·티커"
                      label="약칭"
                    />
                  </span>
                  <span>
                    <S.HeroMetaLabel>원어명</S.HeroMetaLabel>
                    <InlineText
                      value={company.localName ?? ''}
                      onSave={(next) => onPatch({ localName: next })}
                      placeholder="현지어 명칭"
                      label="원어명"
                    />
                  </span>
                </S.HeroSubName>
              </S.HeroNameRow>
            </S.HeroIdentity>

            <S.HeroMeta>
              <S.HeroMetaItem>
                <S.HeroMetaLabel>상태</S.HeroMetaLabel>
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
              </S.HeroMetaItem>

              <S.HeroMetaItem>
                <S.HeroMetaLabel>설립·해산</S.HeroMetaLabel>
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
              </S.HeroMetaItem>

              <S.HeroMetaItem>
                <FiGlobe />
                <InlineText
                  value={websiteUrl}
                  onSave={(next) => onPatch({ websiteUrl: next })}
                  placeholder="웹사이트 미입력"
                  label="웹사이트"
                  validate={(value) =>
                    !value.trim() || /^https?:\/\//i.test(value.trim())
                      ? null
                      : 'http:// 또는 https:// 로 시작하는 주소만 가능합니다'
                  }
                />
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noreferrer">
                    <FiExternalLink size={13} />
                  </a>
                )}
              </S.HeroMetaItem>
            </S.HeroMeta>

            {/* 관계 FK(국가·창립자·본사)는 v1에서 읽기 전용 — 편집은 기본 정보 폼. */}
            <S.HeroMeta>
              {country && (
                <S.HeroMetaItem>
                  <FiMapPin />
                  {country.name}
                </S.HeroMetaItem>
              )}
              {company.founder && (
                <S.HeroMetaItem>
                  <FiUser />
                  {company.founder.name}
                </S.HeroMetaItem>
              )}
              {company.headquartersCity && (
                <S.HeroMetaItem>
                  <FiMapPin />
                  {company.headquartersCity.name}
                </S.HeroMetaItem>
              )}
              <S.HeroMetaItem>
                <a
                  href={`/companies/${companyId}/edit`}
                  onClick={(e) => {
                    e.preventDefault()
                    navigate(`/companies/${companyId}/edit`)
                  }}
                >
                  <FiSliders size={12} /> 기본 정보 수정
                </a>
              </S.HeroMetaItem>
            </S.HeroMeta>
          </S.Hero>

          <S.Body>
            <S.Rail>
              <S.RailLabel id="company-rail-label">보기</S.RailLabel>
              <S.RailNav aria-labelledby="company-rail-label" role="tablist">
                {GROUPS.map((group) => (
                  <li key={group.id}>
                    <S.RailItem
                      type="button"
                      role="tab"
                      $active={activeGroup === group.id}
                      aria-selected={activeGroup === group.id}
                      onClick={() => setActiveGroup(group.id)}
                    >
                      <S.RailItemLabel>{group.label}</S.RailItemLabel>
                      <S.RailItemHint>{group.hint}</S.RailItemHint>
                    </S.RailItem>
                  </li>
                ))}
              </S.RailNav>
            </S.Rail>

            <S.Main>
              <S.GroupPanel $active={activeGroup === 'overview'} role="tabpanel">
                <S.GroupGrid $aside>
                  <S.GridCell>{overviewSection}</S.GridCell>
                  <S.GridCell>
                    <CompanySummaryCard company={company} />
                  </S.GridCell>
                </S.GroupGrid>
              </S.GroupPanel>

              <S.GroupPanel $active={activeGroup === 'business'} role="tabpanel">
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

              <S.GroupPanel $active={activeGroup === 'finance'} role="tabpanel">
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

              <S.GroupPanel $active={activeGroup === 'ops'} role="tabpanel">
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
