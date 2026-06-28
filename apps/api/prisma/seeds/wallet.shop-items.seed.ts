import { ItemCategory, Prisma } from '@prisma/client'

import { PrismaService } from '../prisma.service'

/**
 * 파피 상점 데모 코스메틱 시드 — 5개 카테고리 샘플 상품.
 * code(SKU) 기준 upsert라 반복 실행해도 안전(멱등). 가격/외형(payload)만 갱신.
 */
interface DemoItem {
  code: string
  category: ItemCategory
  name: string
  pricePapy: number
  sortOrder: number
  payload: Prisma.InputJsonValue
}

const DEMO_ITEMS: DemoItem[] = [
  // 아바타 프레임
  {
    code: 'FRAME_GOLD',
    category: ItemCategory.AVATAR_FRAME,
    name: '골드 프레임',
    pricePapy: 60,
    sortOrder: 10,
    payload: { borderColor: '#D4AF37', borderWidth: 3, shadowColor: 'rgba(212,175,55,0.6)', shadowBlur: 12 },
  },
  {
    code: 'FRAME_NEON',
    category: ItemCategory.AVATAR_FRAME,
    name: '네온 글로우',
    pricePapy: 80,
    sortOrder: 11,
    payload: { borderColor: '#22d3ee', borderWidth: 2, shadowColor: 'rgba(34,211,238,0.7)', shadowBlur: 18 },
  },
  // 닉네임 색상
  {
    code: 'NICK_PURPLE',
    category: ItemCategory.NICKNAME_COLOR,
    name: '퍼플 닉네임',
    pricePapy: 30,
    sortOrder: 20,
    payload: { lightValue: '#7c3aed', darkValue: '#a78bfa' },
  },
  {
    code: 'NICK_CYAN',
    category: ItemCategory.NICKNAME_COLOR,
    name: '시안 닉네임',
    pricePapy: 30,
    sortOrder: 21,
    payload: { lightValue: '#0891b2', darkValue: '#22d3ee' },
  },
  {
    code: 'NICK_ROSE',
    category: ItemCategory.NICKNAME_COLOR,
    name: '로즈 닉네임',
    pricePapy: 30,
    sortOrder: 22,
    payload: { lightValue: '#e11d48', darkValue: '#fb7185' },
  },
  // 등급 테마
  {
    code: 'GRADE_SUNSET',
    category: ItemCategory.GRADE_THEME,
    name: '선셋 등급 테마',
    pricePapy: 100,
    sortOrder: 30,
    payload: { bgGradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', fgColor: '#fff7ed' },
  },
  // 뱃지 테두리
  {
    code: 'BADGE_HOLO',
    category: ItemCategory.BADGE_FRAME,
    name: '홀로그램 테두리',
    pricePapy: 90,
    sortOrder: 40,
    payload: { borderStyle: '2px solid transparent', shadowEffect: '0 0 14px rgba(139,92,246,0.7)' },
  },
  // 프로필 배경
  {
    code: 'PROFILE_AURORA',
    category: ItemCategory.PROFILE_THEME,
    name: '오로라 배경',
    pricePapy: 120,
    sortOrder: 50,
    payload: { bgGradient: 'linear-gradient(135deg,#1e3a8a,#0ea5e9,#10b981)' },
  },
]

export async function seedShopItems(prisma: PrismaService): Promise<void> {
  for (const item of DEMO_ITEMS) {
    await prisma.shopItem.upsert({
      where: { code: item.code },
      update: {
        category: item.category,
        name: item.name,
        pricePapy: item.pricePapy,
        sortOrder: item.sortOrder,
        payload: item.payload,
        isActive: true,
      },
      create: {
        code: item.code,
        category: item.category,
        name: item.name,
        pricePapy: item.pricePapy,
        sortOrder: item.sortOrder,
        payload: item.payload,
        isActive: true,
      },
    })
    console.log(`  ✓ ${item.code} (${item.name}) — ${item.pricePapy} 파피`)
  }
  console.log(`상점 데모 상품 ${DEMO_ITEMS.length}종 upsert 완료`)
}
