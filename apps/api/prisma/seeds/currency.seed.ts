import { PrismaService } from '../prisma.service'

interface CurrencyData {
  code: string
  name: string
  symbol: string
}

const CURRENCIES: CurrencyData[] = [
  { code: 'USD', name: '미국 달러', symbol: '$' },
  { code: 'EUR', name: '유로', symbol: '€' },
  { code: 'JPY', name: '일본 엔', symbol: '¥' },
  { code: 'CNY', name: '중국 위안', symbol: '¥' },
  { code: 'KRW', name: '대한민국 원', symbol: '₩' },
  { code: 'GBP', name: '영국 파운드', symbol: '£' },
  { code: 'CHF', name: '스위스 프랑', symbol: 'CHF' },
  { code: 'CAD', name: '캐나다 달러', symbol: 'C$' },
  { code: 'AUD', name: '호주 달러', symbol: 'A$' },
  { code: 'HKD', name: '홍콩 달러', symbol: 'HK$' },
  { code: 'SGD', name: '싱가포르 달러', symbol: 'S$' },
  { code: 'TWD', name: '신 타이완 달러', symbol: 'NT$' },
  { code: 'INR', name: '인도 루피', symbol: '₹' },
  { code: 'RUB', name: '러시아 루블', symbol: '₽' },
  { code: 'BRL', name: '브라질 헤알', symbol: 'R$' },
  { code: 'MXN', name: '멕시코 페소', symbol: '$' },
  { code: 'IDR', name: '인도네시아 루피아', symbol: 'Rp' },
  { code: 'THB', name: '태국 바트', symbol: '฿' },
  { code: 'VND', name: '베트남 동', symbol: '₫' },
  { code: 'PHP', name: '필리핀 페소', symbol: '₱' },
  { code: 'MYR', name: '말레이시아 링깃', symbol: 'RM' },
  { code: 'TRY', name: '터키 리라', symbol: '₺' },
  { code: 'SEK', name: '스웨덴 크로나', symbol: 'kr' },
  { code: 'NOK', name: '노르웨이 크로네', symbol: 'kr' },
  { code: 'ZAR', name: '남아공 랜드', symbol: 'R' },
]

export async function seedCurrencies(prisma: PrismaService): Promise<void> {
  console.log('\n💱 화폐 시딩 시작...')

  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    })
  }

  console.log(`✅ 총 ${CURRENCIES.length}개 화폐 시딩 완료!\n`)
}
