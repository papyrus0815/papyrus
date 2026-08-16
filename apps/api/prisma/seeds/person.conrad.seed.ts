/**
 * 프란츠 콘라트 폰 회첸도르프 (Franz Conrad von Hötzendorf, 1852~1925) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 오스트리아-헝가리의 원수·참모총장(1906~1911, 1912~1917). 전쟁 전 수년간 세르비아와
 * 이탈리아에 대한 예방전쟁을 집요하게 요구했고, 1914년 7월 위기에서 개전을 밀어붙인
 * 군부의 중심이었다. 전술 이론가로는 명성이 높았으나 실전 지휘에서는 갈리치아 참패와
 * 트렌티노 공세 실패로 제국군을 소모시켰다는 평가가 굳어져 있다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)이라 구력 병기가 필요 없다 —
 * 러시아·세르비아 측 사료를 인용할 때만 예외적으로 라벨한다(베르히톨트 선례).
 *
 * 관직 매핑: 참모총장·군사령관 등 군 직책은 GovernmentPositionDefinition 카탈로그에
 * 대응 정의가 0건이므로 positionDefinitionId 없이 title을 직접 기입한다(군인 시드 규약,
 * 다닐로프·수호믈리노프 선례). positionType은 MILITARY_COMMANDER.
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (콘라트 본인 — historicalCountryId=오스트리아-헝가리 제국)
 *  - GovernmentPositionTenure x6 (여단장·사단장·참모총장 2회·육군감찰관·군집단 사령관,
 *    전부 MILITARY_COMMANDER) — 신규 생성이라 appointmentDetail을 create에 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonLifeEvent x26 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const CONRAD = {
  name: '프란츠',
  middleName: null as string | null,
  surname: '콘라트 폰 회첸도르프',
  originalName: 'Franz Conrad von Hötzendorf',
  gender: 'MALE' as const,
  birthYear: 1852, birthMonth: 11, birthDay: 11,
  birthNote:
    '빈 근교 펜칭(현 빈 14구) 출생. 하인부르크 유년학교(1863~67)를 거쳐 비너노이슈타트의 ' +
    '테레지아 육군사관학교를 1871년 졸업하고 열아홉에 소위로 임관, 제11엽병대대에 배속 ' +
    '되었다(임관일은 08-28설과 08-31설이 갈린다). 3년 뒤 빈의 육군대학(Kriegsschule)을 ' +
    '우등으로 마치고 1876년 가을 참모본부에 들어갔다.',
  birthPlaceText: '오스트리아 제국 빈 펜칭',
  deathYear: 1925, deathMonth: 8, deathDay: 25,
  deathPlaceText: '독일 뷔르템베르크 바트메르겐트하임',
  deathType: DeathType.NATURAL,
  deathCause: '요양 중이던 온천지에서 담낭 질환이 재발해 사망 (향년 72세).',
  deathNote:
    '09-02 장례에 10만 명이 넘게 모였다 — 다만 어느 사료도 «국장»이라 부르지는 않는다. ' +
    '빈 히칭 묘지(37구역 1열 1번)에 안장되었고, 빈시의 명예묘였다가 2012년 돌푸스 명예묘 ' +
    '논란 때 함께 «역사묘»로 격하되었다. 1919년 오스트리아가 귀족 칭호를 폐지해 법적 ' +
    '이름은 «프란츠 콘라트»가 되었다. 출생일은 독일 인명사전과 빈 시사(市史) 위키가 ' +
    '11-14로 적으나, 독일어·영어 위키와 오스트리아 인명사전·오스트리아포룸이 일치하는 ' +
    '11-11을 채택했다.',
  influence: 78,
  biography:
    '오스트리아-헝가리의 원수·참모총장(1906~1911, 1912~1917). 전쟁 전 10년간 세르비아와 ' +
    '이탈리아에 대한 예방전쟁을 집요하게 요구했고 — 영어권 연구는 1913년 한 해의 요구만 ' +
    '스물다섯 차례로 센다 — 1914년 7월 사라예보 직후 즉시 개전을 밀어붙인 군부의 ' +
    '중심이었다. 한 세대의 장교 교육을 ' +
    '지배한 전술 이론가였으나, 정작 자신이 지휘한 전쟁에서는 갈리치아 참패와 트렌티노 공세 ' +
    '실패로 제국군을 소모시켰다. ' +
    '\n\n' +
    '성장과 수업(1852~1876). 빈 근교 펜칭에서 나폴레옹 전쟁을 겪은 노년의 기병 장교와 32세 ' +
    '연하 화가의 딸 사이에서 태어났다. 하인부르크 유년학교와 비너노이슈타트 사관학교를 ' +
    '거쳐 열아홉에 임관했고, 육군대학을 우등으로 마치고 1876년 참모본부에 들어갔다. ' +
    '\n\n' +
    '야전과 강단(1878~1899). 1878년 보스니아 점령 작전에 종군해 사라예보에 입성했고 ' +
    '1882년 남달마티아 크리보시에 봉기 진압에서는 봉기의 중심 산지를 직접 올라 «용감하고 ' +
    '냉철하다»는 평을 받았다. 렘베르크 사단 참모장 시절 연병장 제식 대신 야외 기동을 ' +
    '관철해 혁신가로 이름을 얻었고, 1888~1892년 육군대학 전술 교수로 보불전쟁 전적지를 ' +
    '답사해 만든 강의를 폈다 — 이때의 제자들이 25년 뒤 세계대전의 고위 장교로 그를 따른다. ' +
    '그 강의를 묶은 «전술 연구»(1898~99)는 제국군의 «성서»로 불리며 공격 지상주의를 교리로 ' +
    '만들었다. 1904년 러일전쟁이 공격 전술의 대가를 보여줬음에도 교리는 고쳐지지 않았다. ' +
    '\n\n' +
    '트리에스테와 이탈리아(1899~1906). 이탈리아어권 아드리아 항구에서 여단장으로 4년을 ' +
    '보내며 «이탈리아의 실지회복주의가 있는 한 충돌은 불가피하다»는 확신을 굳혔다 — 훗날 ' +
    '대이탈리아 예방전쟁 요구의 뿌리다. 1902년에는 항만 노동자 파업을 병력으로 유혈 ' +
    '진압했다. 이 무렵 불시 시찰을 온 프란츠 페르디난트 대공의 눈에 들었다. ' +
    '\n\n' +
    '첫 참모총장 재임(1906~1911). 1906-11-18 대공의 제청으로, 25년을 재임한 76세의 전임을 ' +
    '밀어내고 54세에 전군 참모총장이 되었다. 이듬해 곧바로 이탈리아를 «분쇄»하는 예방전쟁을 ' +
    '제안했고, 보스니아 병합 위기에서는 세르비아 병탄을 주장했다. 1911년 이탈리아가 리비아 ' +
    '전쟁에 묶인 틈을 노린 요구가 외무장관 에렌탈과 정면충돌했고, 프란츠 요제프가 알현에서 ' +
    '«그 끊임없는 공격은 나를 향한 것이다. 정책은 내가 한다»고 직접 질책한 끝에 12월 ' +
    '해임되었다. 유부녀와의 관계도 명분으로 함께 쓰였다. ' +
    '\n\n' +
    '기나. 1907년 1월 빈의 만찬에서 소개받은 실업가의 부인 기나 폰 라이닝하우스에게 평생의 ' +
    '집착을 품어, 8년 동안 3,000통이 넘는 편지를 쓰고 한 통도 부치지 않았다. 1908년 일기에 ' +
    '«승리를 안고 돌아온다면 그때는 모든 굴레를 끊고 내 생애 최고의 행복을 얻겠다»고 적은 ' +
    '것이, 그가 전쟁을 원한 동기의 일부를 여기서 찾는 해석의 근거가 되었다. 1915년 기나가 ' +
    '이혼·입양·개종을 거쳐 마침내 그와 혼인한다. ' +
    '\n\n' +
    '복귀와 7월 위기(1912~1914). 발칸 전쟁의 전운 속에 대공이 다시 밀어 1912-12-12 복귀 ' +
    '했다 — 그를 내쳤던 에렌탈은 그해 2월 이미 병사한 뒤였다. 1913년 한 해에만 대세르비아 ' +
    '개전을 스물다섯 차례 요구했으나 전부 문민 당국에 막혔고, 베르히톨트는 그의 입장을 ' +
    '«전쟁, 전쟁, 전쟁»이라 요약했다. 그를 발탁한 프란츠 페르디난트가 동시에 그 요구를 막는 ' +
    '유일한 제동장치이기도 해서 1913년 여름에는 다시 해임 직전까지 갔는데, 이듬해 그 대공이 ' +
    '사라예보에서 죽으면서 제동이 사라졌다. 그는 «발뒤꿈치에 독사가 있으면 머리를 밟는 ' +
    '것이지 물릴 때까지 기다리지 않는다»며 즉시 동원을 요구했다 — 다만 부대 다수가 추수 ' +
    '휴가 중이라 «가장 이른 개전은 7월 25일»이라고 스스로 못박아야 했다. ' +
    '\n\n' +
    '전쟁(1914~1918). 개전과 함께 그의 계획이 무너졌다. 전략예비 제2군을 세르비아로 보낸 뒤 ' +
    '갈리치아로 되돌리려 했으나 철도가 불가를 통보해, 그 병력은 남에서도 북에서도 결정적 ' +
    '시기를 놓쳤다 — 세르비아 침공군은 예정보다 10만 줄었고 갈리치아에서는 대패했다. 그해 ' +
    '9월 라바루스카에서 셋째 아들이 전사했다. 1915년 고를리체-타르누프 돌파는 독일과의 ' +
    '공동 계획으로 성공했으나 이후 주도권은 독일 최고사령부로 넘어갔고, 1916년 숙원이던 ' +
    '트렌티노 공세는 갈리치아 전선을 비워 브루실로프 공세의 대붕괴를 부른 실패로 끝났다. ' +
    '그해 원수가 되었으나, 이듬해 즉위한 카를 1세가 1917-03-01 그를 참모총장에서 내렸다. ' +
    '남티롤 군집단을 맡아 1918년 6월 피아베 공세에 나섰다가 실패하고 7월 지휘권을 잃었다. ' +
    '\n\n' +
    '만년과 평가. 1919년 오스트리아가 귀족 칭호를 폐지해 법적으로 «프란츠 콘라트»가 된 그는 ' +
    '회고록 «나의 복무 시절»(전 5권, 1921~25)로 자기 변호에 몰두했다 — 제목은 1918년까지를 ' +
    '표방하지만 실제 서술은 1914년 12월에서 끊기고, 사료 가치는 신중히 따져야 한다는 것이 ' +
    '독일어권의 정평이다. 1925년 요양지에서 죽었고 장례에 10만 명이 모였다. 오늘날의 평가는 ' +
    '대체로 «뛰어난 이론가이자 파국적 실무가»로 모인다 — 작전 구상은 대담했으나 제국군의 ' +
    '수송·보급·병력 실태와 늘 어긋났고, 그가 20년간 요구한 전쟁이 마침내 오자 그 전쟁을 ' +
    '감당하지 못했다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  /** 본인 회차(참모총장 제N차) — 공식 통산 대수가 아니므로 termNumber는 비운다 */
  subTermNumber?: number
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '제55보병여단장 (트리에스테)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1899, startMonth: 4, startDay: 9,
    endYear: 1903, endMonth: 9, endDay: 8,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '인스브루크의 제8보병사단장으로 전보.',
    appointmentDetail:
      '트로파우에서 제1보병연대를 «모범 부대»로 만들어 이름을 얻은 직후 여단장에 올랐고 ' +
      '(1899-05-01 소장 진급), 이 무렵 불시 시찰을 온 황위 계승자 프란츠 페르디난트 대공의 ' +
      '눈에 들었다 — 훗날 참모총장 발탁으로 이어지는 인연의 시작이다.',
    notes:
      '이탈리아어권 아드리아 항구 도시에서의 4년이 «이탈리아의 실지회복주의가 있는 한 ' +
      '오스트리아와의 충돌은 불가피하다»는 그의 확신을 굳혔고, 훗날 대이탈리아 예방전쟁 ' +
      '요구의 뿌리가 된다. 1902년에는 오스트리아 로이드 화부 노조의 파업을 여단 병력으로 ' +
      '유혈 진압했다(«1902년»은 영어권 자료의 연도로, 독일어 위키는 연도를 적지 않는다). ' +
      '보병 교범 개정에도 참여했다.',
  },
  {
    title: '제8보병사단장 (인스브루크)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1903, startMonth: 9, startDay: 8,
    endYear: 1906, endMonth: 11, endDay: 18,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '참모총장으로 발탁 (1906-11-18).',
    appointmentDetail:
      '여단장에서 사단장으로 올라서며 1903-11-01 중장(Feldmarschallleutnant)에 진급했다. ' +
      '작전 사상가이자 실전에 가까운 훈련법을 쓰는 지휘관으로 군 안에서 평가가 높았다.',
    notes: '이 사단장 자리에서 곧바로 참모총장으로 발탁된다.',
  },
  {
    title: '참모총장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    subTermNumber: 1,
    startYear: 1906, startMonth: 11, startDay: 18,
    endYear: 1911, endMonth: 12, endDay: 3,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '대이탈리아 예방전쟁 주장을 외무장관 에렌탈이 정면으로 막아섰고, 1911-11-15 알현에서 ' +
      '프란츠 요제프가 «그 끊임없는 공격은 나를 향한 것이다. 정책은 내가 한다, 그것이 내 ' +
      '정책이다»라고 직접 질책한 끝에 12-03 자리를 떠났다. 유부녀 기나와의 관계도 명분으로 ' +
      '함께 쓰였다. 날짜는 확정이나 성격은 사료가 갈린다 — 독일어 위키는 «황제에 의한 해임», ' +
      '오스트리아 인명사전은 «사임»으로 적는다. 후임은 블라지우스 폰 셰무아.',
    appointmentDetail:
      '1906-11-18 황위 계승자 프란츠 페르디난트 대공의 제청으로 프란츠 요제프 1세가 친서를 ' +
      '내려 «전군 참모총장»에 임명했다. 76세의 황제가 동갑의 전임 베크-르지코프스키(1881년 ' +
      '부터 재임)를 물리고 54세의 중장을 앉힌 파격으로, 노황제의 치세가 끝나기 전 요직에 ' +
      '자기 사람을 심으려던 대공의 포석이었다.',
    notes:
      '1906-11-18 ~ 1911-12-03. 취임 이듬해인 1907년 4월 이탈리아를 «분쇄»하는 예방전쟁을 ' +
      '처음 제안했고, 1908~09년 보스니아 병합 위기에서는 세르비아 병탄을 주장했다(외무· ' +
      '전쟁장관이 거부). 1911년 이탈리아가 리비아 전쟁에 묶인 틈을 노린 예방전쟁 요구가 ' +
      '해임의 직접 원인이 되었다. 재임 중 1908년 대장 진급, 1910년 남작 서임.',
  },
  {
    title: '육군감찰관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1911, startMonth: 12, startDay: 3,
    endYear: 1912, endMonth: 12, endDay: 12,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '참모총장으로 복귀 (1912-12-12).',
    appointmentDetail:
      '해임되었으나 예편되지는 않고 육군감찰관 자리를 받았다 — 두 차례 참모총장 재임 사이의 ' +
      '1년을 여기서 보냈다.',
    notes:
      '실권은 없었지만 발언은 멈추지 않아, 1912년 10월 제1차 발칸 전쟁이 터지자 감찰관 ' +
      '자리에서 개입을 촉구하며 «발칸 동맹이 오스트리아 주도로 유럽의 오스만을 정리한 뒤 ' +
      '바이에른이 독일 제국에 그러하듯 제국에 종속되어야 한다»는 구상을 내놓았다.',
  },
  {
    title: '참모총장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    subTermNumber: 2,
    startYear: 1912, startMonth: 12, startDay: 12,
    endYear: 1917, endMonth: 3, endDay: 1,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '즉위한 카를 1세가 1917-03-01 참모총장에서 해임했다 — 일부 오스트리아 사료는 ' +
      '02-28 본인 사임으로 적는다. 이후 남티롤 방면 군집단 사령관으로 옮겼다.',
    appointmentDetail:
      '발칸 전쟁으로 전운이 짙어지자 프란츠 페르디난트 대공이 다시 나서 1912-12-12 복귀 ' +
      '시켰다 — 그를 밀어냈던 에렌탈은 그해 2월 이미 병사한 뒤였다. 대공은 그의 후원자인 ' +
      '동시에 병탄론에 제동을 건 유일한 제동장치이기도 해서, 1913년 여름에는 다시 그를 ' +
      '내치기 직전까지 갔다.',
    notes:
      '1912-12-12 ~ 1917-03-01. ①대세르비아 개전을 거듭 요구했고, 영어권 연구(스트라챈· ' +
      '프롬킨·클라크·에번스)는 «1913-01-01~1914-01-01 열두 달 동안 스물다섯 차례»라는 수치를 ' +
      '공유한다 — 다만 오스트리아·독일어권 사전류(ÖBL·NDB·오스트리아포룸·1914-1918-online)는 ' +
      '어느 곳도 숫자를 제시하지 않고 «거듭»이라는 질적 서술에 그치므로, 이 수치는 확정된 ' +
      '집계가 아니라 영어권 문헌의 계산으로 인용해야 한다. 베르히톨트는 그의 입장을 ' +
      '«전쟁, 전쟁, 전쟁»이라 요약했다. ②사라예보 직후 즉시 동원을 요구하며 «발뒤꿈치 ' +
      '에 독사가 있으면 머리를 밟는 것이지 물릴 때까지 기다리지 않는다»고 했다. 다만 부대 ' +
      '다수가 추수 휴가 중이라 07-14 «가장 이른 개전은 07-25»이라고 스스로 못박았다. ' +
      '③1914년 동원에서 전략예비 B제대(제2군)를 세르비아로 보냈다가 갈리치아로 되돌리려 ' +
      '했으나 철도 참모가 불가를 통보해, 그 병력은 남에서도 북에서도 결정적 시기를 놓쳤다. ' +
      '④1915년 고를리체-타르누프 돌파는 독일과의 공동 계획으로 성공했으나 이후 지휘의 ' +
      '주도권이 독일 최고사령부로 넘어갔고, 1916년 자신의 숙원이던 트렌티노 공세는 갈리치아 ' +
      '전선을 비워 브루실로프 공세를 부른 실패로 끝났다. 렘베르크 탈환 직후인 1915-06-23 ' +
      '상급대장, 1916-11-25 원수로 진급했다.',
  },
  {
    title: '남티롤 군집단 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1917, startMonth: 3,
    endYear: 1918, endMonth: 7, endDay: 15,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1918년 6월 제2차 피아베 공세 실패 후 1918-07-15 해임 — 결정을 누그러뜨리려 같은 날 ' +
      '백작 승작과 근위 명예대령이 함께 내려졌다(국가문서고 서훈 원부 AR 155.26으로 확인). ' +
      '예편은 그해 12월 초.',
    appointmentDetail:
      '참모총장에서 물러난 뒤 황제의 권유로 이탈리아 전선의 남티롤 방면 군집단을 맡았다 — ' +
      '그가 20년 넘게 주적으로 지목해 온 이탈리아와 직접 맞서는 자리였다. 다만 인수 시점을 ' +
      '못박은 사료가 없어(독일어 위키는 «나중에», 오스트리아 인명사전은 «1917/18») 참모총장 ' +
      '해임(03-01) 직후로만 잡는다.',
    notes:
      '1918년 6월 피아베 공세가 실패하며 제국군의 마지막 공세 역량이 소진되었고, 그 직후 ' +
      '지휘권을 잃었다. 시작 시점은 사료가 «1917년 3월 이후»로만 특정돼 월 단위로 둔다.',
  },
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
    title: '빈 근교 펜칭 출생',
    category: 'FAMILY',
    startYear: 1852, startMonth: 11, startDay: 11,
    description:
      '아버지 프란츠 크사버(1793~1878)는 나폴레옹 전쟁의 라이프치히 전투를 겪은 경기병 ' +
      '장교로 1848년 빈 10월 봉기에서 낙마 부상으로 퇴역했고, 어머니 바르바라 퀴블러 ' +
      '(1825~1915)는 화가의 딸로 남편보다 32세 아래였다. 가문은 1815년 증조부 대에 ' +
      '«폰 회첸도르프» 칭호로 귀족이 되었다.',
  },
  {
    title: '테레지아 육군사관학교 졸업·임관',
    category: 'MILITARY',
    startYear: 1871, startMonth: 8,
    description:
      '하인부르크 유년학교(1863~67)를 거쳐 비너노이슈타트 사관학교(1867~71) 졸업, 열아홉에 ' +
      '소위로 제11엽병대대 배속.',
  },
  {
    title: '육군대학 수료 — 참모본부 편입',
    category: 'EDUCATION',
    startYear: 1876,
    description: '1874년 가을 입교해 우등으로 마치고 참모장교단에 들어갔다.',
  },
  {
    title: '보스니아 점령 작전 종군',
    category: 'MILITARY',
    startYear: 1878, startMonth: 8,
    description:
      '제4보병사단 참모로 제3군단에 속해 종군, 9월 제7여단과 함께 사라예보에 입성했다. ' +
      '이듬해에는 노비파자르 산자크 점령에도 참가했고, 전공으로 전시장식 군공십자장을 ' +
      '받았다.',
  },
  {
    title: '크리보시에 봉기 진압',
    category: 'MILITARY',
    startYear: 1882,
    description:
      '남달마티아의 봉기 진압에 참가해 각 사단에 동원 계획을 전하고 봉기의 중심지 오리엔 ' +
      '산을 중앙 종대와 함께 직접 올랐다 — 당대 평가는 «용감하고 냉철하다»였다.',
  },
  {
    title: '렘베르크 제11보병사단 참모장',
    category: 'MILITARY',
    startYear: 1883, startMonth: 10, startDay: 29,
    description:
      '연병장 제식 대신 야외 기동을 관철해 «혁신가»라는 평판을 처음 얻은 자리.',
  },
  {
    title: '빌마 르 보와 결혼',
    category: 'FAMILY',
    startYear: 1886, startMonth: 4, startDay: 10,
    description:
      '렘베르크에서 공병감의 딸 빌헬미네(빌마, 1860~1905)와 혼인. 네 아들 쿠르트(1887~1918)· ' +
      '에르빈(1888~1965)·헤르베르트(1891~1914)·에곤(1896~1965)을 두었고 모두 장교가 되었다.',
  },
  {
    title: '육군대학 전술 교관',
    category: 'EDUCATION',
    startYear: 1888, startMonth: 9, startDay: 10,
    endYear: 1892,
    description:
      '보불전쟁 전적지를 답사하며 준비해 부임했고, 참모장교 과정도 가르쳤다. 이때 길러낸 ' +
      '제자들이 25년 뒤 세계대전에서 그를 따르는 고위 장교가 된다. 독일어권 사료는 모두 ' +
      '«전술 교관(Taktiklehrer)»으로 적으며 «교수»가 아니다 — 소령 진급은 부임 열 달 전인 ' +
      '1887-11-01이라, 진급과 부임을 한데 묶은 영어 위키 서술도 부정확하다.',
  },
  {
    title: '«전술 연구» 출간 — 제국군의 «성서»',
    category: 'PUBLICATION',
    startYear: 1898, endYear: 1899,
    description:
      '제1권 «서론과 보병»(1898)·제2권 «포병·기병·전투»(1899). 방어는 무의미하고 공격이 ' +
      '언제나 우월하며 적의 약한 지점에 병력을 집중해야 한다는 «공격 지상주의»를 설파해 ' +
      '한 세대의 장교 교육을 지배했다 — 1904년 러일전쟁이 공격 전술의 과도한 손실을 ' +
      '보여줬음에도 교리는 수정되지 않았다. 그의 표어는 «행동주의»였다.',
  },
  {
    title: '참모총장 취임 — 프란츠 페르디난트의 발탁',
    category: 'MILITARY',
    startYear: 1906, startMonth: 11, startDay: 18,
    description:
      '황위 계승자의 제청으로 25년 재임한 전임 베크-르지코프스키를 대신해 54세에 전군 ' +
      '참모총장이 되었다.',
  },
  {
    title: '대이탈리아 예방전쟁 첫 제안',
    category: 'MILITARY',
    startYear: 1907, startMonth: 4,
    description:
      '이탈리아를 «분쇄»하는 예방전쟁을 처음 제안했고 이후 거듭 되풀이했다. 헤르비히는 그가 ' +
      '이 해에 «오스트리아의 타고난 적» 이탈리아와 세르비아 모두에 대한 전쟁을 요구했다고 ' +
      '적는다.',
  },
  {
    title: '기나 폰 라이닝하우스와의 만남',
    category: 'PERSONAL',
    startYear: 1907, startMonth: 1,
    description:
      '빈의 만찬에서 소개받은 실업가의 부인 기나(1879~1961)에게 평생의 집착을 품었다. ' +
      '1907~1915년 «나의 고뇌 일기»라는 이름으로 3,000통이 넘는 편지를 썼으나 추문을 ' +
      '우려해 한 통도 부치지 않았다 — 60쪽이 넘는 것도 있었다.',
  },
  {
    title: '남작 서임',
    category: 'AWARD',
    startYear: 1910, startMonth: 8, startDay: 18,
    description:
      '오스트리아 국가문서고 서훈 원부(AT-OeStA/AVA Adel HAA AR 155.25)가 1910-08-18 특허장 ' +
      '으로 기록한다. 빈 시사 위키의 «1907년 남작»설은 그해 받은 추밀고문관(Geheimer Rat)을 ' +
      '잘못 옮긴 것이다.',
  },
  {
    title: '황제의 질책 — 해임',
    category: 'MILITARY',
    startYear: 1911, startMonth: 12, startDay: 3,
    description:
      '11-15 알현에서 프란츠 요제프가 «그 끊임없는 공격은 나를 향한 것이다. 정책은 내가 ' +
      '한다»라고 직접 꾸짖은 끝에 12-03 해임되었다 — 리비아 전쟁으로 이탈리아가 묶인 틈을 ' +
      '노린 예방전쟁 요구가 화근이었다. 육군감찰관으로 1년을 보낸다.',
  },
  {
    title: '참모총장 복귀',
    category: 'MILITARY',
    startYear: 1912, startMonth: 12, startDay: 12,
    description:
      '발칸 전쟁의 전운 속에 프란츠 페르디난트가 다시 밀어 복귀시켰다 — 그를 내쳤던 에렌탈은 ' +
      '그해 2월 이미 병사한 뒤였다.',
  },
  {
    title: '한 해에 스물다섯 번의 개전 요구',
    category: 'MILITARY',
    startYear: 1913,
    description:
      '영어권 연구(스트라챈·프롬킨·클라크·에번스)가 «1913년 1월 1일~1914년 1월 1일 열두 달 ' +
      '동안 스물다섯 차례»로 세는 대세르비아 개전 요구. 오스트리아·독일어권 사전류는 숫자 ' +
      '없이 «거듭»이라고만 적으므로 확정된 집계라기보다 영어권 문헌의 계산이다. 요구는 전부 ' +
      '문민 당국에 막혔고, 베르히톨트는 그의 입장을 «전쟁, 전쟁, 전쟁»이라 요약했다.',
  },
  {
    title: '사라예보 직후 — 즉시 개전 요구',
    category: 'MILITARY',
    startYear: 1914, startMonth: 6, startDay: 29,
    description:
      '«발뒤꿈치에 독사가 있으면 머리를 밟는 것이지 물릴 때까지 기다리지 않는다»며 즉시 ' +
      '동원을 요구했다. 정작 07-14에는 추수 휴가 때문에 «가장 이른 개전은 07-25»이라고 ' +
      '스스로 못박았고, 07-27에는 군 준비를 이유로 8월 12일까지 미루자 해 베르히톨트와 ' +
      '갈렸다.',
  },
  {
    title: '아들 헤르베르트 전사',
    category: 'FAMILY',
    startYear: 1914, startMonth: 9,
    description:
      '자신이 지휘한 갈리치아 전역의 라바루스카 전투(09-06~11)에서 셋째 아들이 전사했다 — ' +
      '테레지아 사관학교 묘지에 묻혔다. 맏아들 쿠르트도 1918년 종전 전에 죽었다.',
  },
  {
    title: 'B제대 반전(反轉) — 두 전선 모두 실기',
    category: 'MILITARY',
    startYear: 1914, startMonth: 7, startDay: 31,
    description:
      '전략예비 제2군을 세르비아로 보낸 뒤 갈리치아로 되돌리려 했으나 철도 참모가 불가를 ' +
      '통보했다. 그 병력은 8월 20일까지 발칸에 묶였다가 뒤늦게 북상해 갈리치아 전투에도 ' +
      '늦었고, 세르비아 침공군은 예정 30만 8천에서 20만으로 줄었다. 러시아의 동원 속도를 ' +
      '30일로 잡은 것도 빗나갔다.',
  },
  {
    title: '고를리체-타르누프 돌파',
    category: 'MILITARY',
    startYear: 1915, startMonth: 5, startDay: 2,
    description:
      '독일과 공동 계획한 돌파로 러시아 전선을 무너뜨렸으나, 이후 작전 주도권이 사실상 독일 ' +
      '최고사령부로 넘어갔다.',
  },
  {
    title: '기나와 재혼',
    category: 'FAMILY',
    startYear: 1915, startMonth: 10, startDay: 19,
    description:
      '가톨릭 혼인법상 재혼이 불가능하자 기나가 헝가리 국적 취득을 위해 입양되고 개신교로 ' +
      '개종한 끝에, 빈의 개신교 도로테아 교회에서 조촐히 혼인했다. 8년의 집착이 끝난 셈이나 ' +
      '«전쟁으로 그를 얻으려 했다»는 해석의 근거가 된 1908년 일기가 남았다.',
  },
  {
    title: '트렌티노 공세 실패 — 브루실로프의 문을 열다',
    category: 'MILITARY',
    startYear: 1916, startMonth: 5,
    description:
      '20년 숙원이던 대이탈리아 공세를 감행했으나 실패했고, 이를 위해 갈리치아 전선에서 ' +
      '병력을 빼낸 것이 6월 브루실로프 공세의 대붕괴를 불렀다. 그해 원수(Feldmarschall)로 ' +
      '진급했다.',
  },
  {
    title: '카를 1세의 해임',
    category: 'MILITARY',
    startYear: 1917, startMonth: 3, startDay: 1,
    description:
      '새 황제 카를 1세가 참모총장직에서 물러나게 했다(오스트리아 일부 사료는 02-28 자진 ' +
      '사임으로 적는다). 이후 남티롤 군집단을 지휘한다.',
  },
  {
    title: '피아베 공세 실패 — 지휘권 상실·백작 승작',
    category: 'MILITARY',
    startYear: 1918, startMonth: 7, startDay: 15,
    description:
      '6월 피아베 공세가 무너진 뒤 카를 1세가 군집단 지휘권을 거두었고, 결정이 너무 매몰차 ' +
      '보이지 않도록 같은 날 백작으로 올리고 근위 명예대령을 함께 주었다 — 오스트리아 ' +
      '국가문서고 서훈 원부(AR 155.26)가 1918-07-15 특허장으로 확인한다. 예편은 그해 12월 ' +
      '초(«12-01»은 단일 출처).',
  },
  {
    title: '회고록 «나의 복무 시절» 출간',
    category: 'PUBLICATION',
    startYear: 1921, endYear: 1925,
    description:
      '전 5권. 제목은 «1906~1918»이나 실제 서술은 1914년 12월에서 끊긴다 — 두 번째 참모총장 ' +
      '재임의 대부분과 군집단 시절이 통째로 빠져 있어, 그 시기를 이 책으로 인용하는 것은 ' +
      '있지도 않은 대목을 인용하는 셈이다. 자기 변호를 위해 쓰였으므로 사료 가치는 신중히 ' +
      '따져야 한다는 것이 독일어권의 정평이다.',
  },
  {
    title: '바트메르겐트하임에서 사망',
    category: 'PERSONAL',
    startYear: 1925, startMonth: 8, startDay: 25,
    description:
      '요양 중 담낭 질환 재발로 사망(향년 72세). 09-02 장례에 10만 명 이상이 모였고 빈 히칭 ' +
      '묘지에 안장되었다. 회고록에서 그는 합스부르크가가 자신을 홀대했다고 씁쓸히 적었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const CONRAD_STATS = {
  politics: 32,
  military: 58,
  diplomacy: 18,
  intellect: 80,
  charisma: 48,
  administration: 42,
  notes:
    '한 세대의 장교 교육을 지배한 «전술 연구»를 쓴 이론가로서의 역량은 이론(학식)에서 ' +
    '최고 수준이다 — 다만 그 교리가 공격 지상주의였고 러일전쟁의 교훈에도 수정되지 않은 ' +
    '것이 전쟁에서 그대로 대가로 돌아왔다. 군사는 야전 지휘 실적으로 깎인다: 갈리치아 ' +
    '참패, 제2군을 남북 어느 쪽에도 늦게 보낸 B제대 반전, 갈리치아를 비워 브루실로프 ' +
    '공세를 부른 트렌티노 공세 — 구상은 대담했으나 제국군의 수송·보급 실태와 늘 어긋났다. ' +
    '정치·외교는 최저 수준: 20년간 예방전쟁만 요구해 두 차례 외무장관과 정면충돌하고 ' +
    '황제에게 «정책은 내가 한다»는 질책을 들었으며, 자신을 발탁한 후원자(프란츠 페르디난트) ' +
    '와도 끝내 멀어졌다. 부하 장교들의 헌신을 얻은 교육자적 매력은 있었으나, 3,000통의 ' +
    '부치지 않은 연서로 대표되는 사적 집착이 판단을 흐렸다는 평가가 따른다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedConrad(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️ 프란츠 콘라트 폰 회첸도르프(Conrad von Hötzendorf) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const austriaHungary = await prisma.historicalCountry.findFirst({
    where: { name: '오스트리아-헝가리 제국' },
    select: { id: true },
  })
  if (!austriaHungary) {
    console.warn(
      '  ⚠️  오스트리아-헝가리 제국 HC 미존재 — 먼저 seedAustriaHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Conrad von Hötzendorf' } },
        { AND: [{ name: '프란츠' }, { surname: '콘라트 폰 회첸도르프' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = CONRAD.originalName
    if (!person.biography) patch.biography = CONRAD.biography
    if (!person.birthPlaceText) patch.birthPlaceText = CONRAD.birthPlaceText
    if (!person.birthNote) patch.birthNote = CONRAD.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = CONRAD.deathPlaceText
    if (!person.deathType) patch.deathType = CONRAD.deathType
    if (!person.deathCause) patch.deathCause = CONRAD.deathCause
    if (!person.deathNote) patch.deathNote = CONRAD.deathNote
    if (person.influence == null) patch.influence = CONRAD.influence
    if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${CONRAD.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${CONRAD.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: CONRAD.name,
        middleName: CONRAD.middleName,
        surname: CONRAD.surname,
        originalName: CONRAD.originalName,
        biography: CONRAD.biography,
        birthDate: toDate(CONRAD.birthYear, CONRAD.birthMonth, CONRAD.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: CONRAD.birthNote,
        deathDate: toDate(CONRAD.deathYear, CONRAD.deathMonth, CONRAD.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: CONRAD.deathType,
        deathCause: CONRAD.deathCause,
        deathNote: CONRAD.deathNote,
        gender: CONRAD.gender,
        nameDisplayOrder: 'western' as any,
        influence: CONRAD.influence,
        birthPlaceText: CONRAD.birthPlaceText,
        deathPlaceText: CONRAD.deathPlaceText,
        historicalCountryId: austriaHungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${CONRAD.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 ────────────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
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
        historicalCountryId: austriaHungary.id,
        positionType: t.positionType,
        title: t.title,
        subTermNumber: t.subTermNumber,
        startDate,
        startDatePrecision,
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
    where: {
      personId,
      historicalCountryId: austriaHungary.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 오스트리아-헝가리 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: austriaHungary.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note:
          '출생·복무 전 기간의 국가. 1918년 제국 해체 후에는 오스트리아 제1공화국에서 ' +
          '연금 생활을 하며 회고록을 썼으나 공직을 맡지 않아 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국 (출생·복무 1852~1918)')
  }

  // ── 4) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({
      where: { personId, title: e.title },
    })
    if (exists) continue
    const startDate = toDate(e.startYear, e.startMonth, e.startDay)
    const startDatePrecision = e.startDay ? 'day' : e.startMonth ? 'month' : 'year'
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    const endDatePrecision = e.endYear ? (e.endDay ? 'day' : e.endMonth ? 'month' : 'year') : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate,
        startDatePrecision,
        endDate,
        endDatePrecision,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 5) 6축 능력치 ────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId, accountId: admin.id },
  })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: CONRAD_STATS.politics,
        military: CONRAD_STATS.military,
        diplomacy: CONRAD_STATS.diplomacy,
        intellect: CONRAD_STATS.intellect,
        charisma: CONRAD_STATS.charisma,
        administration: CONRAD_STATS.administration,
        notes: CONRAD_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${CONRAD_STATS.politics}·군사 ${CONRAD_STATS.military}·` +
        `외교 ${CONRAD_STATS.diplomacy}·학식 ${CONRAD_STATS.intellect}·` +
        `카리스마 ${CONRAD_STATS.charisma}·행정 ${CONRAD_STATS.administration}`,
    )
  }

  console.log('✅ 프란츠 콘라트 폰 회첸도르프 시딩 완료\n')
}
