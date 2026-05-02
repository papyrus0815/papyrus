/**
 * 1872년 긴자 대화재(銀座大火 / 和田倉門火災 / 明治5年大火) 시드
 *
 * 등록 항목:
 *  - Event(부모): 긴자 대화재 (1872-04-03 발화 ~ 1872-04-04 진화)
 *  - Event(자식): 긴자 연와가 건설(1872-04 ~ 1877-12) — 화재 재건 사업
 *  - EventSection(부모): 발화·연소 경과 / 피해 규모 / 긴자 연와가 재건 사업 / 사회·문화적 의의
 *  - EventSection(자식): 토머스 워터스의 도시 설계 / 시공·재정 / 시민 반응과 한계
 *  - EventCountryRelation: 일본 제국(피해·재건 주체)
 *  - PersonEvent: 오쿠마 시게노부(재건 총괄·大蔵卿) — 인물이 시드된 경우만 연결
 *
 * 의존성: seedJapanMeijiEra(일본 제국·오쿠마)·seedEventCategories('사회')·admin.
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '사회'

export async function seedJapan1872GinzaFire(prisma: PrismaService): Promise<void> {
  console.log('\n🔥 1872년 긴자 대화재(메이지 대화재) 시딩 시작...')

  // ── 사전 의존성 ─────────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 없음 — 시딩 중단 (admin.seed 먼저 실행)')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  카테고리 미존재: ${EVENT_CATEGORY_NAME}`)
    return
  }

  const empireHc = await prisma.historicalCountry.findFirst({
    where: { name: '일본 제국' },
    select: { id: true },
  })
  if (!empireHc) {
    console.warn('  ⚠️  일본 제국 hc 미존재 — seedJapanMeijiEra 먼저 실행 필요')
    return
  }

  // ── 1) 부모 사건 ────────────────────────────────────────────────────
  const PARENT_TITLE = '긴자 대화재 (1872 메이지 대화재)'
  const PARENT_START = new Date('1872-04-03')

  let parent = await prisma.event.findFirst({
    where: { title: PARENT_TITLE, startDate: PARENT_START, deletedAt: null },
  })

  if (parent) {
    console.log(`  ⏭️  부모 사건 이미 존재: ${PARENT_TITLE}`)
  } else {
    parent = await prisma.event.create({
      data: {
        title: PARENT_TITLE,
        description:
          '1872년 4월 3일(메이지 5년 음력 2월 26일) 저녁, 도쿄부 황거(고쿄) 와다쿠라몬(和田倉門) 외측 옛 아이즈한 저택 자리에서 발화하여 약 28시간 동안 강풍을 타고 동남쪽으로 번지며 긴자(銀座)·교바시(京橋)·쓰키지(築地) 일대 약 41정(町, 약 95헥타르)을 잿더미로 만든 대화재. 메이지 정부 수립 후 도쿄에서 발생한 가장 큰 화재 중 하나로, 황거 인근의 정부 청사·외국인 거류지·번화가가 동시에 피해를 입어 사회적 충격이 컸다. 이 화재를 계기로 정부는 토머스 워터스(Thomas Waters)에게 설계를 맡겨 1872~1877년 긴자 일대를 서양식 벽돌(煉瓦) 도시로 재건하는 "긴자 연와가(銀座煉瓦街)" 사업을 단행, 일본 근대 도시계획의 출발점이 되었다.',
        startDate: PARENT_START,
        startDatePrecision: 'day',
        endDate: new Date('1872-04-04'),
        endDatePrecision: 'day',
        location: '도쿄부 — 황거 와다쿠라몬·긴자·교바시·쓰키지 일대 (현 도쿄도 치요다구·주오구)',
        categoryId: category.id,
        historicalCountryId: empireHc.id,
        background:
          '메이지 초기의 도쿄는 에도 시대의 목조 가옥이 그대로 남아 있는 인구 약 80만의 거대한 목조 도시였다. 다이묘 屋敷가 비어 있던 황거 주변 일대는 1869년 도쿄 천도 이후 정부 청사로 전용되었으나 화재 대비책은 빈약했다. 1869년·1871년에도 도쿄에서 대형 화재가 잇따라 발생, 정부는 도시 방재 필요성을 절감하던 차였다. 화재 직전 며칠간 강한 서풍이 계속되어 발화 시 급속한 연소 조건이 갖춰져 있었다.',
        aftermath:
          '발화 28시간 만에 진화되었으나, 약 4,879호(사료에 따라 4,000~5,000호)가 전소되고 약 95헥타르가 잿더미가 되었다. 사망자는 수 명에 그쳤으나 황거 인근 정부 시설·외국인 거류지(쓰키지) 일부·번화가 긴자가 한꺼번에 소실되어 정부의 충격은 컸다. 이에 메이지 정부는 4월 중순 즉각 도쿄부에 "긴자 연와가 건설안"을 명령, 도쿄부지사 유리 기미마사(由利公正)와 大蔵卿(재무장관) 오쿠마 시게노부(大隈重信)의 주도로 영국인 토머스 워터스를 초빙해 서양식 벽돌 도시 재건을 시작했다. 1873년 부분 개통, 1877년 완공된 긴자 연와가는 약 900동의 2~3층 서양식 벽돌 건물·15間(약 27m) 폭 도로·가스등·버드나무 가로수로 구성되어 분메이카이카(文明開化)의 상징이 되었다.',
        keywords: [
          '긴자대화재', '메이지5년대화재', '와다쿠라몬화재', '銀座大火', '銀座煉瓦街',
          '메이지유신', '분메이카이카', '도쿄도시계획', '오쿠마시게노부', '토머스워터스', '유리기미마사',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 부모 사건 생성: ${PARENT_TITLE} (id=${parent.id})`)
  }

  // ── 2) 자식 사건: 긴자 연와가 건설 ─────────────────────────────────
  const CHILD_TITLE = '긴자 연와가(銀座煉瓦街) 건설'
  const CHILD_START = new Date('1872-04-15')

  let child = await prisma.event.findFirst({
    where: { title: CHILD_TITLE, startDate: CHILD_START, parentEventId: parent.id, deletedAt: null },
  })

  if (child) {
    console.log(`  ⏭️  자식 사건 이미 존재: ${CHILD_TITLE}`)
  } else {
    child = await prisma.event.create({
      data: {
        title: CHILD_TITLE,
        description:
          '1872년 긴자 대화재 직후 메이지 정부가 단행한 일본 최초의 본격 서양식 도시 재건 사업. 영국인 토목기사 토머스 워터스가 마스터플랜을 그렸고, 大蔵省(재무성)이 자금을 직접 투입해 5년에 걸쳐 약 900동의 벽돌 건물과 폭 27m의 직선 도로, 가스등, 가로수가 정비되었다. 분메이카이카(文明開化)의 시각적 상징이자 일본 근대 도시계획의 시발점.',
        startDate: CHILD_START,
        startDatePrecision: 'day',
        endDate: new Date('1877-12-31'),
        endDatePrecision: 'month',
        location: '도쿄부 긴자·교바시 일대 — 현 도쿄도 주오구',
        categoryId: category.id,
        historicalCountryId: empireHc.id,
        parentEventId: parent.id,
        background:
          '1872년 4월 3일 화재 직후 메이지 정부는 4월 9일 "煉瓦造 도시 건설" 방침을 결정. 4월 14일 太政官(태정관) 達 제113호로 긴자·교바시 일대의 벽돌 건축 의무화를 공포했다. 외무경(外務卿) 소에지마 다네오미(副島種臣)·大蔵卿 오쿠마 시게노부의 합의 하에 도쿄부지사 유리 기미마사가 시공 책임을 맡았고, 마침 등대 건설을 위해 일본에 와 있던 영국인 기사 토머스 워터스(Thomas James Waters)가 설계자로 발탁되었다.',
        aftermath:
          '1873년 1월 신바시(新橋) 정거장 인근부터 부분 개통, 1877년 12월 전체 완공. 사업비는 약 137만 엔(완공 기준)으로 메이지 정부 1년 예산의 상당 부분을 차지, 입주자에게 25년 분할 상환을 부과했다. 다만 벽돌의 통기성 부족과 서양식 가옥에 대한 시민의 거부감으로 1880년대까지도 빈집이 많았으며, 1923년 관동대지진으로 대부분 붕괴되어 현재는 일부 유구만 남아 있다. 그러나 직선 도로·서양식 가게의 거리 풍경은 메이지·다이쇼기 긴자가 일본 최초의 근대 번화가로 성장하는 토대가 되었다.',
        keywords: [
          '銀座煉瓦街', '긴자연와가', '토머스워터스', 'Thomas Waters', '오쿠마시게노부',
          '유리기미마사', '문명개화', '분메이카이카', '메이지도시계획', '벽돌건축', '가스등',
        ] as any,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 자식 사건 생성: ${CHILD_TITLE} (id=${child.id})`)
  }

  // ── 3) 부모 사건 섹션 ──────────────────────────────────────────────
  const PARENT_SECTIONS: { title: string; content: string; order: number; sectionType?: string }[] = [
    {
      order: 1, title: '발화·연소 경과', sectionType: 'process',
      content: `<p>1872년 4월 3일(메이지 5년 음력 2월 26일) 오후 3시경, 도쿄부 황거 외곽 와다쿠라몬(和田倉門) 외측 — 옛 <strong>아이즈한(会津藩) 저택 자리</strong>에서 불길이 솟았다. 이곳은 메이지 정부의 兵部省(병부성) 부속 건물(병마 사육소·화약 임시 보관소가 있었다는 설이 있다) 부지로, 발화 원인은 정확히 규명되지 않았으나 실화로 추정된다.</p>
<ul>
  <li><strong>15:00경</strong> 와다쿠라몬 외측에서 발화. 마침 며칠째 이어진 강한 서풍을 타고 불길은 동남쪽으로 빠르게 확산.</li>
  <li><strong>15:30~17:00</strong> 마루노우치(丸の内)·야에스(八重洲) 방면을 거쳐 교바시(京橋)에 도달. 이 일대 다이묘 屋敷·정부 청사·상점이 차례로 소실.</li>
  <li><strong>17:00~21:00</strong> 긴자 일대(현 긴자 1~8정목 전역)가 화염에 휩싸임. 당시 긴자는 에도 시대 화폐주조소(銀座役所)가 있었던 데서 이름을 얻은 신흥 상업가.</li>
  <li><strong>21:00~다음날 새벽</strong> 쓰키지(築地)의 외국인 거류지(쓰키지 거류지)·일부 가부키좌(歌舞伎座) 전신 시설로 번짐. 외국인 사상자는 거의 없었으나 외교관저 일부가 소실.</li>
  <li><strong>4월 4일 오전</strong> 풍향 변화와 시민·번 兵의 화재 방지 활동으로 약 28시간 만에 진화.</li>
</ul>
<p>당시 도쿄의 소방은 에도 시대의 정화방조직(町火消)을 그대로 이어받아 갈고리로 가옥을 부숴 연소를 차단하는 "破壊消火" 방식이 주류였고, 근대적 소방펌프·수도망은 갖춰져 있지 않았다. 풍속과 목조 밀집 가옥의 조건이 결합되어 피해가 극대화되었다.</p>`,
    },
    {
      order: 2, title: '피해 규모', sectionType: 'process',
      content: `<p>공식 집계는 도쿄부 보고서 기준 다음과 같다(사료별 편차 있음).</p>
<table>
  <thead><tr><th>구분</th><th>피해 수치</th></tr></thead>
  <tbody>
    <tr><td>소실 면적</td><td>약 41정(町) — 약 95헥타르 (현 긴자·교바시·쓰키지 일부)</td></tr>
    <tr><td>소실 가옥</td><td>약 4,879호(사료별 4,000~5,000호 사이)</td></tr>
    <tr><td>이재민</td><td>약 19,000명</td></tr>
    <tr><td>사망자</td><td>약 3명 — 28시간 연소에 비해 매우 적었음(피난 시간 충분)</td></tr>
    <tr><td>소실 주요 시설</td><td>大蔵省 임시청사 일부, 兵部省 부속 시설, 옛 아이즈한 저택, 쓰키지 외국인 거류지의 외국인 주택 일부, 긴자 상점가 거의 전체</td></tr>
    <tr><td>추정 재산 피해</td><td>약 1,000만 엔 이상(당시 메이지 정부 1년 일반 회계 세입의 큰 부분)</td></tr>
  </tbody>
</table>
<p>황거 본궁(메이지 천황 어소)은 와다쿠라몬에서 직선 거리 약 600m에 있었으나 다행히 직접 피해는 없었다. 다만 정부 핵심부와 외국인 거류지가 동시에 피해를 입은 점은 메이지 신정부에 큰 정치적 충격을 주었다.</p>`,
    },
    {
      order: 3, title: '긴자 연와가 재건 사업', sectionType: 'aftermath',
      content: `<p>화재 직후 메이지 정부는 종래의 목조 도시를 근본적으로 바꾸기로 결정했다. 4월 9일 太政官 회의에서 긴자·교바시 일대의 <strong>전면 벽돌(煉瓦)化</strong> 방침이 확정되었고, 4월 14일 태정관 達 제113호로 다음과 같은 사항이 공포되었다.</p>
<ol>
  <li><strong>건축 의무</strong>: 화재 구역의 신축은 모두 벽돌·기와·석재만 사용. 목조 건축 금지.</li>
  <li><strong>도로 확폭</strong>: 긴자 도리(현 中央通り) 도로 폭을 15間(약 27m)으로 확장 — 기존의 약 2배.</li>
  <li><strong>설계 책임</strong>: 영국인 기사 토머스 워터스(Thomas James Waters)에게 마스터플랜과 첫 시공을 위탁.</li>
  <li><strong>재정</strong>: 大蔵省(大隈重信 大蔵卿)이 직접 융자, 입주자에게 25년 분할 상환.</li>
  <li><strong>의장 통일</strong>: 영국 조지안·이탈리안 양식이 절충된 2~3층 벽돌 가옥, 1층 아케이드(베란다), 가스등·버드나무 가로수로 가로 경관 통일.</li>
</ol>
<p>1873년 1월 신바시(현 신바시역) 정거장 인근부터 부분 개통, 1877년 12월 약 900동(주거 800동+상점 100동)의 벽돌 건물이 완공되었다. 사업비는 약 137만 엔이었다.</p>`,
    },
    {
      order: 4, title: '사회·문화적 의의', sectionType: 'aftermath',
      content: `<p>긴자 대화재와 그에 이은 연와가 사업은 일본 근대사에 다음과 같은 의미를 남겼다.</p>
<ul>
  <li><strong>도시계획의 시발</strong>: 일본 정부가 직접 도시 경관과 건축 양식을 통제·설계한 최초의 사업. 이후 1888년 도쿄 시구개정조례(東京市区改正条例)로 이어지며 근대 도시계획의 모태가 되었다.</li>
  <li><strong>분메이카이카의 시각적 상징</strong>: 가스등(1874 점등)·버드나무 가로수·서양식 진열창의 거리는 신문·우키요에·사진을 통해 전국에 알려져 메이지 신문화의 아이콘이 되었다.</li>
  <li><strong>고용 외국인 정책의 본격화</strong>: 토머스 워터스 외에도 콘도르(Josiah Conder) 등 영국 출신 건축·토목 기사들이 잇따라 초빙되어 일본 근대 건축의 토대를 형성했다.</li>
  <li><strong>한계와 시민 거부감</strong>: 벽돌은 통기성이 떨어지고 습기가 차서 건강에 좋지 않다는 평이 많았고, 가스등·서양식 진열창은 도쿄 서민 정서와 거리가 있었다. 사업 초기 빈집이 많았으며 1880년대 들어서야 상업가로 정착했다.</li>
  <li><strong>관동대지진(1923)으로 소멸</strong>: 긴자 연와가의 대부분은 1923년 9월 1일 관동대지진과 화재로 붕괴, 현재는 긴자 4정목 일부 유구·박물관 전시 외에는 남아 있지 않다.</li>
</ul>`,
    },
  ]

  for (const s of PARENT_SECTIONS) {
    const exists = await prisma.eventSection.findFirst({ where: { eventId: parent.id, title: s.title } })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵: ${s.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: parent.id,
        title: s.title,
        content: s.content,
        order: s.order,
        sectionType: s.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${s.title}`)
  }

  // ── 4) 자식 사건 섹션 ──────────────────────────────────────────────
  const CHILD_SECTIONS: { title: string; content: string; order: number; sectionType?: string }[] = [
    {
      order: 1, title: '토머스 워터스의 도시 설계', sectionType: 'process',
      content: `<p>설계자 <strong>토머스 제임스 워터스(Thomas James Waters, 1842~1898)</strong>는 1864년경 일본에 와 오사카 조폐료(造幣寮)·요코하마 등대 등을 설계한 영국 출신 토목·건축 기사다. 1872년 화재 직후 우대신(右大臣) 산조 사네토미(三条実美)·외무경 소에지마 다네오미·大蔵卿 오쿠마 시게노부의 회의에서 그가 설계자로 지명되었다.</p>
<p>워터스의 마스터플랜은 다음을 핵심으로 했다.</p>
<ul>
  <li>긴자 도리(현 中央通り)를 폭 15間(약 27m)·길이 약 1km의 직선 대로로 확폭. 그 양 옆에 일률적 벽돌 가옥 행렬을 배치.</li>
  <li>건물은 2~3층 벽돌 라이트(柱粱)식, 1층 전면에 아케이드(베란다·콜로네이드)를 둠 — 이탈리아 갈레리아의 영향.</li>
  <li>주요 교차로에는 광장과 가스등(1874년 4월 일본 최초로 점등)·버드나무 가로수를 배치.</li>
  <li>하수도와 보도 분리, 우편함·전신주 등 근대 인프라 매설.</li>
</ul>
<p>벽돌은 처음에는 도쿄 시바(芝)에 임시로 설치된 가마에서 구워졌고, 이후 가나가와현 호도가야(保土ヶ谷)에 영구 벽돌 공장이 세워졌다. 워터스는 1876년까지 사업을 지휘한 후 일본을 떠나 캘리포니아로 이주했다.</p>`,
    },
    {
      order: 2, title: '시공 체계와 재정', sectionType: 'process',
      content: `<p>사업 추진 체계는 정부가 직접 시공·자금을 투입하는 강력한 관영 방식이었다.</p>
<ul>
  <li><strong>총괄 책임</strong>: 大蔵卿 오쿠마 시게노부(재정·기획), 도쿄부지사 유리 기미마사(행정 집행) → 1872년 6월 후임 오쿠보 이치오(大久保一翁).</li>
  <li><strong>설계·감리</strong>: 토머스 워터스(외무성 御雇い 외국인) — 월급 800엔(당시 일본 관료 최고위급의 약 2배).</li>
  <li><strong>시공</strong>: 도쿄부 직영. 일본인 棟梁(목수 우두머리)을 동원했으나 벽돌 적층 기법은 영국인 기술자가 직접 가르쳤다.</li>
  <li><strong>재정 구조</strong>: 화재로 가옥을 잃은 토지 소유자에게 정부가 벽돌 가옥을 건축해 분배하고, 건축비를 25년 분할(연 6% 이자)로 회수하는 방식. 사업비 총액 약 137만 엔.</li>
  <li><strong>건축 분류</strong>: 1등 건물(긴자 도리 양면 — 벽돌 2~3층 본격 양식), 2등(裏通り — 벽돌 단순), 3등(주택가 — 벽돌+목조 혼합) 3개 등급으로 나누어 시공.</li>
</ul>
<p>1873년 1월 신바시 정거장(일본 최초의 철도 종착역, 전년 1872년 9월 12일 개통)과 연결된 신바시~교바시 구간이 우선 완공되어 일본 최초의 "근대 가로 풍경"이 등장했다.</p>`,
    },
    {
      order: 3, title: '시민 반응과 한계', sectionType: 'aftermath',
      content: `<p>긴자 연와가는 분메이카이카의 시각적 상징이 되었으나, 실제 거주자에게는 다음과 같은 불만이 컸다.</p>
<ol>
  <li><strong>습기와 통풍 문제</strong>: 벽돌이 습기를 머금어 일본의 여름 무더위·장마에 부적합. "습이 차서 다다미가 썩는다"는 평.</li>
  <li><strong>비싼 임대료</strong>: 분할 상환금이 일반 가옥의 임대료보다 1.5~2배 높아 입주자 모집 난항.</li>
  <li><strong>서양식 가옥에 대한 위화감</strong>: 메이지 초기 일본 서민에게 의자·테이블·도토리(土間 없는 마루) 구조는 낯설었음. 1880년대 중반까지 긴자 연와가에는 빈집이 많았다.</li>
  <li><strong>치안 문제</strong>: 가로수와 가스등이 어두운 골목을 일부 가려 매춘·소매치기 등이 늘었다는 신문 보도.</li>
</ol>
<p>그러나 1880년대 후반 신문사·서점·양복점·정육점·이발소 등 신흥 상업이 차례로 입주하며 긴자는 일본 최초의 "양품(洋品) 거리"로 자리잡았다. 1900년경 도쿄 시민 사이에서 "긴부라(銀ぶら)" — 긴자를 산책하는 것이 유행어가 될 정도로 분메이카이카의 일상화가 진행되었다.</p>
<p>1923년 9월 1일 <strong>관동대지진</strong>의 강진과 직후 화재로 긴자 연와가의 약 90%가 붕괴·소실되었다. 현재 긴자 4정목 일대 도로 아래에 일부 유구가 보존되어 있고, 도쿄 도립박물관·에도도쿄박물관에서 일부 벽돌·아치를 전시한다.</p>`,
    },
  ]

  for (const s of CHILD_SECTIONS) {
    const exists = await prisma.eventSection.findFirst({ where: { eventId: child.id, title: s.title } })
    if (exists) {
      console.log(`    ⏭️  자식 섹션 스킵: ${s.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: child.id,
        title: s.title,
        content: s.content,
        order: s.order,
        sectionType: s.sectionType ?? null,
      },
    })
    console.log(`    ✅ 자식 섹션: ${s.title}`)
  }

  // ── 5) 국가 관계 (부모) ────────────────────────────────────────────
  const PARENT_RELATIONS = [
    {
      historicalCountryId: empireHc.id,
      role: EventCountryRole.PARTICIPANT,
      roleDescription: '피해 발생국 + 재건 주도국. 메이지 정부가 직접 자금을 투입해 긴자 연와가 사업을 추진.',
    },
  ]
  for (const rel of PARENT_RELATIONS) {
    const exists = await prisma.eventCountryRelation.findFirst({
      where: { eventId: parent.id, historicalCountryId: rel.historicalCountryId, role: rel.role },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵 (부모)`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: parent.id,
        historicalCountryId: rel.historicalCountryId,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ 국가관계 (부모): 일본 제국 (${rel.role})`)
  }

  // 자식 사건도 동일 국가 관계 등록
  for (const rel of PARENT_RELATIONS) {
    const exists = await prisma.eventCountryRelation.findFirst({
      where: { eventId: child.id, historicalCountryId: rel.historicalCountryId, role: rel.role },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵 (자식)`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: child.id,
        historicalCountryId: rel.historicalCountryId,
        role: rel.role,
        roleDescription: '재건 사업 시행 주체. 大蔵省·도쿄부가 직접 시공.',
      },
    })
    console.log(`    ✅ 국가관계 (자식): 일본 제국 (${rel.role})`)
  }

  // ── 6) 인물 관계 (오쿠마 시게노부 — 大蔵卿) ────────────────────────
  const okuma = await prisma.person.findFirst({
    where: { originalName: 'Ōkuma Shigenobu' },
    select: { id: true },
  })
  if (okuma) {
    for (const ev of [
      { id: parent.id, role: '재건 사업 총괄(大蔵卿)', note: '화재 직후 大蔵省 자금 투입과 분할 상환 구조 설계.' },
      { id: child.id, role: '재정·기획 책임(大蔵卿)', note: '약 137만 엔 사업비를 25년 분할 상환으로 회수.' },
    ]) {
      const exists = await prisma.personEvent.findFirst({
        where: { personId: okuma.id, eventId: ev.id },
      })
      if (exists) {
        console.log(`    ⏭️  인물관계 스킵: 오쿠마 시게노부`)
        continue
      }
      await prisma.personEvent.create({
        data: { personId: okuma.id, eventId: ev.id, role: ev.role, note: ev.note },
      })
      console.log(`    ✅ 인물관계: 오쿠마 시게노부 (${ev.role})`)
    }
  } else {
    console.log('    ℹ️  오쿠마 시게노부 미시드 — PersonEvent 연결 생략(seedJapanMeijiEra 실행 시 자동 처리됨)')
  }

  console.log(`\n✅ 1872년 긴자 대화재 시딩 완료\n`)
}
