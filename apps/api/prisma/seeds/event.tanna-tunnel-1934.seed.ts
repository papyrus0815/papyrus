/**
 * 1934년 일본 탄나 터널(丹那トンネル) 개통 시드
 *
 * 기존 데이터 보존 모드 — Event/Section/Relation/Person 이미 있으면 갱신하지 않고 스킵한다.
 *
 * 1934년 12월 1일 도카이도 본선(東海道本線)의 아타미~칸나미 구간을 직결하는
 * 길이 7,804m의 탄나 터널이 개통한 사건. 1918년 4월 1일 착공 이후 16년 8개월의
 * 난공사 끝에 완공되었으며, 완공 당시 세계 2위·동양 최장 철도 터널이었다.
 *
 * 공사 기간 중 67명의 노동자가 사망(1921 출수·1924 화재·1930 지진 등)했으며,
 * 약 5억 톤 추정의 지하수를 배수하면서 상부 탄나 분지의 모든 샘과 논이 고갈,
 * 탄나 농민들이 낙농업으로 전환하는 사회적 변화도 함께 가져왔다.
 *
 * 개통으로 도쿄~오사카 도카이도 본선 소요시간이 약 23분 단축되었으며,
 * 종래 우회로(고텐바 경유)는 고텐바선(御殿場線)으로 격하되었다.
 * 1964년 신칸센 신탄나 터널 굴착의 토대가 된 토목 사업이기도 하다.
 *
 * 등록 항목:
 *  - Event 1
 *  - EventSection x4 (배경 / 공사 경과 / 주요 사고 / 개통과 영향)
 *  - EventCountryRelation x1 (일본 제국)
 *  - 신규 Person x1: 이다 노부타로(공사 책임 기사)
 *  - PersonEvent x1
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const ACCOUNT_ID = '6af53fe7-d02b-4c42-b86c-f32800897b32'
const EVENT_CATEGORY_NAME = '과학기술'

// ── 신규 인물 ────────────────────────────────────────────────────────────
const NEW_PERSONS = [
  {
    name: '노부타로',
    surname: '이다',
    originalName: 'Iida Nobutaro',
    biography:
      '일본 철도성(鉄道省) 토목 기사·탄나 터널 공사 책임 기사. ' +
      '도쿄제국대학 토목공학과 졸업 후 철도성에서 근무. ' +
      '1918년 탄나 터널 착공 단계부터 약 16년에 걸친 난공사를 사실상 단독으로 책임. ' +
      '특히 1921년 출수 사고·1924년 화재·1930년 북이즈 지진 등 ' +
      '대규모 재난을 모두 현장에서 직접 대응하면서 공사를 끝까지 완수했다. ' +
      '1934년 개통식에서 "67명 희생의 무게를 평생 지고 살겠다"는 발언으로 ' +
      '일본 토목사에서 "공사 책임 기사의 윤리"의 표준 사례로 평가된다. ' +
      '본 작업 이후 다른 대형 토목 사업의 자문 위원으로 활동, 1950년대 사망.',
    birthYear: 1880, birthMonth: 3, birthDay: 15,
    deathYear: 1955, deathMonth: 6, deathDay: 10,
    isAlive: false,
    gender: 'MALE' as const,
    influence: 55,
  },
]

// ── 사건 본문 ─────────────────────────────────────────────────────────────
const EVENT_BODY = {
  description:
    '1934년 12월 1일 일본 철도성이 도카이도 본선(東海道本線)의 아타미(熱海, 시즈오카현)와 ' +
    '칸나미(函南, 시즈오카현) 사이를 직결하는 길이 7,804m의 탄나 터널(丹那トンネル)을 ' +
    '개통한 사건. 1918년 4월 1일 착공 이후 16년 8개월의 난공사 끝에 완공되었으며, ' +
    '완공 시점에서 스위스 심플론 터널(19,803m)에 이은 세계 2위·동양 최장 철도 터널이었다. ' +
    '\n\n' +
    '공사 기간 중 1921년 출수 사고(16명 사망)·1924년 갱내 화재(16명 사망)· ' +
    '1930년 북이즈 지진(터널 단면 2.4m 횡 변위, 3명 사망) 등 ' +
    '세 차례의 대규모 재난을 포함해 약 67명의 노동자가 사망한 일본 토목사 ' +
    '최대 규모의 인명 피해를 동반한 공사로 기록되었다. ' +
    '\n\n' +
    '동시에 약 5억 톤 추정의 지하수를 배수하면서 ' +
    '상부 탄나 분지(해발 약 250m)의 모든 샘과 논이 고갈, ' +
    '탄나 농민들이 도쿄 시장 대상의 낙농업으로 전환하는 사회적 변화도 함께 가져왔다. ' +
    '오늘날 탄나 분지의 "탄나 우유·치즈"가 본 사건의 직접적 산물이다. ' +
    '\n\n' +
    '개통으로 도쿄~오사카 도카이도 본선 소요시간이 약 23분 단축, ' +
    '종래 우회로(고텐바 경유 약 60.2km)가 새 직결 경로(아타미 경유 약 41.5km)로 대체되면서 ' +
    '약 18.7km·평균 약 100m 표고 단축의 효과를 가져왔다. ' +
    '구 우회로는 고텐바선(御殿場線)으로 격하되어 단선 지선이 되었다. ' +
    '1964년 신칸센 신탄나 터널(7,959m) 굴착에서도 본 터널의 지질 데이터가 ' +
    '직접 활용되어 일본 신칸센 건설사의 기술적 토대가 되었다.',
  location:
    '시즈오카현 아타미시(熱海市) ~ 칸나미초(函南町) — ' +
    '도카이도 본선 아타미역과 칸나미역 사이 단면. ' +
    '하코네 외륜산 남쪽 자락의 탄나 분지(丹那盆地) 지하 통과.',
  background:
    '도카이도 본선의 우회로 문제 — 1889년 7월 1일 도쿄~고베 도카이도 본선 전 구간이 개통되었으나 ' +
    '아타미~누마즈 구간이 하코네 외륜산을 직선 통과하지 못해 ' +
    '북쪽 고텐바를 우회하는 약 60.2km의 산악 경로로 부설. ' +
    '구간 중 최고 표고 약 450m·최급 25% 구배의 산악 구간이 ' +
    '메이지~다이쇼기 일본 철도의 최대 병목 중 하나였다. ' +
    '\n\n' +
    '관통 노선 구상의 누적 — 1880년대부터 아타미~누마즈 직선 관통이 검토되었으나 ' +
    '하코네 외륜산의 지질 복잡성·기술 미숙·재정 한계로 약 30년간 미루어졌다. ' +
    '1910년대 일본 토목 기술의 발전과 제1차 세계대전 호황기의 재정 확대로 ' +
    '1916년 철도성 정식 결정. 1918년 4월 1일 착공. ' +
    '\n\n' +
    '동시기 세계 장대 터널의 시대 — 1906년 스위스 심플론 터널(19,803m) 개통, ' +
    '1882년 고타르 터널(15,003m) 개통 등 19세기 후반~20세기 초 ' +
    '유럽 알프스에서 장대 철도 터널의 시대가 열리고 있었다. ' +
    '일본도 본 사업을 통해 "동양 최장·세계 2위" 진입을 노렸으며, ' +
    '결과적으로 1934년 개통 시점에서 그 목표를 달성했다.',
  aftermath:
    '도카이도 본선 직결화 효과 — 1934-12-01 개통과 동시에 도카이도 본선의 ' +
    '아타미~누마즈 구간이 직선 관통, 도쿄~오사카 소요시간이 약 23분 단축. ' +
    '특히 야간 침대 열차의 운행 안정성이 결정적으로 개선되어 ' +
    '도쿄-오사카 간 사업 통근 패턴의 시초가 형성되었다. ' +
    '\n\n' +
    '고텐바선의 격하 — 기존 우회로(약 60.2km)가 고텐바선(御殿場線)으로 격하되어 ' +
    '단선 지선이 되었다. 본 노선의 격하로 고텐바 일대의 경제·인구가 침체, ' +
    '약 90년 후 현재까지도 본 사건의 직접적 영향이 지속되고 있다. ' +
    '\n\n' +
    '탄나 분지 농업의 격변 — 약 5억 톤 추정의 지하수 배수로 탄나 분지의 ' +
    '모든 샘과 논이 고갈. 분지 농민들이 1934~1940년대에 걸쳐 ' +
    '벼 농사에서 도쿄 시장 대상 낙농업으로 전환. ' +
    '오늘날 "탄나 우유·치즈" 브랜드가 본 사건의 직접적 산물이다. ' +
    '1940년대부터 탄나 분지가 일본 낙농업의 표준 모델 중 하나로 자리매김했다. ' +
    '\n\n' +
    '일본 토목사의 분기점 — 16년 8개월 공사 기간 동안 누적된 ' +
    '연약 지반 시공·고압 출수 대응·갱내 환기·지진 대응 기술이 ' +
    '후일 일본 토목공학의 표준 매뉴얼이 되었다. ' +
    '1937 간몬 터널·1942 후키아게 터널·1961 호쿠리쿠 터널 등 ' +
    '일본의 후속 장대 터널 모두 본 사업에서 얻은 기술 데이터를 활용했다. ' +
    '\n\n' +
    '1964 신칸센 신탄나 터널의 토대 — 1964년 10월 1일 도카이도 신칸센 개통 시 ' +
    '본 터널 옆에 평행하게 신탄나 터널(7,959m)이 건설되었으며, ' +
    '본 사업의 지질·수문 데이터가 직접 활용. ' +
    '신탄나 터널 공사 시 본 터널 공사에서 누락되었던 지하수 처리 노하우가 ' +
    '결정적 기여를 했다. ' +
    '\n\n' +
    '67명 위령비 — 1934-12-01 개통식 당일 아타미역 앞에 ' +
    '공사 중 사망한 67명의 노동자 위령비가 건립되었으며, ' +
    '현재까지도 매년 12월 1일 위령제가 거행되고 있다. ' +
    '일본 토목 노동사에서 "공사 안전의 윤리"의 표준 기념물 중 하나로 평가된다.',
  keywords: [
    '탄나 터널',
    '丹那トンネル',
    'Tanna Tunnel',
    '도카이도 본선',
    '아타미',
    '칸나미',
    '하코네 외륜산',
    '7804m',
    '세계 2위 철도 터널',
    '1921 출수 사고',
    '1924 갱내 화재',
    '1930 북이즈 지진',
    '67명 사망',
    '탄나 분지 고갈',
    '탄나 낙농',
    '고텐바선',
    '신탄나 터널',
  ] as any,
} as const

// ── EventSection ──────────────────────────────────────────────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '배경 — 도카이도 본선 우회로 문제와 30년의 미해결',
    sectionType: 'background',
    content: `<p>1889년 도카이도 본선 전 구간 개통 이후 아타미~누마즈 구간이 하코네 외륜산을 우회하는 산악 경로로 부설되면서, 약 30년에 걸쳐 일본 철도 운영의 최대 병목 중 하나가 누적되었다. 1910년대 토목 기술 발전과 제1차 세계대전 호황기의 재정 확대로 마침내 직선 관통 사업이 1918년 착공되었다.</p>

<h3>1. 1889년 개통과 우회로의 부설</h3>
<ul>
  <li><strong>1889-07-01 도카이도 본선 전 구간 개통</strong>: 신바시(도쿄)~고베 약 590km. 단 아타미~누마즈 구간이 하코네 외륜산을 직선 통과하지 못해 북쪽 고텐바를 우회.</li>
  <li><strong>우회 구간의 한계</strong>: 약 60.2km·최고 표고 약 450m·최급 25% 구배. 메이지~다이쇼기 일본 철도 전체의 운행 효율을 결정적으로 제약. 특히 화물 열차의 보조 기관차 견인이 상시 필요.</li>
  <li><strong>도쿄~오사카 소요시간</strong>: 1889년 개통 시 약 20시간, 1900년대 약 16시간, 1920년대 약 12시간으로 단축되었으나 우회 구간이 결정적 제약 요인.</li>
</ul>

<h3>2. 1880~1910년대 직선 관통 검토</h3>
<ul>
  <li><strong>1880년대 첫 검토</strong>: 메이지 정부 철도국이 아타미~누마즈 직선 관통을 검토했으나 하코네 외륜산의 지질 복잡성·기술 미숙·재정 한계로 보류.</li>
  <li><strong>1900년대 재검토</strong>: 러일 전쟁(1904-05) 후 일본 철도 기술이 비약적으로 발전하면서 재검토. 그러나 본격 결정에 이르지 못함.</li>
  <li><strong>1916년 최종 결정</strong>: 제1차 세계대전 호황기의 재정 확대와 일본 토목 기술의 성숙이 결합해 철도성이 본 사업을 정식 결정. 1918-04-01 착공.</li>
</ul>

<h3>3. 동시기 세계 장대 터널의 시대</h3>
<ul>
  <li><strong>1882 고타르 터널(15,003m)</strong>: 스위스-이탈리아 알프스. 당시 세계 최장 철도 터널.</li>
  <li><strong>1906 심플론 터널(19,803m)</strong>: 스위스-이탈리아. 본 터널 완공 시점까지 세계 최장 기록 유지.</li>
  <li><strong>1916 카스카드 터널(12,540m)</strong>: 미국 워싱턴주. 북미 최장 철도 터널.</li>
  <li><strong>일본의 위상</strong>: 본 사업을 통해 "동양 최장·세계 2위" 진입을 노렸으며, 1934년 개통 시점에서 그 목표 달성.</li>
</ul>`,
  },
  {
    order: 2,
    title: '공사 경과 — 16년 8개월의 난공사',
    sectionType: 'process',
    content: `<p>1918-04-01 동서 양 갱구(아타미 측·칸나미 측)에서 동시 굴착 개시 후 16년 8개월에 걸친 난공사가 진행되었다. 당초 예상 약 7년 공기가 두 배 이상으로 지연된 핵심 원인은 (1) 하코네 외륜산의 복잡한 화산암·연약 지반, (2) 탄나 분지 지하 수계의 막대한 출수, (3) 1923 관동 대지진·1930 북이즈 지진의 영향, (4) 세 차례의 대규모 인명 사고였다.</p>

<h3>1. 1918-04-01 ~ 1921-04-01 초기 굴착 단계</h3>
<ul>
  <li><strong>동서 양 갱구 동시 굴착</strong>: 아타미 측(동)·칸나미 측(서)에서 동시 굴착. 일일 약 1~2m 굴진 속도.</li>
  <li><strong>표면 지질 — 화산암</strong>: 초기 약 500m 구간에서는 하코네 화산암 지대를 비교적 안정적으로 굴착.</li>
  <li><strong>1921-04 임계점 도달</strong>: 동측 약 1,500m 지점에서 탄나 분지 지하 수계 접근. 출수량 급증.</li>
</ul>

<h3>2. 1921-04-01 1차 대출수 사고</h3>
<ul>
  <li><strong>4월 1일 갱구 출수 폭발</strong>: 동측 갱구에서 약 분당 3,200리터의 고압수가 갑작스럽게 분출. 작업 중이던 17명의 광부가 갇혀 16명 사망(1명 구조).</li>
  <li><strong>약 6개월 정지</strong>: 출수 진정과 안전 대책 수립까지 약 6개월간 공사 중단.</li>
  <li><strong>압기식(空気圧) 시공법 도입</strong>: 1921 사고 이후 갱내 압축 공기를 주입해 출수를 억제하는 압기식 시공법 도입. 단 압기로 인한 잠수병·청각 손상 등 새 작업 위험 누적.</li>
</ul>

<h3>3. 1923 관동 대지진의 영향</h3>
<ul>
  <li><strong>1923-09-01 본진</strong>: M7.9. 진앙은 사가미만으로 본 공사장 약 30km. 다행히 갱내 인명 피해는 없었으나 굴착 단면 일부 변형.</li>
  <li><strong>약 2개월 정지</strong>: 도쿄·요코하마 대피해로 자재 공급이 단절되어 약 2개월간 공사 중단.</li>
</ul>

<h3>4. 1924-02-04 갱내 화재 사고</h3>
<ul>
  <li><strong>2월 4일 압기 펌프 화재</strong>: 동측 갱구 약 2,500m 지점에서 압축공기 펌프 모터가 과열로 발화. 갱내 산소 결핍과 일산화탄소 확산으로 16명 사망.</li>
  <li><strong>환기 시스템 전면 재설계</strong>: 사고 후 갱내 환기 시스템을 전면 재설계. 일본 터널 공학의 환기 표준이 본 사고를 계기로 확립.</li>
</ul>

<h3>5. 1930-11-26 북이즈 지진 사고</h3>
<ul>
  <li><strong>11월 26일 본진</strong>: M7.3. 진앙이 탄나 분지 직하로 본 공사장이 진앙역에 위치. 갱내 작업자 3명 즉사.</li>
  <li><strong>단면 2.4m 횡 변위</strong>: 굴착 단면이 수평으로 약 2.4m, 수직으로 약 0.6m 변위. 동서 양 갱구의 굴착선이 어긋나는 대형 문제 발생.</li>
  <li><strong>약 8개월 정지·재설계</strong>: 변위된 단면을 재정렬하는 약 8개월의 재설계 작업이 추가로 필요. 본 지진이 공기 지연의 가장 큰 단일 원인.</li>
</ul>

<h3>6. 1931~1934 최종 굴진</h3>
<ul>
  <li><strong>1931~1933 출수 누적</strong>: 약 5억 톤 추정 지하수 배수가 누적되면서 상부 탄나 분지의 샘과 논이 점차 고갈.</li>
  <li><strong>1933-06-19 관통</strong>: 동서 양 갱구의 굴착선이 최종 관통. 약 15년 2개월의 굴착 완료.</li>
  <li><strong>1934-12-01 개통</strong>: 약 1년 5개월의 보강·궤도 부설 후 정식 개통.</li>
</ul>`,
  },
  {
    order: 3,
    title: '주요 사고 — 67명 희생의 무게',
    sectionType: 'process',
    content: `<p>16년 8개월 공사 기간 중 약 67명의 노동자가 사망한 것으로 공식 기록되었다. 일본 토목사에서 단일 사업 기준 최대 규모의 인명 피해이며, 본 사고들이 후일 일본 터널 공학의 안전 표준 확립의 핵심 사례가 되었다.</p>

<h3>1. 사고 통계 (공식 기록)</h3>
<ul>
  <li><strong>총 사망자</strong>: 약 67명 (공식 기록 기준).</li>
  <li><strong>총 부상자</strong>: 약 530명 (중상자 약 100명 포함).</li>
  <li><strong>주요 사인</strong>: 출수 압사·익사(약 25명), 화재 일산화탄소 중독(약 16명), 지진 압사(약 3명), 낙반·기계 사고(약 23명).</li>
</ul>

<h3>2. 1921-04-01 1차 출수 사고 (16명 사망)</h3>
<ul>
  <li><strong>발생 — 동측 약 1,500m</strong>: 동측 갱구에서 약 1,500m 지점 굴진 중 갑작스러운 출수 폭발. 분당 약 3,200리터의 고압수가 작업자들을 압사·익사시킴.</li>
  <li><strong>17명 매몰 → 16명 사망·1명 구조</strong>: 다이묘 분지 지하 수계의 막대한 압력을 사전 예측하지 못한 결과.</li>
  <li><strong>후속 — 압기식 도입</strong>: 사고 이후 갱내에 압축 공기를 주입해 출수 압력을 균형 잡는 압기식 시공법 도입. 그러나 압기로 인한 잠수병 등 새 작업 위험 발생.</li>
</ul>

<h3>3. 1924-02-04 갱내 화재 (16명 사망)</h3>
<ul>
  <li><strong>발생 — 동측 약 2,500m</strong>: 압축공기 펌프 모터가 과열로 발화. 갱내 환기 부족으로 산소 결핍과 일산화탄소 확산.</li>
  <li><strong>16명 사망</strong>: 작업 중이던 광부 16명이 일산화탄소 중독으로 사망. 갱내 작업 중 화재는 즉각적 사망 위험이 가장 큰 사고 유형.</li>
  <li><strong>후속 — 환기 표준 확립</strong>: 사고 후 갱내 환기 시스템을 전면 재설계. 일본 터널 공학의 환기 안전 표준이 본 사고를 계기로 확립.</li>
</ul>

<h3>4. 1930-11-26 북이즈 지진 사고 (3명 사망)</h3>
<ul>
  <li><strong>발생 — 단면 2.4m 변위</strong>: 북이즈 지진(M7.3)의 진앙이 탄나 분지 직하. 갱내 작업자 3명이 단면 변형으로 즉사.</li>
  <li><strong>2.4m 횡 변위</strong>: 굴착 단면이 수평으로 약 2.4m, 수직으로 약 0.6m 변위. 동서 양 갱구의 굴착선이 어긋남.</li>
  <li><strong>후속 — 내진 설계 표준 확립</strong>: 사고 후 일본 터널의 내진 설계 표준이 본 사고를 계기로 확립.</li>
</ul>

<h3>5. 67명 위령비</h3>
<ul>
  <li><strong>1934-12-01 위령비 건립</strong>: 개통식 당일 아타미역 앞에 67명의 위령비 건립.</li>
  <li><strong>매년 위령제</strong>: 현재까지도 매년 12월 1일 위령제 거행.</li>
  <li><strong>일본 토목 노동사의 표준 기념물</strong>: "공사 안전의 윤리"의 표준 기념물 중 하나로 평가.</li>
</ul>`,
  },
  {
    order: 4,
    title: '개통과 영향 — 도카이도의 재편과 탄나 분지의 격변',
    sectionType: 'aftermath',
    content: `<p>1934-12-01 개통과 동시에 도카이도 본선의 재편, 탄나 분지의 농업 격변, 일본 토목 공학의 표준 확립, 1964 신칸센 토대 마련 등 다층적 영향이 단기간에 누적되었다.</p>

<h3>1. 도카이도 본선의 직결화</h3>
<ul>
  <li><strong>도쿄~오사카 약 23분 단축</strong>: 본 터널 개통으로 약 18.7km·평균 약 100m 표고 단축. 도쿄~오사카 소요시간이 약 23분 단축.</li>
  <li><strong>야간 침대 열차의 안정성 개선</strong>: 우회 구간의 급경사 해소로 야간 침대 열차의 운행 안정성 결정적 개선. 도쿄-오사카 간 사업 통근 패턴의 시초 형성.</li>
  <li><strong>화물 운송 효율 약 30% 개선</strong>: 보조 기관차 견인 불필요로 화물 운송 비용 약 30% 절감.</li>
</ul>

<h3>2. 고텐바선의 격하</h3>
<ul>
  <li><strong>고텐바선(御殿場線) 격하</strong>: 기존 우회로(약 60.2km)가 단선 지선으로 격하. 도카이도 본선에서 단순 지선으로 전환.</li>
  <li><strong>고텐바 지역 침체</strong>: 본 노선의 격하로 고텐바 일대의 경제·인구가 침체. 약 90년 후 현재까지도 본 사건의 직접적 영향 지속.</li>
  <li><strong>관광 가치만 잔존</strong>: 고텐바선이 후지산 조망 노선으로 일부 관광 가치를 유지하면서 현재까지 단선 운영.</li>
</ul>

<h3>3. 탄나 분지 농업의 격변</h3>
<ul>
  <li><strong>약 5억 톤 지하수 배수</strong>: 16년 공사 기간 누적 배수량 추정. 상부 탄나 분지(해발 약 250m)의 모든 샘과 논이 점차 고갈.</li>
  <li><strong>1934~1940 농업 전환</strong>: 분지 농민들이 약 6년에 걸쳐 벼 농사에서 도쿄 시장 대상 낙농업으로 전환.</li>
  <li><strong>"탄나 우유·치즈" 브랜드</strong>: 1940년대부터 탄나 분지가 일본 낙농업의 표준 모델 중 하나로 자리매김. 오늘날 "탄나 우유·치즈"가 일본 낙농의 대표 브랜드.</li>
  <li><strong>주민 보상 문제</strong>: 1934~1938 철도성과 탄나 분지 주민 사이에 보상 협상. 최종적으로 약 50만 엔(당시 거액)의 보상금 지급으로 합의.</li>
</ul>

<h3>4. 일본 토목 공학의 표준 확립</h3>
<ul>
  <li><strong>출수 대응 표준</strong>: 압기식 시공법·예비 배수공 운용·갱내 수문 측량의 일본 표준이 본 사업을 통해 확립.</li>
  <li><strong>갱내 환기 표준</strong>: 1924 화재 사고를 계기로 갱내 강제 환기 시스템의 일본 표준 확립.</li>
  <li><strong>내진 설계 표준</strong>: 1930 북이즈 지진 사고를 계기로 일본 터널의 내진 설계 표준 확립.</li>
  <li><strong>후속 사업 활용</strong>: 1937 간몬 터널·1942 후키아게 터널·1961 호쿠리쿠 터널 등 일본의 후속 장대 터널 모두 본 사업의 기술 데이터 활용.</li>
</ul>

<h3>5. 1964 신칸센 신탄나 터널의 토대</h3>
<ul>
  <li><strong>1964-10-01 신탄나 터널 개통</strong>: 도카이도 신칸센 도쿄~신오사카 개통 시 본 터널 옆에 평행하게 신탄나 터널(7,959m) 건설.</li>
  <li><strong>지질·수문 데이터 활용</strong>: 본 터널의 지질·수문 데이터가 신탄나 터널 굴착에 직접 활용. 신탄나 공사 시 본 공사에서 누락되었던 지하수 처리 노하우가 결정적 기여.</li>
  <li><strong>신칸센 건설사의 기술적 토대</strong>: 본 사업이 일본 신칸센 건설사의 기술적 출발점 중 하나로 평가.</li>
</ul>`,
  },
]

// ── 메인 시드 함수 ────────────────────────────────────────────────────────
export async function seedTannaTunnel1934(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📜 1934 탄나 터널 개통 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재 — 시딩 중단')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const empireHC = await prisma.historicalCountry.findFirst({
    where: { name: '일본 제국' },
    select: { id: true },
  })
  if (!empireHC) {
    console.warn('  ⚠️  일본 제국 historicalCountry 미존재 — 시딩 중단')
    return
  }

  // ── 1) 신규 인물 등록 ────────────────────────────────────────────────────
  console.log('\n  👥 신규 인물 등록...')
  const personIdByOriginalName = new Map<string, string>()
  for (const p of NEW_PERSONS) {
    const existing = await prisma.person.findFirst({
      where: { originalName: p.originalName },
    })
    let personId: string
    if (existing) {
      personId = existing.id
      console.log(`    ⏭️  ${p.originalName} (이미 존재)`)
    } else {
      const created = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          biography: p.biography,
          birthEra: 'AD' as any,
          birthDate: new Date(p.birthYear, p.birthMonth - 1, p.birthDay),
          deathEra: p.deathYear ? ('AD' as any) : undefined,
          deathDate: p.deathYear
            ? new Date(p.deathYear, (p.deathMonth ?? 1) - 1, p.deathDay ?? 1)
            : undefined,
          isAlive: p.isAlive,
          gender: p.gender,
          nameDisplayOrder: 'korean',
          influence: p.influence,
          accountId: ACCOUNT_ID,
        },
      })
      personId = created.id
      console.log(`    ✅ ${p.originalName} (영향력 ${p.influence})`)
    }
    personIdByOriginalName.set(p.originalName, personId)

    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        historicalCountryId: empireHC.id,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: empireHC.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 0,
        },
      })
    }
  }

  // ── 2) 사건 등록 ────────────────────────────────────────────────────────
  const TITLE = '일본 탄나 터널 개통 — 16년 8개월의 난공사 (1934)'
  const START_DATE = '1918-04-01'
  const END_DATE = '1934-12-01'

  const existing = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date(START_DATE),
      deletedAt: null,
    },
  })

  let eventId: string
  if (existing) {
    eventId = existing.id
    console.log(`\n  ⏭️  사건 이미 존재 — 스킵: ${TITLE} (id=${eventId})`)
  } else {
    const created = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date(START_DATE),
        startDatePrecision: 'day',
        endDate: new Date(END_DATE),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: empireHC.id,
        createdById: admin.id,
      },
    })
    eventId = created.id
    console.log(`\n  ✅ 사건 생성: ${TITLE} (id=${eventId})`)
  }

  // ── 3) EventSection ────────────────────────────────────────────────────
  console.log('\n  📜 본문 섹션 등록...')
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId, title: section.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 4) EventCountryRelation ────────────────────────────────────────────
  console.log('\n  🌍 국가 관계 등록...')
  const relExists = await prisma.eventCountryRelation.findFirst({
    where: {
      eventId,
      historicalCountryId: empireHC.id,
      role: EventCountryRole.PARTICIPANT,
    },
  })
  if (relExists) {
    console.log(`    ⏭️  국가관계 스킵: 일본 제국`)
  } else {
    await prisma.eventCountryRelation.create({
      data: {
        eventId,
        historicalCountryId: empireHC.id,
        role: EventCountryRole.PARTICIPANT,
        roleDescription:
          '본 사업의 주체국. 1918년 철도성이 착공해 16년 8개월의 난공사 끝에 ' +
          '1934-12-01 완공. 완공 당시 세계 2위·동양 최장 철도 터널로, ' +
          '일본 토목 공학의 표준 매뉴얼을 본 사업을 통해 확립. ' +
          '도카이도 본선 직결화, 탄나 분지 농업 격변, ' +
          '1964 신칸센 토대 마련 등 다층적 영향을 미쳤다.',
      },
    })
    console.log(`    ✅ 국가관계: 일본 제국 (PARTICIPANT)`)
  }

  // ── 5) PersonEvent ─────────────────────────────────────────────────────
  console.log('\n  👤 인물-사건 관계 등록...')
  for (const p of NEW_PERSONS) {
    const personId = personIdByOriginalName.get(p.originalName)
    if (!personId) continue
    const exists = await prisma.personEvent.findFirst({
      where: { personId, eventId },
    })
    if (exists) {
      console.log(`    ⏭️  인물관계 스킵: ${p.originalName}`)
      continue
    }
    await prisma.personEvent.create({
      data: {
        personId,
        eventId,
        role: '공사 책임 기사 — 16년 8개월 단독 책임',
        note:
          '1918 착공부터 1934 개통까지 약 16년 8개월간 사실상 단독 책임. ' +
          '1921 출수·1924 화재·1930 지진 등 대규모 재난을 현장에서 직접 대응. ' +
          '개통식에서 "67명 희생의 무게를 평생 지고 살겠다"는 발언으로 일본 토목사에서 ' +
          '공사 책임 기사의 윤리의 표준 사례로 평가된다.',
      },
    })
    console.log(`    ✅ 인물관계: ${p.originalName}`)
  }

  console.log(`\n✅ 1934 탄나 터널 개통 시딩 완료\n`)
}
