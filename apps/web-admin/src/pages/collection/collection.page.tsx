/**
 * 유물관 — 역사 유물 수집(싸이월드 미니룸 analog).
 * 파피로 유물을 수집하고 프로필 진열장에 전시. 차별점: 유물이 실제 백과 엔티티에 링크(클릭→탐험).
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  type Artifact,
  type UserArtifact,
  artifactsQueryOptions,
  invalidateArtifacts,
  linkedEntityPath,
  linkedTypeLabel,
  myCollectionQueryOptions,
  newRequestId,
  purchaseArtifact,
  rarityMeta,
  setArtifactDisplay,
} from '@/entities/artifact'
import { walletMeQueryOptions } from '@/entities/wallet'
import { glassCardMixin } from '@/shared/styles/mixins'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

const SET_LABEL: Record<string, string> = {
  JOSEON_ROYAL: '조선 왕실 유물',
}

const RARITY_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'LEGENDARY', label: '국보급' },
  { key: 'RARE', label: '보물' },
  { key: 'COMMON', label: '일반' },
]

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown }
    if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
  }
  return fallback
}

export default function CollectionPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [rarityFilter, setRarityFilter] = useState('all')

  const { data: artifacts } = useQuery(artifactsQueryOptions())
  const { data: collection } = useQuery(myCollectionQueryOptions)
  const { data: wallet } = useQuery(walletMeQueryOptions)
  const balance = wallet?.balance ?? 0

  const afterChange = () => invalidateArtifacts(queryClient)

  const purchaseMutation = useMutation({
    mutationFn: (artifactId: string) => purchaseArtifact(artifactId, newRequestId()),
    onSuccess: () => {
      afterChange()
      notify.success('유물을 수집했습니다! 진열장에서 확인하세요.')
    },
    onError: (error) => notify.error(errorMessage(error, '수집에 실패했습니다.')),
  })

  const displayMutation = useMutation({
    mutationFn: (variables: { userArtifactId: string; displayed: boolean }) =>
      setArtifactDisplay(variables.userArtifactId, variables.displayed),
    onSuccess: () => afterChange(),
    onError: (error) => notify.error(errorMessage(error, '진열 변경에 실패했습니다.')),
  })

  const busy = purchaseMutation.isPending || displayMutation.isPending

  const sets = useMemo(() => {
    const bySet = new Map<string, { total: number; owned: number }>()
    for (const artifact of artifacts ?? []) {
      if (!artifact.setKey) continue
      const entry = bySet.get(artifact.setKey) ?? { total: 0, owned: 0 }
      entry.total += 1
      if (artifact.owned) entry.owned += 1
      bySet.set(artifact.setKey, entry)
    }
    return [...bySet.entries()].map(([setKey, value]) => ({ setKey, ...value }))
  }, [artifacts])

  const visible = (artifacts ?? []).filter(
    (artifact) => rarityFilter === 'all' || artifact.rarity === rarityFilter,
  )
  const ownedCount = (artifacts ?? []).filter((artifact) => artifact.owned).length

  const openLink = (artifact: Artifact | UserArtifact) => {
    const path = linkedEntityPath(artifact.linkedType, artifact.linkedId)
    if (path) navigate(path)
  }

  const handleCollect = async (artifact: Artifact) => {
    if (artifact.owned) return
    if (balance < artifact.pricePapy) {
      notify.error(`파피가 ${(artifact.pricePapy - balance).toLocaleString()} 부족해요. 상점에서 환전해보세요.`)
      navigate(pathKeys.shop())
      return
    }
    const ok = await confirm({
      title: '유물 수집',
      message: `'${artifact.name}'을(를) ${artifact.pricePapy.toLocaleString()} 파피로 수집할까요?`,
    })
    if (!ok) return
    purchaseMutation.mutate(artifact.id)
  }

  return (
    <Page>
      <Header>
        <div>
          <Title>유물관</Title>
          <Subtitle>역사 유물을 모아 진열장을 채워보세요. 유물을 누르면 그 역사로 이어집니다.</Subtitle>
        </div>
        <BalanceCard>
          <BalanceLabel>내 파피</BalanceLabel>
          <BalanceValue>{balance.toLocaleString()}</BalanceValue>
        </BalanceCard>
      </Header>

      {sets.length > 0 && (
        <SetRow>
          {sets.map((set) => {
            const complete = set.owned >= set.total
            return (
              <SetCard key={set.setKey} $complete={complete}>
                <SetHead>
                  <SetName>{SET_LABEL[set.setKey] ?? set.setKey}</SetName>
                  <SetCount>
                    {set.owned}/{set.total}
                    {complete && ' ✓'}
                  </SetCount>
                </SetHead>
                <SetTrack>
                  <SetFill style={{ width: `${Math.round((set.owned / set.total) * 100)}%` }} />
                </SetTrack>
              </SetCard>
            )
          })}
        </SetRow>
      )}

      <FilterRow>
        {RARITY_FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            type="button"
            $active={rarityFilter === filter.key}
            onClick={() => setRarityFilter(filter.key)}
          >
            {filter.label}
          </FilterChip>
        ))}
      </FilterRow>

      {visible.length > 0 ? (
        <Grid>
          {visible.map((artifact) => {
            const rarity = rarityMeta(artifact.rarity)
            const linkLabel = linkedTypeLabel(artifact.linkedType)
            const linkable = !!linkedEntityPath(artifact.linkedType, artifact.linkedId)
            const affordable = balance >= artifact.pricePapy
            return (
              <Card key={artifact.id} $owned={artifact.owned} style={{ borderColor: artifact.owned ? rarity.color : undefined }}>
                <RarityRibbon style={{ color: rarity.color, borderColor: rarity.color }}>
                  {rarity.label}
                </RarityRibbon>
                <Thumb style={{ background: `${rarity.color}1a` }}>
                  {artifact.imageUrl ? <img src={artifact.imageUrl} alt="" /> : <ThumbIcon>🏺</ThumbIcon>}
                </Thumb>
                <Body>
                  <Name>{artifact.name}</Name>
                  {artifact.era && <Era>{artifact.era}</Era>}
                  {linkLabel && (
                    <LinkChip
                      $clickable={linkable}
                      onClick={() => linkable && openLink(artifact)}
                      title={linkable ? '백과로 이동' : undefined}
                    >
                      🔗 {linkLabel}
                    </LinkChip>
                  )}
                  <Footer>
                    <Price>{artifact.pricePapy.toLocaleString()} 파피</Price>
                    {artifact.owned ? (
                      <OwnedTag>수집 완료</OwnedTag>
                    ) : affordable ? (
                      <CollectButton type="button" disabled={busy} onClick={() => handleCollect(artifact)}>
                        수집
                      </CollectButton>
                    ) : (
                      <ShortFall type="button" onClick={() => navigate(pathKeys.shop())}>
                        {(artifact.pricePapy - balance).toLocaleString()} 부족
                      </ShortFall>
                    )}
                  </Footer>
                </Body>
              </Card>
            )
          })}
        </Grid>
      ) : (
        <EmptyState>해당 조건의 유물이 없습니다.</EmptyState>
      )}

      <SectionTitle>내 진열장 ({ownedCount})</SectionTitle>
      {collection && collection.length > 0 ? (
        <DisplayGrid>
          {collection.map((item) => {
            const rarity = rarityMeta(item.rarity)
            const linkLabel = linkedTypeLabel(item.linkedType)
            const linkable = !!linkedEntityPath(item.linkedType, item.linkedId)
            return (
              <DisplayCard key={item.id} $displayed={item.displayed}>
                <DisplayThumb style={{ background: `${rarity.color}1a` }}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <ThumbIcon>🏺</ThumbIcon>}
                </DisplayThumb>
                <DisplayBody>
                  <Name>{item.name}</Name>
                  {item.era && <Era>{item.era}</Era>}
                  {linkLabel && (
                    <LinkChip $clickable={linkable} onClick={() => linkable && openLink(item)}>
                      🔗 {linkLabel}
                    </LinkChip>
                  )}
                </DisplayBody>
                <DisplayToggle
                  type="button"
                  $on={item.displayed}
                  disabled={busy}
                  onClick={() =>
                    displayMutation.mutate({ userArtifactId: item.id, displayed: !item.displayed })
                  }
                >
                  {item.displayed ? '진열 중' : '숨김'}
                </DisplayToggle>
              </DisplayCard>
            )
          })}
        </DisplayGrid>
      ) : (
        <EmptyState>아직 수집한 유물이 없습니다. 위에서 첫 유물을 모아보세요.</EmptyState>
      )}
    </Page>
  )
}

// ── styles ────────────────────────────────────────────────────────────────
const Page = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  padding: calc(var(--header-height, 64px) + 20px) 16px 64px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const Header = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Subtitle = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BalanceCard = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  padding: 12px 20px;
  text-align: right;
  min-width: 150px;
`

const BalanceLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BalanceValue = styled.div`
  font-size: 26px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`

const SetRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
`

const SetCard = styled.div<{ $complete: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  outline: ${({ $complete, theme }) =>
    $complete ? `2px solid ${theme.colors.success}` : '2px solid transparent'};
`

const SetHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const SetName = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SetCount = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
`

const SetTrack = styled.div`
  height: 6px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`

const SetFill = styled.div`
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  transition: width 0.4s ease;
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border.default)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text.secondary)};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`

const Card = styled.div<{ $owned: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 2px solid transparent;
  transition: transform 0.12s ease, box-shadow 0.12s ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
  }
`

const RarityRibbon = styled.span`
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid;
  background: ${({ theme }) => theme.colors.background.primary};
  font-size: 10px;
  font-weight: 800;
`

const Thumb = styled.div`
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ThumbIcon = styled.div`
  font-size: 44px;
`

const Body = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

const Name = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`

const Era = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LinkChip = styled.button<{ $clickable: boolean }>`
  align-self: flex-start;
  margin-top: 2px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ $clickable, theme }) =>
    $clickable ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 11px;
  font-weight: 700;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`

const Footer = styled.div`
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Price = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`

const CollectButton = styled.button`
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const ShortFall = styled.button`
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
`

const OwnedTag = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.success};
`

const SectionTitle = styled.h2`
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const DisplayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
`

const DisplayCard = styled.div<{ $displayed: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: ${({ $displayed }) => ($displayed ? 1 : 0.55)};
`

const DisplayThumb = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }
`

const DisplayBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const DisplayToggle = styled.button<{ $on: boolean }>`
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid
    ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.border.default)};
  background: ${({ $on, theme }) => ($on ? theme.colors.primary : 'transparent')};
  color: ${({ $on, theme }) => ($on ? '#fff' : theme.colors.text.secondary)};
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const EmptyState = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
