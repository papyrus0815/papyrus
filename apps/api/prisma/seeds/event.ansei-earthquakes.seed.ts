/**
 * 안세이 대지진(安政大地震 1854~1855) 시드 — *3건 독립 사건* 구조
 *
 * 1854~1855년 일본 열도를 강타한 *안세이 시기 3대 거대 지진* 시리즈를 각자
 * 발생 날짜에 *별도 최상위 사건*으로 등록한다 (Timeline에서 시간축 위치가
 * 정확히 분리되어 표시되도록).
 *
 *  ① 1854-12-23  안세이 도카이 지진(M8.4)
 *  ② 1854-12-24  안세이 난카이 지진(M8.4)
 *  ③ 1855-11-11  안세이 에도 지진(M7.0)
 *
 * 등록 항목:
 *  - Event(독립) × 3
 *  - EventSection: 사건별 3섹션 (배경·발생/피해·후속 영향)
 *  - EventCountryRelation: 도쿠가와 막부(VICTIM) — Timeline 메인 국가 lane 자동 배치
 *
 * 마이그레이션 로직:
 *  이전 시드(parent "안세이 대지진 (1854~1855)" + 3 children)가 이미 실행됐다면
 *  자식의 parentEventId를 null 처리하고, parent 사건/섹션/국가관계를 정리한다.
 *
 * 의존성: seedKurofune(도쿠가와 막부 historicalCountry) · seedEventCategories('사회') · admin
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '사회'
const SHOGUNATE_NAME = '도쿠가와 막부'

const OBSOLETE_PARENT_TITLE = '안세이 대지진 (1854~1855)'

interface EarthquakeEntry {
  title: string
  startDate: Date
  description: string
  location: string
  background: string
  aftermath: string
  keywords: string[]
  sections: { order: number; title: string; sectionType: string; content: string }[]
}

const QUAKES: EarthquakeEntry[] = [
  // ────────────────────────── ① 도카이 ──────────────────────────
  {
    title: '안세이 도카이 지진(安政東海地震)',
    startDate: new Date('1854-12-23'),
    description:
      '1854년 12월 23일 오전 9시 15분경(안세이 1년 음력 11월 4일) 도카이도(東海道) 연안 앞바다(엔슈나다~스루가만)에서 발생한 추정 모멘트 규모 M8.4의 거대 지진. 진원은 도카이 트라프(남해 트라프 동쪽 구간). 시즈오카·아이치·미에를 중심으로 가옥 전파 약 1만 호, 쓰나미가 시모다·도바·구마노 일대 항만을 강타해 시모다는 거의 완전 파괴되었다. 사망자 약 2,000~3,000명. 페리 내항(1853-07) 직후 격변기에 발생한 *안세이 3대 지진* 시리즈의 시작.',
    location: '일본 — 도카이도(시즈오카·아이치·미에 연안) + 시모다·도바·구마노 항만',
    background:
      '도카이 트라프는 약 100~150년 주기로 거대 지진을 반복 발생시키는 단층대(직전: 1707 호에이 지진 M8.6). 1853-07 페리 내항 → 1854-03 가나가와 조약(미일화친조약) → 시모다·하코다테 개항 결정 → 1854-12-15 가에이→안세이 개원의 격변 이후 *개원 8일 만에* 발생. 본진 직전 약 1주일 전부터 시즈오카·아이치 일대에서 전조 지진이 보고되었으나 막부 천문방·중앙 행정에 보고가 누락되었다.',
    aftermath:
      '쓰나미 높이는 시모다 7m·도바 6m·구마노 5m 추정. 시모다는 가나가와 조약(1854-03)으로 막 개항이 결정된 항만이었으나 본진 + 쓰나미로 *항만 시설·창고·외교관저가 완전 파괴*되어 1859년 *요코하마(가나가와) 개항*으로 이전된 직접 원인이 되었다 — 일본 근대 최대 무역항의 출발점. 시모다에 정박 중이던 *러시아 디아나(Diana) 호*도 쓰나미로 침몰, 푸챠틴 제독 일행이 일본인 측 도움으로 헤다(戸田) 마을에서 *헤다호(戸田号)*를 자체 건조해 귀국 — *일본 최초의 서양식 범선 건조* 기록. 발생 32시간 후 인접 단층 구간에서 안세이 난카이 지진(M8.4)이 연동 발생.',
    keywords: ['안세이도카이지진', '安政東海地震', '도카이트라프', '시모다쓰나미', '디아나호', '안세이대지진'],
    sections: [
      {
        order: 1,
        title: '시대 배경 — 페리 내항과 정치 공백',
        sectionType: 'background',
        content: `<p>안세이(安政) 연호는 본 지진 발생 8일 전인 1854년 12월 15일(가에이 7년 11월 27일) 개원되었다. 막부는 *상서롭지 못한 가에이(嘉永) 연호를 바꿔 액운을 떨치려 했으나*, 개원 직후 거대 지진 시리즈가 시작되어 오히려 안세이라는 연호가 *재난·격변의 대명사*가 되었다.</p>
<p>지진 직전 1년 반의 일본 정세:</p>
<ul>
  <li><strong>1853-07-08</strong>: 페리 함대 우라가 입항(쿠로후네 사건). 250년 쇄국 체제 종결의 신호탄.</li>
  <li><strong>1853-07-27</strong>: 11대 쇼군 도쿠가와 이에요시 급사. 13대 이에사다(병약) 즉위 → 노중수좌 아베 마사히로가 사실상 막정 운영.</li>
  <li><strong>1854-03-31</strong>: 가나가와 조약(미일화친조약) 체결 → 시모다·하코다테 개항 결정.</li>
  <li><strong>1854-08-23</strong>: 영·일 화친조약 체결.</li>
  <li><strong>1854-12-15</strong>: 가에이 → 안세이 개원.</li>
  <li><strong>1854-12-23</strong>: <strong>본 지진 발생</strong> — 개원 8일 만.</li>
</ul>
<p>막부는 *외교 양보 + 자연재해 대응*이라는 이중 부담을 감당하지 못해 통치 권위가 급속히 약화, 후일 1858년 안세이 5개국 조약·1859년 안세이 大獄 → 1860년 사쿠라다몬 외 변(이이 나오스케 암살)으로 이어지는 *바쿠마쓰(幕末) 정치 격변*의 직접 토양이 되었다.</p>`,
      },
      {
        order: 2,
        title: '발생 경위와 피해',
        sectionType: 'process',
        content: `<table>
  <thead><tr><th>항목</th><th>수치/내용</th></tr></thead>
  <tbody>
    <tr><td>발생 시각</td><td>1854-12-23 09:15경 (안세이 1년 음력 11월 4일)</td></tr>
    <tr><td>모멘트 규모</td><td>M8.4 추정</td></tr>
    <tr><td>진원</td><td>도카이 트라프(엔슈나다~스루가만 앞바다)</td></tr>
    <tr><td>가옥 전파</td><td>약 10,000호</td></tr>
    <tr><td>사망자</td><td>약 2,000~3,000명</td></tr>
    <tr><td>최대 쓰나미</td><td>시모다 7m, 도바 6m, 구마노 5m</td></tr>
    <tr><td>피해 지역</td><td>시즈오카·아이치·미에 연안 + 시모다·도바·구마노·이세 항만</td></tr>
  </tbody>
</table>
<p>도카이도는 에도-교토 간선이라 인구 밀집도가 높아 지진과 쓰나미 피해가 컸다. 특히 시모다 항만은 가나가와 조약 체결 8개월 만에 입은 직격타로 외교적 의미도 컸다.</p>`,
      },
      {
        order: 3,
        title: '시모다 → 요코하마 개항 이전',
        sectionType: 'aftermath',
        content: `<p>가나가와 조약(1854-03)으로 시모다가 개항되었으나 안세이 도카이 지진 쓰나미(7m)로 *항만·창고·외교관저가 완전 파괴*. 미국 초대 총영사 타운센드 해리스는 1856년 시모다 부임 시 폐허 상태의 항을 보고 막부에 *대형 항만 이전*을 강력 요구. 1858년 안세이 5개국 조약 협상에서 *가나가와(현 요코하마) 개항*이 결정되었고, 1859-07-01 요코하마가 정식 개항해 일본 근대 최대 무역항으로 발전.</p>
<p>본 지진이 없었다면 시모다가 그 자리를 차지했을 가능성이 높다는 것이 일본 근대사 연구의 통설.</p>
<p>또한 시모다에 정박 중이던 러시아 *디아나(Diana) 호*가 쓰나미로 침몰, 푸챠틴 제독 일행이 헤다(戸田) 마을에서 일본 목수의 도움으로 *헤다호(戸田号, 100t급 양식 스쿠너)*를 자체 건조해 1855년 4월 귀국. 이는 *일본 최초의 서양식 범선 건조* 기록이며, 후일 일본 조선업의 기술 시발점이 되었다.</p>`,
      },
    ],
  },

  // ────────────────────────── ② 난카이 ──────────────────────────
  {
    title: '안세이 난카이 지진(安政南海地震)',
    startDate: new Date('1854-12-24'),
    description:
      '도카이 지진 발생 후 약 32시간 만인 1854년 12월 24일 오후 4시경(안세이 1년 음력 11월 5일) 시코쿠·기이반도 앞바다(난카이 트라프)에서 발생한 M8.4 거대 지진. 도카이 지진과 *연동(쌍둥이 지진)* 발생한 사례로, 일본 지진학에서 *난카이 트라프 지진은 도카이 지진과 30시간~수년 안에 반드시 짝지어 발생*한다는 가설의 핵심 증거가 되었다. 사망자 추정 1,500~3,000명. 와카야마 히로무라의 *이나무라노히(稲むらの火)* 일화가 후일 세계 쓰나미의 날 제정 근거가 되었다.',
    location: '일본 — 시코쿠 남부(고치·도쿠시마)·기이반도(와카야마·미에 남부) 연안',
    background:
      '난카이 트라프는 도카이 트라프 서쪽 구간으로 약 100~150년 주기 거대 지진 반복(직전: 1707 호에이 지진과 동시 발생). 1854-12-23 도카이 지진의 응력 전파로 인접 단층 구간이 즉각 파열한 *연동 발생*. 도카이 지진 본진 32시간 후라는 짧은 간격은 일본 지진학사에서 가장 명확한 연동 사례로 기록된다.',
    aftermath:
      '쓰나미 높이는 고치 16m·도쿠시마 6m·와카야마 8m로 도카이 지진보다 컸다. 와카야마 히로무라(広村)의 *이나무라노히* 일화 — 명주(村長) 하마구치 고료(浜口梧陵)가 자신의 볏짚 더미에 불을 질러 마을 사람을 고지대로 유도, 약 1,500명 중 36명만 사망 — 는 일본 방재 교육의 고전이 되었다. 하마구치는 1858~1860년 자비(약 1,580냥)로 *방조제(廣村堤防)*를 축조했고, 이는 1946년 쇼와 난카이 지진 시 마을을 다시 구한 일본 최초의 시민 방재 인프라가 되었다. 라프카디오 헌(고이즈미 야쿠모)이 1896년 영문 소개("A Living God")한 후 2015년 UN 총회가 11월 5일을 *세계 쓰나미의 날*로 지정하는 근거가 되었다.',
    keywords: [
      '안세이난카이지진', '安政南海地震', '난카이트라프', '이나무라노히', '稲むらの火',
      '하마구치고료', '世界쓰나미의날', '세계쓰나미의날', '안세이대지진',
    ],
    sections: [
      {
        order: 1,
        title: '도카이 지진과의 연동 발생',
        sectionType: 'background',
        content: `<p>본 지진의 가장 큰 학술적 의의는 32시간 차이로 발생한 도카이 지진과의 *연동(連動·페어링)*이다.</p>
<table>
  <thead><tr><th>지진</th><th>발생일시</th><th>규모</th><th>진원</th></tr></thead>
  <tbody>
    <tr><td>도카이</td><td>1854-12-23 09:15</td><td>M8.4</td><td>도카이 트라프(엔슈나다~스루가만)</td></tr>
    <tr><td><strong>난카이</strong></td><td><strong>1854-12-24 16:00</strong></td><td><strong>M8.4</strong></td><td><strong>난카이 트라프(시코쿠 남방)</strong></td></tr>
  </tbody>
</table>
<p>도카이 본진의 응력이 인접 단층 구간으로 전파되어 약 32시간 만에 두 번째 거대 지진이 발생했다. 일본 지진학에서는 이를 *난카이 트라프 거대 지진은 도카이 지진과 30시간~수년 안에 짝지어 발생한다*는 가설의 핵심 표본 사례로 본다.</p>
<p>참고로 난카이 트라프 지진의 역사적 발생 기록:</p>
<ul>
  <li><strong>684</strong>: 하쿠호 지진 (M8.2~8.4) — 도카이/난카이 동시</li>
  <li><strong>887</strong>: 닌나 지진 (M8.0~8.5) — 동시</li>
  <li><strong>1361</strong>: 쇼헤이 지진 (M8.2~8.5) — 동시</li>
  <li><strong>1707</strong>: 호에이 지진 (M8.6) — 동시</li>
  <li><strong>1854</strong>: 안세이 도카이/난카이 (M8.4 / M8.4) — 32시간 간격 ★</li>
  <li><strong>1944/1946</strong>: 쇼와 도카이/난카이 (M7.9 / M8.0) — 약 2년 간격</li>
</ul>
<p>다음 난카이 트라프 거대 지진은 21세기 중반 발생 가능성이 일본 정부 *남해 트라프 거대 지진 대책 위원회*의 공식 시나리오에 포함되어 있다.</p>`,
      },
      {
        order: 2,
        title: '발생 경위와 피해',
        sectionType: 'process',
        content: `<table>
  <thead><tr><th>항목</th><th>수치/내용</th></tr></thead>
  <tbody>
    <tr><td>발생 시각</td><td>1854-12-24 16:00경 (안세이 1년 음력 11월 5일)</td></tr>
    <tr><td>모멘트 규모</td><td>M8.4 추정</td></tr>
    <tr><td>진원</td><td>난카이 트라프(시코쿠 남방 앞바다)</td></tr>
    <tr><td>가옥 전파</td><td>약 8,000호</td></tr>
    <tr><td>사망자</td><td>약 1,500~3,000명</td></tr>
    <tr><td>최대 쓰나미</td><td>고치 16m, 와카야마 8m, 도쿠시마 6m</td></tr>
    <tr><td>피해 지역</td><td>시코쿠 남부(고치·도쿠시마)·기이반도(와카야마·미에 남부) 연안</td></tr>
  </tbody>
</table>
<p>고치 쓰나미 16m는 안세이 3대 지진 중 최고 기록. 본진 발생 후 약 5~10분 만에 1차 쓰나미가 도착했다는 사료 기록이 있다.</p>`,
      },
      {
        order: 3,
        title: '이나무라노히와 세계 쓰나미의 날',
        sectionType: 'aftermath',
        content: `<p>와카야마현 히로무라(현 와카야마현 히로가와정)에서 일어난 *이나무라노히(稲むらの火, 볏짚 더미의 불)* 일화는 일본 방재 교육사의 고전이자 UN이 *세계 쓰나미의 날(11월 5일)*을 제정한 근거다.</p>
<h3>일화 개요</h3>
<p>1854년 12월 24일 본진 후 마을 명주(村長) <strong>하마구치 고료(浜口梧陵, 1820-1885)</strong>는 바다가 평소와 다르게 후퇴하는 것을 보고 곧 거대 쓰나미가 닥칠 것을 직감. 마을 사람들에게 즉시 고지대로 피난하라 외쳤으나 어두운 저녁이라 길을 찾지 못하는 사람이 많았다. 그러자 그는 *수확 직후의 자기 볏짚 더미(稲むら) 약 14개에 불을 질러* 화재로 보이게 만들어 마을 사람들이 불을 끄러 고지대로 모이게 유도했다. 약 1,500명 중 36명만 사망 — 마을의 90%+가 살아남은 기적적 사례.</p>
<h3>방조제 자비 축조 (1858~1860)</h3>
<p>하마구치는 본 지진 후 *마을이 다음 쓰나미에 살아남으려면 방조제가 필요하다*는 신념으로 자비 약 1,580냥(당시 막대한 사재)을 들여 길이 600m·높이 5m·폭 20m의 *廣村堤防*을 4년에 걸쳐 축조. 92년 후 *1946년 쇼와 난카이 지진* 시 이 방조제가 마을을 다시 한번 구했다.</p>
<h3>국제적 전파</h3>
<ul>
  <li><strong>1896</strong>: 라프카디오 헌(고이즈미 야쿠모)이 영문 단편 *"A Living God"*으로 일화를 소개.</li>
  <li><strong>1937</strong>: 일본 소학교 국정 교과서에 *이나무라노히*가 채택되어 전국 방재 교육의 표준 텍스트가 됨.</li>
  <li><strong>2005</strong>: UN 국제재해경감전략(UNISDR)이 일화를 채택, 아시아·태평양 쓰나미 피해국에 다국어 번역 보급.</li>
  <li><strong>2015-12-22</strong>: UN 총회 결의 70/203으로 매년 11월 5일(난카이 지진 발생일)을 *세계 쓰나미의 날(World Tsunami Awareness Day)*로 공식 지정.</li>
</ul>
<p>현재 와카야마현 히로가와정의 *하마구치 고료 기념관*과 *이나무라노히 박물관*이 일화를 보존·전시 중.</p>`,
      },
    ],
  },

  // ────────────────────────── ③ 에도 ──────────────────────────
  {
    title: '안세이 에도 지진(安政江戸地震)',
    startDate: new Date('1855-11-11'),
    description:
      '1855년 11월 11일 오후 10시경(안세이 2년 음력 10월 2일) 에도(현 도쿄) 직하에서 발생한 추정 M7.0~7.1의 직하형 지진. 진원이 얕고(약 40km) 인구 밀집지 직격이라 도카이·난카이 지진(M8.4)보다 규모는 작아도 *에도 단일 도시에 7,000~10,000명 사망*이라는 막대한 도시 피해를 냈다. 막부 정치의 핵심부 직격이라 정치적 충격이 가장 컸으며, 직후 폭발적으로 유행한 *나마즈에(鯰絵)* 풍자 판화는 일본 최초의 근대적 풍자 미디어로 평가된다.',
    location: '일본 — 에도(현 도쿄도) 직하 — 혼조·후카가와·시타야·아사쿠사 일대 집중',
    background:
      '도카이·난카이 거대 지진(1854-12) 발생 후 1년 만에 에도 직하에서 발생한 *수도 직격 지진*. 진원은 도쿄만 북부 또는 도쿄 직하 단층으로 추정. 직전 7~8개월간 에도에서 소규모 유감 지진이 산발적 보고되었으나 큰 주의를 끌지 못했다. 막부는 1년 전 도카이/난카이 지진 부흥 부담금을 다이묘·상인층에 부과한 직후라 추가 부담 여력이 거의 없었다.',
    aftermath:
      '사망자 7,000~10,000명(추정), 가옥 전파 약 14,000호. 특히 매립지인 *혼조·후카가와* 지반 액상화로 가옥 붕괴율 70%+. 막부 핵심 인물 사상으로는 ① 미토번 출신 *후지타 도코(藤田東湖)* 등 양이파 사상가 사망, ② 화가 *우타가와 히로시게*는 무사했으나 그의 제자·동료 다수 사망, ③ 막부 천문방 시설 일부 붕괴. 이후 1855년 12월~1856년 1월에 약 400종의 *나마즈에(鯰絵)* 풍자 판화가 폭발적 유행 — 메기(鯰)가 막부·부유 상인을 응징하고 *세상직시(世直し)*를 가져온다는 이미지로, 막부 통치 정당성에 대한 *민중적 비판 미디어*로 기능. 막부는 1855-12 *나마즈에 출판 금지령*을 내렸으나 단속이 어려웠다.',
    keywords: [
      '안세이에도지진', '安政江戸地震', '에도직하지진', '나마즈에', '鯰絵',
      '世直し', '혼조후카가와', '후지타도코', '안세이대지진',
    ],
    sections: [
      {
        order: 1,
        title: '직하형 지진의 특수성',
        sectionType: 'background',
        content: `<p>본 지진은 안세이 3대 지진 중 *유일한 직하형(直下型) 지진*이다. 도카이/난카이 지진이 해구형(海溝型) 거대 지진이었던 것과 달리, 본 지진은 진원이 얕고(약 40km) 도시 직하에서 발생해 *규모(M7.0)에 비해 도시 피해가 압도적으로 컸다*.</p>
<table>
  <thead><tr><th>유형</th><th>대표 사례</th><th>특성</th></tr></thead>
  <tbody>
    <tr><td>해구형(거대)</td><td>도카이/난카이</td><td>M8+ · 진원 깊고 광범위 · 쓰나미 동반 · 연안 피해 중심</td></tr>
    <tr><td><strong>직하형</strong></td><td><strong>본 지진</strong></td><td><strong>M7대 · 진원 얕고 좁은 범위 · 쓰나미 없음 · 도시 직격</strong></td></tr>
  </tbody>
</table>
<p>일본 지진학에서는 본 지진을 *수도권 직하 지진의 역사적 표본*으로 다루며, 1923년 관동대지진(M7.9, 직하형 + 화재)·1995년 한신 대지진(M7.3, 직하형)과 함께 *도시 직격형 재해의 3대 사례*로 분류한다.</p>
<p>매립지인 혼조·후카가와의 가옥 붕괴율 70%+는 *지반 액상화(液状化)* 현상의 초기 기록으로도 중요한 사례다.</p>`,
      },
      {
        order: 2,
        title: '발생 경위와 피해',
        sectionType: 'process',
        content: `<table>
  <thead><tr><th>항목</th><th>수치/내용</th></tr></thead>
  <tbody>
    <tr><td>발생 시각</td><td>1855-11-11 22:00경 (안세이 2년 음력 10월 2일 亥의刻)</td></tr>
    <tr><td>모멘트 규모</td><td>M7.0~7.1 추정</td></tr>
    <tr><td>진원</td><td>도쿄만 북부 또는 에도 직하 (얕은 직하형)</td></tr>
    <tr><td>가옥 전파</td><td>약 14,000호</td></tr>
    <tr><td>사망자</td><td>약 7,000~10,000명 (안세이 3대 지진 중 최다)</td></tr>
    <tr><td>최대 쓰나미</td><td>없음 (직하형)</td></tr>
    <tr><td>피해 집중지</td><td>혼조·후카가와(매립지 액상화)·시타야·아사쿠사·니혼바시</td></tr>
  </tbody>
</table>
<p>야간(밤 10시) 발생이라 잠자리에서 압사한 사람이 많았다. 가옥 붕괴 후 발생한 화재로 사망자가 추가됐으나 1855년의 에도는 1657년 메이레키 대화재 이후 화재 차단 정책이 정비되어 있어 화재 피해는 1923년 관동대지진보다 작았다.</p>`,
      },
      {
        order: 3,
        title: '나마즈에(鯰絵) — 일본 최초의 풍자 미디어',
        sectionType: 'aftermath',
        content: `<p>본 지진 직후 약 2개월 사이에 에도에서 약 *400종*의 *나마즈에(鯰絵)*가 폭발적으로 출판되었다. 나마즈에란 *땅속 큰 메기(大鯰)가 흔들어 지진을 일으킨다*는 일본 민간신앙을 풍자한 컬러 우키요에 판화로, 다음과 같은 정치적·사회적 메시지를 담고 있었다.</p>
<ul>
  <li><strong>막부·부유층 응징</strong>: 메기가 막부 관료·고리대업자·매점매석 상인을 잡아 두들겨 패는 그림. *지진은 부정한 자에 대한 천벌*이라는 메시지.</li>
  <li><strong>世直し(세상직시)</strong>: 지진 후 *목수·미장이·기와장이* 등 재건 인부들이 떼돈을 벌어 술집·유곽에서 흥청망청 노는 그림 — *부의 재분배*가 일어나 세상이 뒤집혔다는 풍자.</li>
  <li><strong>가시마 신(鹿島神) 부재론</strong>: 메기를 누르고 있어야 할 가시마 신이 *카미아리 시즈키(神無月)*에 이즈모로 출장 가서 자리를 비운 사이 메기가 폭주했다는 풍자 — 막부의 통치 부재 비유.</li>
  <li><strong>외국인 풍자</strong>: 페리·하리스 등 외국인을 메기와 동일시하거나 *외국인이 메기를 부추긴다*는 양이 메시지.</li>
</ul>
<p>막부는 1855-12 *나마즈에 출판 금지령*을 내렸으나 익명 출판·지방 유통으로 단속이 어려웠고, 결과적으로 막부 권위에 대한 *최초의 대중 매체 비판*이 자리잡았다. 후일 일본 대중문화·정치 풍자(가와라반·삽화 신문)의 직접 조상으로 평가된다.</p>
<h3>막부 정치 충격</h3>
<p>본 지진은 도카이/난카이(연안 피해)와 달리 *막부 본부 직격*이라 정치 충격이 더 컸다. 미토번 출신 사상가 *후지타 도코(藤田東湖)*가 어머니를 구하다 압사한 사건은 양이파 진영에 큰 손실이었고, 노중수좌 아베 마사히로는 1855-10 자리를 홋타 마사요시에게 양도, 1857-08-06 38세에 위장병으로 급사 — 막부 개국 외교의 사령탑 단명. 안세이 5개국 조약(1858) → 안세이 大獄(1859) → 사쿠라다몬 외 변(1860)으로 이어지는 *바쿠마쓰 정치 격변*의 직접 토양이 되었다.</p>
<h3>학술적 가치</h3>
<p>나마즈에는 1964년 미야기현 지진학자 *이마무라 아키쓰네*의 연구 이래 *일본 지진사·민속학·미술사 교차연구*의 핵심 텍스트가 되었다. 현재 도쿄대학 지진연구소·국립역사민속박물관 등에 약 250종이 보존되어 있다.</p>`,
      },
    ],
  },
]

export async function seedAnseiEarthquakes(prisma: PrismaService): Promise<void> {
  console.log('\n🌋 안세이 대지진(1854-1855) 시딩 시작 — 3건 독립 사건...')

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

  const bakufu = await prisma.historicalCountry.findFirst({
    where: { name: SHOGUNATE_NAME },
    select: { id: true },
  })
  if (!bakufu) {
    console.warn(`  ⚠️  ${SHOGUNATE_NAME} hc 미존재 — seedKurofune 먼저 실행 필요`)
    return
  }

  // ── 0) 마이그레이션 — 이전 시드의 부모 wrapper 정리 ────────────────
  // 이전 버전은 "안세이 대지진 (1854~1855)" 부모 1건 + 자식 3건 구조였다.
  // 자식의 parentEventId를 null 처리하고, 부모와 그 종속 데이터(섹션·국가관계)를 삭제.
  const obsoleteParent = await prisma.event.findFirst({
    where: { title: OBSOLETE_PARENT_TITLE, deletedAt: null },
    select: { id: true },
  })
  if (obsoleteParent) {
    console.log(`  🧹 이전 부모 사건 발견 — 자식 분리 + 부모 정리 진행`)
    // 1. 자식들의 parentEventId 해제
    const detached = await prisma.event.updateMany({
      where: { parentEventId: obsoleteParent.id },
      data: { parentEventId: null },
    })
    console.log(`     ↳ 자식 ${detached.count}건 parentEventId 해제`)

    // 2. 부모 사건의 종속 데이터 (섹션·국가관계·이미지) 정리
    const sectionsDeleted = await prisma.eventSection.deleteMany({
      where: { eventId: obsoleteParent.id },
    })
    const relationsDeleted = await prisma.eventCountryRelation.deleteMany({
      where: { eventId: obsoleteParent.id },
    })
    console.log(`     ↳ 부모 섹션 ${sectionsDeleted.count}건·국가관계 ${relationsDeleted.count}건 삭제`)

    // 3. 부모 사건 자체 삭제 (hard — 시드 데이터)
    await prisma.event.delete({ where: { id: obsoleteParent.id } })
    console.log(`     ↳ 부모 사건 삭제 완료`)
  }

  // ── 1~3) 3건의 독립 사건 등록 ──────────────────────────────────────
  for (const q of QUAKES) {
    let event = await prisma.event.findFirst({
      where: { title: q.title, startDate: q.startDate, deletedAt: null },
    })

    if (event) {
      // 이미 존재 — 부모 분리(이전 시드의 잔재일 수 있음) + 사건 본문 갱신
      if (event.parentEventId) {
        await prisma.event.update({
          where: { id: event.id },
          data: { parentEventId: null },
        })
        console.log(`  🔧 ${q.title}: parentEventId 해제`)
      }
      console.log(`  ⏭️  사건 이미 존재: ${q.title} (id=${event.id})`)
    } else {
      event = await prisma.event.create({
        data: {
          title: q.title,
          description: q.description,
          startDate: q.startDate,
          startDatePrecision: 'day',
          endDate: q.startDate,
          endDatePrecision: 'day',
          location: q.location,
          categoryId: category.id,
          historicalCountryId: bakufu.id,
          parentEventId: null,
          background: q.background,
          aftermath: q.aftermath,
          keywords: q.keywords as any,
          createdById: admin.id,
        },
      })
      console.log(`  ✅ 사건 생성: ${q.title} (id=${event.id})`)
    }

    // 섹션 등록 (idempotent)
    for (const s of q.sections) {
      const exists = await prisma.eventSection.findFirst({
        where: { eventId: event.id, title: s.title },
      })
      if (exists) {
        console.log(`    ⏭️  섹션 스킵: ${s.title}`)
        continue
      }
      await prisma.eventSection.create({
        data: {
          eventId: event.id,
          title: s.title,
          content: s.content,
          order: s.order,
          sectionType: s.sectionType ?? null,
        },
      })
      console.log(`    ✅ 섹션: ${s.title}`)
    }

    // 국가 관계 (VICTIM)
    const relExists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId: event.id,
        historicalCountryId: bakufu.id,
        role: EventCountryRole.VICTIM,
      },
    })
    if (!relExists) {
      await prisma.eventCountryRelation.create({
        data: {
          eventId: event.id,
          historicalCountryId: bakufu.id,
          role: EventCountryRole.VICTIM,
          roleDescription: '안세이 시기 거대 지진의 피해 주체. 막부 재정·정치 정당성에 직접 타격.',
        },
      })
      console.log(`    ✅ 국가관계: 도쿠가와 막부 (VICTIM)`)
    } else {
      console.log(`    ⏭️  국가관계 이미 존재`)
    }
  }

  console.log(`\n✅ 안세이 대지진 시딩 완료 — 3건 독립 사건\n`)
}
