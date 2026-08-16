/**
 * 드라구틴 디미트리예비치 «아피스» (Dragutin Dimitrijević "Apis", 1876~1917) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고 누락 필드만 보강.
 *
 * 세르비아 왕국 육군 대령·참모본부 정보부장. 1903년 5월 쿠데타(오브레노비치 왕가 시해)의
 * 실질 주모자로 궁정에서 세 발을 맞고 살아남았고, 이후 10여 년간 «국가 서열 3인자»로 불릴
 * 만큼 군의 비공식 실세였다. 1911년 비밀결사 «통일이냐 죽음이냐»(흑수단) 창립에 참여했고,
 * 정보부장으로서 사라예보 암살자들에게 무기와 월경 통로를 제공한 정보망의 책임자였다.
 * 1917년 솔룬(테살로니키) 재판에서 섭정 알렉산다르 암살 미수 혐의로 사형 선고를 받고
 * 총살되었으나, 그 «암살»은 실체가 없었고 1953년 재심에서 전원 무죄가 선고되었다.
 *
 * 날짜 규약: 세르비아는 1919년 1월까지 율리우스력(구력)을 썼다. 이 시드는 신력(NS)으로
 * 저장하고 구력 원일자를 notes·birthNote에 병기한다(19세기 +12일, 20세기 +13일).
 * 연·월 단위까지만 확인된 보직은 startDatePrecision으로 정밀도를 명시한다(팔레올로그 선례).
 *
 * ⚠️ 사료 계통이 정면 충돌하는 대목은 한쪽으로 단정하지 않고 양측을 병기했다:
 *  · 흑수단에서의 지위 — 세르비아 사료는 «최고중앙위원회의 일개 위원, 의장은 라디보예비치»,
 *    영어권 사료는 «지도자». 실질 최대 실세였다는 데는 양측이 수렴.
 *  · 사라예보 암살 «내가 조직했다» 자백 — 액면 그대로 받아들이지 않는 것이 현재 통설.
 *  · 군사학교 «수석 졸업»은 사실이 아님(하급 6등·상급 5등).
 *
 * 의존: seedSerbiaHistoricalCountries('세르비아 왕국 (근대)' HC).
 *
 * 등록 항목:
 *  - Person x1 (historicalCountryId=세르비아 왕국 (근대))
 *  - GovernmentPositionTenure x11 (MILITARY_COMMANDER — 임관부터 체포까지, appointmentDetail 포함)
 *    ※ 크라구예바츠 대대장(1908~1910)은 드리나 참모장과 시작 연도가 겹치고 사료가 시점을
 *      특정하지 못해 별도 재임으로 나누지 않고 드리나 재임의 notes에 병기했다.
 *  - PersonCountryAffiliation x1 / PersonNickname x1 (아피스)
 *  - PersonLifeEvent x18 / PersonStats x1
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
  type PersonNicknameType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const APIS = {
  name: '드라구틴',
  surname: '디미트리예비치',
  originalName: 'Dragutin Dimitrijević «Apis» (Драгутин Т. Димитријевић — Апис)',
  gender: 'MALE' as const,
  birthYear: 1876, birthMonth: 8, birthDay: 17,
  birthPlaceText: '세르비아 공국 베오그라드 — 체틴스카 거리의 흙벽돌 소가옥',
  birthNote:
    '구력 1876-08-05 출생 — 신력 환산 08-17(「세르비아 백과사전」이 지바노비치 1925·매켄지 ' +
    '1989을 근거로 «5/17. августа»로 이중표기). 세르비아어 위키백과 인포박스는 신력 08-18, ' +
    '영어 위키백과 본문은 08-19로 적어 사료가 3설로 갈리나, 19세기 구·신력 차이가 12일이므로 ' +
    '08-17이 가장 정합적이다. 친친(아로마니아) 계통의 가난한 함석장이 집안 출신으로, 부친 ' +
    '토도르는 그가 다섯 살 무렵 사망했고 교사가 된 누나 옐레나가 가족을 부양했다.',
  deathYear: 1917, deathMonth: 6, deathDay: 26,
  deathPlaceText: '그리스 테살로니키(솔룬) 교외 «솔룬 들판» — 총살 집행장',
  deathType: DeathType.EXECUTION,
  deathCause: '솔룬 재판 사형 판결에 따른 총살 (향년 40세)',
  deathNote:
    '구력 1917-06-13(신력 06-26) 새벽, 미리 파둔 무덤 앞에서 포병 소령 류보미르 불로비치· ' +
    '정보요원 라데 말로바비치와 함께 총살되었다. 판결문을 두 시간에 걸쳐 낭독한 뒤 04시 45분 ' +
    '집행. 유해의 소재는 확정되지 않았다 — 솔룬 제이틴리크 세르비아 군인묘지 납골당의 ' +
    '«무명인 5027번»설이 널리 퍼져 있으나 묘지 관리인 가문의 구전에 근거하며, 세 사람이 ' +
    '애초에 이장된 적 없다는 설도 병존한다. 1953년 베오그라드 재심에서 솔룬 판결이 전부 ' +
    '파기되고 피고 전원이 무죄·복권되었으며, 2012년 세르비아 사법부가 두 번째로 복권을 ' +
    '결정했다.',
  influence: 62,
  biography:
    '세르비아 왕국의 군인·정보장교. 계급은 대령에 그쳤으나 1903년부터 1916년까지 세르비아 ' +
    '군의 비공식 실세로서 «국가 서열 3인자»로 불렸고, 사라예보 암살로 이어지는 정보망의 ' +
    '책임자였다. 김나지움 시절 체구와 힘 때문에 얻은 별명 «아피스»(이집트 신화의 성스러운 ' +
    '황소)로 더 널리 알려졌다. ' +
    '\n\n' +
    '성장과 교육(1876~1898). 베오그라드의 가난한 함석장이 집안에서 태어나 다섯 살 무렵 ' +
    '아버지를 잃었고, 교사가 된 누나와 그 남편인 역사가 지반 지바노비치의 집에서 자랐다. ' +
    '김나지움 마지막 학년에 돌연 진로를 바꿔 1892년 군사학교에 들어갔고, 하급학교를 6등 ' +
    '(1896), 상급 참모과정을 5등(1898~)으로 마쳤다 — 흔히 회자되는 «수석 졸업»은 사실이 ' +
    '아니다. 1905년 참모본부 자격시험에 합격하고 이듬해까지 베를린에 유학해 독일군의 조직과 ' +
    '훈련을 연구했다. ' +
    '\n\n' +
    '1903년 5월 쿠데타. 1901년부터 알렉산다르 오브레노비치 국왕 부부의 «추방»이 아닌 ' +
    '«살해»로 계획을 전환한 발상의 출발점이 그였다. 그가 구술한 선서문에 약 120명의 장교가 ' +
    '서명했고, 구력 1903-05-29(신력 06-11) 밤 그는 27명과 함께 왕궁에 진입했다. 도주하는 ' +
    '인물을 국왕으로 착각해 단독 추격하다 근위병의 총격으로 세 발을 맞았다 — 넓적다리 ' +
    '관통상, 엉덩이뼈까지 파고든 열창, 그리고 흉골을 뚫고 심장 옆을 지나 폐를 관통한 ' +
    '가슴 정중부의 총상. 열흘을 사경에서 헤맸고 페타르 1세가 빈에서의 수술비를 부담했다. ' +
    '\n\n' +
    '군의 실세(1903~1913). 쿠데타의 주모자였음에도 특진은 없었고 계급은 정규 경로대로 ' +
    '올라갔다. 대신 카라조르제 별 훈장의 첫 수훈자 중 하나가 되었고, 1906년 영국의 압력으로 ' +
    '고위 공모 장교들이 예편되자 젊은 장교층의 구심점으로 남아 1906~1913년 육군장관 인선이 ' +
    '그의 영향 아래 이뤄졌다. 슬로보단 요바노비치의 증언에 따르면 그는 자신을 위해서는 결코 ' +
    '진급이나 훈장을 요구하지 않고 추종자들의 승진만 챙겼다. ' +
    '\n\n' +
    '흑수단(1911). 보스니아 병합에 굴복한 정부에 격분한 장교들이 1911년 5월(구력 09일) ' +
    '베오그라드에서 «통일이냐 죽음이냐»를 창설했고 그는 원본 규약 서명자의 한 사람이었다. ' +
    '조직에서의 지위는 사료가 정면으로 충돌한다 — 세르비아 사료는 그가 최고중앙위원회의 ' +
    '일개 위원이었을 뿐이며 유일한 의장은 1913년 전사한 일리야 라디보예비치였다고 못 박고, ' +
    '영어권 사료는 그를 일관되게 «흑수단의 지도자»로 규정한다. 실질적 최대 실세였다는 데는 ' +
    '양측이 수렴한다. ' +
    '\n\n' +
    '정보부장과 사라예보(1913~1914). 1913년 8월 참모본부 정보부장에 올라 오스트리아-헝가리 ' +
    '내 첩보망을 지휘했다. 사라예보 암살자들이 받은 수류탄과 브라우닝 권총은 크라구예바츠 ' +
    '조병창에서 나왔고, 국경을 넘은 통로는 그의 정보부가 운용하던 «터널»이었다. 다만 그가 ' +
    '직접 지시했는지는 논쟁적이며, 뒤늦게 암살을 중단시키려 사람을 보냈다는 회고(체도미르 ' +
    '포포비치, 1932)도 있다. 1917년 재판에서 그는 «내가 주 조직자이며 러시아 무관 ' +
    '아르타모노프의 보증을 받고 결심했다»는 자백서를 냈으나, 실행에 쓰인 무기와 그에게서 ' +
    '압수된 무기가 다르다는 등의 반증 때문에 현재 학계는 이 자백을 액면 그대로 받아들이지 ' +
    '않는다 — 동료를 구하려는 자기희생, 혹은 조직의 위신을 지키려는 진술로 읽는다. ' +
    '\n\n' +
    '전쟁과 좌천(1914~1916). 개전과 함께 최고사령부 정보업무를 총괄해 적 후방 교란용 ' +
    '체트니크 분견대 4개를 편성했으나, 1915년 3월 섭정 알렉산다르와의 갈등으로 우지체 군 ' +
    '참모장으로 밀려났다. 10월 대령으로 진급해 티모크 군 참모장으로 알바니아 철수를 ' +
    '엄호했고, 1916년 5월부터 살로니카 전선의 제3군 참모장 보좌관을 지냈다. ' +
    '\n\n' +
    '솔룬 재판과 처형(1916~1917). 구력 1916-12-15(신력 12-28) 제3군 사령부에서 체포되었다. ' +
    '기소의 핵심이던 «섭정 암살 미수»는 실체가 없는 사건이었고, 재판은 «아피스 대령 청산을 ' +
    '위한 10인 위원회»가 준비한 정치적 숙청이었다는 것이 학계 정설이다. 증인 108명 가운데 ' +
    '변호 측 증인은 한 명도 없었고 그중 22명은 오히려 피고에게 유리한 증언을 했다. 구력 ' +
    '1917-06-13(신력 06-26) 총살되었다. ' +
    '\n\n' +
    '평가. 20세기 초 세르비아 정치를 군이 좌우하게 만든 인물이자, 그 군을 다시 왕권이 ' +
    '숙청하며 사라진 인물이다. 사라예보 암살에서 그가 실제로 어디까지 관여했는가는 제1차 ' +
    '세계대전 기원 연구의 핵심 쟁점으로 남아 있으며, 세르비아에서는 두 차례의 사법적 ' +
    '복권을 통해 «정치재판의 희생자»로 자리매김했다.',
}

// ── 재임 (전부 세르비아 왕국 (근대) · MILITARY_COMMANDER) ────────────────────
interface TenureSpec {
  title: string
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  appointmentDetail: string
}

const TENURES: TenureSpec[] = [
  {
    title: '제7보병연대 소위',
    startYear: 1896,
    endYear: 1898, endMonth: 9,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '군사학교 상급학교(참모장교 양성 과정) 진학으로 부대를 떠났다.',
    notes: '베오그라드 주둔 제7보병연대에서 소위로 임관해 1년여 복무했고, 1899년 8월 중위로 진급했다.',
    appointmentDetail:
      '1892년 김나지움 마지막 학년에 진로를 바꿔 군사학교에 들어갔고, 1896년 하급학교를 ' +
      '동기 중 6등으로 졸업한 신임 장교의 통상 배속이었다. 흔히 인용되는 «수석 졸업»은 ' +
      '사실이 아니며, 상급 참모과정 졸업 성적도 5등이었다.',
  },
  {
    title: '두나브 사단 참모장 보좌관',
    startYear: 1905,
    endYear: 1905,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '참모장교 필수 과정인 베를린 유학을 위해 자리를 떠났다.',
    notes: '참모본부 전문직군 편입 후의 첫 참모 보직으로, 같은 해 1급 대위로 진급했다.',
    appointmentDetail:
      '1905년 참모본부 자격시험에 합격해 참모본부 전문직군에 편입되면서 받은 첫 참모 ' +
      '보직이다. 1903년 쿠데타의 주모자였음에도 특진은 없었고, 계급과 보직 모두 정규 ' +
      '경로대로 올라갔다.',
  },
  {
    title: '육군성 참모본부과 근무',
    startYear: 1906, startMonth: 9,
    endYear: 1907, endMonth: 3,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '반년 만에 부대 근무로 이동했다.',
    notes:
      '베를린 유학에서 돌아온 직후의 배속. 귀국 후 그는 구식 사열·열병 중심의 훈련을 ' +
      '벗어나 장비 예산을 늘리고 군사학교 교수진을 세대교체하는 개혁의 추동자가 되었다.',
    appointmentDetail:
      '1905~1906년 베를린 유학에서 귀국한 직후의 배속이다. 유학 중 포즈난 인근 독일군 ' +
      '대기동훈련을 자전거로 답사해 참관하고 장문의 보고서를 국방부에 제출했다.',
  },
  {
    title: '드리나 사단관구 참모장',
    startYear: 1908,
    endYear: 1908,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '이후 크라구예바츠 대대장을 거쳐 1910년 베오그라드 기병사단 참모장으로 옮겼다.',
    notes:
      '발례보 주둔. 오스트리아-헝가리의 보스니아 병합(1908년 10월)으로 세르비아 여론이 ' +
      '들끓던 시기의 국경 방면 보직이며, 이해에 소령으로 진급했다. 이 무렵 크라구예바츠에서 ' +
      '대대장으로도 근무했으나(1908년 이후~1910년 이전) 사료가 시점을 특정하지 못해 별도 ' +
      '재임으로 나누지 않았다.',
    appointmentDetail:
      '소령 진급과 맞물린 보직이나, 임명 경위와 전임자를 밝힌 사료는 확인되지 않는다.',
  },
  {
    title: '기병사단 참모장',
    startYear: 1910, startMonth: 7,
    endYear: 1912,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1912년 10월 발칸전쟁 개전 당시에도 이 직에 있었으나 브루셀라증(«몰타열»)으로 후송돼 ' +
      '실전에 참가하지 못했고, 1913년 4월까지 요양했다.',
    notes:
      '베오그라드 주둔. 이 무렵 그는 이미 군 내 최대 비공식 실세로, 육군장관 인선에까지 ' +
      '영향을 미치고 있었다.',
    appointmentDetail:
      '임명 경위를 밝힌 사료는 없다. 다만 1906년 영국의 압력으로 고위 공모 장교들이 ' +
      '예편된 뒤 젊은 장교층의 구심점이 된 그가 이미 군의 실세로 자리 잡은 시점이었다.',
  },
  {
    title: '군사학교 전략학 교수',
    startYear: 1910, startMonth: 10,
    endYear: 1914,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '제1차 세계대전 발발로 최고사령부 정보업무에 전념하게 되었다.',
    notes:
      '군사학교와 참모본부 예비과정에서 전략을 가르쳤다(영어 위키백과는 과목을 «전술»로 ' +
      '적어 갈린다). 기병사단 참모장·정보부장직과 겸직이었다.',
    appointmentDetail:
      '1903년 이후 군사학교 교수진이 젊은 혁신파로 교체되는 흐름 속의 임명이며, 그 인사 ' +
      '흐름을 밀어붙인 당사자가 아피스 자신이었다.',
  },
  {
    title: '참모본부 정보부장',
    startYear: 1913, startMonth: 8,
    endYear: 1914, endMonth: 8,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '제1차 세계대전 개전과 함께 최고사령부 편제의 정보업무 책임자로 이동했다(명시적 ' +
      '해임일은 어느 사료에서도 확인되지 않는다).',
    notes:
      '그의 핵심 보직. 오스트리아-헝가리 내 첩보망을 지휘했고 라데 말로바비치·류보미르 ' +
      '불로비치·체도 포포비치가 실무를 맡았다. 1913/14년 겨울 정보부는 보스니아·스렘· ' +
      '바나트의 오스트리아군 배치를 상당히 정확히 파악했다. 사라예보 암살자들이 국경을 ' +
      '넘은 «터널»(은신처·요원 연결망)이 바로 이 정보부의 자산이었다.',
    appointmentDetail:
      '발칸전쟁 승리 직후, 브루셀라증 요양(1912-10 발병~1913-04 퇴원)에서 복귀하고 ' +
      '1913년 1월 중령으로 진급한 시점의 임명이다. 전임자는 디미트리예 파블로비치 대령. ' +
      '「세르비아 백과사전」은 이 인사에 흑수단의 영향력이 작용했을 가능성을 시사한다. ' +
      '임명은 «1913년 8월»까지만 확인되고 일 단위 훈령 날짜는 사료에 없다.',
  },
  {
    title: '최고사령부 정보업무 책임자',
    startYear: 1914, startMonth: 8,
    endYear: 1915, endMonth: 3,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '섭정 알렉산다르와의 갈등이 커지면서 1915년 3월 우지체 군 참모장으로 사실상 좌천되었다.',
    notes:
      '크라구예바츠에서 8개월간 정보과장 겸 정보국장으로 일했다. 적 후방 교란용 체트니크 ' +
      '분견대 4개(즐라티보르·야다르·루드니크·고르냐크)의 편성을 발의하고 지휘관을 직접 ' +
      '뽑았는데 전원이 «통일이냐 죽음이냐» 조직원이었다. 전시언론국도 그의 관장 아래 있었다.',
    appointmentDetail:
      '개전에 따른 전시 최고사령부 편성으로 참모본부 정보부가 그대로 야전 최고사령부의 ' +
      '정보 조직이 되면서 이동한 자리다.',
  },
  {
    title: '우지체 군 참모장',
    startYear: 1915, startMonth: 3,
    endYear: 1915, endMonth: 10,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '1915년 10월 대령 진급과 함께 티모크 군 참모장으로 이동했다.',
    notes: '사실상 좌천이었다.',
    appointmentDetail:
      '섭정 알렉산다르 카라조르제비치와의 다툼 끝에 최고사령부에서 밀려난 문책성 전출이다 ' +
      '(「세르비아 백과사전」).',
  },
  {
    title: '티모크 군 참모장',
    startYear: 1915, startMonth: 10,
    endYear: 1916, endMonth: 5,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '살로니카 전선의 제3군 참모장 보좌관으로 이동했다.',
    notes:
      '11월 그의 계획으로 카차니크 협곡을 점령했으나 남쪽 프랑스군의 지원이 없어 스코페 ' +
      '진출에는 실패했다. 알바니아 철수 때 티모크 군은 측방을 엄호해 불가리아군의 엘바산 ' +
      '진출을 저지했고, 1916년 2월 두러스에서 코르푸로 이동했다.',
    appointmentDetail:
      '1915년 10월 대령 진급과 동시의 보직이다(영어권 사료는 대령 진급을 1916년 체포 ' +
      '직전으로 적으나, 세르비아 사료의 1915년 10월이 티모크 군 부임과 정합적이다).',
  },
  {
    title: '제3군 참모장 보좌관',
    startYear: 1916, startMonth: 5,
    endYear: 1916, endMonth: 12, endDay: 28,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '구력 1916-12-15(신력 12-28) 보슈타라네의 제3군 사령부에서 무장해제·체포되며 군 경력이 끝났다.',
    notes:
      '살로니카 전선. 「세르비아 백과사전」은 «그의 고되고 성공적인 참모 작업이 세르비아군의 ' +
      '전진을 가능케 했다»고 평가한다.',
    appointmentDetail:
      '섭정 알렉산다르가 최고사령부를 자기 뜻대로 물갈이한 뒤 그에게 남겨진 자리였다. ' +
      '부임 시점에 이미 «아피스 대령 청산을 위한 10인 위원회»(페타르 지브코비치·요시프 ' +
      '코스티치 주도)가 그를 겨냥한 증거 수집을 시작한 상태였다.',
  },
]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '아피스 (Апис / Apis)', type: 'EPITHET', priority: 1 },
]

// ── 연보 ────────────────────────────────────────────────────────────────────
type LifeEventCategory =
  | 'EDUCATION' | 'TRAVEL' | 'PUBLICATION' | 'EXILE' | 'AWARD' | 'PERSONAL'
  | 'CAREER' | 'MILITARY' | 'POLITICAL' | 'DIPLOMATIC' | 'FAMILY' | 'HEALTH' | 'OTHER'

interface LifeEventEntry {
  title: string
  category: LifeEventCategory
  startYear: number; startMonth?: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  description?: string
}

const LIFE_EVENTS: LifeEventEntry[] = [
  {
    title: '베오그라드 출생',
    category: 'FAMILY',
    startYear: 1876, startMonth: 8, startDay: 17,
    description: '가난한 함석장이 집안의 막내로 출생 (구력 08-05). 다섯 살 무렵 부친 사망.',
  },
  {
    title: '군사학교 입학',
    category: 'EDUCATION',
    startYear: 1892,
    description: '김나지움 마지막 학년에 진로를 바꿔 베오그라드 군사학교 생도가 되었다.',
  },
  {
    title: '군사학교 하급학교 졸업·임관',
    category: 'EDUCATION',
    startYear: 1896,
    description: '동기 중 6등으로 졸업해 제7보병연대 소위로 임관 — «수석 졸업»설은 사실이 아니다.',
  },
  {
    title: '참모장교 과정(상급학교) 수료',
    category: 'EDUCATION',
    startYear: 1898, startMonth: 9,
    description: '졸업 성적 5등. 졸업 후 곧바로 참모본부에 배속되었다.',
  },
  {
    title: '오브레노비치 왕가 시해 모의 착수',
    category: 'POLITICAL',
    startYear: 1901, startMonth: 9,
    description:
      '국왕 부부의 추방이 아닌 살해로 계획을 전환한 발상의 출발점. 1901-09-23 무도회에서 ' +
      '독을 바른 단검으로 살해하려던 계획은 국왕 부부 불참으로 무산되었다.',
  },
  {
    title: '5월 쿠데타 — 왕궁 진입과 총상',
    category: 'MILITARY',
    startYear: 1903, startMonth: 6, startDay: 11,
    description:
      '구력 05-29 밤 27명과 함께 왕궁 진입. 근위병 총격으로 세 발(넓적다리·엉덩이·가슴 ' +
      '정중부)을 맞고 열흘간 사경을 헤맸다. 페타르 1세가 빈 수술비 22,000디나르를 부담했다.',
  },
  {
    title: '카라조르제 별 훈장 최초 수훈',
    category: 'AWARD',
    startYear: 1904,
    description:
      '1904년 제정된 훈장의 첫 수훈자 중 한 사람. 의회는 그를 «조국의 구원자»로 칭했다. ' +
      '쿠데타의 주모자였음에도 특진은 없었다.',
  },
  {
    title: '베를린 유학',
    category: 'EDUCATION',
    startYear: 1905, endYear: 1906,
    description:
      '참모장교 필수 해외연수. 독일군 조직·훈련을 연구하고 포즈난 대기동훈련을 자전거로 ' +
      '답사해 국방부에 장문의 보고서를 냈다.',
  },
  {
    title: '흑수단 «통일이냐 죽음이냐» 창설 참여',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 5, startDay: 22,
    description:
      '구력 05-09 베오그라드. 원본 규약 서명자(9~11명 설이 갈림)의 한 사람. 조직에서의 ' +
      '지위는 세르비아 사료(최고중앙위원회 일개 위원)와 영어권 사료(지도자)가 정면 충돌한다.',
  },
  {
    title: '브루셀라증 발병 — 발칸전쟁 불참',
    category: 'HEALTH',
    startYear: 1912, startMonth: 10,
    endYear: 1913, endMonth: 4,
    description: '개전과 함께 «몰타열»로 후송되어 발칸전쟁 실전에 참가하지 못했다.',
  },
  {
    title: '참모본부 정보부장 취임',
    category: 'MILITARY',
    startYear: 1913, startMonth: 8,
    description: '중령 진급 직후. 오스트리아-헝가리 내 첩보망과 «터널»(월경 연결망)을 지휘했다.',
  },
  {
    title: '사라예보 암살 — 무기·월경 지원',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 6, startDay: 28,
    description:
      '암살자들이 받은 수류탄과 브라우닝 권총은 크라구예바츠 조병창에서 나왔고 국경 통로는 ' +
      '그의 정보부 자산이었다. 직접 지시 여부는 논쟁적이며, 뒤늦게 중단시키려 했다는 회고도 있다.',
  },
  {
    title: '최고사령부 정보업무 총괄 — 체트니크 분견대 편성',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8,
    endYear: 1915, endMonth: 3,
    description: '적 후방 교란용 분견대 4개를 발의·편성하고 지휘관을 직접 선발했다(전원 흑수단원).',
  },
  {
    title: '섭정과의 갈등 — 우지체 군으로 좌천',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 3,
    description: '알렉산다르 섭정과 다툰 뒤 최고사령부에서 밀려났다.',
  },
  {
    title: '대령 진급·알바니아 철수 엄호',
    category: 'MILITARY',
    startYear: 1915, startMonth: 10,
    description:
      '티모크 군 참모장으로서 카차니크 협곡을 점령했고, 알바니아 철수 때 측방을 엄호해 ' +
      '불가리아군의 엘바산 진출을 막았다. 대령이 그의 최종 계급이다.',
  },
  {
    title: '체포',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 12, startDay: 28,
    description: '구력 12-15 보슈타라네의 제3군 사령부에서 무장해제·연행되었다.',
  },
  {
    title: '솔룬 재판 — 자백서와 사형 판결',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 5, startDay: 28,
    endYear: 1917, endMonth: 6, endDay: 5,
    description:
      '섭정 암살 미수 혐의로 기소되었으나 그 사건 자체가 실체가 없었다. 재판 중 자신을 ' +
      '사라예보 암살의 «주 조직자»로 지목한 자백서를 냈다. 증인 108명 중 변호 측 증인은 ' +
      '한 명도 없었고, 그중 22명은 오히려 피고에게 유리한 증언을 했다.',
  },
  {
    title: '총살',
    category: 'PERSONAL',
    startYear: 1917, startMonth: 6, startDay: 26,
    description:
      '구력 06-13 새벽 솔룬 들판에서 불로비치·말로바비치와 함께 총살(향년 40세). 1953년 ' +
      '재심에서 전원 무죄, 2012년 재차 복권되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const APIS_STATS = {
  politics: 74,
  military: 62,
  diplomacy: 28,
  intellect: 66,
  charisma: 76,
  administration: 58,
  notes:
    '계급은 대령에 머물렀으나 왕조를 바꾸고 육군장관 인선을 좌우한 «국가 서열 3인자» — ' +
    '음모와 인적 결속으로 권력을 만든 정치적 역량이 최고 강점(정치·카리스마). 120명의 ' +
    '장교에게 선서를 시키고 자신은 진급을 마다한 채 추종자만 챙긴 조직가였다. 군사 역량은 ' +
    '정보·참모 실무에 특화됐고(오스트리아군 배치 파악·체트니크 분견대·카차니크 작전) 야전 ' +
    '지휘 경력은 제한적이다. 외교는 본령이 아니었고, 오히려 그의 비밀결사 활동이 세르비아 ' +
    '외교를 궁지로 몰았다. 결국 자신이 만든 군의 정치화가 왕권의 숙청 논리로 돌아와 그를 ' +
    '삼켰다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedDimitrijevic(prisma: PrismaService): Promise<void> {
  console.log('\n🐂 드라구틴 디미트리예비치(아피스) 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const serbia = await prisma.historicalCountry.findFirst({
    where: { name: '세르비아 왕국 (근대)' },
    select: { id: true },
  })
  if (!serbia) {
    console.warn('  ⚠️  «세르비아 왕국 (근대)» HC 미존재 — seedSerbiaHistoricalCountries 먼저 실행. 시딩 중단.')
    return
  }

  // ── 1) 인물 ────────────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: { originalName: { contains: 'Dragutin Dimitrijević' } },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.biography) patch.biography = APIS.biography
    if (!person.birthPlaceText) patch.birthPlaceText = APIS.birthPlaceText
    if (!person.birthNote) patch.birthNote = APIS.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = APIS.deathPlaceText
    if (!person.deathType) patch.deathType = APIS.deathType
    if (!person.deathCause) patch.deathCause = APIS.deathCause
    if (!person.deathNote) patch.deathNote = APIS.deathNote
    if (person.influence == null) patch.influence = APIS.influence
    if (!person.historicalCountryId) patch.historicalCountryId = serbia.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${APIS.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${APIS.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: APIS.name,
        surname: APIS.surname,
        originalName: APIS.originalName,
        biography: APIS.biography,
        birthDate: toDate(APIS.birthYear, APIS.birthMonth, APIS.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: APIS.birthNote,
        birthPlaceText: APIS.birthPlaceText,
        deathDate: toDate(APIS.deathYear, APIS.deathMonth, APIS.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: APIS.deathType,
        deathCause: APIS.deathCause,
        deathNote: APIS.deathNote,
        deathPlaceText: APIS.deathPlaceText,
        gender: APIS.gender,
        nameDisplayOrder: 'western' as any,
        influence: APIS.influence,
        historicalCountryId: serbia.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${APIS.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 12건 ──────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: serbia.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
        startDate,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: serbia.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
        title: t.title,
        startDate,
        startDatePrecision: precisionOf(t.startMonth, t.startDay),
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        appointmentDetail: t.appointmentDetail,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: { personId, historicalCountryId: serbia.id, affiliationType: 'CITIZENSHIP' as any },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 세르비아 왕국 (근대)')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: serbia.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log('  ✅ 소속국가: 세르비아 왕국 (근대) (1876~1917)')
  }

  // ── 4) 별명 ─────────────────────────────────────────────────────────────────
  for (const nk of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({ where: { personId, nickname: nk.nickname } })
    if (!exists) {
      await prisma.personNickname.create({
        data: { personId, nickname: nk.nickname, type: nk.type, priority: nk.priority },
      })
      console.log(`  ✅ 별명: ${nk.nickname}`)
    }
  }

  // ── 5) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({ where: { personId, title: e.title } })
    if (exists) continue
    const startDate = toDate(e.startYear, e.startMonth, e.startDay)
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate,
        startDatePrecision: precisionOf(e.startMonth, e.startDay),
        endDate,
        endDatePrecision: e.endYear ? precisionOf(e.endMonth, e.endDay) : null,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 6) 능력치 ────────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({ where: { personId, accountId: admin.id } })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: APIS_STATS.politics,
        military: APIS_STATS.military,
        diplomacy: APIS_STATS.diplomacy,
        intellect: APIS_STATS.intellect,
        charisma: APIS_STATS.charisma,
        administration: APIS_STATS.administration,
        notes: APIS_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${APIS_STATS.politics}·군사 ${APIS_STATS.military}·` +
        `외교 ${APIS_STATS.diplomacy}·학식 ${APIS_STATS.intellect}·` +
        `카리스마 ${APIS_STATS.charisma}·행정 ${APIS_STATS.administration}`,
    )
  }

  console.log('✅ 드라구틴 디미트리예비치 시딩 완료\n')
}
