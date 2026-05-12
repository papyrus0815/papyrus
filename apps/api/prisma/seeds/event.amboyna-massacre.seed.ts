/**
 * 암보이나 학살 (Amboyna Massacre, 1623-02-27) 시드
 *
 * 단독 사건. 네덜란드 동인도회사(VOC)가 향신료 제도(말루쿠) 암본 섬에서
 * 영국 동인도회사(EIC) 상관원 10명·일본 낭인 용병 9~10명·포르투갈인 1명을
 * 모반 음모 자백을 받기 위해 고문한 후 처형한 사건.
 *
 * 영국의 인도네시아 향신료 무역에서 사실상 추방되어 인도 본토로 진출 방향이
 * 전환된 직접 계기. 17세기 영-네덜란드 상업 패권 전쟁(1652~1674)의
 * 원격 도화선이자, 동남아 식민 권역 분할(영국-인도, 네덜란드-인도네시아)의 출발점.
 *
 * 등록 항목:
 *  - Event 1
 *  - EventSection x4 (배경/사건 경과/즉시 파장/장기 유산)
 *  - EventCountryRelation x2 (네덜란드 공화국 INITIATOR / 잉글랜드 왕국 VICTIM)
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '정치'

// ── 사건 본문 ─────────────────────────────────────────────────────────────
const EVENT_BODY = {
  description:
    '1623년 2월 27일 향신료 제도(말루쿠) 암본 섬의 네덜란드 동인도회사(VOC) 빅토리아 요새에서 ' +
    '암본 총독 헤르만 판 스푀이트(Herman van Speult)가 ' +
    '영국 동인도회사(EIC) 상관원 10명 · 일본 낭인 용병 9~10명 · 포르투갈인 노예감독 1명을 ' +
    '"VOC 요새 탈취 모반"을 자백받기 위해 워터보딩(water cure)·태형 등으로 고문한 후 ' +
    '집단 참수형으로 처형한 사건. ' +
    '직접 계기는 1623년 2월 11일 일본 낭인 시다요시 시치로(七郎)가 VOC 보초에게 ' +
    '"요새 방어가 약한가"를 물어본 사소한 사건이었으나, ' +
    '판 스푀이트는 이를 영-일 합작 모반으로 확대해석해 영국·일본 상관원 전원을 체포·고문했다. ' +
    '\n\n' +
    '사후 영국 측은 자백이 고문에 의한 허위라고 강하게 항의했고, ' +
    '약 30년에 걸친 외교 갈등 끝에 1654년 1차 영-네덜란드 전쟁 종전 시 웨스트민스터 조약으로 ' +
    'VOC가 잉글랜드 정부에 8만 5천 파운드·유족에 3,615파운드를 배상하는 것으로 일단락되었다. ' +
    '결과적으로 영국 EIC는 인도네시아 향신료 무역에서 사실상 추방되어 인도 본토(면직물·인디고·초석·아편)로 ' +
    '진출 방향을 전환, 약 130년 후 1757년 플라시 전투로 이어지는 인도 식민화의 ' +
    '간접적 출발점이 되었다.',
  location: '향신료 제도 암본(Ambon, Amboyna) — VOC 빅토리아 요새 (현 인도네시아 말루쿠주 암본 시)',
  background:
    '향신료 제도와 17세기 초 영-네덜란드 경쟁. ' +
    '향신료 제도(말루쿠 — 정향·육두구의 유일한 산지)는 16세기 포르투갈 독점 → ' +
    '1605년 VOC의 암본 점령으로 네덜란드 우위 확립. ' +
    '잉글랜드 EIC(1600년 설립)도 1603년 1차 항해 이래 향신료 제도에 진출을 시도, ' +
    '1610년대 자카르타·반텐·암본 등에 소규모 상관을 두고 VOC와 공존했다. ' +
    '\n\n' +
    '1619년 방위 조약과 "공동 향신료 무역". ' +
    '양국 본국 정부 압력으로 1619년 7월 17일 런던에서 "영-네덜란드 방위 조약"이 체결, ' +
    '향신료 제도에서 양사가 1/3(영국)·2/3(네덜란드) 비율로 향신료를 할당하고 ' +
    '공동 함대(fleet of defence)를 운용해 스페인·포르투갈에 대항하기로 합의했다. ' +
    '그러나 현지 VOC 총독 얀 피터르스존 쿤(Jan Pieterszoon Coen, 바타비아 총독)·판 스푀이트 등은 ' +
    '본국의 합의를 명령 위반으로 간주하고 영국 측을 체계적으로 압박, ' +
    '관세 이중 부과·식량 공급 차단·항구 출입 제한 등으로 사실상 EIC를 무력화시키고 있었다. ' +
    '\n\n' +
    '사건 직전 — 1623년 2월 11일. ' +
    '암본 빅토리아 요새 보초가 일본 낭인 용병 시다요시 시치로(VOC 고용)에게 ' +
    '"왜 요새 방어 시설을 살피느냐"고 추궁. 시치로는 단순 호기심이라 답했으나 ' +
    '판 스푀이트는 이를 모반 시도로 규정해 시치로를 체포·고문 시작. ' +
    '워터보딩(천을 얼굴에 덮고 물을 부어 익사 직전 상태 유발)으로 강요된 자백에서 ' +
    '"영국인·일본인이 VOC 요새를 점거하려 했다"는 허위 진술이 나왔다. ' +
    '이를 근거로 EIC 상관장 가브리엘 토우어슨(Gabriel Towerson) 등 영국인 10명을 ' +
    '2월 15일~25일 차례로 체포해 동일한 고문을 가했다.',
  aftermath:
    '즉시 처형 — 1623-02-27. ' +
    '판 스푀이트의 군법회의는 단 사흘 만에 고문 자백만을 근거로 사형을 선고, ' +
    '1623년 2월 27일 빅토리아 요새 광장에서 ' +
    '영국인 10명(상관장 가브리엘 토우어슨 외 9명) · 일본 낭인 9~10명 · 포르투갈인 노예감독 1명 ' +
    '도합 약 20명이 참수형으로 집단 처형되었다. ' +
    '나머지 영국인 4명·일본인 2명은 마지막 순간 사면되어 추방. ' +
    '\n\n' +
    '소식의 영국 도착(1624년 5월). ' +
    '암본 → 바타비아 → 마카오 → 희망봉 → 런던으로 약 14개월 후인 ' +
    '1624년 5월 영국 본국에 사건이 알려짐. EIC와 제임스 1세가 격렬히 항의했으나, ' +
    '당시 영국은 30년 전쟁(1618~1648)·스페인과의 갈등으로 네덜란드와의 동맹이 외교적으로 더 중요했고, ' +
    '1625년 제임스 1세 사후 즉위한 찰스 1세도 의회와의 갈등으로 강력한 보복을 추진할 여력이 없었다. ' +
    '\n\n' +
    '프로파간다 전쟁. ' +
    'EIC는 1624년 "A True Relation of the Unjust, Cruell, and Barbarous Proceedings against the English at Amboyna"을 출간, ' +
    '영국에서 17세기 내내 베스트셀러로 유통되며 반(反)네덜란드 정서의 핵심 자료가 되었다. ' +
    '1672년 존 드라이든(John Dryden)이 "Amboyna, or the Cruelties of the Dutch to the English Merchants"라는 ' +
    '연극을 발표해 3차 영-네덜란드 전쟁(1672~1674) 명분으로 활용. ' +
    '\n\n' +
    '인도 전환의 가속. ' +
    'EIC는 향신료 제도에서 사실상 추방되어 인도 본토로 진출 방향을 전환. ' +
    '1623~1640년 사이 수라트(1613, 기존)·마술리파탐(1632)·마드라스(1640) 등 인도 거점에 자원 집중, ' +
    '면직물·인디고·초석 무역으로 새 수익원을 개척. ' +
    '결과적으로 1757년 플라시 전투 → 1858년 인도 제국 성립으로 이어지는 ' +
    '"인도 식민화"의 간접적 출발점이 되었다.',
  keywords: [
    '암보이나 학살',
    'Amboyna Massacre',
    '암본',
    'Ambon',
    '향신료 제도',
    '말루쿠',
    'VOC',
    '네덜란드 동인도회사',
    'EIC',
    '영국 동인도회사',
    '헤르만 판 스푀이트',
    '가브리엘 토우어슨',
    '얀 피터르스존 쿤',
    '워터보딩',
    '1619 영-네덜란드 방위 조약',
    '영-네덜란드 전쟁',
    '웨스트민스터 조약 1654',
    '존 드라이든',
    '인도 전환',
  ] as any,
} as const

// ── EventSection 본문 ───────────────────────────────────────────────────────
const SECTIONS: Array<{
  title: string
  content: string
  order: number
  sectionType?: string
}> = [
  {
    order: 1,
    title: '사건 배경',
    sectionType: 'background',
    content: `<p>암보이나 학살은 17세기 초 향신료 제도(말루쿠)에서 영국 EIC와 네덜란드 VOC의 누적된 무역 갈등이 1619년 방위 조약의 형식적 봉합 이후 현지 VOC의 일방적 압박으로 폭발한 사건이었다.</p>

<h3>1. 향신료 제도와 17세기 초 양사 경쟁</h3>
<ul>
  <li><strong>독점 가치 — 정향·육두구의 유일한 산지</strong>: 말루쿠 제도는 16세기 유럽에서 무게당 금에 비견된 정향(clove)·육두구(nutmeg)의 세계 유일 산지. 16세기 포르투갈이 약 100년 독점 후 1605년 VOC가 암본 점령으로 우위 확립.</li>
  <li><strong>EIC의 후발 진출</strong>: 1603년 1차 항해 이래 영국 EIC도 자카르타·반텐·암본·반다 등 5개 주요 향신료 제도에 소규모 상관 운영. 1620년경 영국 측 인력은 약 200명, 네덜란드 측은 약 2,000명으로 압도적 격차.</li>
  <li><strong>본국 합의 vs 현지 갈등</strong>: 양국 본국은 외교적 봉합을 원했으나 현지 VOC 사령관들(코엔·판 스푀이트)은 영국 EIC의 잠식을 좌시할 수 없다는 강경 입장.</li>
</ul>

<h3>2. 1619년 영-네덜란드 방위 조약</h3>
<ul>
  <li><strong>1619-07-17 런던 체결</strong>: 양사가 향신료 제도에서 정향 1/3·육두구 1/3·후추 절반을 영국 측에 할당. 공동 함대(fleet of defence)로 스페인·포르투갈에 대항. 군사비는 비율대로 분담.</li>
  <li><strong>현지 VOC의 사실상 거부</strong>: 바타비아 총독 얀 피터르스존 쿤(Coen)이 "본국이 모르고 양보한 것"이라며 격분, 본국에 항의 서한 발송. 현지에서는 EIC 측에 (1)관세 이중 부과 (2)식량 공급 차단 (3)항구 출입 제한 등으로 사실상 무력화 시도.</li>
  <li><strong>1621 반다 학살</strong>: 코엔이 1621년 반다 제도(육두구 산지)에서 토착민 약 14,000명 중 1,000~3,000명을 처형하고 나머지를 노예로 전락시킨 학살 사건. EIC 측은 항의했으나 묵살. 암보이나 학살의 직접 전조.</li>
</ul>

<h3>3. 사건 직전 정세 (1622~1623년 초)</h3>
<ul>
  <li><strong>판 스푀이트 암본 총독</strong>: 1618년 부임한 헤르만 판 스푀이트(Herman van Speult)는 코엔의 강경 노선을 충실히 이행. 영국 측 가브리엘 토우어슨 상관장과 표면적으로 우호 관계를 유지하면서도 체계적으로 EIC를 압박.</li>
  <li><strong>일본 낭인 용병의 존재</strong>: VOC는 일본 도쿠가와 막부의 쇄국 진행 과정에서 직업을 잃은 낭인(浪人)·기독교 무사들을 향신료 제도 요새 수비에 고용. 암본 빅토리아 요새에는 약 30명의 일본인이 근무 중이었다.</li>
  <li><strong>1623-02-11 시치로 사건</strong>: 일본 낭인 시다요시 시치로(七郎)가 VOC 보초에게 "요새 방어 상태"를 물어본 사건. 단순 호기심이었으나 판 스푀이트가 모반 시도로 규정해 체포 → 워터보딩 고문 → 허위 자백 강제.</li>
</ul>`,
  },
  {
    order: 2,
    title: '사건 경과 — 1623년 2월 15일~27일',
    sectionType: 'process',
    content: `<p>약 12일에 걸쳐 일본 낭인 → 영국인 EIC 상관원 → 포르투갈인 노예감독 순으로 체포·고문·자백 강요·집단 처형이 진행되었다. 정상 사법 절차는 전혀 거치지 않았으며, 모든 자백은 워터보딩과 태형의 고문 하에서 강제된 것이었다.</p>

<h3>1. 일본 낭인 체포와 고문 (2월 11일 ~ 14일)</h3>
<ul>
  <li><strong>2-11 시치로 체포</strong>: 보초의 신문에서 "요새 방어 상태"를 물은 것이 발단. 즉시 체포 후 빅토리아 요새 지하 감옥에서 워터보딩 시작.</li>
  <li><strong>워터보딩(water cure) 묘사</strong>: 피의자의 얼굴을 천으로 덮고 물을 부어 호흡 곤란을 유발하다가 의식 잃기 직전 잠깐 멈추고 다시 시작. 동시대 영국 측 보고서에 "사람의 몸이 물 항아리처럼 부풀었다"고 기록.</li>
  <li><strong>강제 자백</strong>: 시치로가 약 6시간 고문 끝에 "영국인과 함께 VOC 요새를 점거하려 했다"는 허위 자백. 다른 일본 낭인 9명도 차례로 체포·고문되어 동일 자백.</li>
</ul>

<h3>2. 영국 EIC 상관원 체포 (2월 15일 ~ 25일)</h3>
<ul>
  <li><strong>2-15 가브리엘 토우어슨 체포</strong>: EIC 암본 상관장 가브리엘 토우어슨(Gabriel Towerson, 1576~1623)이 식사 중 체포. 동행 상관원 9명도 같은 날 체포.</li>
  <li><strong>토우어슨의 항변</strong>: 토우어슨은 "VOC 요새는 견고한 석조 건물에 수비병 200명·대포 50문이 배치되어 있는데, 영국인 10명·일본인 10명이 어떻게 점거하겠다는 음모를 꾸미겠는가"라며 강하게 항변. 그러나 판 스푀이트는 이를 묵살.</li>
  <li><strong>영국인 워터보딩</strong>: 영국인 10명에게도 동일한 고문이 가해졌고, 모두 자백을 강요당했다. 토우어슨은 마지막까지 자백을 거부하다가 약 8시간 고문 끝에 정신을 잃은 상태에서 형식적 자백 서명.</li>
  <li><strong>포르투갈인 노예감독</strong>: 추가로 포르투갈인 노예감독 아우구스티노 페레이라가 영국인의 일과 연관되었다는 이유로 체포·고문·자백 강요.</li>
</ul>

<h3>3. 군법회의와 처형 (2월 26일 ~ 27일)</h3>
<ul>
  <li><strong>2-26 약식 군법회의</strong>: 판 스푀이트가 주재한 VOC 암본 군법회의가 단 하루 만에 사형 선고. 자백서만이 증거로 채택, 토우어슨의 정상 사법 권리 요청은 모두 거부.</li>
  <li><strong>2-27 빅토리아 요새 광장 집단 처형</strong>: 영국인 10명 + 일본인 9~10명 + 포르투갈인 1명 도합 약 20명이 참수형으로 처형. 토우어슨은 처형 전 동료 영국인들에게 "모두 결백하다"고 외치며 사망.</li>
  <li><strong>사면된 4인</strong>: 영국인 4명(에드워드 콜린스, 에마누엘 톰슨, 존 클라크, 윌리엄 웹버)와 일본인 2명은 마지막 순간 사면되어 추방. 이들의 증언이 후일 사건의 주요 사료가 되었다.</li>
  <li><strong>EIC 자산 몰수</strong>: 처형 당일 VOC가 EIC 암본 상관의 모든 자산(은화·향신료 재고·서류)을 몰수. 추정 가치 약 4,500파운드(현재 가치 약 100만 파운드 상당).</li>
</ul>

<h3>4. 처형의 잔혹성</h3>
<ul>
  <li><strong>유족 참관</strong>: 토우어슨의 인도인 아내(현지 결혼)가 처형 광장에 강제 참관. 후일 자카르타로 추방.</li>
  <li><strong>시신 처리</strong>: 처형된 시신은 빅토리아 요새 외곽 공동묘지에 무명으로 매장. EIC 측의 시신 인도 요청은 거부.</li>
  <li><strong>증거 인멸 시도</strong>: 판 스푀이트는 EIC 상관 서류를 대부분 소각. 그러나 사면된 영국인 4명이 일부 서류를 숨겨 가져와 후일 영국 측 항의의 핵심 증거가 됨.</li>
</ul>`,
  },
  {
    order: 3,
    title: '즉시 파장 — 영-네덜란드 외교와 1차 영-네덜란드 전쟁',
    sectionType: 'aftermath',
    content: `<p>사건 소식이 영국에 도착한 1624년 5월부터 약 30년에 걸쳐 영-네덜란드 외교의 핵심 쟁점이 되었으며, 1652년 1차 영-네덜란드 전쟁의 원격 도화선이자 1654년 웨스트민스터 조약의 핵심 의제 중 하나였다.</p>

<h3>1. 영국 도착과 초기 항의 (1624 ~ 1625)</h3>
<ul>
  <li><strong>1624-05 영국 도착</strong>: 암본 → 바타비아 → 마카오 → 희망봉 → 런던으로 약 14개월의 항해 끝에 사건 소식이 영국 본국에 도달. EIC 총재 모리스 애벗이 즉시 제임스 1세에게 항의.</li>
  <li><strong>1624 EIC 팸플릿</strong>: "A True Relation of the Unjust, Cruell, and Barbarous Proceedings against the English at Amboyna"을 출간. 사면된 4인의 증언과 토우어슨의 마지막 서신을 핵심으로 한 약 100쪽 분량의 고발서. 영국에서 17세기 내내 베스트셀러로 유통.</li>
  <li><strong>제임스 1세의 외교 압박</strong>: 1624년 7월 헤이그 주재 영국 대사 더들리 칼튼이 네덜란드 의회(Staten-Generaal)에 공식 항의. 네덜란드 측은 "현지 VOC의 합법적 사법 절차"라는 입장을 고수하며 책임 회피.</li>
  <li><strong>1625 제임스 1세 사망</strong>: 보복 정책 추진 중 제임스 1세 사망. 후임 찰스 1세는 의회와의 갈등(권리청원 1628 등)으로 강력한 보복 추진 여력 부재.</li>
</ul>

<h3>2. 1620~30년대 — 외교 갈등의 만성화</h3>
<ul>
  <li><strong>판 스푀이트의 운명</strong>: 1623년 12월 암본 총독 임기 만료로 본국 송환 명령. 1626년 페르시아로 향하는 항해 중 사망(아라비아해 — 자연사 또는 독살설). VOC가 책임자 처벌을 회피한 핵심 사실.</li>
  <li><strong>1631 헤이그 군법회의</strong>: 영국 측 압박으로 VOC가 형식적 군법회의 개최. 그러나 판 스푀이트가 이미 사망한 상태에서 사실상 면죄부 부여.</li>
  <li><strong>경제 보복</strong>: 영국이 1620년대 후반부터 네덜란드 어선에 대한 영국 해역 어업권 제한, 네덜란드 청어 어업 단속 등 간접 보복 조치를 누적.</li>
</ul>

<h3>3. 1차 영-네덜란드 전쟁 (1652 ~ 1654)</h3>
<ul>
  <li><strong>직접 발발 원인</strong>: 1651년 크롬웰 공화국의 "항해법(Navigation Act)"으로 영국 식민지 무역에서 네덜란드 선박 배제. 이로 인한 해상 충돌이 1652-07-10 정식 선전포고로 확대.</li>
  <li><strong>암보이나 사건의 명분 활용</strong>: 영국 의회·프로파간다 측은 "암보이나 학살에 대한 정의를 세우는 전쟁"으로 공식 규정. 1623년 사건이 30년 후 전쟁의 도덕적 정당화에 동원됨.</li>
  <li><strong>전쟁 경과</strong>: 양국 해군이 잉글랜드 해협·북해에서 약 10차례 대규모 해전. 영국이 점차 우세를 차지, 1653-08 셰베닝겐 전투에서 네덜란드 사령관 마르텐 트롬프 전사.</li>
  <li><strong>1654-04-15 웨스트민스터 조약</strong>: 종전 조약. 핵심 조항 중 하나가 "암보이나 배상 조항" — VOC가 잉글랜드 정부에 8만 5천 파운드(현재 가치 약 1,800만 파운드 상당), 유족에 3,615파운드 배상. 1623년 사건 발생 31년 만의 정식 배상.</li>
</ul>

<h3>4. 2차·3차 영-네덜란드 전쟁 (1665~1667, 1672~1674)</h3>
<ul>
  <li><strong>2차 전쟁(1665~1667) 메드웨이 공격</strong>: 네덜란드의 일시 우세. 그러나 영국이 뉴암스테르담(현 뉴욕)을 영구 확보.</li>
  <li><strong>3차 전쟁(1672~1674)과 드라이든의 "암보이나"</strong>: 1672년 영국 시인 존 드라이든(John Dryden)이 비극 "Amboyna, or the Cruelties of the Dutch to the English Merchants"를 발표. 다시 한 번 1623년 사건을 전쟁 명분으로 활용. 1674년 웨스트민스터 조약으로 종전.</li>
</ul>`,
  },
  {
    order: 4,
    title: '장기 유산 — 동남아 식민 분할과 EIC의 인도 전환',
    sectionType: 'aftermath',
    content: `<p>암보이나 학살의 가장 결정적인 장기 유산은 (1)동남아시아 식민 권역 분할(영국-인도 / 네덜란드-인도네시아) 구도의 출발점 (2)EIC의 인도 본토 진출 가속화로 1757년 플라시 전투 → 1858년 인도 제국 → 1947년 인도·파키스탄 독립으로 이어지는 인도 식민사의 간접적 출발점 (3)근대 국제법 사상의 한 토대(휘호 흐로티위스의 "자유해론"이 1609년 발표된 후 VOC의 사실상 자치 사법권을 상징하는 사건이 됨)이다.</p>

<h3>1. 동남아 식민 권역 분할의 출발점</h3>
<ul>
  <li><strong>영국 EIC의 인도네시아 추방</strong>: 사건 후 EIC는 향신료 제도에서 사실상 모든 거점을 철수. 1620년경 약 200명이었던 인도네시아 주재 EIC 인력이 1630년경 50명 미만으로 격감.</li>
  <li><strong>네덜란드 VOC의 인도네시아 독점</strong>: 1623년 이후 VOC는 향신료 제도에서 거의 완전한 독점적 지위 확보. 1799년 VOC 해체 후 네덜란드 정부가 직접 통치하는 "네덜란드령 동인도(Dutch East Indies)"로 1945년 인도네시아 독립까지 약 320년간 식민 지배.</li>
  <li><strong>1824년 영-네덜란드 조약</strong>: 약 200년 후 정식 식민 권역 분할 조약 체결. 영국이 말라카 영유, 네덜란드가 수마트라·자바 등 인도네시아 영유로 동남아 식민 분할이 공식화. 1623년 암보이나 학살이 만든 사실상의 분할이 200년 만에 조약으로 정식화된 것.</li>
</ul>

<h3>2. EIC의 인도 전환과 인도 식민사의 출발</h3>
<ul>
  <li><strong>인도 본토 자원 집중</strong>: 1623~1640년 EIC는 인도네시아 철수 자원을 인도 본토에 재배치. 1632년 마술리파탐(코로만델 해안), 1639년 마드라스(포트 세인트 조지) 등 거점 확장.</li>
  <li><strong>새 수익원 — 면직물·인디고·초석·아편</strong>: 향신료 대신 인도산 면직물·인디고(인도 남부)·초석(벵골)·아편(벵골)이 새 수익원으로 부상. 17세기 후반 EIC 수익의 약 60%가 인도 면직물에서 발생.</li>
  <li><strong>1757 플라시 전투로의 연결</strong>: 약 130년 후 1757년 플라시 전투에서 EIC가 벵골 정복. 1858년 인도 통치법으로 EIC 해체 후 인도 통치권이 영국 왕실에 직접 귀속, "인도 제국(British Raj)" 성립. 암보이나 학살이 EIC를 인도네시아에서 추방하지 않았다면 인도 식민화의 시기·강도가 달랐을 가능성.</li>
</ul>

<h3>3. 근대 국제법·식민지 사법권 논쟁</h3>
<ul>
  <li><strong>흐로티위스 "자유해론"(1609)과의 모순</strong>: VOC 법률고문 흐로티위스(Hugo Grotius)가 1609년 발표한 "자유해론(Mare Liberum)"은 모든 국가의 자유로운 해상 통항권을 주장. 그러나 1623년 암보이나 학살은 VOC가 향신료 제도에서 사실상 자국 사법권을 일방적으로 행사한 사건으로, 이후 영국 측은 "자유해론"의 기회주의적 적용을 비판하는 핵심 논거로 활용.</li>
  <li><strong>"회사 국가(company-state)"의 폭력성</strong>: 17세기 동인도회사들이 본국 정부의 명목적 위임 하에 사실상 주권국가급 무력·사법권을 행사한 "회사 국가" 모델의 잔혹한 단면. 후일 EIC도 1769~1770 벵골 대기근 등 유사한 폭력성을 드러내며 1858년 영국 왕실 직할로 전환.</li>
</ul>

<h3>4. 사학사적 평가</h3>
<ul>
  <li><strong>영국 사학</strong>: "네덜란드 상업 제국주의의 잔혹성을 드러낸 사건"으로 평가. 17~19세기 영국 학교 교과서에 반(反)네덜란드·친(親)인도 식민 정책의 도덕적 정당화 자료로 수록.</li>
  <li><strong>네덜란드 사학</strong>: "현지 VOC 사령관의 일탈로, 본국 정부의 책임은 제한적"이라는 입장이 19세기까지 주류. 그러나 20세기 후반 이후 식민지 폭력의 대표적 사례로 비판적 재평가.</li>
  <li><strong>인도네시아·인도 사학(탈식민 학파)</strong>: "유럽 동인도회사들의 상호 폭력의 한 예시일 뿐, 진정한 피해자는 학살된 영국·일본·포르투갈인이 아니라 식민화된 토착민"이라는 시각. 1621년 반다 학살(토착민 약 14,000명 → 1,000명 미만)과 1623년 암보이나 학살을 동일한 식민 폭력의 두 측면으로 평가.</li>
  <li><strong>비교사학(앤서니 밀튼, 2008)</strong>: "Amboyna 1623: An East India Company Tragedy"에서 사건의 외교·법률·문화적 다층 영향을 종합 분석, 현대 학계의 표준적 해석 제공.</li>
</ul>`,
  },
]

export async function seedAmboynaMassacre(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n🗡️  암보이나 학살(1623) 시딩 시작...')

  // ── 사전 의존성 조회 ───────────────────────────────────────────────────
  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const category = await prisma.eventCategory.findFirst({
    where: { name: EVENT_CATEGORY_NAME },
    select: { id: true },
  })
  if (!category) {
    console.warn(`  ⚠️  사건 카테고리 '${EVENT_CATEGORY_NAME}' 미존재 — 시딩 중단`)
    return
  }

  const dutchHC = await prisma.historicalCountry.findFirst({
    where: { name: '네덜란드 공화국' },
    select: { id: true },
  })
  if (!dutchHC) {
    console.warn('  ⚠️  역사 국가 \'네덜란드 공화국\' 미존재 — 시딩 중단 (먼저 historicalCountry.benelux.seed 실행)')
    return
  }

  const englandHC = await prisma.historicalCountry.findFirst({
    where: { name: '잉글랜드 왕국' },
    select: { id: true },
  })
  if (!englandHC) {
    console.warn('  ⚠️  역사 국가 \'잉글랜드 왕국\' 미존재 — 시딩 중단')
    return
  }

  // ── 1) 사건 등록(또는 갱신) ───────────────────────────────────────────
  const TITLE = '암보이나 학살'

  let event = await prisma.event.findFirst({
    where: {
      title: TITLE,
      startDate: new Date('1623-02-27'),
      deletedAt: null,
    },
  })

  if (event) {
    await prisma.event.update({
      where: { id: event.id },
      data: EVENT_BODY,
    })
    console.log(`  🔄 갱신: ${TITLE} (id=${event.id})`)
  } else {
    event = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date('1623-02-27'),
        startDatePrecision: 'day',
        endDate: new Date('1623-02-27'),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: dutchHC.id,
        createdById: admin.id,
      },
    })
    console.log(`  ✅ 생성: ${TITLE} (id=${event.id})`)
  }

  // ── 2) EventSection ───────────────────────────────────────────────────
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId: event.id, title: section.title },
    })
    if (exists) {
      await prisma.eventSection.update({
        where: { id: exists.id },
        data: {
          content: section.content,
          order: section.order,
          sectionType: section.sectionType ?? null,
        },
      })
      console.log(`    🔄 섹션 갱신: ${section.title}`)
      continue
    }
    await prisma.eventSection.create({
      data: {
        eventId: event.id,
        title: section.title,
        content: section.content,
        order: section.order,
        sectionType: section.sectionType ?? null,
      },
    })
    console.log(`    ✅ 섹션 생성: ${section.title}`)
  }

  // ── 3) EventCountryRelation ───────────────────────────────────────────
  type RelInput = {
    historicalCountryName: string
    role: EventCountryRole
    roleDescription: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '네덜란드 공화국',
      role: EventCountryRole.INITIATOR,
      roleDescription:
        '주도국·가해국. 1602년 설립된 네덜란드 동인도회사(VOC)가 향신료 제도(말루쿠) 암본을 ' +
        '1605년 점령한 후 사실상 자치 식민 정부로 운영하던 시기. ' +
        '암본 총독 헤르만 판 스푀이트가 일본 낭인 시치로의 사소한 신문 사건을 ' +
        '"영-일 합작 모반"으로 확대해석해 약 12일에 걸친 고문·자백 강요·집단 처형을 자행. ' +
        '본국 네덜란드 의회는 사후 영국 측 항의에 "현지 VOC의 합법적 사법 절차"라며 책임을 회피, ' +
        '약 30년 후 1654년 웨스트민스터 조약에서 8만 5천 파운드 + 유족 3,615파운드 배상으로 일단락. ' +
        '결과적으로 향신료 제도 독점을 확립하고 1799년 VOC 해체 후 1945년까지 약 320년간 ' +
        '인도네시아 식민 지배의 토대를 마련했다.',
    },
    {
      historicalCountryName: '잉글랜드 왕국',
      role: EventCountryRole.VICTIM,
      roleDescription:
        '피해국. 1600년 설립된 영국 동인도회사(EIC) 상관장 가브리엘 토우어슨 등 ' +
        '암본 상관원 10명이 처형되고 자산 약 4,500파운드가 몰수됨. ' +
        '제임스 1세·찰스 1세 정부가 30년 전쟁 중 외교적 제약과 의회와의 갈등으로 ' +
        '강력한 즉각 보복을 추진하지 못했으나, 1652~1654년 1차 영-네덜란드 전쟁의 명분으로 활용. ' +
        '1654년 웨스트민스터 조약으로 정식 배상을 받아 31년 만에 일단락. ' +
        '간접적 결과로 EIC가 향신료 제도에서 추방되어 인도 본토(면직물·인디고·초석·아편)로 ' +
        '진출 방향을 전환, 1757년 플라시 전투로 이어지는 인도 식민화의 출발점이 되었다.',
    },
  ]

  for (const rel of RELATIONS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: rel.historicalCountryName },
      select: { id: true },
    })
    if (!hc) {
      console.warn(`    ⚠️  역사 국가 미존재: ${rel.historicalCountryName}`)
      continue
    }

    const exists = await prisma.eventCountryRelation.findFirst({
      where: {
        eventId: event.id,
        historicalCountryId: hc.id,
        role: rel.role,
      },
    })
    if (exists) {
      await prisma.eventCountryRelation.update({
        where: { id: exists.id },
        data: { roleDescription: rel.roleDescription },
      })
      console.log(`    🔄 국가관계 갱신: ${rel.historicalCountryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId: event.id,
        historicalCountryId: hc.id,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.historicalCountryName} (${rel.role})`)
  }

  console.log(`✅ 암보이나 학살 시딩 완료\n`)
}
