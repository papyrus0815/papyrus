/**
 * 오무라 마스지로(大村益次郎, 1824~1869) 시드.
 *
 * 조슈번의 시골 의사 아들 → 난학자·번의(藩医) → 막부 반쇼시라베쇼·고부쇼 서양 병학 교수 →
 * 조슈 군제개혁의 설계자 → 보신 전쟁 신정부군 작전 총괄 → 초대 병부대보(兵部大輔).
 * 국민개병(징병제)·번병 해체를 구상해 "일본 육군의 아버지"로 불리며, 그 구상에 반발한
 * 불평 사족의 습격으로 취임 4개월 만에 사망했다.
 *
 *   ⚠️ 기존 데이터 보존 모드(있으면 스킵, 비어 있는 사망정보만 backfill).
 *   ⚠️ 의존: "도쿠가와 막부"·"일본 제국" HC + 현대 국가 일본(JP) 기등록.
 *
 * 등록 항목:
 *   - GovernmentPositionDefinition x2 (병부대보·군무관 판사) + 스코프(역사 우선 + 현대 dual-fill)
 *   - Person x1 / PersonStats x1 / PersonNickname x3
 *   - PersonCountryAffiliation x4
 *   - GovernmentPositionTenure x2
 *   - PersonLifeEvent x12 (번 단위 직책·전역 지휘 등 HC에 걸 수 없는 경력은 연보로)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  PersonNicknameType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

const HC_TOKUGAWA = '도쿠가와 막부'
const HC_EMPIRE = '일본 제국'
const ISO_JAPAN = 'JP'

// ── 관직 정의 ────────────────────────────────────────────────────────────────
interface DefinitionSpec {
  title: string
  titleEn: string
  titleLocal: string
  positionType: GovernmentPositionType
  rank: number
  description: string
  establishedDate?: Date
  abolishedDate?: Date
  /** 스코프 시대 창 — 한 나라 안에서도 시기가 갈리는 직책이라 명시 */
  scopeStartYear?: number
  scopeEndYear?: number
  scopeNote: string
}

const DEF_HYOBU_TAIFU: DefinitionSpec = {
  title: '병부대보',
  titleEn: 'Vice Minister of Military Affairs',
  titleLocal: '兵部大輔',
  positionType: GovernmentPositionType.VICE_MINISTER,
  rank: 3,
  description:
    '1869년 직원령(職員令)으로 설치된 병부성(兵部省)의 차관. 장관인 병부경(兵部卿)에 황족이 ' +
    '앉는 것이 관례여서 실무·정책의 최고 책임자는 대보였다. 병부성은 1872년 육군성·해군성으로 ' +
    '분리되며 폐지되었다.',
  establishedDate: new Date(1869, 7, 15),
  abolishedDate: new Date(1872, 3, 4),
  scopeStartYear: 1869,
  scopeEndYear: 1872,
  scopeNote: '병부성 존속기(1869~1872) 한정. 후신은 육군차관·해군차관으로 계보가 갈린다.',
}

const DEF_GUNMU_HANJI: DefinitionSpec = {
  title: '군무관 판사',
  titleEn: 'Judicial Officer of the Military Affairs Bureau',
  titleLocal: '軍務官判事',
  positionType: GovernmentPositionType.VICE_MINISTER,
  rank: 4,
  description:
    '1868년 정체서(政体書) 체제에서 설치된 군무관(軍務官)의 3등관. 지사(知事)·부지사(副知事) ' +
    '아래에서 실무를 총괄했다. 여기서 "판사"는 사법관이 아니라 관(官)의 실무 책임직을 가리키는 ' +
    '당시 관명이다. 1869년 직원령으로 군무관이 병부성으로 개편되며 소멸.',
  establishedDate: new Date(1868, 5, 11),
  abolishedDate: new Date(1869, 7, 15),
  scopeStartYear: 1868,
  scopeEndYear: 1869,
  scopeNote: '정체서 관제(1868~1869) 한정 직명.',
}

const DEFINITIONS: readonly DefinitionSpec[] = [DEF_HYOBU_TAIFU, DEF_GUNMU_HANJI] as const

// ── 인물 스펙 ────────────────────────────────────────────────────────────────
type AffiliationSpec = {
  type: 'CITIZENSHIP' | 'PRIMARY_RESIDENCE' | 'SERVED' | 'BIRTH_PLACE' | 'EXILE' | 'OTHER'
  countryIso?: string
  historicalCountryName?: string
  startYear?: number
  endYear?: number
}

interface TenureSpec {
  definitionTitle: string
  historicalCountryName: string
  startYear: number; startMonth: number; startDay: number
  endYear?: number; endMonth?: number; endDay?: number
  appointmentMethod: AppointmentMethod
  appointmentDetail?: string
  endReason?: TenureEndReason
  endReasonDetail?: string
  notes: string
}

interface LifeEventSpec {
  title: string
  category: string
  startYear: number; startMonth?: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  description: string
}

const NICKNAMES: { nickname: string; type: PersonNicknameType; reason: string; priority: number }[] = [
  {
    nickname: '무라타 조로쿠(村田蔵六)',
    type: PersonNicknameType.BIRTH_NAME,
    reason:
      '출생 때부터 40대 초반까지 쓴 본명. 1865년 조슈번이 그를 사족(士族)으로 발탁하면서 ' +
      '"오무라 마스지로"라는 이름을 내렸다.',
    priority: 0,
  },
  {
    nickname: '일본 육군의 아버지',
    type: PersonNicknameType.EPITHET,
    reason:
      '번병(藩兵)을 해체하고 신분과 무관한 국민개병으로 상비군을 세운다는 구상을 처음 제도로 ' +
      '밀어붙인 인물이라, 1873년 징병령으로 완성된 근대 일본 육군의 설계자로 평가된다.',
    priority: 1,
  },
  {
    nickname: '불 뿜는 달마(火吹き達磨)',
    type: PersonNicknameType.EPITHET,
    reason:
      '둥근 얼굴에 넓은 이마, 무표정하고 말수가 없는 외모를 두고 동료들이 붙인 별명. ' +
      '사교를 극도로 꺼리고 용건만 말하는 성격이 함께 얽혀 있다.',
    priority: 2,
  },
]

const AFFILIATIONS: AffiliationSpec[] = [
  { type: 'BIRTH_PLACE', historicalCountryName: HC_TOKUGAWA, startYear: 1824, endYear: 1824 },
  { type: 'CITIZENSHIP', historicalCountryName: HC_TOKUGAWA, startYear: 1824, endYear: 1868 },
  { type: 'SERVED', historicalCountryName: HC_TOKUGAWA, startYear: 1856, endYear: 1860 },
  { type: 'SERVED', historicalCountryName: HC_EMPIRE, startYear: 1868, endYear: 1869 },
]

const TENURES: TenureSpec[] = [
  {
    definitionTitle: '군무관 판사',
    historicalCountryName: HC_EMPIRE,
    startYear: 1868, startMonth: 6, startDay: 11,
    endYear: 1869, endMonth: 8, endDay: 15,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    appointmentDetail:
      '1868-06-11(게이오 4년 음력 윤4월 21일) 정체서 반포로 군무관이 설치되고, 조슈번에서 ' +
      '군제개혁 실적을 쌓은 본인이 실무 책임자로 곧바로 기용되었다. 신분상으로는 불과 몇 해 전까지 ' +
      '번의(藩医)였던 인물이 신정부 군사행정의 사실상 최고 실무자가 된 파격이었다.',
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '1869-08-15 직원령으로 군무관이 병부성으로 개편, 병부대보로 전임.',
    notes:
      '약 1년 2개월 재임. 보신 전쟁 후반의 작전을 이 직위에서 총괄했다. (1)1868-07-04 우에노 ' +
      '전쟁 — 에도 간에이지(寛永寺)에 농성한 쇼기타이(彰義隊) 약 3,000명을 하루 만에 궤멸시키는 ' +
      '작전을 입안·지휘. 혼고 대지에 암스트롱포를 배치해 화력으로 제압하고 퇴로 한 방향을 일부러 ' +
      '열어 두는 방식이었다. (2)이후 오우에쓰 열번동맹 공략의 전체 구도를 짜 아이즈·쇼나이 방면 ' +
      '진격을 조율했다. 서양 병서 번역으로 익힌 작전술을 실전에 그대로 적용한 사례로, 사이고 ' +
      '다카모리류의 무사적 전투 지휘와 대비된다.',
  },
  {
    definitionTitle: '병부대보',
    historicalCountryName: HC_EMPIRE,
    startYear: 1869, startMonth: 8, startDay: 15,
    endYear: 1869, endMonth: 12, endDay: 7,
    appointmentMethod: AppointmentMethod.APPOINTMENT,
    appointmentDetail:
      '1869-08-15(메이지 2년 음력 7월 8일) 직원령 시행으로 병부성이 설치되면서 초대 대보에 ' +
      '임명. 장관인 병부경에는 황족 닌나지노미야 요시아키 친왕이 앉았으므로 군사 정책의 실권은 ' +
      '대보인 본인에게 있었다.',
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail:
      '1869-10-08 교토에서 피습, 부상 후유증으로 1869-12-07 오사카에서 재임 중 사망.',
    notes:
      '약 3개월 22일 재임. 짧았지만 이후 일본 육군의 골격이 여기서 정해졌다. (1)번병 해체 — ' +
      '각 번이 거느린 사병(私兵)을 없애고 정부 직할 상비군으로 일원화 (2)국민개병 — 사족의 ' +
      '군사 독점을 깨고 신분과 무관한 징병으로 병력을 충원(1873년 징병령으로 실현) (3)오사카를 ' +
      '군사 중심지로 삼아 병학료(兵学寮)·조병소(造兵司)를 두고, 방어 거점을 도쿄가 아닌 서쪽에 ' +
      '두는 배치를 구상. 이 구상은 "무사에게서 칼을 빼앗는 정책"으로 받아들여져 유신의 주역이던 ' +
      '조슈 사족들에게서 가장 격렬한 반발을 샀고, 그것이 곧 피습의 동기가 되었다.',
  },
]

const LIFE_EVENTS: LifeEventSpec[] = [
  {
    title: '간기엔(咸宜園) 수학',
    category: 'EDUCATION',
    startYear: 1842, endYear: 1843,
    description:
      '분고국 히타(豊後日田)의 히로세 단소(広瀬淡窓)가 연 사숙 간기엔에서 한학을 배웠다. ' +
      '신분·나이·학력을 따지지 않고 성적만으로 서열을 매기는 "삼탈법(三奪法)"으로 운영된 곳으로, ' +
      '시골 의사의 아들이 실력만으로 올라설 수 있다는 경험을 처음 한 시기다.',
  },
  {
    title: '데키주쿠(適塾) 입숙 — 오가타 고안 문하',
    category: 'EDUCATION',
    startYear: 1844, endYear: 1846,
    description:
      '오사카에서 오가타 고안(緒方洪庵)의 데키주쿠에 들어가 난학과 서양의학을 배웠다. ' +
      '네덜란드어 독해력으로 두각을 나타내 숙두(塾頭, 수석 학생)에 올랐다. 후쿠자와 유키치가 ' +
      '몇 해 뒤 같은 숙의 숙두가 되는 곳으로, 막말 난학 인맥의 중심이었다.',
  },
  {
    title: '나가사키 유학 후 귀향 개업',
    category: 'CAREER',
    startYear: 1846, endYear: 1853,
    description:
      '나가사키에서 난방의학을 더 익힌 뒤 고향 스젠지촌으로 돌아와 아버지의 뒤를 이어 의사로 ' +
      '개업했다. 본인은 이 시기를 평생 가장 무료했던 때로 회고했다고 전한다. 이때까지 그의 ' +
      '이력에 군사는 전혀 없었다.',
  },
  {
    title: '우와지마번 출사 — 증기선·포대 기술 자문',
    category: 'CAREER',
    startYear: 1853, endYear: 1856,
    description:
      '페리 내항 직후 서양 기술자를 찾던 우와지마번(宇和島藩) 번주 다테 무네나리(伊達宗城)에게 ' +
      '초빙되어 번의 겸 난학자로 출사. 제등장(提灯張) 장인 출신 가야 요시로(嘉蔵, 후의 마에바라 ' +
      '고잔)에게 네덜란드어 문헌을 풀어 주며 국산 증기선 제작을 지도했고, 해안 포대 설계에도 ' +
      '관여했다. 의학에서 병학·공학으로 넘어간 전환점.',
  },
  {
    title: '에도 사숙 구주쿠도(鳩居堂) 개설',
    category: 'CAREER',
    startYear: 1856,
    description:
      '에도로 옮겨 사숙 구주쿠도를 열고 난학·병학을 가르쳤다. 이 무렵 번역·강의로 쌓은 평판이 ' +
      '곧 막부 기관 초빙으로 이어진다.',
  },
  {
    title: '막부 반쇼시라베쇼·고부쇼 교수직',
    category: 'CAREER',
    startYear: 1856, endYear: 1860,
    description:
      '막부의 양학 연구·교육기관 반쇼시라베쇼(蕃書調所) 교수 보좌와 강무소(講武所) 교수로 ' +
      '서양 병학을 강의했다. 네덜란드어 병서를 직접 번역해 가르친 몇 안 되는 인물로, 뒷날 ' +
      '적이 될 막부 쪽에서 먼저 그의 값을 알아본 셈이다.',
  },
  {
    title: '조슈번 출사 — 무비국 담당',
    category: 'CAREER',
    startYear: 1860, endYear: 1863,
    description:
      '고향 번인 조슈번(長州藩)의 부름으로 번에 출사해 병학 교육과 군비 실무를 맡았다. ' +
      '1863년 이후에는 번의 군사 부문인 무비국(武備局) 실무를 담당하며 번 전체의 군제를 ' +
      '손보기 시작한다.',
  },
  {
    title: '조슈 군제개혁 — 서양식 편제 전환',
    category: 'MILITARY',
    startYear: 1865, endYear: 1866,
    description:
      '금문의 변 패배와 1차 조슈 정벌로 무너진 번군을 서양식으로 다시 세웠다. 창·활 중심의 ' +
      '무사 편제를 미니에 소총 보병 중심으로 바꾸고, 신분을 섞은 제대(諸隊)를 정규 지휘 ' +
      '계통에 편입했다. 무기는 나가사키의 글로버 상회를 통해 사쓰마 명의로 들여왔다. ' +
      '이 시기 번의 명으로 이름을 "오무라 마스지로"로 바꾸고 사족이 되었다.',
  },
  {
    title: '제2차 조슈 정벌(사경 전쟁) 지휘',
    category: 'MILITARY',
    startYear: 1866, startMonth: 6, endYear: 1866, endMonth: 9,
    description:
      '막부가 네 방면에서 조슈를 친 이른바 사경 전쟁(四境戦争)에서 이시슈구치(石州口) 방면 ' +
      '지휘를 맡아 하마다번을 무너뜨리고 하마다성을 점령했다. 병력은 열세였지만 소총 사거리와 ' +
      '기동을 계산한 운용으로 압도했다. 막부군 패배를 결정지은 전역 중 하나이며, 그를 번 ' +
      '바깥에도 알린 계기가 되었다.',
  },
  {
    title: '교토 피습 — 기야마치 여관 습격',
    category: 'HEALTH',
    startYear: 1869, startMonth: 10, startDay: 8,
    description:
      '1869-10-08(메이지 2년 음력 9월 4일) 출장 중 머물던 교토 기야마치(木屋町)의 여관에서 ' +
      '조슈 출신 불평 사족 여덟 명에게 습격당해 이마와 오른쪽 무릎 등에 중상을 입었다. ' +
      '주모자는 조슈 번사 간자키 나오토(神代直人) 등으로, 번병 해체와 국민개병 구상이 ' +
      '무사 계급의 존재 이유를 지운다는 것이 동기였다. 근처에 있던 구스노키 마사토라 등의 ' +
      '도움으로 목숨은 건졌다.',
  },
  {
    title: '오사카 이송·오른다리 절단 수술',
    category: 'HEALTH',
    startYear: 1869, startMonth: 11,
    description:
      '상처가 악화되자 오사카로 옮겨져, 네덜란드인 군의 보드윈(A. F. Bauduin)의 집도로 ' +
      '오른쪽 다리를 절단했다. 그러나 이미 퍼진 감염을 되돌리지 못했다. 수술 시점은 이송 후 ' +
      '11월 중으로 전해지며 날짜는 자료마다 다르다.',
  },
  {
    title: '야스쿠니 신사 동상 건립',
    category: 'AWARD',
    startYear: 1893, startMonth: 6,
    description:
      '사후 24년 만에 도쿄 구단자카 야스쿠니 신사 경내에 그의 동상이 세워졌다. 오쿠마 우지히로 ' +
      '제작으로, 일본 최초의 서양식 근대 동상으로 꼽힌다. 우에노 방면을 바라보는 자세는 ' +
      '1868년 우에노 전쟁을 가리킨다.',
  },
]

const BIOGRAPHY =
  '조슈번 시골 의사의 아들로 태어나 난방의(蘭方医)·난학자로 출발해, 막부와 조슈 양쪽에서 서양 ' +
  '병학을 가르친 끝에 보신 전쟁 신정부군의 작전을 총괄하고 초대 병부대보로서 근대 일본 육군의 ' +
  '골격을 설계한 인물. 칼을 쥔 적이 거의 없는 기술 관료가 유신의 군사를 지휘했다는 점에서 ' +
  '막말·메이지 인물군 가운데 가장 이질적인 경력을 가졌다.\n\n' +
  '1824-05-30(분세이 7년 음력 5월 3일) 스오국 요시키군 스젠지촌(周防国吉敷郡鋳銭司村, 현 ' +
  '야마구치현 야마구치시 스젠지)에서 촌의(村医) 무라타 다카마사(村田孝益)의 아들로 태어났다. ' +
  '본명은 무라타 조로쿠(村田蔵六). 1842년 분고 히타의 간기엔에서 한학을, 1844년부터 오사카 ' +
  '오가타 고안의 데키주쿠에서 난학과 서양의학을 배워 숙두(塾頭)에 올랐고, 나가사키 유학을 거쳐 ' +
  '고향에서 의사로 개업했다.\n\n' +
  '전환은 1853년 페리 내항 직후 우와지마번의 초빙이었다. 번주 다테 무네나리 아래에서 네덜란드어 ' +
  '문헌을 풀어 국산 증기선 제작과 해안 포대 설계를 지도하면서, 그의 네덜란드어 능력은 의학이 ' +
  '아니라 군사·공학 쪽에서 값이 매겨지기 시작했다. 1856년 에도로 올라가 사숙 구주쿠도를 열고, ' +
  '곧 막부의 반쇼시라베쇼 교수 보좌와 강무소 교수로 서양 병학을 강의했다. 막부가 먼저 그를 ' +
  '고용했다는 사실은 뒷날의 이력과 겹쳐 자주 언급된다.\n\n' +
  '1860년 고향 번인 조슈로 돌아가 무비국 실무를 맡았고, 금문의 변과 1차 조슈 정벌로 번군이 ' +
  '무너진 뒤 군제를 전면 개편했다. 창·활을 쥔 무사 편제를 미니에 소총 보병 중심으로 바꾸고, ' +
  '농민·조닌이 섞인 제대(諸隊)를 정규 지휘 계통 안에 넣었다. 무기는 나가사키 글로버 상회를 ' +
  '통해 사쓰마 명의로 조달했다. 이 시기 번의 명으로 이름을 오무라 마스지로로 바꾸고 사족이 ' +
  '되었으며, 1866년 제2차 조슈 정벌(사경 전쟁)에서 이시슈구치 방면을 맡아 하마다성을 함락시켜 ' +
  '개혁의 효과를 실전으로 증명했다.\n\n' +
  '1868년 정체서 체제에서 군무관 판사에 기용되어 보신 전쟁 후반을 지휘했다. 대표적 사례가 ' +
  '1868-07-04 우에노 전쟁으로, 간에이지에 농성한 쇼기타이를 혼고 대지의 암스트롱포 화력과 ' +
  '한쪽 퇴로를 열어 두는 배치로 하루 만에 궤멸시켰다. 이어 오우에쓰 열번동맹 공략의 전체 ' +
  '구도를 짰다. 숫자와 화력으로 전장을 계산하는 그의 방식은, 무사의 기개로 싸우던 동시대 ' +
  '지휘관들과 뚜렷이 대비되어 반감도 함께 샀다.\n\n' +
  '1869-08-15 직원령으로 병부성이 설치되자 초대 병부대보에 올랐다. 병부경은 황족이었으므로 ' +
  '군사 정책의 실권자는 그였다. 그가 밀어붙인 것은 (1)각 번의 사병 해체 (2)신분과 무관한 ' +
  '국민개병 (3)오사카를 축으로 한 병학료·조병소 배치였다. 세 가지 모두 사족의 군사 독점을 ' +
  '끝내는 방향이었고, 유신을 이룬 당사자인 조슈 사족들에게는 배신으로 읽혔다.\n\n' +
  '1869-10-08 교토 기야마치의 여관에서 조슈 출신 불평 사족 여덟 명에게 습격당해 중상을 입고, ' +
  '오사카로 옮겨져 오른쪽 다리를 절단했으나 패혈증으로 1869-12-07(메이지 2년 음력 11월 5일) ' +
  '사망했다. 향년 45세, 병부대보 취임 넉 달 만이었다. 그가 남긴 구상은 야마가타 아리토모가 ' +
  '이어받아 1873년 징병령으로 제도화되었고, 1893년 야스쿠니 신사에 일본 최초의 서양식 동상이 ' +
  '세워지며 "일본 육군의 아버지"라는 평가가 굳어졌다.'

const STATS = {
  politics: 62,
  military: 92,
  diplomacy: 45,
  intellect: 96,
  charisma: 38,
  administration: 88,
  notes:
    '군사 92 — 조슈 군제개혁과 사경 전쟁·우에노 전쟁을 설계·지휘해 실전으로 검증했다. ' +
    '지력 96 — 네덜란드어 병서를 직접 읽고 번역해 가르친 당대 최고 수준의 난학자이며, ' +
    '의학·조선·포술까지 넘나들었다. 행정 88 — 병부성 4개월 만에 번병 해체·국민개병·병학료 ' +
    '설치라는 근대 육군의 설계도를 제도 문서로 만들어 냈다. 정치 62 — 구상의 방향은 옳았으나 ' +
    '사족의 반발을 관리하지 못했다. 외교 45·매력 38 — 사교를 꺼리고 용건만 말하는 성격으로 ' +
    '적을 쉽게 만들었고, 그 반감이 결국 피습으로 이어졌다.',
}

/** 종료일 — 월/일이 없으면 그 해·그 달의 마지막 날로 채운다(Date 월 넘침 방지). */
function buildEndDate(year: number, month?: number, day?: number): Date {
  const monthIndex = (month ?? 12) - 1
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, day ?? lastDayOfMonth)
}

// ────────────────────────────────────────────────────────────────────────────
export async function seedOmuraMasujiro(prisma: PrismaService): Promise<void> {
  console.log('\n🎌 오무라 마스지로(大村益次郎) 시딩 시작...')

  const admin = await prisma.account.findUnique({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정 미존재 — 시딩 중단')
    return
  }

  const hcIdByName: Record<string, string> = {}
  for (const name of [HC_TOKUGAWA, HC_EMPIRE]) {
    const hc = await prisma.historicalCountry.findFirst({ where: { name }, select: { id: true } })
    if (!hc) {
      console.warn(`  ⚠️  "${name}" HC 미존재 — 시딩 중단`)
      return
    }
    hcIdByName[name] = hc.id
  }
  const japan = await prisma.country.findFirst({
    where: { isoCode: ISO_JAPAN },
    select: { id: true },
  })
  if (!japan) {
    console.warn('  ⚠️  현대 국가 일본(JP) 미존재 — 시딩 중단')
    return
  }

  // ── 관직 정의 + 스코프 ──────────────────────────────────────────────
  const definitionIdByTitle: Record<string, string> = {}
  for (const def of DEFINITIONS) {
    let definitionId: string
    const existingDef = await prisma.governmentPositionDefinition.findFirst({
      where: { title: def.title },
      select: { id: true },
    })
    if (existingDef) {
      definitionId = existingDef.id
      console.log(`  ⏭️  관직 정의 스킵: ${def.title}`)
    } else {
      const created = await prisma.governmentPositionDefinition.create({
        data: {
          title: def.title,
          titleEn: def.titleEn,
          titleLocal: def.titleLocal,
          positionType: def.positionType,
          rank: def.rank,
          description: def.description,
          isMonarchical: false,
          establishedDate: def.establishedDate,
          abolishedDate: def.abolishedDate,
        },
      })
      definitionId = created.id
      console.log(`  ✅ 관직 정의 생성: ${def.title} (${def.titleLocal})`)
    }
    definitionIdByTitle[def.title] = definitionId

    // 스코프 — 역사 우선 + 현대 dual-fill (레포 규약)
    const scopeTargets: { countryId?: string; historicalCountryId?: string }[] = [
      { historicalCountryId: hcIdByName[HC_EMPIRE] },
      { countryId: japan.id },
    ]
    for (const target of scopeTargets) {
      const exists = await prisma.governmentPositionDefinitionScope.findFirst({
        where: {
          definitionId,
          countryId: target.countryId ?? null,
          historicalCountryId: target.historicalCountryId ?? null,
        },
        select: { id: true },
      })
      if (exists) continue
      await prisma.governmentPositionDefinitionScope.create({
        data: {
          definitionId,
          countryId: target.countryId ?? null,
          historicalCountryId: target.historicalCountryId ?? null,
          localTitle: def.titleLocal,
          startEra: 'AD' as any,
          startYear: def.scopeStartYear,
          endEra: 'AD' as any,
          endYear: def.scopeEndYear,
          note: def.scopeNote,
        },
      })
      console.log(`    ✅ 스코프: ${def.title} → ${target.countryId ? '일본(현대)' : HC_EMPIRE}`)
    }
  }

  // ── Person ──────────────────────────────────────────────────────────
  const originalName = 'Omura Masujiro (大村益次郎)'
  let personId: string
  const existing = await prisma.person.findFirst({
    where: { originalName },
    select: { id: true, deathType: true, deathCause: true, deathNote: true },
  })
  if (existing) {
    personId = existing.id
    console.log(`  ⏭️  인물 스킵(기존): ${originalName}`)
  } else {
    const created = await prisma.person.create({
      data: {
        name: '마스지로',
        surname: '오무라',
        originalName,
        gender: 'MALE',
        nameDisplayOrder: 'korean' as any,
        biography: BIOGRAPHY,
        birthEra: 'AD' as any,
        birthDate: new Date(1824, 4, 30),
        birthDatePrecision: 'day',
        birthPlaceText:
          '스오국 요시키군 스젠지촌(周防国吉敷郡鋳銭司村) — 현 야마구치현 야마구치시 스젠지',
        birthNote:
          '촌의(村医) 무라타 다카마사의 아들. 음력 분세이 7년 5월 3일생으로, 무가가 아니라 ' +
          '의가(醫家) 출신이라는 점이 평생의 이력과 평가를 갈랐다.',
        deathEra: 'AD' as any,
        deathDate: new Date(1869, 11, 7),
        deathDatePrecision: 'day',
        deathPlaceText: '오사카 — 오사카부 의학교 병원(현 오사카시 주오구 일대)',
        deathType: DeathType.ASSASSINATION,
        deathCause: '교토 피습(1869-10-08) 부상 → 오른다리 절단 수술 후 패혈증 (향년 45세)',
        deathNote:
          '1869-10-08(메이지 2년 음력 9월 4일) 교토 기야마치의 여관에서 조슈 출신 불평 사족 ' +
          '여덟 명에게 습격당해 이마·오른쪽 무릎 등에 중상을 입었다. 주모자 간자키 나오토 등의 ' +
          '동기는 병부대보로서 그가 추진한 번병 해체·국민개병 구상이 무사 계급의 존재 이유를 ' +
          '지운다는 것이었다. 오사카로 이송되어 네덜란드인 군의 보드윈(A. F. Bauduin)의 집도로 ' +
          '오른쪽 다리를 절단했으나 이미 퍼진 감염을 막지 못하고 1869-12-07(음력 11월 5일) ' +
          '사망했다. 병부대보 취임 넉 달 만의 재임 중 사망이며, 사인은 직접적으로는 패혈증이나 ' +
          '통상 암살로 분류된다. 그의 군제 구상은 야마가타 아리토모가 이어받아 1873년 징병령으로 ' +
          '제도화되었고, 1893년 야스쿠니 신사 경내에 일본 최초의 서양식 동상이 세워졌다.',
        influence: 82,
        countryId: japan.id,
        historicalCountryId: hcIdByName[HC_EMPIRE],
        accountId: admin.id,
      },
    })
    personId = created.id
    console.log(`  ✅ 인물 생성: ${originalName} (id=${created.id})`)
  }

  // ── PersonStats ─────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId, accountId: admin.id },
    select: { id: true },
  })
  if (statsExists) {
    console.log('    ⏭️  능력치 스킵')
  } else {
    await prisma.personStats.create({ data: { personId, accountId: admin.id, ...STATS } })
    console.log('    ✅ 능력치 등록')
  }

  // ── PersonNickname ──────────────────────────────────────────────────
  for (const nick of NICKNAMES) {
    const nickExists = await prisma.personNickname.findFirst({
      where: { personId, nickname: nick.nickname },
      select: { id: true },
    })
    if (nickExists) continue
    await prisma.personNickname.create({
      data: {
        personId,
        nickname: nick.nickname,
        type: nick.type,
        reason: nick.reason,
        priority: nick.priority,
      },
    })
    console.log(`    ✅ 별칭: ${nick.nickname}`)
  }

  // ── PersonCountryAffiliation ────────────────────────────────────────
  for (const aff of AFFILIATIONS) {
    const historicalCountryId = aff.historicalCountryName
      ? hcIdByName[aff.historicalCountryName]
      : undefined
    const countryId = aff.countryIso === ISO_JAPAN ? japan.id : undefined
    if (!historicalCountryId && !countryId) continue
    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        affiliationType: aff.type as any,
      },
      select: { id: true },
    })
    if (affExists) continue
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        affiliationType: aff.type as any,
        startDate: aff.startYear ? new Date(aff.startYear, 0, 1) : undefined,
        endDate: aff.endYear ? new Date(aff.endYear, 11, 31) : undefined,
        priority: 0,
      },
    })
    console.log(`    ✅ 소속: ${aff.historicalCountryName ?? aff.countryIso} (${aff.type})`)
  }

  // ── GovernmentPositionTenure ────────────────────────────────────────
  for (const tenure of TENURES) {
    const definitionId = definitionIdByTitle[tenure.definitionTitle]
    const definition = DEFINITIONS.find((def) => def.title === tenure.definitionTitle)!
    const startDate = new Date(tenure.startYear, tenure.startMonth - 1, tenure.startDay)
    const endDate = tenure.endYear
      ? new Date(tenure.endYear, (tenure.endMonth ?? 1) - 1, tenure.endDay ?? 1)
      : undefined
    const tenureExists = await prisma.governmentPositionTenure.findFirst({
      where: { personId, title: tenure.definitionTitle, startDate },
      select: { id: true },
    })
    if (tenureExists) {
      console.log(`    ⏭️  재임 스킵: ${tenure.definitionTitle} (${tenure.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        positionDefinitionId: definitionId,
        positionType: definition.positionType,
        title: definition.title,
        titleEn: definition.titleEn,
        historicalCountryId: hcIdByName[tenure.historicalCountryName],
        startDate,
        startDatePrecision: null,
        endDate,
        appointmentMethod: tenure.appointmentMethod,
        appointmentDetail: tenure.appointmentDetail,
        endReason: tenure.endReason,
        endReasonDetail: tenure.endReasonDetail,
        notes: tenure.notes,
        accountId: admin.id,
      },
    })
    console.log(
      `    ✅ 재임: ${tenure.definitionTitle} (${tenure.startYear}~${tenure.endYear ?? '∞'})`,
    )
  }

  // ── PersonLifeEvent (연보) ──────────────────────────────────────────
  let sortOrder = 0
  for (const lifeEvent of LIFE_EVENTS) {
    sortOrder += 1
    const startDate = new Date(
      lifeEvent.startYear,
      (lifeEvent.startMonth ?? 1) - 1,
      lifeEvent.startDay ?? 1,
    )
    const startDatePrecision = lifeEvent.startDay ? 'day' : lifeEvent.startMonth ? 'month' : 'year'
    const endDate = lifeEvent.endYear
      ? buildEndDate(lifeEvent.endYear, lifeEvent.endMonth, lifeEvent.endDay)
      : undefined
    const endDatePrecision = lifeEvent.endYear
      ? lifeEvent.endDay
        ? 'day'
        : lifeEvent.endMonth
          ? 'month'
          : 'year'
      : undefined
    const lifeEventExists = await prisma.personLifeEvent.findFirst({
      where: { personId, title: lifeEvent.title },
      select: { id: true },
    })
    if (lifeEventExists) continue
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: lifeEvent.title,
        description: lifeEvent.description,
        category: lifeEvent.category,
        startDate,
        startDatePrecision,
        endDate,
        endDatePrecision,
        sortOrder,
        accountId: admin.id,
      },
    })
    console.log(`    ✅ 연보: ${lifeEvent.title} (${lifeEvent.startYear})`)
  }

  console.log('✅ 오무라 마스지로 시딩 완료\n')
}
