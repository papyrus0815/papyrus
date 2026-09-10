/**
 * 주요 조약 코어 시드 — 16~20세기 대표 조약 14건.
 *
 * ## 배경
 * `Treaty` 도메인은 스키마·API·화면이 모두 갖춰져 있었는데 실DB는 0행이었다.
 * 그래서 국가 대시보드의 「조약」 축은 전 국가 0으로 보였고, 조약 탭·카탈로그는
 * 항상 빈 화면이었다. 이 시드가 그 바닥을 채운다.
 *
 * ## 규약
 * - **기존 데이터 보존 모드**: 같은 이름 + 같은 서명일 조약이 이미 있으면 통째로 스킵한다.
 *   (사용자가 손본 조약을 덮어쓰지 않는다 — 재실행 멱등)
 * - **서명국은 역사국가 우선**: 1919년 독일은 '독일'(현대)이 아니라 '바이마르 공화국'이다.
 *   해당 시점에 역사국가 행이 없는 나라(미국)만 현대 국가 FK를 쓴다.
 *   `TreatySignatory`는 두 FK를 동시에 갖지 못한다(컨트롤러 XOR 검증).
 * - **없는 국가는 그 서명국만 건너뛴다**: 시드 전체를 실패시키지 않고 경고만 남긴다.
 *   역사국가 목록은 세션마다 늘어나므로, 한 나라가 없다고 조약 13건이 통째로 빠지면 손해다.
 * - **연도 하한**: 여기 실린 조약은 전부 AD 1500년 이후다. mariadb DATETIME이 연도 100 미만을
 *   손상시키는 문제(세션 메모리 참고)와 무관하다 — 고대 조약을 추가한다면 그때 구조화 필드가 필요하다.
 */
import { PrismaService } from '../prisma.service'

type TreatyTypeName =
  | 'NON_AGGRESSION'
  | 'ALLIANCE'
  | 'TRADE'
  | 'TERRITORIAL'
  | 'PEACE'
  | 'FRIENDSHIP'
  | 'DISARMAMENT'
  | 'BORDER'
  | 'SECRET'
  | 'MULTILATERAL'
  | 'OTHER'

interface SignatorySpec {
  /** 역사국가 이름 (historical_country.name과 정확히 일치해야 함) */
  historical?: string
  /** 현대 국가 이름 — 그 시점에 대응하는 역사국가 행이 없을 때만 */
  modern?: string
  /** 서명자 직책 (자유 입력) */
  role?: string
  participationType?:
    | 'SIGNATORY'
    | 'GUARANTOR'
    | 'MEDIATOR'
    | 'RATIFIER'
    | 'OBSERVER'
  note?: string
}

interface TermSpec {
  title: string
  content: string
  isSecret?: boolean
}

interface TreatySpec {
  name: string
  alias?: string
  type: TreatyTypeName
  /** YYYY-MM-DD */
  signDate: string
  effectiveDate?: string
  expiryDate?: string
  violationDate?: string
  violationReason?: string
  location?: string
  summary: string
  background?: string
  aftermath?: string
  signatories: SignatorySpec[]
  terms?: TermSpec[]
}

const TREATIES: TreatySpec[] = [
  {
    name: '베스트팔렌 조약',
    alias: '베스트팔렌 평화',
    type: 'PEACE',
    signDate: '1648-10-24',
    location: '신성로마제국 베스트팔렌 — 뮌스터·오스나브뤼크',
    summary:
      '30년 전쟁(1618~1648)을 종결한 두 개의 평화 조약(오스나브뤼크 조약·뮌스터 조약)을 함께 이르는 이름. ' +
      '제국 내 제후들에게 사실상의 외교 주권을 인정하고, 칼뱅파를 아우크스부르크 화의의 승인 대상에 포함시켰다. ' +
      '주권 국가가 서로의 내정에 간섭하지 않는다는 근대 국제질서의 출발점으로 흔히 인용된다.',
    background:
      '30년 전쟁은 보헤미아의 종교 분쟁으로 시작해 덴마크·스웨덴·프랑스가 차례로 개입하면서 ' +
      '제국 전역을 소모전으로 몰아넣었다. 1640년대에 이르러 어느 진영도 결정적 승리를 얻지 못한 채 ' +
      '독일 인구가 지역에 따라 3분의 1까지 줄자, 1644년부터 뮌스터(가톨릭)와 오스나브뤼크(개신교) ' +
      '두 도시에서 병행 협상이 4년간 이어졌다.',
    aftermath:
      '합스부르크의 제국 통합 구상이 좌절되고 프랑스가 대륙의 주도권을 잡는 계기가 되었다. ' +
      '스위스와 네덜란드 공화국의 독립이 국제적으로 승인되었고, 제국은 300여 개 영방의 느슨한 연합으로 굳어졌다.',
    signatories: [
      { historical: '신성로마제국', role: '황제 페르디난트 3세 정부' },
      { historical: '프랑스 왕국', role: '루이 14세 섭정 정부' },
      { historical: '네덜란드 공화국', role: '연방의회' },
    ],
    terms: [
      {
        title: '영방 주권',
        content:
          '제국의 각 영방은 자기 영토에 대한 통치권과 외국과 동맹을 맺을 권리를 가진다. ' +
          '다만 황제와 제국에 반하는 동맹은 금지한다.',
      },
      {
        title: '종교 조항',
        content:
          '아우크스부르크 화의의 적용 대상에 칼뱅파(개혁파)를 추가하고, ' +
          '1624년 1월 1일의 종교 현상을 기준 연도로 삼아 각 영방의 종파 귀속을 확정한다.',
      },
    ],
  },
  {
    name: '위트레흐트 조약',
    type: 'PEACE',
    signDate: '1713-04-11',
    location: '네덜란드 공화국 위트레흐트',
    summary:
      '스페인 왕위 계승 전쟁을 마무리한 일련의 조약. 부르봉가의 펠리페 5세가 스페인 왕위를 유지하되 ' +
      '프랑스 왕위 계승권을 포기하게 하여, 프랑스-스페인 합병을 막고 유럽의 세력 균형을 명문화했다.',
    background:
      '1700년 스페인 합스부르크 왕가가 후사 없이 단절되자 루이 14세의 손자 필리프가 왕위를 물려받았다. ' +
      '프랑스와 스페인이 한 왕가 아래 묶이는 것을 우려한 영국·네덜란드·오스트리아가 대동맹을 결성해 ' +
      '13년간 싸웠고, 양측 모두 재정이 고갈된 끝에 협상으로 돌아섰다.',
    aftermath:
      '영국은 지브롤터와 미노르카, 그리고 스페인령 아메리카에 노예를 공급하는 아시엔토 권리를 얻어 ' +
      '해양·상업 제국으로 도약하는 발판을 마련했다. "세력 균형(balance of power)"이 조약문에 명시된 ' +
      '첫 사례 중 하나로 꼽힌다.',
    signatories: [
      { historical: '프랑스 왕국', role: '루이 14세 정부' },
      { historical: '그레이트브리튼 왕국', role: '앤 여왕 정부' },
      { historical: '네덜란드 공화국', role: '연방의회' },
      { historical: '사보이 공국' },
      { historical: '포르투갈 왕국' },
    ],
  },
  {
    name: '틸지트 조약',
    type: 'PEACE',
    signDate: '1807-07-07',
    location: '네만강 위 뗏목 — 틸지트(현 소베츠크)',
    summary:
      '아일라우·프리틀란트 전투 이후 나폴레옹이 러시아·프로이센과 각각 맺은 강화 조약. ' +
      '러시아는 대륙봉쇄에 가담하고, 프로이센은 영토의 절반가량을 잃었다.',
    background:
      '1806년 예나-아우어슈테트에서 프로이센군이 궤멸하고 이듬해 프리틀란트에서 러시아군마저 패하자, ' +
      '알렉산드르 1세는 전쟁 지속 대신 나폴레옹과의 제휴를 택했다. 두 황제는 중립을 상징하기 위해 ' +
      '네만강 한가운데 띄운 뗏목 위 천막에서 만났다.',
    aftermath:
      '프로이센 영토에서 바르샤바 공국과 베스트팔렌 왕국이 떨어져 나왔다. ' +
      '대륙봉쇄가 러시아 경제를 압박하면서 양국의 제휴는 오래가지 못했고, 5년 뒤 1812년 원정으로 이어졌다.',
    signatories: [
      { historical: '프랑스 제1제국', role: '나폴레옹 1세 정부' },
      { historical: '러시아 제국', role: '알렉산드르 1세 정부' },
      { historical: '프로이센 왕국', role: '프리드리히 빌헬름 3세 정부' },
    ],
  },
  {
    name: '난징 조약',
    alias: '강녕 조약',
    type: 'PEACE',
    signDate: '1842-08-29',
    location: '청 강녕부 난징 — 영국 군함 콘윌리스호 선상',
    summary:
      '제1차 아편전쟁을 종결한 조약이자 청이 맺은 최초의 근대적 조약. 홍콩 섬 할양, 5개 항구 개항, ' +
      '배상금 2,100만 은원 지불을 규정했다. 관세 자주권과 영사재판권 문제는 이듬해 후속 조약에서 확정되어 ' +
      '이후 100년간 이어지는 불평등 조약 체제의 원형이 되었다.',
    background:
      '영국의 대중 무역 적자를 메우던 아편 밀무역을 임칙서가 광저우에서 강제 몰수·소각하자 ' +
      '영국이 원정군을 파견했다. 청군은 화력과 기동에서 상대가 되지 못했고, ' +
      '영국 함대가 양쯔강을 거슬러 올라 난징에 이르자 청 조정이 강화에 응했다.',
    aftermath:
      '광저우 한 곳으로 제한되던 공행 무역 체제가 무너지고 상하이가 급부상했다. ' +
      '이 조약을 시작으로 미국·프랑스가 최혜국 대우를 요구해 같은 조건을 얻어냈다.',
    signatories: [
      { historical: '청나라', role: '흠차대신 기영' },
      { historical: '대영제국', role: '전권대사 헨리 포틴저' },
    ],
    terms: [
      {
        title: '홍콩 할양',
        content: '청은 홍콩 섬을 영국에 할양하고, 영국 군주가 이를 영구히 통치한다.',
      },
      {
        title: '5개 항 개항',
        content:
          '광저우·샤먼·푸저우·닝보·상하이 다섯 항구를 개항하고 영국 상인의 거주와 영사 주재를 허용한다.',
      },
      {
        title: '배상금',
        content:
          '몰수된 아편 대금·상채·군비를 합쳐 은 2,100만 원을 4년에 걸쳐 분할 지급한다.',
      },
    ],
  },
  {
    name: '조일수호조규',
    alias: '강화도 조약',
    type: 'TRADE',
    signDate: '1876-02-27',
    location: '조선 강화부 연무당',
    summary:
      '조선이 외국과 맺은 최초의 근대적 조약. 부산 외 2개 항의 개항, 일본의 해안 측량권, ' +
      '영사재판권을 규정한 불평등 조약이었다. 제1관에서 조선을 "자주국"으로 명시했는데, ' +
      '이는 청의 종주권을 배제하려는 일본 측 포석이었다.',
    background:
      '1875년 일본 군함 운요호가 강화도 초지진에 접근해 포격을 유도한 뒤 영종도를 습격했다. ' +
      '일본은 이 사건의 책임을 물어 개항을 요구했고, 대원군 실각 이후 개화 여론이 형성되던 조선 조정이 ' +
      '협상 테이블에 나섰다.',
    aftermath:
      '부산(1876)·원산(1880)·인천(1883)이 차례로 열리며 일본 상인의 진출이 본격화됐다. ' +
      '관세 규정이 빠져 있어 조선은 한동안 무관세 무역을 감수해야 했고, 1883년에 가서야 관세를 물릴 수 있었다.',
    signatories: [
      { historical: '조선', role: '접견대관 신헌' },
      { historical: '일본 제국', role: '특명전권변리대신 구로다 기요타카' },
    ],
    terms: [
      {
        title: '제1관 — 자주국 규정',
        content:
          '조선국은 자주국으로서 일본국과 평등한 권리를 가진다. ' +
          '(청의 종주권을 부정하려는 일본 측 의도가 담긴 조항으로 평가된다.)',
      },
      {
        title: '제5관 — 개항',
        content:
          '부산 이외에 두 곳의 항구를 20개월 안에 열어 일본인의 왕래·통상을 허용한다.',
      },
      {
        title: '제10관 — 영사재판권',
        content:
          '개항장에서 일본인이 죄를 범한 경우 일본 관원이 일본 법에 따라 심판한다.',
      },
    ],
  },
  {
    name: '조미수호통상조약',
    type: 'TRADE',
    signDate: '1882-05-22',
    location: '조선 인천 제물포',
    summary:
      '조선이 서양 국가와 맺은 최초의 조약. 거중조정(good offices) 조항과 협정 관세를 담아 ' +
      '강화도 조약보다는 대등한 형식을 갖췄으나, 영사재판권과 최혜국 대우는 그대로 남았다.',
    background:
      '청의 이홍장은 러시아와 일본을 견제하기 위해 조선이 서양 국가와 수교하도록 주선했다. ' +
      '조선 조정도 일본 일변도의 통상 관계를 분산시킬 필요를 느껴 미국과의 교섭에 응했다.',
    aftermath:
      '이 조약을 본보기로 영국·독일·러시아·프랑스와의 수교가 이어졌다. ' +
      '고종은 제1조의 거중조정 조항을 근거로 미국의 개입을 여러 차례 기대했으나 실제로 작동하지 않았다.',
    signatories: [
      { historical: '조선', role: '전권대관 신헌·부관 김홍집' },
      { modern: '미국', role: '전권위원 로버트 슈펠트 제독' },
    ],
  },
  {
    name: '삼국 동맹 조약',
    type: 'ALLIANCE',
    signDate: '1882-05-20',
    location: '오스트리아-헝가리 제국 빈',
    summary:
      '독일·오스트리아-헝가리·이탈리아가 맺은 방어 동맹. 프랑스가 어느 한 나라를 공격하면 ' +
      '나머지가 참전한다는 것이 핵심이었고, 5년마다 갱신되며 1915년까지 이어졌다.',
    background:
      '비스마르크는 보불전쟁 이후 고립시킨 프랑스가 동맹을 찾지 못하도록 유럽 외교를 설계했다. ' +
      '튀니지를 프랑스에 빼앗겨 반프랑스 정서가 높던 이탈리아를 끌어들여 독오 동맹을 삼국으로 확장했다.',
    aftermath:
      '프랑스-러시아 동맹(1894)과 영불 협상(1904)을 자극해 유럽을 두 진영으로 갈랐다. ' +
      '이탈리아는 1915년 런던 조약으로 협상국 측에 가담하며 동맹을 이탈했다.',
    signatories: [
      { historical: '독일 제국', role: '재상 오토 폰 비스마르크 정부' },
      { historical: '오스트리아-헝가리 제국' },
      { historical: '이탈리아 왕국', note: '1915년 협상국 측으로 이탈' },
    ],
  },
  {
    name: '시모노세키 조약',
    alias: '마관 조약',
    type: 'PEACE',
    signDate: '1895-04-17',
    location: '일본 야마구치현 시모노세키 — 슌판로',
    summary:
      '청일전쟁을 종결한 조약. 청은 조선에 대한 종주권을 포기하고 랴오둥 반도·타이완·펑후 제도를 ' +
      '할양했으며, 은 2억 냥을 배상했다.',
    background:
      '동학농민운동을 계기로 조선에 함께 출병한 청과 일본이 충돌했고, 평양·황해에서 연패한 청이 ' +
      '이홍장을 전권대신으로 파견해 강화를 청했다.',
    aftermath:
      '조약 엿새 뒤 러시아·프랑스·독일의 삼국간섭으로 일본은 랴오둥 반도를 반환해야 했고, ' +
      '이는 러일 대립의 씨앗이 되었다. 조선에서는 청의 영향력이 사라진 자리를 두고 러시아와 일본이 각축했다.',
    signatories: [
      { historical: '청나라', role: '전권대신 이홍장' },
      { historical: '일본 제국', role: '내각총리대신 이토 히로부미' },
    ],
  },
  {
    name: '영일 동맹',
    type: 'ALLIANCE',
    signDate: '1902-01-30',
    expiryDate: '1923-08-17',
    location: '영국 런던',
    summary:
      '영국이 "영광스러운 고립"을 접고 맺은 첫 대등 동맹. 한쪽이 두 나라 이상과 교전하면 ' +
      '다른 쪽이 참전한다는 조항으로, 러일전쟁에서 일본이 제3국의 개입 없이 싸울 수 있게 했다.',
    background:
      '의화단 사건 이후 만주에 주둔한 러시아 군대가 물러나지 않자, 러시아의 남하를 함께 우려한 ' +
      '두 나라의 이해가 맞아떨어졌다.',
    aftermath:
      '1905년·1911년 두 차례 개정되며 적용 범위가 인도까지 확대됐다. ' +
      '워싱턴 회의에서 4개국 조약으로 대체되며 1923년 소멸했다.',
    signatories: [
      { historical: '대영제국', role: '외무장관 랜즈다운 후작' },
      { historical: '일본 제국', role: '주영공사 하야시 다다스' },
    ],
  },
  {
    name: '포츠머스 조약',
    type: 'PEACE',
    signDate: '1905-09-05',
    location: '미국 뉴햄프셔주 포츠머스 해군 조선소',
    summary:
      '러일전쟁을 종결한 조약. 러시아는 한국에 대한 일본의 우월권을 인정하고 ' +
      '뤼순·다롄 조차권과 남만주 철도, 사할린 남부를 일본에 넘겼다. 배상금은 없었다.',
    background:
      '펑톈 회전과 쓰시마 해전에서 승리했으나 전비가 바닥난 일본과, 1905년 혁명으로 내정이 흔들린 러시아 ' +
      '양쪽 모두 전쟁을 끝낼 이유가 있었다. 미국 대통령 시어도어 루스벨트가 중재를 맡았다.',
    aftermath:
      '배상금을 받지 못한 데 분노한 도쿄 시민이 히비야 방화 사건을 일으켰다. ' +
      '루스벨트는 이 중재로 노벨 평화상을 받았고, 두 달 뒤 을사늑약으로 대한제국의 외교권이 박탈됐다.',
    signatories: [
      { historical: '러시아 제국', role: '전권대사 세르게이 비테' },
      { historical: '일본 제국', role: '외무대신 고무라 주타로' },
      {
        modern: '미국',
        role: '대통령 시어도어 루스벨트',
        participationType: 'MEDIATOR',
        note: '중재국 — 조약 당사국은 아니다',
      },
    ],
  },
  {
    name: '제2차 한일협약',
    alias: '을사늑약',
    type: 'OTHER',
    signDate: '1905-11-17',
    violationDate: '1965-06-22',
    violationReason:
      '한일기본조약 제2조에서 1910년 8월 22일 이전에 체결된 모든 조약·협정이 "이미 무효"임을 확인',
    location: '대한제국 한성 — 중명전',
    summary:
      '대한제국의 외교권을 일본이 대행하도록 규정하고 통감부 설치를 명시한 협약. ' +
      '고종이 비준하지 않았고 국새도 찍히지 않아 성립 자체가 무효라는 것이 한국 학계·정부의 일관된 입장이다.',
    background:
      '포츠머스 조약과 가쓰라-태프트 밀약, 제2차 영일동맹으로 열강의 묵인을 확보한 일본은 ' +
      '이토 히로부미를 파견해 군대를 동원한 상태에서 조약 체결을 압박했다.',
    aftermath:
      '외교권 상실에 항의해 민영환이 자결하고 을사의병이 일어났다. ' +
      '고종은 1907년 헤이그 특사를 보내 무효를 호소했으나 오히려 강제 퇴위당했다.',
    signatories: [
      {
        historical: '대한제국',
        role: '외부대신 박제순',
        note: '고종의 비준 없음 — 성립 자체가 다투어진다',
      },
      { historical: '일본 제국', role: '특파대사 이토 히로부미' },
    ],
  },
  {
    name: '베르사유 조약',
    type: 'PEACE',
    signDate: '1919-06-28',
    effectiveDate: '1920-01-10',
    location: '프랑스 베르사유 궁전 거울의 방',
    summary:
      '제1차 세계대전을 공식 종결한 대독 강화 조약. 전쟁 책임을 독일에 지우고(제231조) ' +
      '영토 할양·군비 제한·배상금을 부과했으며, 국제연맹 규약을 제1편에 담았다.',
    background:
      '1918년 11월 휴전 뒤 파리에서 열린 강화회의는 프랑스의 안보 요구, 영국의 세력 균형, ' +
      '미국 윌슨의 14개조 원칙이 맞부딪히는 자리였다. 독일 대표단은 협상에 참여하지 못한 채 ' +
      '완성된 조약문에 서명하도록 요구받았다.',
    aftermath:
      '독일에서는 "명령된 평화(Diktat)"라는 반발이 정치적 자산이 되어 바이마르 공화국을 계속 흔들었다. ' +
      '미국 상원은 국제연맹 가입 조항을 문제 삼아 비준을 거부했다.',
    signatories: [
      {
        historical: '바이마르 공화국',
        role: '외무장관 헤르만 뮐러',
        note: '협상에서 배제된 채 서명',
      },
      { historical: '프랑스 제3공화국', role: '총리 조르주 클레망소' },
      { historical: '대영제국', role: '총리 데이비드 로이드 조지' },
      { historical: '이탈리아 왕국', role: '총리 비토리오 오를란도' },
      { historical: '일본 제국', role: '전권대사 사이온지 긴모치' },
      {
        modern: '미국',
        role: '대통령 우드로 윌슨',
        note: '서명했으나 상원이 비준을 거부 — 1921년 별도 강화조약 체결',
      },
    ],
    terms: [
      {
        title: '제231조 — 전쟁 책임',
        content:
          '독일과 그 동맹국이 침략으로 연합국에 입힌 모든 손실과 피해에 대한 책임을 독일이 인정한다.',
      },
      {
        title: '군비 제한',
        content:
          '독일 육군은 10만 명으로 제한하고 징병제를 폐지한다. ' +
          '잠수함·군용기 보유를 금지하고 라인란트를 비무장지대로 둔다.',
      },
      {
        title: '영토',
        content:
          '알자스-로렌을 프랑스에 반환하고, 자를란트를 15년간 국제연맹 관리 아래 둔다. ' +
          '포젠·서프로이센을 폴란드에 넘겨 단치히 회랑을 만든다. 모든 해외 식민지를 포기한다.',
      },
    ],
  },
  {
    name: '워싱턴 해군 군축조약',
    alias: '5개국 조약',
    type: 'DISARMAMENT',
    signDate: '1922-02-06',
    effectiveDate: '1923-08-17',
    expiryDate: '1936-12-31',
    violationDate: '1934-12-29',
    violationReason: '일본이 조약 폐기를 정식 통고 — 1936년 말 실효',
    location: '미국 워싱턴 D.C.',
    summary:
      '주력함 보유 톤수를 영국·미국 5, 일본 3, 프랑스·이탈리아 1.67의 비율로 제한한 최초의 본격적 군축 조약. ' +
      '10년간 주력함 신규 건조를 중단하는 "해군 휴일"도 함께 규정했다.',
    background:
      '1차대전 후 미·영·일의 건함 경쟁이 재정을 압박하자 미국이 회의를 소집했다. ' +
      '같은 회의에서 영일동맹을 대체하는 4개국 조약과 중국의 문호개방을 확인하는 9개국 조약이 함께 나왔다.',
    aftermath:
      '항공모함과 순양함 등 제한 밖 함종의 경쟁으로 옮겨붙었다. ' +
      '대등한 비율을 요구하던 일본이 1934년 폐기를 통고하면서 조약 체제는 1936년 말로 끝났다.',
    signatories: [
      { modern: '미국', role: '국무장관 찰스 에번스 휴스' },
      { historical: '대영제국' },
      { historical: '일본 제국', note: '1934년 12월 폐기 통고' },
      { historical: '프랑스 제3공화국' },
      { historical: '이탈리아 왕국' },
    ],
  },
  {
    name: '독소 불가침 조약',
    alias: '몰로토프-리벤트로프 조약',
    type: 'NON_AGGRESSION',
    signDate: '1939-08-23',
    effectiveDate: '1939-08-24',
    violationDate: '1941-06-22',
    violationReason: '독일의 바르바로사 작전 — 소련 침공으로 조약 파기',
    location: '소련 모스크바 크렘린',
    summary:
      '나치 독일과 소련이 10년 기한으로 맺은 상호 불가침 조약. ' +
      '본문과 별도로 동유럽을 두 세력권으로 나누는 비밀 의정서가 붙어 있었고, ' +
      '조약 체결 9일 뒤 독일이 폴란드를 침공하며 2차대전이 시작됐다.',
    background:
      '영·프와의 집단안보 교섭이 지지부진하자 스탈린은 전쟁 준비 시간을 벌기 위해 독일 쪽으로 방향을 틀었다. ' +
      '히틀러는 폴란드 침공 시 동서 양면 전쟁을 피하려 했다. 서로 이념적 숙적이던 두 정권의 이해가 잠시 겹쳤다.',
    aftermath:
      '소련은 발트 3국과 폴란드 동부, 베사라비아를 병합했다. ' +
      '비밀 의정서의 존재를 소련은 1989년까지 공식 부인했고, 인민대표대회가 이를 인정하며 무효를 선언했다.',
    signatories: [
      {
        historical: '나치 독일 (제3제국)',
        role: '외무장관 요아힘 폰 리벤트로프',
      },
      {
        historical: '소비에트 사회주의 공화국 연방',
        role: '외무인민위원 뱌체슬라프 몰로토프',
      },
    ],
    terms: [
      {
        title: '제1조 — 불가침',
        content:
          '양 체약국은 서로에 대한 모든 폭력 행위와 침략 행위, 그리고 공격을 삼간다. ' +
          '단독으로든 다른 국가와 연합해서든 마찬가지다.',
      },
      {
        title: '제4조 — 적대 진영 불참',
        content:
          '어느 한쪽도 상대방을 겨냥한 국가 집단에 참여하지 않는다.',
      },
      {
        title: '비밀 추가 의정서',
        content:
          '발트 3국·폴란드·베사라비아에 대한 양국의 세력권 경계를 정한다. ' +
          '핀란드·에스토니아·라트비아는 소련 세력권, 리투아니아는 독일 세력권으로 하고 ' +
          '폴란드는 나레프·비스와·산 강 선을 기준으로 분할한다. ' +
          '(1939년 9월 28일 수정으로 리투아니아가 소련 몫으로 교환됐다.)',
        isSecret: true,
      },
    ],
  },
]

/** 이름 → id 조회기. 없는 이름은 null을 돌려주고 호출부가 경고만 남긴다. */
async function buildCountryResolvers(prisma: PrismaService) {
  const historicalRows = await prisma.historicalCountry.findMany({
    select: { id: true, name: true },
  })
  const modernRows = await prisma.country.findMany({
    select: { id: true, name: true },
  })
  const historicalByName = new Map(
    historicalRows.map((row) => [row.name, row.id]),
  )
  const modernByName = new Map(modernRows.map((row) => [row.name, row.id]))
  return { historicalByName, modernByName }
}

export async function seedCoreTreaties(prisma: PrismaService): Promise<void> {
  const { historicalByName, modernByName } = await buildCountryResolvers(prisma)

  let created = 0
  let skipped = 0
  const missingCountries = new Set<string>()

  for (const spec of TREATIES) {
    const signDate = new Date(`${spec.signDate}T00:00:00.000Z`)

    const existing = await prisma.treaty.findFirst({
      where: { name: spec.name, signDate },
      select: { id: true },
    })
    if (existing) {
      skipped += 1
      console.log(`  · 이미 있음 — ${spec.name} (${spec.signDate})`)
      continue
    }

    /* 서명국을 먼저 해석한다 — 한 곳도 못 찾으면 조약을 만들 이유가 없다 */
    const signatoryData = spec.signatories.flatMap((signatory) => {
      const countryId = signatory.modern
        ? (modernByName.get(signatory.modern) ?? null)
        : null
      const historicalCountryId = signatory.historical
        ? (historicalByName.get(signatory.historical) ?? null)
        : null
      if (!countryId && !historicalCountryId) {
        missingCountries.add(signatory.modern ?? signatory.historical ?? '?')
        return []
      }
      return [
        {
          countryId,
          historicalCountryId,
          role: signatory.role ?? null,
          participationType: signatory.participationType ?? 'SIGNATORY',
          note: signatory.note ?? null,
        },
      ]
    })

    if (signatoryData.length === 0) {
      console.warn(`  ⚠ 서명국을 하나도 찾지 못해 건너뜀 — ${spec.name}`)
      continue
    }

    await prisma.$transaction(async (tx) => {
      const treaty = await tx.treaty.create({
        data: {
          name: spec.name,
          alias: spec.alias ?? null,
          type: spec.type as never,
          signDate,
          effectiveDate: spec.effectiveDate
            ? new Date(`${spec.effectiveDate}T00:00:00.000Z`)
            : null,
          expiryDate: spec.expiryDate
            ? new Date(`${spec.expiryDate}T00:00:00.000Z`)
            : null,
          violationDate: spec.violationDate
            ? new Date(`${spec.violationDate}T00:00:00.000Z`)
            : null,
          violationReason: spec.violationReason ?? null,
          location: spec.location ?? null,
          summary: spec.summary,
          background: spec.background ?? null,
          aftermath: spec.aftermath ?? null,
        },
        select: { id: true },
      })

      await tx.treatySignatory.createMany({
        data: signatoryData.map((signatory) => ({
          ...signatory,
          treatyId: treaty.id,
          participationType: signatory.participationType as never,
        })),
      })

      if (spec.terms?.length) {
        await tx.treatyTerm.createMany({
          data: spec.terms.map((term, index) => ({
            treatyId: treaty.id,
            order: index + 1,
            title: term.title,
            content: term.content,
            isSecret: term.isSecret ?? false,
          })),
        })
      }
    })

    created += 1
    console.log(
      `  ✓ ${spec.name} (${spec.signDate}) — 서명국 ${signatoryData.length}, 조항 ${spec.terms?.length ?? 0}`,
    )
  }

  if (missingCountries.size > 0) {
    console.warn(
      `\n  ⚠ DB에서 찾지 못한 국가(해당 서명국만 제외됨): ${[...missingCountries].join(', ')}`,
    )
  }
  console.log(`\n  신규 ${created}건 · 기존 스킵 ${skipped}건`)
}
