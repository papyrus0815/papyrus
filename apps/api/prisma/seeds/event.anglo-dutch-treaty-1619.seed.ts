/**
 * 1619년 영-네덜란드 방위 조약 (Anglo-Dutch Treaty of Defense, 1619-07-17) 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Event/Section/EventCountryRelation이 이미 있으면
 *    갱신하지 않고 스킵한다. (사용자 편집 보호)
 *
 * 단독 사건. 영국 동인도회사(EIC)와 네덜란드 동인도회사(VOC)의 향신료 제도
 * 무역 분쟁을 봉합하기 위해 양국 본국이 런던에서 체결한 상업·군사 조약.
 * 향신료 할당(1/3:2/3)·공동 방위 함대·중재 위원회 등을 규정했으나,
 * 현지 VOC 사령관(코엔·판 스푀이트)이 사실상 이행을 거부하면서
 * 1623년 암보이나 학살 → 1626년 조약 사실상 폐기로 이어졌다.
 *
 * 등록 항목 (모두 존재 시 스킵):
 *  - Event 1
 *  - EventSection x4 (배경/협상과 체결/조약 내용/실패와 후속)
 *  - EventCountryRelation x2 (잉글랜드 왕국·네덜란드 공화국 모두 SIGNATORY 성격)
 */
import { EventCountryRole } from '@prisma/client'

import { PrismaService } from '../prisma.service'

const EVENT_CATEGORY_NAME = '회담/조약'

// ── 사건 본문 ─────────────────────────────────────────────────────────────
const EVENT_BODY = {
  description:
    '1619년 7월 17일 런던에서 잉글랜드 왕 제임스 1세 정부와 네덜란드 공화국 의회(Staten-Generaal)가 ' +
    '양국 동인도회사(EIC·VOC)의 향신료 제도(말루쿠) 무역 분쟁을 봉합하기 위해 체결한 상업·군사 조약. ' +
    '핵심 조항은 ①향신료 할당 — 영국 EIC가 정향·육두구의 1/3, 후추의 1/2 확보 ' +
    '②공동 방위 함대(fleet of defence) — 양사 각 10척씩 총 20척으로 스페인·포르투갈에 대항 ' +
    '③비용 분담 — 군사 작전비를 할당 비율대로 분담 ' +
    '④중재 위원회 — 분쟁 발생 시 반텐(Bantam) 주재 양사 합동 위원회에서 조정 ' +
    '⑤상호 자유 통상 — 양사 상관에서 자유 거래 보장이었다. ' +
    '\n\n' +
    '본국 정부 차원에서는 30년 전쟁(1618~1648) 발발 직후 신교 동맹 강화 명분으로 추진되었으나, ' +
    '현지 VOC 사령관 얀 피터르스존 쿤(Coen, 바타비아 총독)·헤르만 판 스푀이트(암본 총독)는 ' +
    '"본국이 모르고 양보한 것"이라며 사실상 이행을 거부, 영국 EIC를 체계적으로 압박했다. ' +
    '1623년 암보이나 학살로 양국 관계가 결정적으로 파탄, 1626년 영국 측이 조약을 정식 폐기 통고하면서 ' +
    '7년 만에 사문화되었다. 그러나 17세기 초 양사가 추구한 "협력적 식민 분할"의 실험으로 ' +
    '근대 국제 무역 조약사의 한 분기점으로 평가된다.',
  location: '잉글랜드 런던 — 화이트홀 궁정 / 네덜란드 헤이그(비준)',
  background:
    '【향신료 제도의 격화하는 충돌】 1605년 VOC가 암본을 점령한 후 향신료 제도(말루쿠)에서 ' +
    'EIC와 VOC의 충돌이 급증했다. 1610년대 양사는 정향·육두구 가격을 둘러싸고 ' +
    '관세 이중 부과·항구 출입 제한·해상 나포 등 사실상의 무력 충돌을 반복했다. ' +
    '1618년에는 자카르타에서 VOC와 영국·반텐 술탄 연합군이 직접 교전, ' +
    '1619-05-30 코엔의 자카르타 함락(이후 바타비아로 개명)으로 양사 갈등이 임계점에 도달. ' +
    '\n\n' +
    '【본국 정부의 외교적 봉합 시도】 양국 본국은 1613·1615·1618년 세 차례에 걸쳐 ' +
    '공동 위원회(joint commission)를 구성해 분쟁 조정을 시도했으나 모두 결렬. ' +
    '1618년 30년 전쟁 발발로 신교 동맹 강화가 절박해진 잉글랜드 측이 ' +
    '1619년 초부터 적극적 양보안을 제시했고, 네덜란드 측도 ' +
    '스페인 휴전(1609~1621 12년 휴전)이 만료되면 다시 본국 방어가 절실해질 것을 우려해 합의에 응했다. ' +
    '\n\n' +
    '【제임스 1세의 의도】 잉글랜드 왕 제임스 1세는 ①EIC의 향신료 무역 보호 ②네덜란드와의 신교 동맹 강화 ' +
    '③스페인 무적함대 위협 분산을 동시에 추구. 그러나 본국 합의가 현지 VOC 사령관에 의해 ' +
    '얼마든 무력화될 수 있다는 점을 과소평가한 것이 결정적 한계였다.',
  aftermath:
    '【조약 비준과 초기 이행(1619-08 ~ 1621)】 ' +
    '1619-08-13 네덜란드 의회 비준 → 1619-08 런던 정식 교환. ' +
    '1620~1621년 양사가 실제로 인도네시아·향신료 제도에서 합동 함대를 운영해 ' +
    '필리핀·마카오 부근에서 스페인·포르투갈 함선을 나포한 사례 다수. ' +
    '\n\n' +
    '【1621 반다 학살과 균열】 1621년 코엔이 반다 제도(육두구 산지)에서 ' +
    '토착민 약 14,000명 중 1,000~3,000명을 처형하고 나머지를 노예로 전락시킨 학살 사건. ' +
    'EIC 측이 합동 함대 일원으로 형식적으로 참여했으나 실질 결정·실행은 VOC가 단독으로 수행. ' +
    'EIC의 항의는 묵살되었다. ' +
    '\n\n' +
    '【1623 암보이나 학살】 1623-02-27 판 스푀이트가 EIC 상관원 10명·일본 낭인 9명·포르투갈인 1명을 ' +
    '"VOC 요새 탈취 모반"을 자백받기 위해 워터보딩 고문 후 집단 처형. ' +
    '1619년 조약의 "분쟁 시 반텐 위원회 중재" 조항을 완전히 무시하고 VOC가 일방 사법권을 행사한 사건. ' +
    '\n\n' +
    '【1626 조약 폐기와 영국의 인도 전환】 ' +
    '1624년 5월 영국에 사건 소식이 도달한 후 약 2년의 외교 갈등 끝에 ' +
    '1626년 영국 정부가 조약 폐기 통고. EIC는 향신료 제도에서 사실상 철수해 ' +
    '인도 본토(수라트·마술리파탐·마드라스)로 진출 방향을 전환, ' +
    '17세기 후반 면직물·인디고·초석·아편 무역으로 새 수익원을 개척한다. ' +
    '결과적으로 1757년 플라시 전투로 이어지는 인도 식민화의 간접적 출발점이 되었다. ' +
    '\n\n' +
    '【장기 유산】 1619년 조약은 17세기 초 유럽 동인도회사들이 추구한 ' +
    '"협력적 식민 분할" 모델의 마지막 시도였으며, 이의 실패가 ' +
    '17세기 후반 영-네덜란드 전쟁(1차 1652~1654, 2차 1665~1667, 3차 1672~1674) 시대 ' +
    '"상업 패권 다툼" 모델로의 전환을 가속화시켰다.',
  keywords: [
    '영-네덜란드 방위 조약',
    'Anglo-Dutch Treaty of Defense 1619',
    '1619 조약',
    '제임스 1세',
    '얀 피터르스존 쿤',
    'EIC',
    'VOC',
    '향신료 제도',
    '말루쿠',
    '공동 방위 함대',
    'fleet of defence',
    '반텐 위원회',
    '암보이나 학살',
    '반다 학살',
    '30년 전쟁',
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
    title: '체결 배경',
    sectionType: 'background',
    content: `<p>1619년 영-네덜란드 방위 조약은 ①1605년 이후 향신료 제도에서 격화된 EIC-VOC 충돌 ②1618년 30년 전쟁 발발로 인한 신교 동맹 강화 필요성 ③1619-05 코엔의 자카르타 함락으로 임계점에 도달한 현지 무력 충돌이라는 세 갈래의 압력이 결합한 결과였다.</p>

<h3>1. 향신료 제도의 격화하는 충돌</h3>
<ul>
  <li><strong>1605 VOC 암본 점령</strong>: 향신료 제도(말루쿠 — 정향·육두구 산지)에서 포르투갈을 축출하고 VOC가 우위 확보. 영국 EIC도 1603년 1차 항해 이래 자카르타·반텐·암본 등에 소규모 상관 운영.</li>
  <li><strong>1610년대 충돌 증가</strong>: 정향·육두구 가격을 둘러싸고 양사가 관세 이중 부과·항구 출입 제한·해상 나포 등 사실상 무력 충돌 반복. EIC 측 인력은 약 200명, VOC 측은 약 2,000명으로 압도적 격차.</li>
  <li><strong>1618 자카르타 충돌</strong>: VOC와 영국·반텐 술탄 연합군이 자카르타에서 직접 교전. 1619-05-30 코엔의 자카르타 함락으로 양사 갈등이 임계점.</li>
</ul>

<h3>2. 본국 정부의 외교적 봉합 시도</h3>
<ul>
  <li><strong>1613·1615·1618 공동 위원회</strong>: 양국 본국이 세 차례에 걸쳐 공동 위원회(joint commission) 구성, 분쟁 조정 시도했으나 모두 결렬. 핵심 쟁점은 향신료 할당 비율과 군사비 분담.</li>
  <li><strong>1618 30년 전쟁 발발</strong>: 보헤미아 반란으로 30년 전쟁(1618~1648) 시작. 잉글랜드·네덜란드 모두 신교 진영의 핵심 국가로 외교적 동맹 강화가 절박해짐.</li>
  <li><strong>스페인 12년 휴전 만료(1621) 우려</strong>: 1609년 시작된 스페인-네덜란드 12년 휴전이 1621년 만료 예정. 네덜란드 측도 본국 방어가 다시 절실해질 것을 우려해 잉글랜드와의 합의에 적극.</li>
</ul>

<h3>3. 양국 본국의 의도</h3>
<ul>
  <li><strong>제임스 1세의 의도</strong>: ①EIC 향신료 무역 보호 ②네덜란드와의 신교 동맹 강화 ③스페인 무적함대 위협 분산을 동시에 추구. 본국 합의가 현지 VOC 사령관에 의해 무력화될 수 있다는 점을 과소평가.</li>
  <li><strong>네덜란드 의회의 의도</strong>: 본국 방어 우선·30년 전쟁에서 잉글랜드의 협력 확보·향신료 무역 독점은 다소 양보. 단 코엔·판 스푀이트 등 현지 사령관은 "본국이 양보를 모르고 결정한 것"이라며 격분, 사실상 이행을 거부할 준비.</li>
</ul>`,
  },
  {
    order: 2,
    title: '협상과 체결 — 1619년 7월 17일',
    sectionType: 'process',
    content: `<p>1619년 4월부터 약 3개월에 걸친 런던 협상 끝에 7월 17일 잉글랜드 왕 제임스 1세 정부와 네덜란드 의회 대표가 정식 조약에 서명. 1619년 8월 13일 네덜란드 의회 비준으로 효력 발생.</p>

<h3>1. 협상 대표</h3>
<ul>
  <li><strong>잉글랜드 측</strong>: 외상(Lord Privy Seal) 헨리 몬태규, EIC 총재 모리스 애벗, 추밀원 위원 다수. 제임스 1세가 직접 핵심 사항 결재.</li>
  <li><strong>네덜란드 측</strong>: 헤이그 의회(Staten-Generaal)에서 파견한 전권대사단. VOC 17인 위원회(Heeren XVII) 측에서도 옵저버 파견. 그러나 현지 VOC 사령관(코엔)은 협상 과정에 전혀 참여하지 못함.</li>
</ul>

<h3>2. 협상 쟁점</h3>
<ul>
  <li><strong>향신료 할당 비율</strong>: 영국 측은 1:1 할당을 요구했으나 네덜란드 측이 거부. 최종 절충안은 정향·육두구 1/3:2/3, 후추 1:1 비율.</li>
  <li><strong>공동 방위 함대 규모</strong>: 영국 측은 양사 각 5척을 제시했으나 네덜란드 측이 더 큰 규모를 요구. 최종 양사 각 10척으로 합의.</li>
  <li><strong>중재 메커니즘</strong>: 분쟁 발생 시 중재 장소를 두고 영국은 런던, 네덜란드는 헤이그를 주장. 최종 절충안은 현지 반텐(Banten) 주재 양사 합동 위원회.</li>
  <li><strong>현지 사령관의 권한</strong>: 영국 측은 현지 VOC 사령관의 일방적 행동을 제약하는 조항을 요구했으나, 네덜란드 측이 "현지 자율성"을 이유로 거부. 이 미합의가 후일 코엔의 반다 학살(1621)·판 스푀이트의 암보이나 학살(1623)을 가능케 한 핵심 결함이 됨.</li>
</ul>

<h3>3. 서명과 비준</h3>
<ul>
  <li><strong>1619-07-17 런던 서명</strong>: 화이트홀 궁정에서 양국 대표가 정식 서명. 본 조약문은 라틴어·영어·네덜란드어 3개 언어로 작성.</li>
  <li><strong>1619-08-13 네덜란드 의회 비준</strong>: 헤이그에서 정식 비준. 양국 비준서 교환으로 효력 발생.</li>
  <li><strong>VOC 17인 위원회의 사실상 거부</strong>: 비준 직후 VOC 17인 위원회는 코엔에게 "조약 이행은 신중히 — 본국의 향신료 무역 이익을 우선시하라"는 사실상의 회피 지침 발송.</li>
</ul>`,
  },
  {
    order: 3,
    title: '조약 내용 — 5대 핵심 조항',
    sectionType: 'process',
    content: `<p>1619년 조약의 핵심 조항은 ①향신료 할당 ②공동 방위 함대 ③비용 분담 ④중재 위원회 ⑤상호 자유 통상의 5개 항목으로 구성되었다.</p>

<h3>1. 향신료 할당 (Spice Allocation)</h3>
<ul>
  <li><strong>정향(clove)</strong>: 영국 EIC 1/3, 네덜란드 VOC 2/3. 1620년 기준 연간 약 30만 파운드 거래량 중 영국에 약 10만 파운드 할당.</li>
  <li><strong>육두구(nutmeg) 및 메이스(mace)</strong>: 영국 EIC 1/3, 네덜란드 VOC 2/3. 반다 제도 산지의 산출량 기준.</li>
  <li><strong>후추(pepper)</strong>: 영국 EIC 1/2, 네덜란드 VOC 1/2. 수마트라·자바 등 광범위 산지여서 절반씩 할당.</li>
  <li><strong>강제 매매 금지</strong>: 양사가 토착민에게 가격을 강제하거나 단일 매수자 행세를 하는 것을 금지(실제로는 양사 모두 위반).</li>
</ul>

<h3>2. 공동 방위 함대 (Fleet of Defence)</h3>
<ul>
  <li><strong>편성 규모</strong>: 양사 각 10척, 총 20척으로 합동 함대 운영. 핵심 목적은 스페인·포르투갈 함선의 나포·요새 공격.</li>
  <li><strong>지휘 체계</strong>: 합동 함대 사령관은 양사 사령관이 6개월씩 교대 지휘. 실제로는 VOC가 다수의 경험·인력 우위로 사실상 주도.</li>
  <li><strong>나포 전리품</strong>: 합동 작전에서 나포한 적함·화물은 출자 비율(1:1)로 분배. 1620~1621년 필리핀 부근에서 마닐라행 갤리언선 나포 등 일부 성과.</li>
</ul>

<h3>3. 비용 분담 (Cost-Sharing)</h3>
<ul>
  <li><strong>군사 작전비</strong>: 합동 함대 운영비는 양사 각 50% 분담. 그러나 함선·인력의 실질 부담은 VOC가 더 많아 형평성 시비 발생.</li>
  <li><strong>요새 운영비</strong>: 향신료 제도 요새 운영비는 향신료 할당 비율(1/3:2/3)대로 분담.</li>
  <li><strong>분쟁 시 정산</strong>: 양사 결산은 매년 반텐 합동 위원회에서 검토.</li>
</ul>

<h3>4. 중재 위원회 (Council of Defence at Bantam)</h3>
<ul>
  <li><strong>구성</strong>: 자바 반텐(Banten) 주재 양사 합동 위원회. 양사 각 4명씩 총 8명으로 구성.</li>
  <li><strong>관할</strong>: 향신료 제도에서 발생하는 양사 간 분쟁 일체. 위원회 결정에 양사가 구속됨.</li>
  <li><strong>실효성 부재</strong>: 코엔·판 스푀이트 등 현지 VOC 사령관이 위원회 결정을 사실상 무시. 1623년 암보이나 학살 시에도 위원회 중재 절차를 완전히 거치지 않고 VOC가 일방 처형.</li>
</ul>

<h3>5. 상호 자유 통상 (Mutual Free Trade)</h3>
<ul>
  <li><strong>상관 자유 거래</strong>: 양사 상관에서 상대 회사의 자유 거래 보장. 관세 이중 부과·항구 출입 제한 금지.</li>
  <li><strong>영토 양보 금지</strong>: 양사가 토착 군주로부터 새 영토·요새를 획득할 경우 사전 합의 필수.</li>
  <li><strong>실효성 부재</strong>: 1620~1623년 코엔이 자카르타 영구 점령·바타비아 개명, 1621년 반다 학살로 사실상 단독 영토 확장. 영국 측 항의는 묵살.</li>
</ul>`,
  },
  {
    order: 4,
    title: '실패와 후속 — 암보이나로 가는 길',
    sectionType: 'aftermath',
    content: `<p>1619년 조약은 본국 차원의 봉합에도 불구하고 현지 VOC의 사실상 거부로 약 7년 만에 사문화. 1621년 반다 학살, 1623년 암보이나 학살로 양국 관계가 결정적으로 파탄, 1626년 영국 측의 정식 폐기 통고로 7년 만에 종결되었다.</p>

<h3>1. 1620~1621 — 표면적 협력과 균열의 시작</h3>
<ul>
  <li><strong>합동 함대 일부 성과</strong>: 1620~1621년 필리핀 부근에서 마닐라행 갤리언선 나포 등 일부 성과. 양사 모두 약 5만 길더의 전리품 분배.</li>
  <li><strong>1621 반다 학살</strong>: 코엔이 반다 제도(육두구 산지)에서 토착민 약 14,000명 중 1,000~3,000명을 처형하고 나머지를 노예로 전락시킨 학살 사건. 영국 EIC는 합동 함대 일원으로 형식적으로 참여했으나 실질 결정·실행은 VOC가 단독 수행. EIC의 항의는 묵살.</li>
  <li><strong>현지 VOC의 일방주의 강화</strong>: 코엔이 1622년 임기 종료로 본국 송환된 후에도 후임자들이 같은 노선 유지. 영국 EIC를 향신료 제도에서 사실상 추방하려는 체계적 압박이 가속.</li>
</ul>

<h3>2. 1623 암보이나 학살 — 결정적 파탄</h3>
<ul>
  <li><strong>1623-02-27 처형</strong>: 암본 총독 헤르만 판 스푀이트가 EIC 상관원 10명·일본 낭인 9명·포르투갈인 1명을 "VOC 요새 탈취 모반"을 자백받기 위해 워터보딩 고문 후 집단 처형.</li>
  <li><strong>조약 핵심 조항 위반</strong>: 1619년 조약의 "분쟁 시 반텐 위원회 중재" 조항을 완전히 무시. 양사 합동 사법 절차 없이 VOC가 일방 군법회의로 사형 선고.</li>
  <li><strong>1624-05 영국 도착</strong>: 약 14개월 후 사건 소식이 영국 본국에 도달. EIC와 제임스 1세가 격렬히 항의했으나 30년 전쟁 중 외교적 제약으로 즉각적 보복은 실행되지 못함.</li>
</ul>

<h3>3. 1626 조약 폐기와 영국의 인도 전환</h3>
<ul>
  <li><strong>1626 영국 측 폐기 통고</strong>: 1624~1626년 약 2년의 외교 갈등 끝에 영국 정부가 조약 폐기 통고. 7년 만에 사문화 확정.</li>
  <li><strong>EIC의 향신료 제도 철수</strong>: 1620년경 약 200명이었던 인도네시아 주재 EIC 인력이 1630년경 50명 미만으로 격감. 향신료 제도에서 사실상 모든 거점 철수.</li>
  <li><strong>인도 본토 자원 집중</strong>: 1623~1640년 EIC는 인도네시아 철수 자원을 인도 본토에 재배치. 1632년 마술리파탐, 1639년 마드라스(포트 세인트 조지) 등 거점 확장. 17세기 후반 면직물·인디고·초석·아편 무역으로 새 수익원 개척.</li>
</ul>

<h3>4. 장기 유산</h3>
<ul>
  <li><strong>"협력적 식민 분할" 모델의 종언</strong>: 1619년 조약은 17세기 초 유럽 동인도회사들이 추구한 "협력적 식민 분할" 모델의 마지막 시도. 이의 실패로 17세기 후반 영-네덜란드 전쟁(1차 1652~1654, 2차 1665~1667, 3차 1672~1674) 시대의 "상업 패권 다툼" 모델로 전환 가속.</li>
  <li><strong>1654 웨스트민스터 조약 — 암보이나 배상</strong>: 1차 영-네덜란드 전쟁 종전 조약에서 VOC가 잉글랜드 정부에 8만 5천 파운드 + 유족 3,615파운드 배상. 1623년 암보이나 사건이 31년 만에 정식 배상으로 일단락.</li>
  <li><strong>1824 영-네덜란드 조약</strong>: 약 200년 후 정식 식민 권역 분할 조약 체결. 영국이 말라카 영유, 네덜란드가 수마트라·자바 등 인도네시아 영유. 1619년 조약이 추구했던 "협력적 분할"이 200년 만에 "공간적 분할"로 정식화된 것.</li>
  <li><strong>인도 식민화의 간접적 출발</strong>: EIC가 향신료 제도에서 추방되어 인도 본토로 진출 방향 전환, 1757년 플라시 전투 → 1858년 인도 제국 → 1947년 인도·파키스탄 독립으로 이어지는 인도 식민사의 간접적 출발점.</li>
</ul>`,
  },
]

export async function seedAngloDutchTreaty1619(
  prisma: PrismaService,
): Promise<void> {
  console.log('\n📜 1619 영-네덜란드 방위 조약 시딩 시작 (기존 데이터 보존 모드)...')

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

  const englandHC = await prisma.historicalCountry.findFirst({
    where: { name: '잉글랜드 왕국' },
    select: { id: true },
  })
  const dutchHC = await prisma.historicalCountry.findFirst({
    where: { name: '네덜란드 공화국' },
    select: { id: true },
  })
  if (!englandHC || !dutchHC) {
    console.warn('  ⚠️  필수 역사 국가 미존재 — 시딩 중단 (잉글랜드 왕국 / 네덜란드 공화국)')
    return
  }

  // ── 1) 사건 등록 (존재 시 스킵) ─────────────────────────────────────────
  const TITLE = '영-네덜란드 방위 조약'
  const START_DATE = '1619-07-17'

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
    console.log(`  ⏭️  사건 이미 존재 — 스킵: ${TITLE} (id=${eventId})`)
  } else {
    const created = await prisma.event.create({
      data: {
        title: TITLE,
        ...EVENT_BODY,
        startDate: new Date(START_DATE),
        startDatePrecision: 'day',
        endDate: new Date(START_DATE),
        endDatePrecision: 'day',
        categoryId: category.id,
        historicalCountryId: englandHC.id,
        createdById: admin.id,
      },
    })
    eventId = created.id
    console.log(`  ✅ 생성: ${TITLE} (id=${eventId})`)
  }

  // ── 2) EventSection (각 섹션 단위로 존재 시 스킵) ────────────────────────
  for (const section of SECTIONS) {
    const exists = await prisma.eventSection.findFirst({
      where: { eventId, title: section.title },
    })
    if (exists) {
      console.log(`    ⏭️  섹션 스킵 (이미 존재): ${section.title}`)
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

  // ── 3) EventCountryRelation (존재 시 스킵) ─────────────────────────────
  type RelInput = {
    historicalCountryName: string
    role: EventCountryRole
    roleDescription: string
  }
  const RELATIONS: RelInput[] = [
    {
      historicalCountryName: '잉글랜드 왕국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription:
        '서명 당사국. 제임스 1세 정부가 EIC 향신료 무역 보호와 신교 동맹 강화를 동시에 추구. ' +
        '향신료 1/3 할당·공동 방위 함대 10척 출자·반텐 위원회 중재를 핵심 합의로 확보했으나, ' +
        '현지 VOC의 사실상 이행 거부로 1623년 암보이나 학살을 거쳐 1626년 정식 폐기 통고. ' +
        '간접적 결과로 EIC가 향신료 제도에서 추방되어 인도 본토로 진출 방향을 전환, ' +
        '1757년 플라시 전투로 이어지는 인도 식민화의 출발점이 되었다.',
    },
    {
      historicalCountryName: '네덜란드 공화국',
      role: EventCountryRole.PARTICIPANT,
      roleDescription:
        '서명 당사국. 헤이그 의회(Staten-Generaal)가 30년 전쟁 발발과 스페인 12년 휴전 만료를 앞두고 ' +
        '잉글랜드와의 동맹 강화 차원에서 향신료 2/3 할당을 양보로 받아들임. ' +
        'VOC 17인 위원회는 비준 직후 코엔에게 "조약 이행 신중·향신료 무역 이익 우선" 회피 지침 발송, ' +
        '현지 사령관(코엔·판 스푀이트)의 사실상 거부로 조약 무력화. ' +
        '1621 반다 학살·1623 암보이나 학살로 향신료 제도 단독 지배를 확립, ' +
        '1799년 VOC 해체 후 1945년까지 약 320년간 인도네시아 식민 지배의 토대를 마련했다.',
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
        eventId,
        historicalCountryId: hc.id,
        role: rel.role,
      },
    })
    if (exists) {
      console.log(`    ⏭️  국가관계 스킵 (이미 존재): ${rel.historicalCountryName}`)
      continue
    }
    await prisma.eventCountryRelation.create({
      data: {
        eventId,
        historicalCountryId: hc.id,
        role: rel.role,
        roleDescription: rel.roleDescription,
      },
    })
    console.log(`    ✅ 국가관계: ${rel.historicalCountryName} (${rel.role})`)
  }

  console.log(`✅ 1619 영-네덜란드 방위 조약 시딩 완료\n`)
}
