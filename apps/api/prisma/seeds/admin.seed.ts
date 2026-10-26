import * as bcrypt from 'bcrypt'

import { PrismaService } from '../prisma.service'

const DEV_DEFAULT_PASSWORD = '1234'
const PRODUCTION_MIN_LENGTH = 12

/**
 * 시드 admin 비밀번호. 운영에서는 ADMIN_PASSWORD가 필수다 — 예전엔 운영 시드도 '1234'로 만들어
 * 첫 배포 직후 누구나 로그인할 수 있었다. 개발·테스트는 편의상 '1234' 기본값을 유지한다.
 */
export function resolveAdminPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim()
  if (process.env.NODE_ENV !== 'production') return fromEnv || DEV_DEFAULT_PASSWORD
  if (!fromEnv || fromEnv.length < PRODUCTION_MIN_LENGTH) {
    throw new Error(
      `운영 시드는 ADMIN_PASSWORD(${PRODUCTION_MIN_LENGTH}자 이상) 환경변수가 필요합니다.`,
    )
  }
  return fromEnv
}

export async function seedAdmin(prisma: PrismaService): Promise<void> {
  console.log('\n👤 어드민 계정 시딩 시작...')

  const plainPassword = resolveAdminPassword()
  const passwordHash = await bcrypt.hash(plainPassword, 10)

  const admin = await prisma.account.upsert({
    where: { username: 'admin' },
    // 이미 있으면 건드리지 않는다 — 운영에서 바꾼 비밀번호를 재시딩이 되돌리지 않게
    update: {},
    create: {
      username: 'admin',
      passwordHash,
    },
  })

  console.log(`✅ 어드민 계정 생성됨: ${admin.username}\n`)
}

