/**
 * 제1차 세계대전 인물 묶음(PersonGroup) 시드 — 7개 그룹
 *
 * ⚠️ 기존 데이터 보존 모드 — 같은 이름의 그룹이 이미 있으면 재사용만 하고 필드를 덮어쓰지
 *    않는다(UI 편집 보호). 멤버십은 (그룹, 인물) 쌍이 없을 때만 추가하므로, 아직 등록되지
 *    않은 인물은 건너뛰었다가 나중에 인물이 생기면 재실행으로 백필된다.
 *
 * 설계 원칙 — "실재 집합 우선, 편의 버킷은 최소":
 *  1) 문서·기관으로 경계가 확정되는 집합(연명서한 서명자·대신회의·스타프카·대사단)을 우선한다.
 *  2) 재구성한 진영(친정 지지)은 그렇다고 description에 명시한다.
 *  3) 국가별 "전시 지도부" 같은 편의 버킷은 실재 집합이 하나도 없고 재임 데이터로 잡히지
 *     않는 인물(조프르: 재임 0건)이 있을 때만 예외로 만들고 sortOrder를 90대로 낮춘다.
 *  4) 등록 인물이 2명 미만이면 그룹을 만들지 않는다 — 독일(빌헬름 2세·폰 클루크는 층위
 *     불일치)·세르비아·이탈리아 단독 인물, 일본 원로(등록 내용에 WWI 근거 0건)는 제외.
 *
 * 필드 규약(조사 결과 반영):
 *  - accountId = null: PersonGroupService 주석이 "accountId가 null인(시드·공유) 묶음은
 *    누구나 편집 가능 — 협업 카탈로그"로 규정한다. 시드 산출물이므로 null이 정본.
 *  - countryId = null: 기존 3개 그룹 전부 null이고, PersonGroup에는 역사국가 FK가 없어
 *    1914년 집단에 현대 국가를 박으면 시대착오다(「이 나라의 집단」 블록도 미배선 상태).
 *  - generationOrder·centerPersonId 미사용: GENERATION이 아닌 그룹에서 상세 화면 저장 시
 *    generationOrder가 강제로 null이 되므로 넣어봐야 소실된다.
 *  - roleLabel(VarChar 100)이 화면에 렌더되는 유일한 멤버 필드다(note는 UI 미표시) —
 *    드레퓌스파 선례처럼 "직책 — 근거 한 줄" 형식으로 적고, 상세 서술은 note에 둔다.
 *
 * 의존: 인물 시드들(danilov·yanushkevich·goremykin·bark·sazonov·buchanan·paleologue·
 *       krivoshein·sukhomlinov + 러시아/프로이센 군주·프랑스 인물). 없는 인물은 warn 후 스킵.
 */
import { PersonGroupType } from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 조회 키 ─────────────────────────────────────────────────────────────
/**
 * originalName 부분일치가 기본. 빌헬름 2세는 originalName이 NULL이고 동명 호엔촐레른이
 * 여럿이라 이름+성+출생연도로 특정한다.
 */
type PersonKey =
  | { kind: 'originalName'; value: string }
  | { kind: 'nameBirthYear'; name: string; surname: string; birthYear: number }

const PERSON_KEYS = {
  nicholasII: { kind: 'originalName', value: 'Nicholas II of Russia' },
  wilhelmII: { kind: 'nameBirthYear', name: '빌헬름', surname: '호엔촐레른', birthYear: 1859 },
  alexandra: { kind: 'originalName', value: 'Alexandra Fyodorovna of Russia (Nicholas II)' },
  goremykin: { kind: 'originalName', value: 'Ivan Logginovich Goremykin' },
  sazonov: { kind: 'originalName', value: 'Sergey Dmitrievich Sazonov' },
  bark: { kind: 'originalName', value: 'Pyotr Lvovich Bark' },
  krivoshein: { kind: 'originalName', value: 'Alexander Vasilyevich Krivoshein' },
  sukhomlinov: { kind: 'originalName', value: 'Vladimir Alexandrovich Sukhomlinov' },
  grigorovich: { kind: 'originalName', value: 'Ivan Konstantinovich Grigorovich' },
  berchtold: { kind: 'originalName', value: 'Leopold Graf Berchtold' },
  pasic: { kind: 'originalName', value: 'Nikola Pašić' },
  apis: { kind: 'originalName', value: 'Dragutin Dimitrijević' },
  tisza: { kind: 'originalName', value: 'Tisza István' },
  conrad: { kind: 'originalName', value: 'Conrad von Hötzendorf' },
  yanushkevich: { kind: 'originalName', value: 'Nikolai Nikolaevich Yanushkevich' },
  danilov: { kind: 'originalName', value: 'Yuri Nikiforovich Danilov' },
  grey: { kind: 'originalName', value: 'Edward Grey' },
  buchanan: { kind: 'originalName', value: 'Buchanan' },
  paleologue: { kind: 'originalName', value: 'Maurice Paléologue' },
  poincare: { kind: 'originalName', value: 'Poincaré' },
  clemenceau: { kind: 'originalName', value: 'Clemenceau' },
  joffre: { kind: 'originalName', value: 'Joffre' },
  gallieni: { kind: 'originalName', value: 'Joseph Simon Gallieni' },
  petain: { kind: 'originalName', value: 'Philippe Bénoni Omer Joseph Pétain' },
} satisfies Record<string, PersonKey>

type PersonSlug = keyof typeof PERSON_KEYS

// ── 그룹 명세 ────────────────────────────────────────────────────────────────
interface MemberSpec {
  person: PersonSlug
  /** 화면에 렌더되는 유일한 멤버 필드 (VarChar 100) */
  roleLabel: string
  /** 상세 맥락 — 현재 UI 미표시, API·후속 지면용 */
  note: string
}

interface GroupSpec {
  name: string
  type: PersonGroupType
  sortOrder: number
  description: string
  members: MemberSpec[]
}

const GROUPS: GroupSpec[] = [
  {
    name: '1914년 7월 위기의 결정자들',
    type: PersonGroupType.OTHER,
    sortOrder: 5,
    description:
      '1914년 6월 28일 사라예보 암살에서 8월 4일 영국 참전까지, 유럽을 전쟁으로 몰고 간 ' +
      '다섯 주의 의사결정에 관여한 인물들. 진영을 가리지 않고 "누가 무엇을 결정했는가"로 ' +
      '묶은 큐레이션 집합이며, 당대에 이런 이름의 조직이 있었던 것은 아니다. ' +
      '위기를 시작한 오스트리아-헝가리 쪽은 외무장관 베르히톨트가 등록되며 채워졌으나, ' +
      '독일 재상 베트만홀베크, 영국 총리 애스퀴스 등은 아직 인물로 등록되지 않았다.',
    members: [
      {
        person: 'apis',
        roleLabel: '세르비아 참모본부 정보부장 — 암살자들의 무기·월경 통로를 댄 정보망 책임자',
        note:
          '암살에 쓰인 수류탄과 브라우닝 권총은 크라구예바츠 조병창에서 나왔고 국경을 넘은 ' +
          '통로는 그의 정보부가 운용하던 «터널»이었다. 직접 지시 여부는 지금도 쟁점이며, ' +
          '1917년 솔룬 재판의 «내가 조직했다» 자백을 학계는 액면 그대로 받아들이지 않는다.',
      },
      {
        person: 'berchtold',
        roleLabel: '오스트리아-헝가리 외무장관 — 최후통첩(7/23)·선전포고(7/28) 당사자',
        note:
          '사라예보 이틀 뒤 군사적 결판을 결심하고 호요스를 베를린에 보내 «백지수표»를 받아낸 ' +
          '뒤, 48시간 시한의 최후통첩을 밀어붙이고 선전포고 전보에 서명했다. 1913년 콘라트의 ' +
          '개전 요구를 스물다섯 차례 물리쳤던 사람이 1914년 7월에는 스스로 주전파의 선두에 ' +
          '섰다는 점이 이 인물 평가의 핵심 난점이다.',
      },
      {
        person: 'conrad',
        roleLabel: '오스트리아-헝가리 참모총장 — 즉시 개전 요구, 다만 «7/25 이전 불가» 통보',
        note:
          '1913년 한 해에만 대세르비아 개전을 스물다섯 차례 요구했던 그는 사라예보 직후에도 ' +
          '즉시 동원을 밀어붙였다 — «발뒤꿈치에 독사가 있으면 머리를 밟는 것이지 물릴 때까지 ' +
          '기다리지 않는다». 정작 부대 다수가 추수 휴가 중이라 7월 14일 «가장 이른 개전은 ' +
          '25일»이라고 스스로 못박았고, 27일에는 군 준비를 이유로 8월 12일까지 미루자 해 ' +
          '베르히톨트와 갈렸다. 그를 막던 유일한 제동장치 프란츠 페르디난트가 바로 그 ' +
          '암살로 사라진 것이 이 위기의 구조적 조건이다.',
      },
      {
        person: 'pasic',
        roleLabel: '세르비아 총리 — 최후통첩 수신·회답 전달(7/25 17:55)',
        note:
          '유세차 지방에 있다 섭정의 명으로 급히 돌아와 회답을 만들었고, 총동원 발령 세 시간 ' +
          '뒤 시한 5분 전에 직접 기슬 공사에게 건넸다 — 아무도 그 일을 맡으려 하지 않았기 ' +
          '때문이다. 사라예보 음모를 사전에 어디까지 알았는지는 지금도 사학사의 쟁점이다.',
      },
      {
        person: 'tisza',
        roleLabel: '헝가리 총리 — 7/7 각의에서 홀로 개전 반대, 7/14 병합 배제 조건으로 선회',
        note:
          '러시아 개입과 루마니아 이탈을 예측하고 세르비아 «정부»의 관여 증거가 없다는 점을 들어 ' +
          '반대했으나, 가장 근본적인 동기는 영토 병합이 슬라브 인구를 늘려 마자르 우위를 흔든다는 ' +
          '계산이었다. 반대는 평화주의가 아니라 헝가리 이익 계산이었고, 조건을 얻자 찬성으로 돌아섰다.',
      },
      {
        person: 'nicholasII',
        roleLabel: '러시아 황제 — 총동원령 재가·철회·재재가(7/29~30)',
        note:
          '부분동원과 총동원 사이에서 하루 사이에 결정을 뒤집었고, 최종적으로 총동원을 재가해 ' +
          '독일의 최후통첩을 불렀다.',
      },
      {
        person: 'wilhelmII',
        roleLabel: '독일 황제 — 오스트리아에 «백지수표»(7/5), 뒤늦은 중재 시도',
        note:
          '7월 5일 오스트리아-헝가리에 무조건 지원을 약속했고, 세르비아 회답을 보고 뒤늦게 ' +
          '«베오그라드에서 멈춰라» 중재를 시도했으나 군 동원 논리를 되돌리지 못했다.',
      },
      {
        person: 'sazonov',
        roleLabel: '러시아 외무장관 — 부분동원 불가론으로 총동원 진언(7/30)',
        note:
          '참모본부와 함께 부분동원이 기술적으로 불가능하다는 논리로 황제를 설득해 총동원 ' +
          '재가를 얻어냈다. 연보에 «7월 위기 총동원 진언»으로 등록돼 있다.',
      },
      {
        person: 'grey',
        roleLabel: '영국 외무장관 — 4국 회의 중재 제안, 참전 의사 명확화 실패',
        note:
          '열강 4국 회의를 통한 조정을 제안했으나 독일이 거부했고, 영국의 참전 의사를 개전 ' +
          '전에 분명히 밝히지 않은 것이 억지 실패의 요인이었다는 비판이 오래 따랐다.',
      },
      {
        person: 'poincare',
        roleLabel: '프랑스 대통령 — 7월 방러 정상외교로 동맹 결속 확인',
        note:
          '7월 20~23일 상트페테르부르크를 국빈 방문해 러시아와의 동맹을 재확인했고, 귀국 ' +
          '항해 중 위기가 폭발했다.',
      },
      {
        person: 'paleologue',
        roleLabel: '주러시아 프랑스 대사 — 지지 확약·총동원 보고 지연 논쟁',
        note:
          '사조노프에게 프랑스의 무조건 지지를 확약했고, 러시아 총동원의 진행을 파리에 ' +
          '신속히 알리지 않았다는 점이 개전 책임 논쟁의 쟁점이다.',
      },
      {
        person: 'buchanan',
        roleLabel: '주러시아 영국 대사 — 페트로그라드 3자 회동의 영국 축',
        note: '사조노프·팔레올로그와의 3자 회동으로 협상국 공동 대응을 조율했다.',
      },
    ],
  },
  {
    name: '1915년 8월 각료 연명서한 서명자',
    type: PersonGroupType.FACTION,
    sortOrder: 10,
    description:
      '1915년 8월 21일(구력) 니콜라이 2세의 총사령관 친정에 반대해 여덟 각료가 연명으로 ' +
      '올린 서한의 서명자 명부. 문서 한 장으로 경계가 확정되는 실재 집합이며, 이 아카이브에는 ' +
      '8인 중 3인이 등록돼 있다(미등록: 폴리바노프·셰르바토프·사마린·이그나티예프·샤홉스코이). ' +
      '서한의 표적이던 총리 고레미킨은 서명자가 아니므로 이 묶음에 들지 않는다 — 반대편은 ' +
      '「1915년 8월 총사령관 친정 지지 진영」을 보라. 황제는 서명 각료들을 순차 해임했다.',
    members: [
      {
        person: 'krivoshein',
        roleLabel: '토지정비·농업총국 장관 — 반대 각료 다수파를 조직한 사실상 리더',
        note:
          '두마 진보블록과의 협력을 주장하며 각의 다수파를 이끌었고, 그해 11월 해임되어 ' +
          '적십자 총전권대표로 밀려났다.',
      },
      {
        person: 'sazonov',
        roleLabel: '외무장관 — 서명 이듬해(1916-07) 해임으로 대가를 치름',
        note: '동맹국의 대러 신인도 붕괴를 근거로 서명했다.',
      },
      {
        person: 'bark',
        roleLabel: '재무장관 — 서명 각료 중 드물게 1917년 2월혁명까지 유임',
        note: '전비 조달 책임자로서 서명했으나 재무 실무의 대체 불가능성 덕에 자리를 지켰다.',
      },
    ],
  },
  {
    name: '1915년 8월 총사령관 친정 지지 진영',
    type: PersonGroupType.FACTION,
    sortOrder: 20,
    description:
      '연명서한의 반대편. 서명 명부처럼 문서로 확정되는 집합이 아니라 각의 기록과 궁정 ' +
      '서한으로 재구성한 진영이라 앞 그룹보다 경계가 무르다는 점을 밝혀 둔다. 두 사람 모두 ' +
      '같은 사안에서 황제의 친정을 실제로 밀었고, 그 결과 서명 각료들이 순차 해임되었다. ' +
      '라스푸틴·시튜르머 등이 등록되면 그대로 확장되는 열린 집합이다.',
    members: [
      {
        person: 'goremykin',
        roleLabel: '총리(각의 의장) — 각료 다수의 반대 전달을 거부, 서한의 표적',
        note:
          '«황제의 명령은 법»이라며 홀로 황제 편에 섰고, 각료들의 연명 행동을 항명으로 ' +
          '규정했다. 그 대가로 두마와의 관계가 파탄나 1916년 2월 해임된다.',
      },
      {
        person: 'alexandra',
        roleLabel: '황후 — 라스푸틴의 축복을 근거로 남편의 친정을 촉구',
        note:
          '전선의 남편에게 보낸 서한들로 친정을 재촉했고, 이후 반대 각료 해임의 배후로 ' +
          '지목되며 후방 통치의 상징이 되었다.',
      },
    ],
  },
  {
    name: '스타프카(러시아군 최고사령부) 수뇌 1914~1917',
    type: PersonGroupType.OTHER,
    sortOrder: 30,
    description:
      '개전기 러시아군 최고사령부(스타프카)의 수뇌진. ⚠️ 세 사람이 동시에 함께 근무한 적은 ' +
      '없다 — 1915년 9월 니콜라이 2세의 친정 개시가 곧 야누시케비치·다닐로프가 물러난 ' +
      '날이라, 이 묶음은 한 팀이 아니라 교대선을 사이에 둔 두 진(陣)이다. 초대 총사령관 ' +
      '니콜라이 니콜라예비치 대공과 후임 참모장 알렉세예프가 미등록이라 승계 축이 반쪽이다. ' +
      '2기 인물이 2명 이상 등록되면 1기·2기로 쪼개 predecessorGroupId로 잇는 것이 정석이다.',
    members: [
      {
        person: 'nicholasII',
        roleLabel: '최고총사령관(1915-09~1917-03) — 친정으로 직접 지휘를 떠맡음',
        note:
          '대공을 캅카스로 보내고 스스로 총사령관이 되면서 전선의 패배가 곧 황제 개인의 ' +
          '책임이 되었다 — 2월혁명 퇴위의 원인 중 하나로 꼽힌다.',
      },
      {
        person: 'yanushkevich',
        roleLabel: '참모장(1914-08~1915-08) — 작전을 병참감에게 위임한 명목상 참모장',
        note:
          '야전 참모 경험이 없는 관방 관료 출신으로 전략을 다닐로프에게 넘겼고, 1915년 ' +
          '대퇴각기 전선지대 강제추방 정책에 이름이 결부되어 있다.',
      },
      {
        person: 'danilov',
        roleLabel: '병참감(1914-08~1915-09) — 1기 스타프카의 실질 작전 두뇌',
        note:
          '동원계획 19호의 저자로서 개전 작전을 지도했다. 참모장과 같은 교대에서 함께 ' +
          '교체되어 제25군단장으로 내려갔다.',
      },
    ],
  },
  {
    name: '러시아 제국 대신회의 — 전시 각의 1914~1917',
    type: PersonGroupType.OTHER,
    sortOrder: 35,
    description:
      '전시 러시아의 내각(대신회의). 기관과 직위로 멤버십이 확정되는 실재 집합이지만, ' +
      '재임 시기가 서로 달라 전원이 한자리에 있던 순간은 없다(수호믈리노프는 1915년 6월 ' +
      '해임, 고레미킨은 1916년 2월 교체). 「1915년 8월 각료 연명서한 서명자」는 이 각의 안의 ' +
      '부분집합이다 — 평면 구조라 포함 관계를 링크로 표현할 수 없어 여기 적어 둔다.',
    members: [
      {
        person: 'goremykin',
        roleLabel: '의장(총리, 1914-02~1916-02) — 두마와 각의 다수파 모두와 대립',
        note: '74세의 재기용으로 개전기 정부를 이끌었고 각의 내부의 고립을 자초했다.',
      },
      {
        person: 'sukhomlinov',
        roleLabel: '전쟁장관(~1915-06) — «포탄 기근» 책임으로 해임·반역 혐의 기소',
        note:
          '개전기 육군을 총괄한 최고 책임자로, 해임 뒤 반역 혐의로 기소되어 1917년 유죄 ' +
          '판결을 받았다. 제국사에서 형사 유죄판결을 받은 유일한 전쟁장관.',
      },
      {
        person: 'sazonov',
        roleLabel: '외무장관(1910~1916) — 협상국 외교의 러시아 축',
        note: '콘스탄티노플 협정·사이크스-피코 러시아 축을 담당했다.',
      },
      {
        person: 'bark',
        roleLabel: '재무장관(1914~1917) — 금주 재정·전쟁공채·연합국 차관',
        note: '주세 세입을 끊은 전시 금주령의 공백을 차입과 증세로 메웠다.',
      },
      {
        person: 'krivoshein',
        roleLabel: '토지정비·농업총국 장관(1908~1915) — 각의 최유력 각료',
        note: '스톨리핀 개혁의 집행 총책이자 각의 다수파의 리더였다.',
      },
      {
        person: 'grigorovich',
        roleLabel: '해군장관(1911~1917) — «장관 뜀뛰기»를 끝까지 살아남은 두 사람 중 하나',
        note:
          '쓰시마 이후의 함대 재건을 두마 표결로 관철한 각료로, 수호믈리노프와 달리 의회의 ' +
          '신임을 잃지 않았다. 2월 혁명 때 제정 각료 대부분이 구금된 가운데 체포되지 않았다.',
      },
    ],
  },
  {
    name: '페트로그라드 주재 협상국 대사단 1914~1917',
    type: PersonGroupType.OTHER,
    sortOrder: 40,
    description:
      '전시 페트로그라드에 주재한 협상국 대사들. 상설 조직은 아니지만 연합국 회의와 공동 ' +
      '진언을 실제로 함께 수행한 전시 협의체다(1917년 1월 페트로그라드 연합국 회의가 대표 ' +
      '사례). 이탈리아 대사 카를로티 등은 미등록. 런던·파리의 본부 장관은 대사가 아니므로 ' +
      '포함하지 않는다 — 넣는 순간 "대러 외교에 관여한 사람들"이라는 편의 버킷이 된다.',
    members: [
      {
        person: 'paleologue',
        roleLabel: '주러시아 프랑스 대사(1914-01~1917-05) — 7월 위기 지지 확약의 당사자',
        note:
          '궁정과 사교계에 깊이 밀착해 관찰 기록을 남겼고, 2월혁명 후 구체제와 지나치게 ' +
          '동일시된 인물로 소환되었다.',
      },
      {
        person: 'buchanan',
        roleLabel: '주러시아 영국 대사(1910-11~1918-01) — 황제에게 개혁을 직접 진언(1917-01)',
        note:
          '대사단 중 유일하게 2월혁명 이후까지 남아 임시정부 승인과 로마노프 망명 문제를 ' +
          '다루었다.',
      },
    ],
  },
  {
    name: '프랑스 제3공화국 전시 지도부 1914~1920',
    type: PersonGroupType.OTHER,
    sortOrder: 90,
    description:
      '⚠️ 실재한 조직이 아니라 편의상 분류다 — 푸앵카레와 클레망소는 서로 혐오했고, ' +
      '클레망소는 1914년 신성동맹 내각 참여를 거부했으며, 조프르는 1916년 말 경질됐다. ' +
      '그럼에도 묶은 이유는 프랑스 등록 인물에 문서로 확정되는 실재 집합이 하나도 없고, ' +
      '특히 조프르는 재임 기록이 0건이라 재임 기반 화면에 전혀 잡히지 않기 때문이다. ' +
      '실재 집합 그룹들과 구분되도록 정렬 순서를 뒤로 두었다.',
    members: [
      {
        person: 'poincare',
        roleLabel: '대통령(1913~1920) — 전쟁 전 기간을 관통한 유일한 축',
        note: '"신성한 단결"을 호소했고 1917년 정적 클레망소를 총리로 기용했다.',
      },
      {
        person: 'clemenceau',
        roleLabel: '총리 겸 육군장관(1917-11~1920-01) — 「끝까지 싸운다」의 마지막 국면',
        note: '패배주의를 숙청하고 전쟁을 승리로 끌고 갔으며 파리 강화회의를 주재했다.',
      },
      {
        person: 'joffre',
        roleLabel: '총사령관(1914~1916) — 마른 전투의 승자, 베르됭 이후 경질',
        note:
          '개전기 프랑스군을 지휘해 마른에서 독일의 슐리펜 계획을 좌절시켰다. 병사들은 ' +
          '그를 "파파 조프르"라 불렀다.',
      },
      {
        person: 'gallieni',
        roleLabel: '파리 군사총독(1914)·육군장관(1915~16) — 클루크의 측면 노출을 먼저 포착',
        note:
          '9월 3일 독일 제1군의 측면 노출을 파악하고 총사령부 지시 없이 제6군에 출동을 명한 뒤 ' +
          '조프르를 전화로 설득했다. 다만 전 전선 반격의 구상과 결단은 조프르의 것이라는 것이 ' +
          '현재 학계의 정리다. 1911년 총사령관직을 고사하며 조프르를 지지한 것도 그였다.',
      },
      {
        person: 'petain',
        roleLabel: '총사령관(1917~1918) — 베르됭 방어와 항명 수습으로 무너진 군을 재건',
        note:
          '니벨 공세 참패 후 총사령관이 되어 항명을 처벌과 처우 개선의 병행으로 수습하고 ' +
          '제한 목표 전략으로 전환했다. 훗날 비시 정권의 수반이 되어 대독 협력을 국책으로 ' +
          '선언하지만, 이 묶음이 다루는 것은 1914~18년의 전시 지도부다.',
      },
      {
        person: 'paleologue',
        roleLabel: '주러시아 대사(1914~1917) — 프랑스의 대러 외교 축',
        note: '동부전선을 붙들어 두는 것이 그의 임무였고, 그 신념이 7월 위기 논쟁을 낳았다.',
      },
    ],
  },
]

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedWorldWarOnePersonGroups(prisma: PrismaService): Promise<void> {
  console.log('\n🎗️  제1차 세계대전 인물 묶음 시딩 시작 (기존 데이터 보존 모드)...')

  // 인물 슬러그 → id 해석 (없으면 warn 후 해당 멤버만 건너뛴다)
  const personIdBySlug = new Map<PersonSlug, string>()
  for (const [slug, key] of Object.entries(PERSON_KEYS) as [PersonSlug, PersonKey][]) {
    const found =
      key.kind === 'originalName'
        ? await prisma.person.findFirst({
            where: { originalName: { contains: key.value } },
            select: { id: true },
          })
        : await prisma.person.findFirst({
            where: {
              name: key.name,
              surname: key.surname,
              birthDate: {
                gte: new Date(key.birthYear, 0, 1),
                lt: new Date(key.birthYear + 1, 0, 1),
              },
            },
            select: { id: true },
          })
    if (found) {
      personIdBySlug.set(slug, found.id)
    } else {
      console.warn(`  ⚠️  인물 미등록 — 멤버 건너뜀: ${slug} (나중에 등록되면 재실행으로 백필)`)
    }
  }

  for (const spec of GROUPS) {
    // 그룹 — 이름 기반 멱등. 있으면 필드를 덮어쓰지 않는다(UI 편집 보호).
    let groupId: string
    const existing = await prisma.personGroup.findFirst({
      where: { name: spec.name },
      select: { id: true },
    })
    if (existing) {
      groupId = existing.id
      console.log(`  ⏭️  묶음 이미 존재: ${spec.name}`)
    } else {
      const created = await prisma.personGroup.create({
        data: {
          name: spec.name,
          type: spec.type,
          description: spec.description,
          sortOrder: spec.sortOrder,
          // 시드·공유 카탈로그 = accountId null (서비스 소유권 규약). countryId는 역사 집단이라 비움.
          accountId: null,
          countryId: null,
        },
        select: { id: true },
      })
      groupId = created.id
      console.log(`  ✅ 묶음 생성: ${spec.name} [${spec.type}]`)
    }

    // 멤버십 — 선재 그룹이어도 여기까지 내려와 누락 멤버가 백필된다.
    let added = 0
    let skipped = 0
    for (const [index, member] of spec.members.entries()) {
      const personId = personIdBySlug.get(member.person)
      if (!personId) {
        skipped++
        continue
      }
      const already = await prisma.personGroupMembership.findFirst({
        where: { groupId, personId },
        select: { id: true },
      })
      if (already) {
        skipped++
        continue
      }
      await prisma.personGroupMembership.create({
        data: {
          groupId,
          personId,
          roleLabel: member.roleLabel,
          note: member.note,
          sortOrder: index * 10,
        },
      })
      added++
    }
    const total = await prisma.personGroupMembership.count({ where: { groupId } })
    console.log(`     멤버 ${total}명 (신규 ${added} · 스킵 ${skipped})`)
  }

  console.log('✅ 제1차 세계대전 인물 묶음 시딩 완료\n')
}
