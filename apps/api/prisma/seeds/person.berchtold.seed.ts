/**
 * 레오폴트 베르히톨트 백작 (Leopold Graf Berchtold, 1863~1942) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 오스트리아-헝가리 제국의 외교관·외무장관(1912~1915). 1914년 7월 세르비아에 최후통첩을
 * 보내고 선전포고를 결정한 당사자로, 제1차 세계대전 개전 책임 논쟁의 한복판에 있는
 * 인물이다. 제국 최고의 부호 귀족 가운데 하나였고 경마에 몰두한 «딜레탕트»라는 혹평과,
 * 주전파와 자제 사이에서 흔들리다 끝내 전쟁을 택한 우유부단이라는 평가가 따라다닌다.
 *
 * 날짜 규약: 오스트리아-헝가리는 그레고리력(신력)을 썼으므로 구력 병기가 필요 없다 —
 * 러시아 측 사료에서 인용한 날짜에만 예외적으로 구력을 라벨한다. (이 시리즈의 러시아
 * 인물들과 구별되는 지점.)
 *
 * 의존: seedAustriaHistoricalCountries('오스트리아-헝가리 제국' HC) +
 *       seedGovernmentPositionDefinitions('외무장관'·'대사' 관직 정의).
 *
 * 등록 항목:
 *  - Person x1 (베르히톨트 본인 — historicalCountryId=오스트리아-헝가리 제국)
 *  - GovernmentPositionTenure (주러시아 대사 DIPLOMATIC_POST + 외무장관 CABINET_MINISTER
 *    + 카를 1세 궁내장관 SPECIAL_POSITION) — 신규 생성이므로 appointmentDetail을 직접 기입
 *  - PersonCountryAffiliation x1 (오스트리아-헝가리 제국 CITIZENSHIP)
 *  - PersonLifeEvent x23 (연보)
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
const BERCHTOLD = {
  name: '레오폴트',
  middleName: null as string | null,
  surname: '베르히톨트',
  // 영지명은 모라비아 지명(우헤르치체·브라테닌·폴리체)의 독일어형 — 영어 위키에 도는
  // «Frättling und Püllütz»는 실재하지 않는 철자이므로 독일어 사전류의 형태를 쓴다.
  originalName: 'Leopold Graf Berchtold von und zu Ungarschitz, Fratting und Pullitz',
  gender: 'MALE' as const,
  birthYear: 1863, birthMonth: 4, birthDay: 18,
  birthNote:
    '티롤에서 발원해 모라비아의 대지주가 된 백작 가문 출신 — 아버지 지크문트 베르히톨트 ' +
    '백작(1834~1900)은 모라비아와 헝가리에 영지를 둔 추밀고문관이었고, 어머니 요제파 폰 ' +
    '트라우트만스도르프 백작영애(1835~1894)의 아버지는 주프로이센 대사를 지냈다. 집안은 ' +
    '1800년 부흘로비체 성을 사들여 1945년까지 보유했고, 그는 모라비아의 부흘라우(부흘로프) ' +
    '성에서 자라며 체코어·슬로바키아어·헝가리어를 익혔다. 출생일은 오스트리아·독일 ' +
    '인명사전과 독일어·영어 위키가 04-18로 일치하며, 체코 위키의 04-17과 스파르타쿠스 ' +
    '교육사이트의 «1862년생»은 이설·오류다.',
  birthPlaceText: '오스트리아-헝가리 제국 빈',
  deathYear: 1942, deathMonth: 11, deathDay: 21,
  deathPlaceText: '헝가리 쇼프론(외덴부르크)주 페레스녜 영지',
  deathType: DeathType.NATURAL,
  deathCause: '오랜 중병 끝에 헝가리 영지에서 사망 (향년 79세).',
  deathNote:
    '인근 도시는 사료마다 체프레그(독일 인명사전)와 퀸스/쾨세그(독일어 위키)로 갈린다. ' +
    '모라비아 부흘로프성 인근 성 바르바라 예배당의 가문 납골묘에 안장된 것으로 전한다 — ' +
    '영어·체코어 위키만 기록하고 오스트리아·독일 인명사전은 침묵한다. 방대한 일기와 ' +
    '회고록을 남겼으나 생전에도 사후에도 출간되지 않았고, 유고는 빈 국립문서고(HHStA)에 ' +
    '보관돼 있다 — 후고 한치의 2권짜리 표준 전기 «레오폴트 베르히톨트 백작: 대귀족과 ' +
    '정치가»(1963)가 이를 분석했다. 1918년 11월 합스부르크가의 보석을 스위스로 옮기는 ' +
    '수송을 수행한 뒤 그곳에 머물다 1923년 귀환해 은둔했고, 1931년 부다페스트 저택을 팔고 ' +
    '페레스녜에 정착했다. 전후 전쟁책임 재판이나 인도 절차의 대상이 된 기록은 없다.',
  influence: 72,
  biography:
    '오스트리아-헝가리 제국의 외교관·외무장관(1912~1915). 1914년 7월 세르비아에 최후통첩을 ' +
    '보내고 선전포고에 서명한 당사자로, 제1차 세계대전 개전 책임 논쟁의 한복판에 서 있다. ' +
    '제국 최고의 부호 귀족 가운데 하나였고, 사냥과 승마와 사교가 앞섰던 «세상 물정 모르는» ' +
    '대귀족이라는 혹평과, 정작 7월 위기에서는 과정을 장악하고 밀어붙였다는 평가가 함께 ' +
    '따라다닌다. ' +
    '\n\n' +
    '출신과 입직(1863~1893). 티롤에서 발원해 모라비아의 대지주가 된 백작가에서 태어나 ' +
    '부흘라우 성에서 자랐고, 그 덕에 체코어·슬로바키아어·헝가리어까지 익혔다. 법학을 마친 ' +
    '뒤 1887년 브르노 총독부에서 관직을 시작했고 — 출발점은 외교가 아니라 내무 행정이었다 — ' +
    '1893년 외무부로 옮겨 교황청·알바니아 사무를 맡았다. 같은 해 부다페스트에서 카로이 ' +
    '백작가의 페르디난디네와 혼인했는데, 장인은 주독일·주영국 대사를 지낸 외교 명가의 ' +
    '수장이었고 신부는 광대한 헝가리 영지의 상속인이어서 이 결혼으로 그는 제국 최고 부호의 ' +
    '반열에 올랐다. ' +
    '\n\n' +
    '외교관(1894~1911). 파리 공사관 서기관, 런던 대사관 1등서기관을 거쳐 1903년 에렌탈의 ' +
    '권유로 페테르부르크 대사관 참사관이 되었고, 에렌탈이 외무장관으로 영전하자 1906년 말 ' +
    '그 자리를 이어 주러시아 대사가 되었다 — 베를린 다음가는 제국 제2의 공관이었다. 1908년 ' +
    '9월 자신의 모라비아 영지에서 에렌탈과 러시아 외무장관 이즈볼스키의 비밀 회동을 ' +
    '발의하고 주최했다. 보스니아 병합 묵인과 해협 개방 지지를 맞바꾼 이 «부흘라우 거래»는 ' +
    '배석도 기록도 없이 이뤄졌고 합의문이 끝내 작성되지 않아, 양측 주장이 충돌하며 병합 ' +
    '위기로 번졌다 — 러시아 외교에 깊은 앙금을 남긴 사건의 무대를 그가 제공한 셈이다. ' +
    '\n\n' +
    '외무장관 취임(1912). 백혈병으로 죽어가던 에렌탈이 해임된 그날 저녁 숨을 거두면서 ' +
    '1912-02-17 그 자리를 이어받았다. 49세로 유럽 최연소 외무장관이자 공동각의 의장이 ' +
    '되었지만, 스스로 부적임이라 여겨 황제에게 직접 청해 고사하려 했다고 전한다 — 오스트리아 ' +
    '인명사전은 그가 «자신의 뜻과 달리» 이 자리를 맡았다고 적는다. ' +
    '\n\n' +
    '발칸(1912~1913). 그의 완강한 목표는 세르비아의 아드리아해 출구를 막는 것이었고, 그 ' +
    '방편으로 알바니아 독립국 수립을 밀어붙여 «알바니아 국가의 창설자»로 기록된다. 1913년 ' +
    '스쿠타리 위기에서는 열강 해상봉쇄를 이끌어 몬테네그로의 반환을 관철했고, 10월에는 ' +
    '알바니아 영토에서 물러나라는 8일 시한의 최후통첩을 직접 기초해 세르비아를 이틀 만에 ' +
    '굴복시켰다 — 독일이 지지했고 동맹국에는 사후 통보한 이 방식은 이듬해 7월의 예행연습 ' +
    '이었으며, 빈은 여기서 «단기 시한 최후통첩이면 세르비아는 또 물러선다»는 잘못된 교훈을 ' +
    '얻었다. 그 사이 참모총장 콘라트가 1913~14년에만 스물다섯 차례 요구한 예방전쟁은 모두 ' +
    '물리쳤고, 그의 입장을 «전쟁, 전쟁, 전쟁»이라 요약했다. ' +
    '\n\n' +
    '7월 위기(1914). 콘라트를 막던 다른 축인 프란츠 페르디난트 대공이 사라예보에서 살해 ' +
    '되자 균형이 무너졌고, 이틀 만에 그는 군사적 결판만이 해법이라는 결론에 이르렀다. ' +
    '사라예보 나흘 전 작성돼 있던 마체코 각서를 개전 쪽으로 고쳐 쓰고 «적들이 우리 머리 ' +
    '위로 조여오는 그물의 실을 단호한 손으로 끊어야 한다»는 추기를 붙여 호요스 편에 ' +
    '베를린으로 보냈고, 07-05~06 독일의 «백지수표»를 받아냈다. 07-07 공동각의에서 세르비아를 ' +
    '«무력 시위로 영구히 무해하게» 만들 것을 요구하며 러시아와의 전쟁 가능성까지 스스로 ' +
    '인정했다. 홀로 반대하던 헝가리 총리 티서는 병합 포기 서약을 대가로 07-14 돌아섰다. ' +
    '이미 07-07 그는 기슬 공사에게 «세르비아의 답이 무엇이든 관계를 단절하고 전쟁으로 ' +
    '가야 한다»고 훈령했다 — 7월의 그를 «우유부단»으로 읽기 어렵게 만드는 가장 강한 ' +
    '근거다. 최후통첩은 프랑스 대통령의 러시아 방문이 끝나기를 기다렸다가 07-23 오후 6시 ' +
    '열 개 요구와 48시간 시한으로 전달되었고, 아홉 개를 수용한 세르비아의 회답은 «무조건 ' +
    '수용이 아니»라는 이유로 거부되었다. 07-29에는 영국의 중재 제의도 물리쳤다. ' +
    '\n\n' +
    '테메시쿠빈 오보. 07-27 그는 황제에게 «세르비아군이 도나우 기선에서 우리 군을 사격했다»는 ' +
    '보고를 올리며 선전포고문을 상신했으나 그런 교전은 없었다. 이튿날 아침 그 자신이 오보임을 ' +
    '알고 해당 구절을 서명된 문서에서 삭제해, 실제 타전된 선전포고에는 그 문구가 없다. ' +
    '황제를 의도적으로 속였는가는 지금도 갈린다 — 라우헨슈타이너·빌·한니히·크로넨비터 등 ' +
    '독일어권 연구는 «황제는 이미 개전을 결심한 뒤라 속일 필요가 없었고 이 유령 교전은 결국 ' +
    '큰 의미가 없었다»며 고의설에 회의적인 반면, 헤르비히는 허위임을 알고 방어전 명분을 ' +
    '위해 이용했다고 본다. ' +
    '\n\n' +
    '사임과 만년(1915~1942). 이탈리아를 중립에 붙잡아 두려 트렌티노 할양을 검토하자 티서와 ' +
    '콘라트가 사임을 압박해 1915-01-13 물러났고, 후임은 더 강경한 부리안이었다. 이탈리아 ' +
    '전선에서 잠시 복무한 뒤 1916년부터 카를 대공의 궁내장관·시종장관을 지냈고, 1918년 ' +
    '11월 합스부르크가의 보석을 스위스로 옮기는 마지막 임무를 수행했다. 1923년 귀환해 ' +
    '헝가리 페레스녜 영지에서 은둔하다 1942년 사망했다. 방대한 일기와 회고록은 끝내 출간 ' +
    '되지 않았다. ' +
    '\n\n' +
    '평가. 동시대인들은 그를 «상냥하고 섬세하며 재치 있고 교양 있는 대귀족»으로, 겸손하고 ' +
    '자조적인 사람으로 기억했다. 동시에 신독일인명사전은 «불안정하고 세상 물정에 어두웠다»며 ' +
    '제국 여러 민족의 요구와 관념에 진정으로 다가가는 일은 그에게 불가능했다고 적는다. ' +
    '헤르비히와 헤이먼은 «제국 외무장관에게 필요한 성격의 강인함과 폭넓은 경험이 없었다»고, ' +
    '툰스톨은 «주전파 참모들의 설득에 취약했다»고 평한다. 반면 로이더는 7월 위기에서 그가 ' +
    '과정을 «지휘하고 관리했다»고 보며, 표준 참고문헌을 쓴 윌리엄슨은 «대전 발발에 그보다 ' +
    '더 중요한 역할을 한 사람은 없다 — 전쟁 대신 신중과 자제를 조언했더라면 평화는 거의 ' +
    '확실히 지켜졌을 것»이라고 단언한다. 우유부단한 딜레탕트였는가, 결정적 순간에 스스로 ' +
    '주전파의 선두에 선 사람이었는가 — 그에 대한 평가는 아직 하나로 모이지 않았다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  definitionTitle?: '외무장관' | '대사'
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
    title: '주러시아 대사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    definitionTitle: '대사',
    startYear: 1906, startMonth: 12, startDay: 28,
    endYear: 1911, endMonth: 3, endDay: 25,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '본인 요청으로 이임 — 페테르부르크 근무를 벗어나게 해달라고 청한 것으로 전한다.',
    appointmentDetail:
      '1887년 브륀(브르노) 총독부에서 관직을 시작해 1893년 외무부로 옮겨 교황청·알바니아 ' +
      '사무를 맡았고, 1894년 외교관 시험 합격 후 파리 공사관 서기관, 이어 런던 대사관 ' +
      '1등서기관을 지냈다(런던 부임은 1897년설과 1899년설이 갈린다). 1903년 3월 에렌탈의 ' +
      '거듭된 권유로 페테르부르크 대사관 참사관이 되었고, 그 에렌탈이 외무장관으로 영전해 ' +
      '비운 자리를 1906-12-28 이어받았다 — 베를린 다음가는 제국 제2의 공관이었다.',
    notes:
      '1906-12-28 ~ 1911-03-25. 재임 중이던 1908-09-15~16 자신의 모라비아 영지 부흘라우에서 ' +
      '외무장관 에렌탈과 러시아 외무장관 이즈볼스키의 비밀 회동을 **발의하고 주최**했다 — ' +
      '보스니아 병합을 러시아가 묵인하는 대가로 해협 개방을 지지한다는 «부흘라우 거래»가 ' +
      '여기서 맺어졌다. 배석 없이 여섯 시간 남짓 단둘이 나눈 대화라 기록이 남지 않았고, ' +
      '이즈볼스키가 맡기로 한 합의문은 끝내 나오지 않아 «사전 통보를 받기로 했다»는 러시아 ' +
      '측 주장과 «충분히 알렸다»는 오스트리아 측 주장이 충돌하며 병합 위기로 번졌다. 그 ' +
      '자신은 발의자이자 주최자였을 뿐 협상 당사자는 아니었다(회담 장소가 부흘로비체 성인지 ' +
      '부흘로프 성인지는 사료가 갈린다). 페테르부르크에서 그는 러시아의 대빈 불신과 본국 ' +
      '장관의 구상 사이에 끼여 에렌탈이 자기 구상에 맞지 않는 정보를 무시한다고 토로했다. ' +
      '주재국 러시아는 FK로 연결하지 않고 title로만 표기한다(외교관 변형 규약).',
  },
  {
    title: '외무장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '외무장관',
    startYear: 1912, startMonth: 2, startDay: 17,
    endYear: 1915, endMonth: 1, endDay: 13,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '이탈리아를 중립에 묶어두기 위해 트렌티노와 알바니아 해안 일부를 넘겨줄 용의가 있음을 ' +
      '티서와 콘라트에게 알리자 두 사람이 사임을 압박 — 티서의 요구로 더 강경한 부리안이 ' +
      '후임이 되었다. 이후 이탈리아 전선의 제16군단에서 복무했다.',
    appointmentDetail:
      '전임 에렌탈이 사망한 1912-02-17 그 자리를 이어받았다. 49세로 당시 유럽 최연소 외무 ' +
      '장관이었고, 공동각의 의장직도 겸하게 되었다. 오스트리아 인명사전은 그가 이 자리를 ' +
      '«자신의 뜻과 달리(gegen seinen Willen)» 맡았다고 적는다 — 부임을 꺼렸다는 서술과 ' +
      '일치한다. 임명일은 사료가 02-17(독일어·영어 위키)과 02-19(신독일인명사전·체코 위키), ' +
      '«1912년 1월»(오스트리아 인명사전)로 갈리는데 다수설인 02-17을 채택했다.',
    notes:
      '1912-02-17 ~ 1915-01-13. ①초기 목표는 발칸 현상 유지였으나 발칸 전쟁이 전제를 무너 ' +
      '뜨렸다. 세르비아의 아드리아해 출구를 막는 것이 그의 완강한 목표였고, 그 방편으로 ' +
      '알바니아 독립국 수립을 추진해 «알바니아 국가의 창설자»로 기록된다. ②1913년 스쿠타리 ' +
      '위기에서 열강 해상봉쇄(04-10~05-14)를 이끌어 몬테네그로의 반환을 관철했다. ' +
      '③1913-10-18 세르비아에 8일 시한의 최후통첩을 직접 기초해 알바니아 영토 철수를 ' +
      '받아냈고(10-20 수락), 빈은 여기서 «독일의 지지를 업은 단기 시한 양자 최후통첩이면 ' +
      '세르비아는 또 물러선다»는 교훈을 얻었다 — 1914년의 예행연습이었다. ④참모총장 ' +
      '콘라트가 1913~14년에만 스물다섯 차례 대세르비아 전쟁을 요구했으나 전부 물리쳤고, ' +
      '그의 입장을 «전쟁, 전쟁, 전쟁»이라 요약했다. 억지력이던 프란츠 페르디난트 대공이 ' +
      '1914-06-28 살해되면서 그 균형이 무너졌다.',
  },
  {
    title: '황태자·황제 카를의 궁내 관직',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1916, startMonth: 3,
    endYear: 1918, endMonth: 11, endDay: 11,
    endReason: TenureEndReason.STATE_DISSOLVED,
    endReasonDetail: '제국 해체·카를 1세의 통치권 포기(1918-11-11)로 궁정 관직 자체가 소멸.',
    appointmentDetail:
      '외무장관에서 물러나 이탈리아 전선의 제16군단에서 복무하던 중 1916년 3월 황위 계승자 ' +
      '카를 대공의 궁내장관(Obersthofmeister)으로 궁정에 복귀했다. 외교 일선에서는 밀려났으나 ' +
      '차기 황제의 측근으로 남은 인사였다. 정확한 날짜(03-23)는 1914-1918-online 한 곳에만 ' +
      '있고 접속이 되지 않아, 월 단위로만 기록한다.',
    notes:
      '단계가 셋이라 한 재임으로 묶고 여기 기록한다 — 1916-03 카를 대공의 궁내장관 → ' +
      '프란츠 요제프 사망(1916-11-21)으로 카를이 즉위한 뒤 시종장관(Oberstkämmerer) → ' +
      '1918-05~11 황제의 궁내장관(제국 마지막 재임자). 시종장관 전임 시점은 사료가 갈리는데 ' +
      '(오스트리아 인명사전은 두 직 모두 1916년으로 적고, 영어 위키는 1916-11), 즉위가 ' +
      '1916년 11월이므로 «1917년 1월»설은 채택하지 않는다. 1918년 11월 합스부르크가의 보석을 ' +
      '빈 호프부르크에서 스위스로 옮기는 수송을 수행한 것이 마지막 공적 임무였다.',
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
    title: '빈 출생',
    category: 'FAMILY',
    startYear: 1863, startMonth: 4, startDay: 18,
    description:
      '티롤에서 발원해 모라비아의 대지주가 된 백작가 — 모라비아의 부흘라우 성에서 자라며 ' +
      '체코어·슬로바키아어·헝가리어를 익혔고, 독일어 외에 영어·프랑스어·이탈리아어도 ' +
      '구사했다.',
  },
  {
    title: '법학 학위·관직 시작',
    category: 'CAREER',
    startYear: 1887,
    description:
      '가정교사 교육을 거쳐 법학을 마치고 국가시험 합격 후 브륀(브르노) 총독부에서 ' +
      '관직을 시작했다 — 외교가 아닌 내무 행정이 출발점이었다.',
  },
  {
    title: '페르디난디네 카로이와 결혼',
    category: 'FAMILY',
    startYear: 1893, startMonth: 1, startDay: 25,
    description:
      '부다페스트에서 카로이 백작가의 «난디네»(1868~1955)와 혼인. 장인 얼로이시 카로이는 ' +
      '주독일(1871~78)·주영국 대사와 베를린 회의 제2전권을 지낸 인물이고, 신부는 헝가리 ' +
      '(오늘날 슬로바키아 포함)의 광대한 영지 상속인이어서 이 결혼으로 그는 제국 최고 ' +
      '부호의 반열에 올랐다. 세 아들을 두었는데 그중 아달베르트는 열한 살에 요절했다.',
  },
  {
    title: '외무부 전입 — 교황청·알바니아 사무',
    category: 'CAREER',
    startYear: 1893,
    description: '이듬해 외교관 시험에 합격해 파리 공사관 서기관으로 첫 재외 근무.',
  },
  {
    title: '런던 대사관 1등서기관',
    category: 'CAREER',
    startYear: 1897, endYear: 1903,
    description:
      '에렌탈이 페테르부르크로 부르려 했으나 사양하고 런던을 택했다 — 부임 연도는 1897년설과 ' +
      '1899년설이 갈린다.',
  },
  {
    title: '페테르부르크 대사관 참사관',
    category: 'CAREER',
    startYear: 1903, startMonth: 3,
    description:
      '에렌탈의 거듭된 권유로 부임 — 러일전쟁의 패배(1905)를 현지에서 지켜봤다.',
  },
  {
    title: '주러시아 대사 부임',
    category: 'DIPLOMATIC',
    startYear: 1906, startMonth: 12, startDay: 28,
    description: '외무장관으로 영전한 에렌탈의 후임 — 베를린 다음가는 제국 제2의 공관이었다.',
  },
  {
    title: '부흘라우 회동 — 보스니아 거래',
    category: 'DIPLOMATIC',
    startYear: 1908, startMonth: 9, startDay: 15,
    endYear: 1908, endMonth: 9, endDay: 16,
    description:
      '자신의 모라비아 영지에서 에렌탈과 이즈볼스키의 비밀 회동을 발의·주최했다. 보스니아 ' +
      '병합 묵인과 해협 개방 지지를 맞바꾸는 «부흘라우 거래»가 배석도 기록도 없이 맺어졌고, ' +
      '합의문이 끝내 작성되지 않아 양측 주장이 충돌하며 병합 위기로 번졌다. 그는 발의자이자 ' +
      '주최자였을 뿐 협상 당사자는 아니었다.',
  },
  {
    title: '외무장관 취임 — 유럽 최연소',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 2, startDay: 17,
    description:
      '백혈병으로 죽어가던 에렌탈이 이날 아침 황제의 친서로 해임되고 그날 저녁 사망하면서 ' +
      '그 자리를 이어받았다. 49세로 당시 유럽 최연소 외무장관 — 스스로 부적임이라 여겨 ' +
      '프란츠 요제프에게 직접 청해 고사하려 했다고 전한다.',
  },
  {
    title: '알바니아 독립 — 세르비아 아드리아 진출 저지',
    category: 'DIPLOMATIC',
    startYear: 1912, startMonth: 11, startDay: 28,
    description:
      '블로러 회의의 독립 선언과 그해 12월 런던 대사회의의 자치 승인으로 이어진 알바니아 ' +
      '국가 수립은 세르비아의 아드리아해 출구를 막으려는 그의 완강한 목표의 산물이었다 — ' +
      '신독일인명사전은 그를 «알바니아 국가의 창설자»로 기록한다.',
  },
  {
    title: '스쿠타리 위기 — 몬테네그로 굴복',
    category: 'DIPLOMATIC',
    startYear: 1913, startMonth: 4, startDay: 10,
    endYear: 1913, endMonth: 5, endDay: 14,
    description:
      '몬테네그로가 점령한 스쿠타리(슈코더르)를 두고 열강 해상봉쇄를 이끌어 48시간 내 철수를 ' +
      '요구했고 결국 반환을 관철했다. 같은 해 05-02 공동각의에서는 «세르비아를 동등한 ' +
      '구성체로 제국에 편입»하는 안까지 거론했다 — 사라예보 1년 전이다.',
  },
  {
    title: '대세르비아 최후통첩 — 1914년의 예행연습',
    category: 'DIPLOMATIC',
    startYear: 1913, startMonth: 10, startDay: 18,
    description:
      '알바니아 영토에서 철수하라는 8일 시한의 최후통첩을 직접 기초했고 세르비아는 10-20 ' +
      '수락했다. 독일이 공개 지지했고 그는 동맹국에 사후 통보하는 방식을 썼다 — 1914년 7월과 ' +
      '똑같은 패턴이며, 빈은 여기서 «단기 시한 최후통첩이면 세르비아는 또 물러선다»는 ' +
      '교훈을 얻었다.',
  },
  {
    title: '콘라트의 개전 요구를 스물다섯 차례 거부',
    category: 'POLITICAL',
    startYear: 1913, endYear: 1914,
    description:
      '참모총장 콘라트 폰 회첸도르프의 대세르비아 예방전쟁 요구를 전부 물리쳤고, 그의 입장을 ' +
      '«전쟁, 전쟁, 전쟁»이라 요약했다. 억지의 다른 축이던 프란츠 페르디난트 대공은 1913-02 ' +
      '서한에서 «우리 슬라브인에게 편안하고 공정한 삶을 주면 이레덴티즘은 즉시 그친다»며 ' +
      '전쟁이 아닌 내부 개혁을 주장했다.',
  },
  {
    title: '사라예보 — 억지력의 소멸',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 6, startDay: 28,
    description:
      '전쟁에 가장 완강히 반대하던 프란츠 페르디난트 대공의 암살로 콘라트를 막던 무게추가 ' +
      '사라졌다. 이틀 뒤 그는 이미 세르비아와의 군사적 결판만이 해법이라는 결론에 이르렀다.',
  },
  {
    title: '호요스 사절단 — 독일의 «백지수표»',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 5,
    endYear: 1914, endMonth: 7, endDay: 6,
    description:
      '사라예보 나흘 전 작성된 마체코 각서를 개전 쪽으로 고쳐 쓰고 자신의 추기 — «적들이 ' +
      '우리 머리 위로 조여오는 그물의 실을 단호한 손으로 끊어야 한다» — 를 붙여, 프란츠 ' +
      '요제프의 친서(07-02자)와 함께 비서실장 호요스 편에 베를린으로 보냈다. 빌헬름 2세가 ' +
      '07-05 구두로, 재상 베트만홀베크가 07-06 확인해 준 무조건 지지가 «백지수표»다.',
  },
  {
    title: '공동각의 — «영구히 무해하게»',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 7,
    description:
      '세르비아를 «무력 시위로 영구히 무해하게» 만들 것을 요구했고, 러시아와의 전쟁 가능성을 ' +
      '스스로 인정하면서도 선수를 쳐야 한다고 주장했다. 헝가리 총리 티서만이 홀로 반대했고 ' +
      '07-14 «정복 전쟁을 하지 않고 세르비아를 병합하지 않는다»는 서약을 대가로 돌아섰다.',
  },
  {
    title: '최후통첩 전달 — 48시간',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 23,
    description:
      '07-08부터 무술린 참사관이 기초했고, 07-14 각료 회의에서 «세르비아가 받아들일 수 없어 ' +
      '군사 충돌을 각오해야 할 만큼 강경한 48시간 최후통첩»이라는 설계가 확정되었다. 07-19 ' +
      '공동각의는 최종 문안과 전달 시점을 정하고 «정복 전쟁을 하지 않고 세르비아를 병합하지 ' +
      '않는다»는 선언을 결의했다 — 전달은 프랑스 대통령의 러시아 국빈방문이 끝난 뒤로 일부러 ' +
      '늦췄다. 07-20 황제에게 상신해 07-21 재가, 07-23 오후 6시 기슬 공사가 베오그라드에 ' +
      '열 개 요구와 48시간 시한으로 전달했다.',
  },
  {
    title: '세르비아 회답 거부',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 25,
    description:
      '세르비아는 오후 3시 총동원을 발령한 뒤 오후 5시 55분 파시치 총리 명의로 회답을 ' +
      '건넸다 — 열 개 중 아홉을 수용하고 오스트리아 관리의 세르비아 영내 수사 참여만 헌법을 ' +
      '들어 거부했다. 무조건 수용이 요구였으므로 빈은 불충분하다며 거부했고, 기슬은 그 자리 ' +
      '에서 단교를 선언하고 베오그라드를 떠났다. 07-29에는 영국의 중재 제의도 거절했다.',
  },
  {
    title: '테메시쿠빈 오보와 선전포고',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 28,
    description:
      '07-27 바트이슐에서 황제에게 «세르비아군이 도나우 기선에서 우리 군을 사격했다»는 ' +
      '제4군단 보고를 올리며 선전포고문을 상신했으나, 그런 교전은 실재하지 않았다. 07-28 ' +
      '아침 그 자신이 오보임을 알고 해당 구절을 서명된 문서에서 삭제해, 실제 타전된 ' +
      '선전포고에는 그 문구가 없다. 황제를 속였는지는 지금도 논쟁 — 라우헨슈타이너는 빈 ' +
      '전쟁문서고에 해당 전문이 아예 없음을 확인했고 독일어권 학계는 «황제는 이미 개전을 ' +
      '결심한 뒤라 속일 필요가 없었다»며 고의설에 회의적인 반면, 헤르비히는 허위임을 알고 ' +
      '이용했다고 본다. 선전포고는 그의 서명 전보로 이뤄졌다.',
  },
  {
    title: '외무장관 사임',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 1, startDay: 13,
    description:
      '이탈리아를 붙잡아 두려 트렌티노와 알바니아 해안 일부의 할양을 검토하자 티서와 ' +
      '콘라트가 사임을 압박했다 — 후임은 더 강경한 부리안. 이후 이탈리아 전선의 제16군단 ' +
      '에서 복무했다.',
  },
  {
    title: '카를 대공의 궁내장관',
    category: 'CAREER',
    startYear: 1916, startMonth: 3,
    description:
      '황위 계승자의 궁내장관으로 궁정에 복귀 — 카를 즉위(1916-11) 후 시종장관, 1918년 ' +
      '5~11월 황제의 궁내장관(제국 마지막 재임자)으로 이어졌다.',
  },
  {
    title: '합스부르크 보석 수송·스위스 체류',
    category: 'TRAVEL',
    startYear: 1918, startMonth: 11,
    description:
      '제국이 무너지는 와중에 호프부르크 보물고의 합스부르크가 보석을 스위스로 옮기는 ' +
      '수송을 수행했고, 이후 몇 해를 그곳에 머물렀다.',
  },
  {
    title: '헝가리 은둔',
    category: 'PERSONAL',
    startYear: 1923,
    description:
      '귀환 후 공적 생활에서 물러나 주로 헝가리에서 지냈고, 1931년 부다페스트 저택을 판 뒤 ' +
      '페레스녜 영지에 정착해 회고록을 다듬으며 여생을 보냈다. «나를 좀 내버려 두시오. 그 ' +
      '전쟁 이야기는 오래전부터 지겹소»라 했다는 말이 전한다.',
  },
  {
    title: '페레스녜에서 사망',
    category: 'PERSONAL',
    startYear: 1942, startMonth: 11, startDay: 21,
    description:
      '오랜 중병 끝에 향년 79세로 사망 — 모라비아 부흘로프성 인근 성 바르바라 예배당의 ' +
      '가문 납골묘에 안장되었다. 방대한 일기와 회고록은 끝내 출간되지 않고 빈 국립문서고에 ' +
      '남았다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const BERCHTOLD_STATS = {
  politics: 48,
  military: 18,
  diplomacy: 58,
  intellect: 60,
  charisma: 66,
  administration: 45,
  notes:
    '파리·런던·페테르부르크를 거친 정통 외교관으로 알바니아 국가 수립과 스쿠타리 반환을 ' +
    '관철한 실적은 분명하다(외교) — 다만 그 성과들이 하나같이 «세르비아를 막는다»는 단일 ' +
    '목표에 묶여 있었고, 루마니아를 적대 진영으로 밀어낸 대가를 함께 치렀다. 최대 자산은 ' +
    '6개 국어를 구사하는 교양과 «상냥하고 섬세한 대귀족»이라는 인망(카리스마)이었으나, ' +
    '신독일인명사전이 «불안정하고 세상 물정에 어둡다»고 적었듯 제국 내부의 실제 정치 세력과 ' +
    '닿아 있지 않았다(정치·행정). 콘라트의 개전 요구를 스물다섯 번 물리친 자제와, 1914년 ' +
    '7월 스스로 최후통첩을 밀어붙인 결단이 같은 사람의 것이라는 점이 이 인물 평가의 핵심 ' +
    '난점이다. 군 경력은 없다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedBerchtold(prisma: PrismaService): Promise<void> {
  console.log('\n🎭 레오폴트 베르히톨트(Leopold Berchtold) 시딩 시작 (기존 데이터 보존 모드)...')

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

  const foreignDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '외무장관' },
    select: { id: true },
  })
  const ambassadorDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '대사' },
    select: { id: true },
  })
  const defByTitle: Record<string, string | undefined> = {
    외무장관: foreignDef?.id,
    대사: ambassadorDef?.id,
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        // 영지명 철자가 사료마다 달라 성명 앞부분으로만 식별한다
      { originalName: { contains: 'Leopold Graf Berchtold' } },
        { AND: [{ name: '레오폴트' }, { surname: '베르히톨트' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = BERCHTOLD.originalName
    if (!person.biography) patch.biography = BERCHTOLD.biography
    if (!person.birthPlaceText) patch.birthPlaceText = BERCHTOLD.birthPlaceText
    if (!person.birthNote) patch.birthNote = BERCHTOLD.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = BERCHTOLD.deathPlaceText
    if (!person.deathType) patch.deathType = BERCHTOLD.deathType
    if (!person.deathCause) patch.deathCause = BERCHTOLD.deathCause
    if (!person.deathNote) patch.deathNote = BERCHTOLD.deathNote
    if (person.influence == null) patch.influence = BERCHTOLD.influence
    if (!person.historicalCountryId) patch.historicalCountryId = austriaHungary.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${BERCHTOLD.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${BERCHTOLD.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: BERCHTOLD.name,
        middleName: BERCHTOLD.middleName,
        surname: BERCHTOLD.surname,
        originalName: BERCHTOLD.originalName,
        biography: BERCHTOLD.biography,
        birthDate: toDate(BERCHTOLD.birthYear, BERCHTOLD.birthMonth, BERCHTOLD.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: BERCHTOLD.birthNote,
        deathDate: toDate(BERCHTOLD.deathYear, BERCHTOLD.deathMonth, BERCHTOLD.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: BERCHTOLD.deathType,
        deathCause: BERCHTOLD.deathCause,
        deathNote: BERCHTOLD.deathNote,
        gender: BERCHTOLD.gender,
        nameDisplayOrder: 'western' as any,
        influence: BERCHTOLD.influence,
        birthPlaceText: BERCHTOLD.birthPlaceText,
        deathPlaceText: BERCHTOLD.deathPlaceText,
        historicalCountryId: austriaHungary.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${BERCHTOLD.originalName} (id=${person.id})`)
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
        positionDefinitionId: t.definitionTitle ? defByTitle[t.definitionTitle] : undefined,
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
          '출생·복무 전 기간의 국가. 1918년 제국 해체 후에는 헝가리의 영지에서 살았으나 ' +
          '공직을 맡지 않아 별도 소속을 두지 않는다.',
      },
    })
    console.log('  ✅ 소속국가: 오스트리아-헝가리 제국 (출생·복무 1863~1918)')
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
        politics: BERCHTOLD_STATS.politics,
        military: BERCHTOLD_STATS.military,
        diplomacy: BERCHTOLD_STATS.diplomacy,
        intellect: BERCHTOLD_STATS.intellect,
        charisma: BERCHTOLD_STATS.charisma,
        administration: BERCHTOLD_STATS.administration,
        notes: BERCHTOLD_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${BERCHTOLD_STATS.politics}·군사 ${BERCHTOLD_STATS.military}·` +
        `외교 ${BERCHTOLD_STATS.diplomacy}·학식 ${BERCHTOLD_STATS.intellect}·` +
        `카리스마 ${BERCHTOLD_STATS.charisma}·행정 ${BERCHTOLD_STATS.administration}`,
    )
  }

  console.log('✅ 레오폴트 베르히톨트 시딩 완료\n')
}
