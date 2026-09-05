/**
 * 오스카어 포티오레크 (Oskar Potiorek, 1853~1933) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 오스트리아-헝가리의 보스니아-헤르체고비나 주지사(1911~1914)이자 1914년 대세르비아
 * 침공군 총사령관. 1914-06-28 사라예보 방문 경호를 총괄해 경고를 묵살했고("사라예보에
 * 암살자가 가득하다고 생각하는가? 내가 책임지겠다"), 시청 환영식 뒤 동선 변경을 운전사에게
 * 알리지 않은 실수로 황위 계승자 프란츠 페르디난트 부부가 탄 차가 라틴 다리 앞에서 멈춰
 * 서게 만들었다 — 가브릴로 프린치프가 그 자리에서 저격했다. 본인은 같은 차에 타고 있었으나
 * 무사했고, 프린치프는 훗날 애초 노린 표적이 포티오레크였다고 진술했다. 그해 여름 발칸
 * 전력 총사령관으로 세르비아 침공을 지휘했으나 체르 전투·콜루바라 전투에서 잇달아 참패해
 * 12월 경질되었다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)이라 구력 병기가 필요 없다(콘라트 선례).
 *
 * 관직 매핑: 참모본부·군단장·발칸 전력 사령관 등 군 직책은 GovernmentPositionDefinition
 * 카탈로그에 대응 정의가 0건이므로 title을 직접 기입한다(군인 시드 규약, 콘라트·다닐로프
 * 선례). positionType은 MILITARY_COMMANDER. 보스니아-헤르체고비나 주지사(Landeschef)는
 * 문무 겸임의 지역 통치직으로 LOCAL_GOVERNMENT를 쓴다(카탈로그에 «총독» 정의 없음).
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC).
 *
 * 등록 항목:
 *  - Person x1 (포티오레크 본인 — historicalCountryId=오스트리아-헝가리 제국)
 *  - GovernmentPositionTenure x6 (참모본부 작전과장·여단장·부참모총장·군단장·주지사(문무겸임)·
 *    발칸 전력 총사령관 — 주지사·총사령관은 겹치는 기간) — 신규 생성이라 appointmentDetail을
 *    create에 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonLifeEvent x16 (연보)
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
const POTIOREK = {
  name: '오스카어',
  middleName: null as string | null,
  surname: '포티오레크',
  originalName: 'Oskar Potiorek',
  gender: 'MALE' as const,
  birthYear: 1853, birthMonth: 11, birthDay: 20,
  birthNote:
    '케른텐 지방의 광산촌 블라이베르크에서 태어났다. 빈의 공병기술학교(Genie-Akademie 계열 ' +
    '군사기술학교)와 육군대학(Kriegsschule)을 마치고 1871-09-01 공병연대(제2공병연대) ' +
    '소위로 임관했다.',
  birthPlaceText: '오스트리아 제국 케른텐 블라이베르크',
  deathYear: 1933, deathMonth: 12, deathDay: 17,
  deathPlaceText: '오스트리아 케른텐 클라겐푸르트',
  deathType: DeathType.NATURAL,
  deathCause: '향년 80세, 은거지 클라겐푸르트에서 노환으로 사망.',
  deathNote:
    '경질 이후 클라겐푸르트로 물러나 19년을 조용히 살았다. 빈 노이슈타트의 테레지아 ' +
    '육군사관학교 묘지에 안장되었다 — 콘라트와 같은 묘역이다. 1918년 제국 해체 뒤에는 ' +
    '오스트리아 제1공화국에서 연금 생활을 했을 뿐 공직을 다시 맡지 않았다.',
  influence: 55,
  biography:
    '오스트리아-헝가리의 보스니아-헤르체고비나 주지사(1911~1914)이자 1914년 대세르비아 ' +
    '침공군 총사령관. 사라예보 사건 당일의 경호 총책임자였고, 몇 달 뒤에는 그 사건에 대한 ' +
    '복수를 자임하며 나선 침공에서 체르·콜루바라 두 전투를 잇달아 참패해 세계대전 초반 ' +
    '오스트리아-헝가리군 최악의 패배를 안긴 인물로 남았다. ' +
    '\n\n' +
    '성장과 참모 경력(1853~1906). 케른텐의 광산촌 블라이베르크에서 태어나 공병 소위로 ' +
    '임관, 1886년부터 참모본부 작전과에 자리 잡았다. 1892년 대령으로 작전과장에 올랐고, ' +
    '1898년 소장으로 부다페스트 제64보병여단을 맡았다. 1902년 프란츠 요제프 1세가 그를 ' +
    '부참모총장으로 발탁했으며, 1906년 포병대장(Feldzeugmeister)으로 진급해 그라츠의 ' +
    '제3군단장이 되었다. ' +
    '\n\n' +
    '참모총장 후보에서 밀려나다(1911). 1911년 콘라트 폰 회첸도르프가 예방전쟁 요구로 ' +
    '경질되자 그 후임을 노렸으나, 프란츠 요제프는 블라지우스 폰 셰무아를 앉혔다 — 콘라트는 ' +
    '이듬해 다시 복귀한다. ' +
    '\n\n' +
    '보스니아-헤르체고비나 주지사(1911~1914). 1911-05-10 제8대 주지사(Landeschef)로 ' +
    '부임해 문민 행정과 군 지휘를 함께 쥐었다. 1910년부터 사라예보 감찰총감으로 현지에 ' +
    '있었던 연장선이었다. ' +
    '\n\n' +
    '사라예보, 1914-06-28. 프란츠 페르디난트 대공 부부의 방문 경호를 총괄하며 암살 경고를 ' +
    '묵살했다 — «사라예보에 암살자가 가득하다고 생각하는가? 내가 책임지겠다»고 잘라 ' +
    '말했다고 전해진다. 오전 첫 차량 폭탄 테러(체트니크 차브리노비치)가 실패로 끝난 뒤 ' +
    '시청 환영식을 마치고 부상자 문병으로 동선을 바꾸면서도 이를 운전사 로요카에게 알리지 ' +
    '않았다 — 대공 부부와 하라흐 백작, 본인이 탄 세 번째 차가 라틴 다리 앞에서 길을 잘못 ' +
    '들어 멈춰 섰고, 그 자리에 있던 가브릴로 프린치프가 저격해 대공과 조피 대공비가 ' +
    '숨졌다. 포티오레크와 하라흐, 로요카는 무사했다 — 프린치프는 훗날 자신이 애초 노린 ' +
    '표적은 포티오레크였다고 진술했다. 사건 직후 그는 사라예보에서 세르비아계 주민에 대한 ' +
    '보복을 조직해, 슈츠코르 민병대를 재건하고 약 5,500명을 체포했다(700~2,200명이 ' +
    '옥사, 460명 처형, 약 5,200가구 추방). ' +
    '\n\n' +
    '세르비아 침공(1914). «사라예보에서 살아남은 것은 그 복수를 하기 위해서였다»고 말했다는 ' +
    '일화가 전할 만큼 임전에 나섰고, 제5·6군을 아우르는 발칸 전력 총사령관으로 세르비아 ' +
    '침공을 지휘했다. 그러나 08-15~24 체르 전투에서 스테파 스테파노비치의 세르비아 제2군에 ' +
    '참패해(오스트리아-헝가리군 전사 6,000~1만·부상 3만·포로 4,500) 세계대전 최초의 연합국 ' +
    '측 승전을 헌납했다. 11-16~12-15 콜루바라 전투에서는 12-01 베오그라드를 점령하는 ' +
    '성과를 냈으나, 12-02 라도미르 푸트니크의 반격에 무너져 12-14~15 베오그라드를 다시 ' +
    '내주고 사바·다뉴브 강 너머로 총퇴각했다 — 오스트리아-헝가리군 손실 약 22만5천(전사 ' +
    '3만·부상 17만3천·포로 7만). 세르비아를 전쟁에서 끌어내지도, 불가리아를 끌어들이지도, ' +
    '루마니아의 중립을 지키지도 못한 완전한 실패였다. ' +
    '\n\n' +
    '경질과 만년. 12-22 지휘권과 주지사직을 모두 잃고 오이겐 대공에게 자리를 넘겼다 — 이 ' +
    '경질이 그를 자살 충동으로 몰았다는 일화가 전한다. 이후 재기용되지 않고 클라겐푸르트로 ' +
    '물러나 1933년 죽을 때까지 조용히 지냈다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
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
    title: '참모본부 작전과장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1892,
    endYear: 1898,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '소장 진급과 함께 제64보병여단장으로 전보.',
    appointmentDetail:
      '1886년부터 참모본부 작전과에서 근무하다 1892년 대령 진급과 함께 과장에 올랐다.',
    notes: '참모 경력의 핵심 보직으로, 이후 부참모총장 발탁의 발판이 되었다.',
  },
  {
    title: '제64보병여단장 (부다페스트)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1898, startMonth: 5, startDay: 1,
    endYear: 1902,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '부참모총장으로 발탁되어 빈으로 복귀.',
    appointmentDetail: '1898-05-01 소장 진급과 함께 부다페스트의 여단을 맡았다.',
    notes: '야전 지휘 경력은 이 여단장 재임이 전부이며, 이후로는 참모·행정직을 이어갔다.',
  },
  {
    title: '부참모총장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1902,
    endYear: 1906,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '포병대장 진급과 함께 제3군단장으로 전보.',
    appointmentDetail: '1902년 프란츠 요제프 1세가 직접 부참모총장으로 발탁했다.',
    notes:
      '참모총장(당시 베크-르지코프스키)을 보좌하며 군 중추에서 경력을 쌓았다 — 훗날 ' +
      '1911년 참모총장 후보로 거론되는 배경이 된다.',
  },
  {
    title: '제3군단장 (그라츠)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1906,
    endYear: 1910, endMonth: 4,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '카를 시코프스키 중장에게 군단을 넘기고 사라예보 감찰총감으로 이동.',
    appointmentDetail: '1906년 포병대장(Feldzeugmeister)으로 진급하며 군단장에 올랐다.',
    notes: '1910년 4월까지 재임한 뒤 보스니아로 이동해 이듬해 주지사직으로 이어진다.',
  },
  {
    title: '보스니아-헤르체고비나 주지사(문무겸임)',
    positionType: GovernmentPositionType.LOCAL_GOVERNMENT,
    startYear: 1911, startMonth: 5, startDay: 10,
    endYear: 1914, endMonth: 12, endDay: 22,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '세르비아 침공 실패의 책임을 물어 발칸 전력 총사령관직과 함께 12-22 경질되어 오이겐 ' +
      '대공에게 자리를 넘겼다.',
    appointmentDetail:
      '1910년 사라예보 감찰총감으로 현지에 부임한 데 이어 1911-05-10 제8대 주지사 ' +
      '(Landeschef)로 임명돼 문민 행정과 군 지휘를 함께 쥐었다.',
    notes:
      '1914-06-28 프란츠 페르디난트 대공 부부 방문 경호를 총괄한 책임자로, 암살 경고를 ' +
      '묵살하고 동선 변경을 운전사에게 알리지 않은 실수로 사건 현장을 만들었다. 사건 직후 ' +
      '세르비아계 주민 약 5,500명을 체포(700~2,200명 옥사·460명 처형)하는 보복을 조직했다.',
  },
  {
    title: '발칸 전력 총사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1914, startMonth: 7, startDay: 28,
    endYear: 1914, endMonth: 12, endDay: 22,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '체르·콜루바라 두 전투의 잇단 참패로 12-22 경질되었다 — 이 결정이 그를 자살 충동으로 ' +
      '몰았다는 일화가 전한다. 후임은 오이겐 대공.',
    appointmentDetail:
      '1914-07-28 오스트리아-헝가리의 대세르비아 선전포고와 함께 제5·6군을 아우르는 발칸 ' +
      '전력 총사령관을 맡았다 — 사라예보 사건의 복수를 자임하며 나섰다는 평이 따른다.',
    notes:
      '08-15~24 체르 전투에서 세르비아 제2군(스테파노비치)에 참패(전사 6,000~1만·부상 3만· ' +
      '포로 4,500)해 세계대전 최초의 연합국 측 승전을 헌납했다. 11-16~12-15 콜루바라 ' +
      '전투에서는 12-01 베오그라드를 점령했으나 12-02 푸트니크의 반격에 무너져 12-14~15 ' +
      '재탈환당하고 총퇴각했다(오스트리아-헝가리군 손실 약 22만5천).',
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
    title: '케른텐 블라이베르크 출생',
    category: 'FAMILY',
    startYear: 1853, startMonth: 11, startDay: 20,
    description: '케른텐 지방의 광산촌 블라이베르크에서 출생.',
  },
  {
    title: '공병연대 소위 임관',
    category: 'MILITARY',
    startYear: 1871, startMonth: 9, startDay: 1,
    description: '군사기술학교와 육군대학을 마치고 제2공병연대에 소위로 배속되었다.',
  },
  {
    title: '참모본부 작전과 편입',
    category: 'MILITARY',
    startYear: 1886,
    description: '참모장교로 참모본부 작전과에 자리 잡아 이후 20년 참모 경력의 출발점이 되었다.',
  },
  {
    title: '작전과장 취임 (대령 진급)',
    category: 'MILITARY',
    startYear: 1892,
    description: '대령으로 진급하며 참모본부 작전과장을 맡았다.',
  },
  {
    title: '제64보병여단장 취임 (소장 진급)',
    category: 'MILITARY',
    startYear: 1898, startMonth: 5, startDay: 1,
    description: '부다페스트의 제64보병여단을 맡았다 — 그의 유일한 야전 지휘 경력.',
  },
  {
    title: '부참모총장 발탁',
    category: 'MILITARY',
    startYear: 1902,
    description: '프란츠 요제프 1세가 직접 부참모총장으로 발탁했다.',
  },
  {
    title: '포병대장 진급·제3군단장 취임',
    category: 'MILITARY',
    startYear: 1906,
    description: '포병대장(Feldzeugmeister)으로 진급, 그라츠의 제3군단을 맡았다.',
  },
  {
    title: '참모총장 후보에서 밀림',
    category: 'MILITARY',
    startYear: 1911,
    description:
      '콘라트 폰 회첸도르프가 예방전쟁 요구로 경질되자 후임을 노렸으나, 프란츠 요제프는 ' +
      '블라지우스 폰 셰무아를 임명했다.',
  },
  {
    title: '보스니아-헤르체고비나 주지사 취임',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 5, startDay: 10,
    description:
      '1910년 사라예보 감찰총감으로 부임한 데 이어 제8대 주지사(Landeschef)로 임명돼 문민 ' +
      '행정과 군 지휘를 함께 쥐었다.',
  },
  {
    title: '사라예보 저격 — 경호 총책임자',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 6, startDay: 28,
    description:
      '프란츠 페르디난트 대공 부부 방문 경호를 총괄하며 암살 경고를 묵살했다. 시청 환영식 ' +
      '뒤 동선 변경을 운전사에게 알리지 않아 차량이 라틴 다리 앞에서 멈춰 섰고, 가브릴로 ' +
      '프린치프가 그 자리에서 대공 부부를 저격했다 — 같은 차에 탔던 본인은 무사했다. ' +
      '프린치프는 훗날 애초 노린 표적이 포티오레크였다고 진술했다.',
  },
  {
    title: '사라예보 반(反)세르비아 보복 조직',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 6, startDay: 29,
    endYear: 1914, endMonth: 8,
    description:
      '슈츠코르 민병대를 재건해 세르비아계 주민 약 5,500명을 체포(700~2,200명 옥사·460명 ' +
      '처형), 약 5,200가구를 추방했다.',
  },
  {
    title: '대세르비아 선전포고 — 발칸 전력 총사령관',
    category: 'MILITARY',
    startYear: 1914, startMonth: 7, startDay: 28,
    description: '선전포고와 함께 제5·6군을 아우르는 발칸 전력 총사령관을 맡았다.',
  },
  {
    title: '체르 전투 참패',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8, startDay: 15,
    endYear: 1914, endMonth: 8, endDay: 24,
    description:
      '스테파 스테파노비치의 세르비아 제2군에 참패(전사 6,000~1만·부상 3만·포로 4,500) — ' +
      '세계대전 최초의 연합국 측 승전을 헌납했다.',
  },
  {
    title: '콜루바라 전투 — 베오그라드 점령과 총퇴각',
    category: 'MILITARY',
    startYear: 1914, startMonth: 11, startDay: 16,
    endYear: 1914, endMonth: 12, endDay: 15,
    description:
      '12-01 베오그라드를 점령했으나 12-02 라도미르 푸트니크의 반격에 무너져 12-14~15 ' +
      '재탈환당하고 사바·다뉴브강 너머로 총퇴각했다(오스트리아-헝가리군 손실 약 22만5천).',
  },
  {
    title: '경질',
    category: 'MILITARY',
    startYear: 1914, startMonth: 12, startDay: 22,
    description:
      '주지사직과 총사령관직을 모두 잃고 오이겐 대공에게 자리를 넘겼다 — 이 경질이 그를 ' +
      '자살 충동으로 몰았다는 일화가 전한다. 이후 재기용되지 않았다.',
  },
  {
    title: '클라겐푸르트에서 사망',
    category: 'PERSONAL',
    startYear: 1933, startMonth: 12, startDay: 17,
    description:
      '은거지 클라겐푸르트에서 노환으로 사망(향년 80세). 빈 노이슈타트 테레지아 육군사관학교 ' +
      '묘지에 안장되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const POTIOREK_STATS = {
  politics: 38,
  military: 22,
  diplomacy: 20,
  intellect: 48,
  charisma: 30,
  administration: 52,
  notes:
    '체르·콜루바라 두 전투의 완패로 군사는 이 시리즈 최저 수준이다 — 침공 계획 자체가 ' +
    '무리했고 지휘 판단도 거듭 빗나갔다. 정치·행정은 보스니아 주지사로서 문민 행정을 ' +
    '4년 가까이 이끈 경력을 반영해 중간 이상이나, 그 실적에는 사라예보 사건 이후 조직한 ' +
    '세르비아계 보복(체포 5,500·처형 460)이 함께 걸려 있어 순전한 치적으로만 보기 어렵다. ' +
    '외교·카리스마는 최저권 — 암살 경고를 자신만만하게 묵살한 오판이 사건 자체를 부른 ' +
    '직접 원인이 되었다. 학식은 20년 참모 경력에 걸맞게 중간 이상이나, 이론과 실전 지휘의 ' +
    '괴리가 컸다는 점에서 콘라트와 닮은 평가를 받는다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedPotiorek(prisma: PrismaService): Promise<void> {
  console.log('\n⚔️ 오스카어 포티오레크(Oskar Potiorek) 시딩 시작 (기존 데이터 보존 모드)...')

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
        { originalName: { contains: 'Potiorek' } },
        { AND: [{ name: '오스카어' }, { surname: '포티오레크' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = POTIOREK.originalName
    if (!person.biography) patch.biography = POTIOREK.biography
    if (!person.birthPlaceText) patch.birthPlaceText = POTIOREK.birthPlaceText
    if (!person.birthNote) patch.birthNote = POTIOREK.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = POTIOREK.deathPlaceText
    if (!person.deathType) patch.deathType = POTIOREK.deathType
    if (!person.deathCause) patch.deathCause = POTIOREK.deathCause
    if (!person.deathNote) patch.deathNote = POTIOREK.deathNote
    if (person.influence == null) patch.influence = POTIOREK.influence
    if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${POTIOREK.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${POTIOREK.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: POTIOREK.name,
        middleName: POTIOREK.middleName,
        surname: POTIOREK.surname,
        originalName: POTIOREK.originalName,
        biography: POTIOREK.biography,
        birthDate: toDate(POTIOREK.birthYear, POTIOREK.birthMonth, POTIOREK.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: POTIOREK.birthNote,
        deathDate: toDate(POTIOREK.deathYear, POTIOREK.deathMonth, POTIOREK.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: POTIOREK.deathType,
        deathCause: POTIOREK.deathCause,
        deathNote: POTIOREK.deathNote,
        gender: POTIOREK.gender,
        nameDisplayOrder: 'western' as any,
        influence: POTIOREK.influence,
        birthPlaceText: POTIOREK.birthPlaceText,
        deathPlaceText: POTIOREK.deathPlaceText,
        historicalCountryId: austriaHungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${POTIOREK.originalName} (id=${person.id})`)
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
        title: t.title,
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
          '출생·복무 전 기간의 국가. 1918년 제국 해체 후에는 오스트리아 제1공화국에서 연금 ' +
          '생활을 했을 뿐 공직을 다시 맡지 않아 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국 (출생·복무 1853~1918)')
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
        politics: POTIOREK_STATS.politics,
        military: POTIOREK_STATS.military,
        diplomacy: POTIOREK_STATS.diplomacy,
        intellect: POTIOREK_STATS.intellect,
        charisma: POTIOREK_STATS.charisma,
        administration: POTIOREK_STATS.administration,
        notes: POTIOREK_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${POTIOREK_STATS.politics}·군사 ${POTIOREK_STATS.military}·` +
        `외교 ${POTIOREK_STATS.diplomacy}·학식 ${POTIOREK_STATS.intellect}·` +
        `카리스마 ${POTIOREK_STATS.charisma}·행정 ${POTIOREK_STATS.administration}`,
    )
  }

  console.log('✅ 오스카어 포티오레크 시딩 완료\n')
}
