/**
 * 일본 행정구역 시드.
 *  · level 1: 都道府県 (47개) — 도 1, 도 1, 부 2, 현 43
 */
import { PrismaService } from '../prisma.service'
import {
  type AdminDivisionItem,
  seedAdminDivisionsForCountry,
} from './admin-division.shared'

const PREFECTURES: { name: string; localName: string }[] = [
  // 홋카이도 (道)
  { name: '홋카이도', localName: '北海道' },
  // 도호쿠 (6현)
  { name: '아오모리현', localName: '青森県' },
  { name: '이와테현', localName: '岩手県' },
  { name: '미야기현', localName: '宮城県' },
  { name: '아키타현', localName: '秋田県' },
  { name: '야마가타현', localName: '山形県' },
  { name: '후쿠시마현', localName: '福島県' },
  // 간토 (1도 + 6현)
  { name: '도쿄도', localName: '東京都' },
  { name: '이바라키현', localName: '茨城県' },
  { name: '도치기현', localName: '栃木県' },
  { name: '군마현', localName: '群馬県' },
  { name: '사이타마현', localName: '埼玉県' },
  { name: '치바현', localName: '千葉県' },
  { name: '가나가와현', localName: '神奈川県' },
  // 주부 (9현)
  { name: '니가타현', localName: '新潟県' },
  { name: '도야마현', localName: '富山県' },
  { name: '이시카와현', localName: '石川県' },
  { name: '후쿠이현', localName: '福井県' },
  { name: '야마나시현', localName: '山梨県' },
  { name: '나가노현', localName: '長野県' },
  { name: '기후현', localName: '岐阜県' },
  { name: '시즈오카현', localName: '静岡県' },
  { name: '아이치현', localName: '愛知県' },
  // 긴키 (2부 + 5현)
  { name: '미에현', localName: '三重県' },
  { name: '시가현', localName: '滋賀県' },
  { name: '교토부', localName: '京都府' },
  { name: '오사카부', localName: '大阪府' },
  { name: '효고현', localName: '兵庫県' },
  { name: '나라현', localName: '奈良県' },
  { name: '와카야마현', localName: '和歌山県' },
  // 주고쿠 (5현)
  { name: '돗토리현', localName: '鳥取県' },
  { name: '시마네현', localName: '島根県' },
  { name: '오카야마현', localName: '岡山県' },
  { name: '히로시마현', localName: '広島県' },
  { name: '야마구치현', localName: '山口県' },
  // 시코쿠 (4현)
  { name: '도쿠시마현', localName: '徳島県' },
  { name: '가가와현', localName: '香川県' },
  { name: '에히메현', localName: '愛媛県' },
  { name: '고치현', localName: '高知県' },
  // 규슈·오키나와 (8현)
  { name: '후쿠오카현', localName: '福岡県' },
  { name: '사가현', localName: '佐賀県' },
  { name: '나가사키현', localName: '長崎県' },
  { name: '구마모토현', localName: '熊本県' },
  { name: '오이타현', localName: '大分県' },
  { name: '미야자키현', localName: '宮崎県' },
  { name: '가고시마현', localName: '鹿児島県' },
  { name: '오키나와현', localName: '沖縄県' },
]

const DIVISIONS: AdminDivisionItem[] = PREFECTURES.map((p) => ({
  level: 1,
  name: p.name,
  localName: p.localName,
}))

export async function seedJapanAdminDivisions(
  prisma: PrismaService,
): Promise<void> {
  await seedAdminDivisionsForCountry(prisma, {
    isoCode: 'JP',
    countryNameKo: '일본',
    levels: [
      { level: 1, label: '都道府県', description: '도·도·부·현 (47)' },
      { level: 2, label: '市区町村', description: '시·구·정·촌' },
    ],
    divisions: DIVISIONS,
  })
}
