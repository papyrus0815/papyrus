/**
 * 중국 행정구역 시드.
 *  · level 1: 省/直辖市/自治区/特別行政区 (34개)
 */
import { PrismaService } from '../prisma.service'
import {
  type AdminDivisionItem,
  seedAdminDivisionsForCountry,
} from './admin-division.shared'

const PROVINCES: { name: string; localName: string }[] = [
  // 직할시 (4)
  { name: '베이징시', localName: '北京市' },
  { name: '톈진시', localName: '天津市' },
  { name: '상하이시', localName: '上海市' },
  { name: '충칭시', localName: '重庆市' },
  // 성 (23)
  { name: '허베이성', localName: '河北省' },
  { name: '산시성 (山西)', localName: '山西省' },
  { name: '랴오닝성', localName: '辽宁省' },
  { name: '지린성', localName: '吉林省' },
  { name: '헤이룽장성', localName: '黑龙江省' },
  { name: '장쑤성', localName: '江苏省' },
  { name: '저장성', localName: '浙江省' },
  { name: '안후이성', localName: '安徽省' },
  { name: '푸젠성', localName: '福建省' },
  { name: '장시성', localName: '江西省' },
  { name: '산둥성', localName: '山东省' },
  { name: '허난성', localName: '河南省' },
  { name: '후베이성', localName: '湖北省' },
  { name: '후난성', localName: '湖南省' },
  { name: '광둥성', localName: '广东省' },
  { name: '하이난성', localName: '海南省' },
  { name: '쓰촨성', localName: '四川省' },
  { name: '구이저우성', localName: '贵州省' },
  { name: '윈난성', localName: '云南省' },
  { name: '산시성 (陝西)', localName: '陕西省' },
  { name: '간쑤성', localName: '甘肃省' },
  { name: '칭하이성', localName: '青海省' },
  { name: '대만성', localName: '台湾省' },
  // 자치구 (5)
  { name: '내몽골자치구', localName: '内蒙古自治区' },
  { name: '광시좡족자치구', localName: '广西壮族自治区' },
  { name: '시짱자치구 (티베트)', localName: '西藏自治区' },
  { name: '닝샤후이족자치구', localName: '宁夏回族自治区' },
  { name: '신장위구르자치구', localName: '新疆维吾尔自治区' },
  // 특별행정구 (2)
  { name: '홍콩특별행정구', localName: '香港特别行政区' },
  { name: '마카오특별행정구', localName: '澳门特别行政区' },
]

const DIVISIONS: AdminDivisionItem[] = PROVINCES.map((p) => ({
  level: 1,
  name: p.name,
  localName: p.localName,
}))

export async function seedChinaAdminDivisions(
  prisma: PrismaService,
): Promise<void> {
  await seedAdminDivisionsForCountry(prisma, {
    isoCode: 'CN',
    countryNameKo: '중국',
    levels: [
      {
        level: 1,
        label: '省级行政区',
        description: '성·직할시·자치구·특별행정구 (34)',
      },
      { level: 2, label: '地级市', description: '지급시' },
      { level: 3, label: '县级市/区', description: '현급시·구' },
    ],
    divisions: DIVISIONS,
  })
}
