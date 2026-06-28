/**
 * 파피 상점 페이지 — 잔액 / 포인트 환전 / 프로모 / 코스메틱 상점 / 인벤토리.
 * "사고 싶게": sticky 내 모습 미리보기(호버 시 내 아바타·닉네임에 입혀짐) + 카드에 실제 코스메틱 렌더
 * + 레어도 + 부족 파피→환전 유도.
 */
import { useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { sessionQueryOptions } from '@/entities/session'
import {
  type AvatarFramePayload,
  type ItemCategory,
  type NicknameColorPayload,
  type ProfileThemePayload,
  type ShopItem,
  type UserItem,
  CosmeticPreview,
  avatarFrameStyle,
  equipUserItem,
  exchangePapy,
  invalidateWallet,
  newRequestId,
  nicknameColor,
  profileBackground,
  purchaseShopItem,
  redeemPromo,
  useEquippedCosmetics,
  walletItemsQueryOptions,
  walletMeQueryOptions,
  walletShopQueryOptions,
} from '@/entities/wallet'
import { glassCardMixin } from '@/shared/styles/mixins'
import { useThemeStore } from '@/shared/styles/theme.store'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  AVATAR_FRAME: '아바타 프레임',
  NICKNAME_COLOR: '닉네임 색상',
  GRADE_THEME: '등급 테마',
  BADGE_FRAME: '뱃지 테두리',
  PROFILE_THEME: '프로필 배경',
}

const REASON_LABEL: Record<string, string> = {
  PURCHASE_TOPUP: '충전',
  ADMIN_GRANT: '운영 지급',
  PROMO_CODE: '프로모',
  POINT_EXCHANGE: '포인트 환전',
  CONSUME: '구매',
  REFUND_REVERSAL: '환불',
  ADMIN_ADJUST: '보정',
}

const CATEGORY_FILTERS: { key: ItemCategory | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'AVATAR_FRAME', label: '아바타 프레임' },
  { key: 'NICKNAME_COLOR', label: '닉네임 색상' },
  { key: 'GRADE_THEME', label: '등급 테마' },
  { key: 'BADGE_FRAME', label: '뱃지 테두리' },
  { key: 'PROFILE_THEME', label: '프로필 배경' },
]

function rarityOf(price: number): { label: string; color: string } {
  if (price >= 100) return { label: '에픽', color: '#a855f7' }
  if (price >= 60) return { label: '레어', color: '#3b82f6' }
  return { label: '일반', color: '#64748b' }
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const maybe = error as { message?: unknown }
    if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message
  }
  return fallback
}

export default function WalletPage() {
  const queryClient = useQueryClient()
  const isDark = useThemeStore((state) => state.mode === 'dark')
  const exchangeRef = useRef<HTMLDivElement>(null)

  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all')
  const [exchangeInput, setExchangeInput] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null)

  const { data: wallet } = useQuery(walletMeQueryOptions)
  const { data: session } = useQuery(sessionQueryOptions)
  const { data: shopItems } = useQuery(
    walletShopQueryOptions(categoryFilter === 'all' ? undefined : categoryFilter),
  )
  const { data: inventory } = useQuery(walletItemsQueryOptions)
  const equipped = useEquippedCosmetics()

  const myName = session?.displayName || session?.account || '나'
  const balance = wallet?.balance ?? 0

  const afterChange = () => invalidateWallet(queryClient)

  const exchangeMutation = useMutation({
    mutationFn: (papy: number) => exchangePapy(papy, newRequestId()),
    onSuccess: () => {
      afterChange()
      setExchangeInput('')
      notify.success('포인트를 파피로 환전했습니다.')
    },
    onError: (error) => notify.error(errorMessage(error, '환전에 실패했습니다.')),
  })

  const promoMutation = useMutation({
    mutationFn: (code: string) => redeemPromo(code),
    onSuccess: () => {
      afterChange()
      setPromoInput('')
      notify.success('프로모 코드를 교환했습니다.')
    },
    onError: (error) => notify.error(errorMessage(error, '프로모 교환에 실패했습니다.')),
  })

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => purchaseShopItem(itemId, newRequestId()),
    onSuccess: () => {
      afterChange()
      notify.success('아이템을 구매했습니다. 보관함에서 장착해보세요!')
    },
    onError: (error) => notify.error(errorMessage(error, '구매에 실패했습니다.')),
  })

  const equipMutation = useMutation({
    mutationFn: (variables: { userItemId: string; equipped: boolean }) =>
      equipUserItem(variables.userItemId, variables.equipped),
    onSuccess: (_result, variables) => {
      afterChange()
      notify.success(variables.equipped ? '아이템을 장착했습니다.' : '장착을 해제했습니다.')
    },
    onError: (error) => notify.error(errorMessage(error, '장착에 실패했습니다.')),
  })

  const busy =
    exchangeMutation.isPending ||
    promoMutation.isPending ||
    purchaseMutation.isPending ||
    equipMutation.isPending

  const ownedByItemId = new Map((inventory ?? []).map((userItem) => [userItem.itemId, userItem]))

  const maxExchange = wallet
    ? Math.min(wallet.exchangeableNow, wallet.dailyExchangeRemaining)
    : 0

  const handleExchange = () => {
    const amount = Number(exchangeInput)
    if (!Number.isInteger(amount) || amount <= 0) {
      notify.error('환전할 파피는 1 이상의 정수여야 합니다.')
      return
    }
    exchangeMutation.mutate(amount)
  }

  const handlePromo = () => {
    const code = promoInput.trim()
    if (!code) {
      notify.error('프로모 코드를 입력하세요.')
      return
    }
    promoMutation.mutate(code)
  }

  const handlePurchase = async (item: ShopItem) => {
    if (ownedByItemId.has(item.id)) return
    if (balance < item.pricePapy) {
      scrollToExchange()
      notify.error(`파피가 ${(item.pricePapy - balance).toLocaleString()} 부족해요. 포인트를 환전해보세요.`)
      return
    }
    const ok = await confirm({
      title: '아이템 구매',
      message: `'${item.name}'을(를) ${item.pricePapy.toLocaleString()} 파피에 구매할까요?`,
    })
    if (!ok) return
    purchaseMutation.mutate(item.id)
  }

  const handleEquipFromShop = (item: ShopItem) => {
    const ownedItem = ownedByItemId.get(item.id)
    if (!ownedItem) return
    equipMutation.mutate({ userItemId: ownedItem.id, equipped: !ownedItem.equipped })
  }

  const handleEquipFromInventory = (item: UserItem) => {
    equipMutation.mutate({ userItemId: item.id, equipped: !item.equipped })
  }

  const scrollToExchange = () =>
    exchangeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  // ── 내 모습 미리보기: 호버 상품 우선, 없으면 현재 장착 ──────────────────────
  const previewFrame: AvatarFramePayload | null =
    previewItem?.category === 'AVATAR_FRAME'
      ? (previewItem.payload as AvatarFramePayload)
      : equipped.avatarFrame
  const previewNameColor: NicknameColorPayload | null =
    previewItem?.category === 'NICKNAME_COLOR'
      ? (previewItem.payload as NicknameColorPayload)
      : equipped.nicknameColor
  const previewProfile: ProfileThemePayload | null =
    previewItem?.category === 'PROFILE_THEME'
      ? (previewItem.payload as ProfileThemePayload)
      : equipped.profileTheme
  const meBackground = profileBackground(previewProfile)
  const meNameColor = nicknameColor(previewNameColor, isDark)
  const previewOwned = previewItem ? ownedByItemId.get(previewItem.id) : undefined
  const previewAffordable = previewItem ? balance >= previewItem.pricePapy : false

  return (
    <Page>
      <Header>
        <div>
          <Title>파피 상점</Title>
          <Subtitle>기여로 모은 포인트를 파피로 바꿔 프로필을 빛내보세요.</Subtitle>
        </div>
        <BalanceCard>
          <BalanceLabel>내 파피</BalanceLabel>
          <BalanceValue>{balance.toLocaleString()}</BalanceValue>
        </BalanceCard>
      </Header>

      <EarnRow ref={exchangeRef}>
        <EarnCard>
          <CardTitle>포인트 환전</CardTitle>
          <CardHint>
            {wallet
              ? `${wallet.pointsPerPapy} 포인트당 1 파피 · 지금 ${maxExchange.toLocaleString()} 파피까지 (오늘 ${wallet.dailyExchangeRemaining.toLocaleString()} 남음)`
              : '불러오는 중…'}
          </CardHint>
          <InputRow>
            <TextInput
              type="number"
              min={1}
              max={maxExchange || undefined}
              placeholder="환전할 파피"
              value={exchangeInput}
              onChange={(event) => setExchangeInput(event.target.value)}
              disabled={busy || maxExchange <= 0}
            />
            <PrimaryButton type="button" onClick={handleExchange} disabled={busy || maxExchange <= 0}>
              환전
            </PrimaryButton>
          </InputRow>
        </EarnCard>

        <EarnCard>
          <CardTitle>프로모 코드</CardTitle>
          <CardHint>받은 코드를 입력해 파피를 받으세요 (계정당 1회).</CardHint>
          <InputRow>
            <TextInput
              type="text"
              placeholder="코드 입력"
              value={promoInput}
              onChange={(event) => setPromoInput(event.target.value)}
              disabled={busy}
            />
            <PrimaryButton type="button" onClick={handlePromo} disabled={busy}>
              교환
            </PrimaryButton>
          </InputRow>
        </EarnCard>
      </EarnRow>

      {wallet && wallet.recent.length > 0 && (
        <RecentCard>
          <CardTitle>최근 거래</CardTitle>
          <LedgerList>
            {wallet.recent.slice(0, 6).map((entry) => (
              <LedgerRow key={entry.id}>
                <span>{REASON_LABEL[entry.reason] ?? entry.reason}</span>
                <LedgerAmount $positive={entry.amount >= 0}>
                  {entry.amount >= 0 ? '+' : ''}
                  {entry.amount.toLocaleString()}
                </LedgerAmount>
              </LedgerRow>
            ))}
          </LedgerList>
        </RecentCard>
      )}

      <SectionTitle>상점</SectionTitle>
      <ShopLayout>
        <MeColumn>
          <MePreviewCard style={meBackground ? { background: meBackground } : undefined}>
            <MeAvatar style={avatarFrameStyle(previewFrame)}>
              {(myName.trim().charAt(0) || '나').toUpperCase()}
            </MeAvatar>
            <MeName style={meNameColor ? { color: meNameColor } : undefined}>{myName}</MeName>
            {previewItem &&
              (previewItem.category === 'GRADE_THEME' || previewItem.category === 'BADGE_FRAME') && (
                <MeAccent>
                  <CosmeticPreview
                    category={previewItem.category}
                    payload={previewItem.payload}
                    sampleName={myName}
                  />
                </MeAccent>
              )}
            <MeCaption>
              {previewItem ? `미리보기 · ${previewItem.name}` : '상품에 올려보면 내 모습으로 보여줘요'}
            </MeCaption>
            {previewItem &&
              (previewOwned ? (
                <MeCta
                  type="button"
                  disabled={busy || previewOwned.equipped}
                  onClick={() => handleEquipFromShop(previewItem)}
                >
                  {previewOwned.equipped ? '장착 중' : '장착하기'}
                </MeCta>
              ) : previewAffordable ? (
                <MeCta type="button" disabled={busy} onClick={() => handlePurchase(previewItem)}>
                  {previewItem.pricePapy.toLocaleString()} 파피로 구매
                </MeCta>
              ) : (
                <MeCta type="button" onClick={scrollToExchange}>
                  {(previewItem.pricePapy - balance).toLocaleString()} 파피 부족 · 환전하기
                </MeCta>
              ))}
          </MePreviewCard>
        </MeColumn>

        <div>
          <FilterRow>
            {CATEGORY_FILTERS.map((filter) => (
              <FilterChip
                key={filter.key}
                type="button"
                $active={categoryFilter === filter.key}
                onClick={() => setCategoryFilter(filter.key)}
              >
                {filter.label}
              </FilterChip>
            ))}
          </FilterRow>

          {shopItems && shopItems.length > 0 ? (
            <ShopGrid>
              {shopItems.map((item) => {
                const owned = ownedByItemId.get(item.id)
                const rarity = rarityOf(item.pricePapy)
                const affordable = balance >= item.pricePapy
                return (
                  <ItemCard
                    key={item.id}
                    $active={previewItem?.id === item.id}
                    $equipped={!!owned?.equipped}
                    onMouseEnter={() => setPreviewItem(item)}
                    onClick={() => setPreviewItem(item)}
                  >
                    <RarityRibbon style={{ color: rarity.color, borderColor: rarity.color }}>
                      {rarity.label}
                    </RarityRibbon>
                    <ItemThumb>
                      <CosmeticPreview category={item.category} payload={item.payload} sampleName={myName} />
                    </ItemThumb>
                    <ItemBody>
                      <ItemCategoryTag>{CATEGORY_LABEL[item.category] ?? item.category}</ItemCategoryTag>
                      <ItemName>{item.name}</ItemName>
                      <ItemFooter>
                        <ItemPrice>{item.pricePapy.toLocaleString()} 파피</ItemPrice>
                        {owned ? (
                          <OwnedTag>{owned.equipped ? '장착 중' : '보유'}</OwnedTag>
                        ) : affordable ? (
                          <BuyButton
                            type="button"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation()
                              handlePurchase(item)
                            }}
                          >
                            구매
                          </BuyButton>
                        ) : (
                          <ShortFall
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              scrollToExchange()
                            }}
                          >
                            {(item.pricePapy - balance).toLocaleString()} 부족
                          </ShortFall>
                        )}
                      </ItemFooter>
                    </ItemBody>
                  </ItemCard>
                )
              })}
            </ShopGrid>
          ) : (
            <EmptyState>판매 중인 상품이 없습니다.</EmptyState>
          )}
        </div>
      </ShopLayout>

      <SectionTitle>내 보관함</SectionTitle>
      {inventory && inventory.length > 0 ? (
        <InventoryGrid>
          {inventory.map((item) => (
            <InventoryRow key={item.id} $equipped={item.equipped}>
              <InvThumb>
                <CosmeticPreview category={item.category} payload={item.payload} sampleName={myName} size={44} />
              </InvThumb>
              <InvBody>
                <ItemCategoryTag>{CATEGORY_LABEL[item.category] ?? item.category}</ItemCategoryTag>
                <InventoryName>{item.name}</InventoryName>
              </InvBody>
              <EquipButton
                type="button"
                $equipped={item.equipped}
                onClick={() => handleEquipFromInventory(item)}
                disabled={busy}
              >
                {item.equipped ? '해제' : '장착'}
              </EquipButton>
            </InventoryRow>
          ))}
        </InventoryGrid>
      ) : (
        <EmptyState>아직 보유한 아이템이 없습니다. 상점에서 코스메틱을 구매해보세요.</EmptyState>
      )}
    </Page>
  )
}

// ── styles ────────────────────────────────────────────────────────────────
const Page = styled.div`
  max-width: 1040px;
  margin: 0 auto;
  /* 고정 헤더(var(--header-height)) 아래로 콘텐츠를 내려 상단 잘림 방지 (leaderboard 컨벤션) */
  padding: calc(var(--header-height, 64px) + 20px) 16px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  min-width: 160px;
`

const BalanceLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BalanceValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`

const EarnRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const EarnCard = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RecentCard = styled(EarnCard)``

const CardTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CardHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const InputRow = styled.div`
  display: flex;
  gap: 8px;
`

const TextInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 14px;

  &:disabled {
    opacity: 0.5;
  }
`

const PrimaryButton = styled.button`
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const LedgerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const LedgerRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 2px 0;
`

const LedgerAmount = styled.span<{ $positive: boolean }>`
  font-weight: 700;
  color: ${({ $positive, theme }) => ($positive ? theme.colors.success : theme.colors.error)};
`

const SectionTitle = styled.h2`
  margin: 8px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ShopLayout = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 18px;
  align-items: start;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`

const MeColumn = styled.div`
  position: relative;
`

const MePreviewCard = styled.div`
  position: sticky;
  /* 고정 헤더 아래에 고정 + 짧은 화면에선 카드 내부 스크롤로 하단 CTA 보장 */
  top: calc(var(--header-height, 64px) + 16px);
  max-height: calc(100vh - var(--header-height, 64px) - 32px);
  overflow-y: auto;
  border-radius: 16px;
  padding: 24px 18px;
  background: ${({ theme }) =>
    `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`};
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);

  @media (max-width: 820px) {
    position: static;
    max-height: none;
    overflow: visible;
  }
`

const MeAvatar = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
`

const MeName = styled.div`
  font-size: 18px;
  font-weight: 800;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
`

const MeAccent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const MeCaption = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  min-height: 16px;
`

const MeCta = styled.button`
  margin-top: 4px;
  padding: 8px 18px;
  border-radius: 999px;
  border: none;
  background: #fff;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
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

const ShopGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 14px;
`

const ItemCard = styled.div<{ $active: boolean; $equipped: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  outline: ${({ $active, $equipped, theme }) =>
    $equipped
      ? `2px solid ${theme.colors.success}`
      : $active
        ? `2px solid ${theme.colors.primary}`
        : '2px solid transparent'};

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

const ItemThumb = styled.div`
  height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: ${({ theme }) => theme.colors.background.tertiary};
`

const ItemBody = styled.div`
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ItemCategoryTag = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ItemName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ItemFooter = styled.div`
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ItemPrice = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
`

const BuyButton = styled.button`
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
  font-weight: 700;
  color: ${({ theme }) => theme.colors.success};
`

const InventoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
`

const InventoryRow = styled.div<{ $equipped: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  outline: ${({ $equipped, theme }) =>
    $equipped ? `2px solid ${theme.colors.success}` : '2px solid transparent'};
`

const InvThumb = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.tertiary};
  flex-shrink: 0;
`

const InvBody = styled.div`
  flex: 1;
  min-width: 0;
`

const InventoryName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EquipButton = styled.button<{ $equipped: boolean }>`
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid
    ${({ $equipped, theme }) => ($equipped ? theme.colors.border.default : theme.colors.primary)};
  background: ${({ $equipped, theme }) => ($equipped ? 'transparent' : theme.colors.primary)};
  color: ${({ $equipped, theme }) => ($equipped ? theme.colors.text.secondary : '#fff')};
  font-weight: 700;
  font-size: 13px;
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
