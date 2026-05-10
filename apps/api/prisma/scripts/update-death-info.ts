/**
 * 사망정보 일괄 보강 스크립트 — 153명
 *
 * 사르데냐/이탈리아 왕실, 러시아 황실, 프로이센·독일 왕실, 영국 왕실,
 * 세르비아 왕가, 일본 천황·총리, 청·민국·인민공화국 지도자, 미국·영국·소련·한국 정치인 등
 * 153명에 대해 deathType, deathCause, deathNote, deathPlaceText 일괄 update.
 *
 * 정확성: 알려진 역사 기록 기준. deathNote는 2~5문장으로 압축.
 *
 * 멱등성: 항상 update. 재실행 안전.
 */
import { DeathType } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

import { PrismaService } from '../prisma.service'

type DeathInfo = {
  deathType: DeathType
  deathCause: string
  deathNote: string
  deathPlaceText: string
}

const I = DeathType.ILLNESS
const N = DeathType.NATURAL
const A = DeathType.ASSASSINATION
const E = DeathType.EXECUTION
const X = DeathType.ACCIDENT

const DEATH_INFO: Record<string, DeathInfo> = {
  // ── 사르데냐/이탈리아 왕실 ─────────────────────────────────────────────
  'Vittorio Amedeo II of Sardinia': {
    deathType: I,
    deathCause: '말년 정신 이상 + 자연사',
    deathNote: '1730년 아들 카를로 에마누엘레 3세에게 양위 후 영지 회수 시도로 1731년 9월 폐위되어 몬칼리에리 성에 연금되었다. 정신 이상이 악화된 채 1732년 10월 31일 토리노 인근 몬칼리에리 성에서 향년 66세로 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노 몬칼리에리 성',
  },
  "Anne Marie d'Orléans": {
    deathType: I,
    deathCause: '울혈성 심부전',
    deathNote: '비토리오 아메데오 2세의 부인이자 카를로 에마누엘레 3세의 어머니. 1728년 8월 26일 토리노 왕궁에서 향년 59세로 자연사했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Carlo Emanuele III of Sardinia': {
    deathType: I,
    deathCause: '노환',
    deathNote: '사르데냐 왕국 5대 국왕. 약 43년 재위로 사르데냐 행정 개혁과 7년 전쟁 참전을 주도했다. 1773년 2월 20일 토리노 왕궁에서 향년 71세로 사망.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Anna Cristina of Sulzbach': {
    deathType: I,
    deathCause: '출산 합병증',
    deathNote: '카를로 에마누엘레 3세의 첫 부인. 결혼 9개월 만인 1723년 3월 12일 토리노에서 첫 아들 출산 후 산욕열로 향년 18세에 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Polissena of Hesse-Rheinfels-Rotenburg': {
    deathType: I,
    deathCause: '출산 합병증',
    deathNote: '카를로 에마누엘레 3세의 두 번째 부인. 1735년 1월 13일 토리노에서 출산 합병증으로 향년 28세에 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Elisabeth Therese of Lorraine': {
    deathType: I,
    deathCause: '출산 합병증',
    deathNote: '카를로 에마누엘레 3세의 세 번째 부인. 1741년 7월 3일 토리노에서 출산 합병증으로 향년 30세에 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Vittorio Amedeo III of Sardinia': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '사르데냐 왕국 6대 국왕. 프랑스 혁명전쟁 중 평생 모은 영토를 프랑스에 빼앗긴 충격으로 1796년 4월 28일 케라스코 휴전 직후 토리노 왕궁에서 향년 70세로 뇌졸중으로 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Maria Antonietta of Bourbon-Spain': {
    deathType: I,
    deathCause: '결핵 추정',
    deathNote: '비토리오 아메데오 3세의 부인. 1785년 9월 19일 토리노에서 향년 56세에 자연사했다.',
    deathPlaceText: '사르데냐 왕국 토리노 왕궁',
  },
  'Carlo Emanuele IV of Sardinia': {
    deathType: I,
    deathCause: '노환',
    deathNote: '사르데냐 왕국 7대 국왕. 1802년 동생 비토리오 에마누엘레 1세에게 양위 후 예수회 수도사로 입회했다. 1819년 10월 6일 로마 콜레지오 로마노에서 양위 17년 만에 향년 68세로 사망했다.',
    deathPlaceText: '교황령 로마 콜레지오 로마노',
  },
  'Marie Clotilde of France': {
    deathType: I,
    deathCause: '결핵',
    deathNote: '카를로 에마누엘레 4세의 부인이자 프랑스 루이 16세의 누이. 1802년 3월 7일 나폴리에서 향년 42세에 결핵으로 사망. 후일 가톨릭 교회의 시복(尊者) 칭호를 받았다.',
    deathPlaceText: '나폴리 왕국 나폴리',
  },
  'Vittorio Emanuele I of Sardinia': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '사르데냐 왕국 8대 국왕. 1821년 자유주의 봉기로 동생 카를로 펠리체에게 양위했다. 1824년 1월 10일 모카르체 성에서 향년 64세로 사망했다.',
    deathPlaceText: '사르데냐 왕국 모카르체 성',
  },
  'Maria Teresa of Austria-Este': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '비토리오 에마누엘레 1세의 부인. 1832년 3월 29일 제노바에서 향년 58세로 사망했다.',
    deathPlaceText: '사르데냐 왕국 제노바',
  },
  'Carlo Felice of Sardinia': {
    deathType: I,
    deathCause: '결핵',
    deathNote: '사르데냐 왕국 9대 국왕. 후사 없이 1831년 4월 27일 토리노 모랏조 성에서 향년 65세로 사망했고, 사보이-카리냐노 분지의 카를로 알베르토에게 왕위가 넘어갔다.',
    deathPlaceText: '사르데냐 왕국 토리노 모랏조 성',
  },
  'Maria Cristina of the Two Sicilies': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '카를로 펠리체의 부인. 1849년 3월 11일 사보나에서 향년 70세로 사망했다.',
    deathPlaceText: '사르데냐 왕국 사보나',
  },
  'Carlo Alberto of Sardinia': {
    deathType: I,
    deathCause: '간질환',
    deathNote: '사르데냐 왕국 10대 국왕. 1차 이탈리아 독립 전쟁 노바라 패전 책임으로 1849년 3월 23일 양위·망명했다. 1849년 7월 28일 포르투갈 포르투에서 향년 50세로 사망했다.',
    deathPlaceText: '포르투갈 왕국 포르투',
  },
  'Maria Teresa of Austria-Tuscany': {
    deathType: I,
    deathCause: '콜레라',
    deathNote: '카를로 알베르토의 부인. 1855년 1월 12일 토리노에서 콜레라로 향년 53세로 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노',
  },
  'Vittorio Emanuele II of Italy': {
    deathType: I,
    deathCause: '말라리아성 발열 + 폐렴',
    deathNote: '통일 이탈리아 왕국의 초대 국왕. 1878년 1월 9일 로마 퀴리날레 궁에서 말라리아성 발열과 폐렴 합병증으로 향년 57세로 사망했다. 매장지는 로마 판테온.',
    deathPlaceText: '이탈리아 왕국 로마 퀴리날레 궁',
  },
  'Maria Adelaide of Austria': {
    deathType: I,
    deathCause: '복막염',
    deathNote: '비토리오 에마누엘레 2세의 부인. 1855년 1월 20일 토리노에서 출산 후 복막염으로 향년 32세에 사망했다.',
    deathPlaceText: '사르데냐 왕국 토리노',
  },
  'Umberto I of Italy': {
    deathType: A,
    deathCause: '아나키스트 가에타노 브레시의 권총 암살',
    deathNote: '통일 이탈리아 왕국 2대 국왕. 1900년 7월 29일 몬차에서 미국 이주 아나키스트 가에타노 브레시(Gaetano Bresci)에게 권총 4발로 피격되어 향년 56세로 사망했다. 1898년 밀라노 봉기 진압 명령에 대한 보복이었다.',
    deathPlaceText: '이탈리아 왕국 몬차',
  },
  'Margherita of Savoy': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '움베르토 1세의 부인이자 비토리오 에마누엘레 3세의 어머니. 1926년 1월 4일 보르디게라에서 향년 74세로 사망했다. 마르게리타 피자의 어원 인물이다.',
    deathPlaceText: '이탈리아 왕국 보르디게라',
  },
  'Vittorio Emanuele III of Italy': {
    deathType: I,
    deathCause: '폐색전',
    deathNote: '통일 이탈리아 왕국 3대 국왕. 1946년 5월 9일 양위 후 같은 해 6월 공화국 수립으로 망명했다. 1947년 12월 28일 이집트 알렉산드리아에서 향년 78세로 사망했다.',
    deathPlaceText: '이집트 알렉산드리아',
  },
  'Elena of Montenegro': {
    deathType: I,
    deathCause: '복강 종양',
    deathNote: '비토리오 에마누엘레 3세의 부인. 1952년 11월 28일 망명지 프랑스 몽펠리에에서 향년 79세로 사망했다.',
    deathPlaceText: '프랑스 몽펠리에',
  },
  'Umberto II of Italy': {
    deathType: I,
    deathCause: '갈비뼈 골수 종양',
    deathNote: '통일 이탈리아 왕국 마지막 국왕. 약 한 달간 재위(1946년 5월~6월) 후 망명했다. 1983년 3월 18일 스위스 제네바에서 향년 78세로 사망했다.',
    deathPlaceText: '스위스 제네바',
  },
  'Marie José of Belgium': {
    deathType: I,
    deathCause: '폐암',
    deathNote: '움베르토 2세의 부인. 2001년 1월 27일 스위스 제네바에서 향년 94세로 사망했다.',
    deathPlaceText: '스위스 제네바',
  },

  // ── 러시아 황실 ─────────────────────────────────────────────────────
  'Ivan V of Russia': {
    deathType: I,
    deathCause: '병약·노환 합병증',
    deathNote: '평생 병약했던 황제. 표트르 1세와 1682년부터 1696년까지 공동 황제로 재위했다. 1696년 2월 8일 모스크바 크렘린에서 향년 29세로 사망했다.',
    deathPlaceText: '러시아 차르국 모스크바 크렘린',
  },
  'Peter I of Russia': {
    deathType: I,
    deathCause: '방광염·요로결석 + 패혈증',
    deathNote: '표트르 대제. 1724년 가을 핀란드 만에서 익사 위기의 군인들을 구하다 폐렴에 걸렸다. 1725년 2월 8일 상트페테르부르크 겨울궁전에서 향년 52세로 사망했다. 후계자를 미지정한 채 사망해 부인 카타리나 1세가 즉위했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Catherine I of Russia': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '표트르 대제의 두 번째 부인. 1725년 즉위 후 약 2년 만인 1727년 5월 17일 상트페테르부르크에서 향년 43세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Alexei Petrovich of Russia': {
    deathType: E,
    deathCause: '고문 후 옥중 사망 (의문사)',
    deathNote: '표트르 1세의 장남이자 후계자. 부친에 반항해 빈으로 망명했다 귀국한 후 1718년 6월 26일 상트페테르부르크 페트로파블롭스크 요새에서 약 28세에 의문사했다. 공식 발표는 발작 사망이었으나 고문 후 살해된 것으로 추정된다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 페트로파블롭스크 요새',
  },
  'Anna Petrovna of Russia': {
    deathType: I,
    deathCause: '출산 합병증',
    deathNote: '표트르 1세의 딸이자 표트르 3세의 어머니. 1728년 5월 15일 슐레스비히-홀슈타인 키일에서 출산 후 향년 20세에 산욕열로 사망했다.',
    deathPlaceText: '슐레스비히-홀슈타인 공국 키일',
  },
  'Peter II of Russia': {
    deathType: I,
    deathCause: '천연두',
    deathNote: '알렉세이 페트로비치의 아들. 11세에 즉위해 약 3년 재위한 후 1730년 1월 30일 모스크바 크렘린에서 향년 14세에 천연두로 사망했다.',
    deathPlaceText: '러시아 제국 모스크바 크렘린',
  },
  'Anna of Russia': {
    deathType: I,
    deathCause: '신장 결석 합병증',
    deathNote: '이반 5세의 딸. 1730년 즉위 후 약 10년 재위했다. 1740년 10월 28일 상트페테르부르크 겨울궁전에서 향년 47세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Ivan VI of Russia': {
    deathType: E,
    deathCause: '슐리셀부르크 요새 살해',
    deathNote: '안나 황제 후계자. 생후 2개월에 즉위해 약 13개월 재위한 후 1741년 폐위되어 23년간 슐리셀부르크 요새에 유폐되었다. 1764년 7월 16일 미로비치의 봉기 시도 중 경비병에게 살해되어 향년 23세로 사망했다.',
    deathPlaceText: '러시아 제국 슐리셀부르크 요새',
  },
  'Elizabeth of Russia': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '표트르 대제의 딸. 1741년 즉위 후 약 21년 재위했다. 1762년 1월 5일 상트페테르부르크 겨울궁전에서 향년 52세에 뇌졸중으로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Peter III of Russia': {
    deathType: A,
    deathCause: '쿠데타 후 알렉세이 오를로프 등에 의한 살해',
    deathNote: '1762년 1월 즉위해 6개월 재위한 후 7월 9일 부인 카타리나 2세의 쿠데타로 폐위되었다. 7월 17일 로프샤에서 알렉세이 오를로프 등에게 살해되어 향년 34세로 사망했다.',
    deathPlaceText: '러시아 제국 로프샤 궁',
  },
  'Catherine II of Russia': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '예카테리나 대제. 1762년 즉위 후 약 34년 재위했다. 1796년 11월 17일 상트페테르부르크 겨울궁전에서 향년 67세에 뇌졸중으로 쓰러져 다음 날 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Paul I of Russia': {
    deathType: A,
    deathCause: '궁중 쿠데타 — 목 졸림 살해',
    deathNote: '예카테리나 대제의 아들. 1796년 즉위 후 약 5년 재위했다. 1801년 3월 23일 상트페테르부르크 미하일롭스키 궁에서 귀족 쿠데타로 향년 46세에 살해되었다. 후계자 알렉산드르 1세는 직접 가담을 부인했으나 음모를 인지한 것으로 알려졌다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 미하일롭스키 궁',
  },
  'Maria Feodorovna (Sophie Dorothea of Württemberg)': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '파울 1세의 부인이자 알렉산드르 1세·니콜라이 1세의 어머니. 1828년 11월 5일 상트페테르부르크에서 향년 69세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Maria Fyodorovna of Russia (Paul I)': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '파울 1세의 부인이자 알렉산드르 1세·니콜라이 1세의 어머니. 1828년 11월 5일 상트페테르부르크에서 향년 69세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Alexander I of Russia': {
    deathType: I,
    deathCause: '발진티푸스 (가짜 사망설 있음)',
    deathNote: '1801년 즉위 후 약 24년 재위. 나폴레옹 격퇴와 빈 회의를 주도했다. 1825년 12월 1일 흑해 연안 타간로크에서 향년 47세로 사망했다. 일부 학설에서는 시베리아로 떠나 표도르 쿠즈미치라는 이름으로 1864년까지 살았다는 가짜 사망설이 있다.',
    deathPlaceText: '러시아 제국 타간로크',
  },
  'Elizaveta Alexeievna of Russia': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알렉산드르 1세의 부인. 남편 사망 약 5개월 후 귀환 길에 1826년 5월 16일 벨료프 인근에서 향년 47세로 사망했다.',
    deathPlaceText: '러시아 제국 벨료프',
  },
  'Nicholas I of Russia': {
    deathType: I,
    deathCause: '폐렴 (자살설 있음)',
    deathNote: '1825년 12월 데카브리스트 봉기 진압 후 즉위해 약 30년 재위했다. 크리미아 전쟁 중 1855년 3월 2일 상트페테르부르크 겨울궁전에서 향년 58세로 사망했다. 패전 충격에 의한 자살설(독약 복용)도 있으나 학술적 다수설은 폐렴이다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Alexandra Fyodorovna of Russia (Nicholas I)': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '니콜라이 1세의 부인. 1860년 11월 1일 차르스코예 셀로에서 향년 62세로 사망했다.',
    deathPlaceText: '러시아 제국 차르스코예 셀로',
  },
  'Alexander II of Russia': {
    deathType: A,
    deathCause: '인민의 의지파 폭탄 테러',
    deathNote: '1855년 즉위, 1861년 농노 해방 등 대개혁을 주도했다. 약 26년 재위 중 약 6번의 암살 시도가 있었다. 1881년 3월 13일 상트페테르부르크 그리보예도프 운하에서 인민의 의지파의 폭탄 테러로 두 다리가 절단되어 약 한 시간 후 향년 62세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 그리보예도프 운하',
  },
  'Maria Alexandrovna of Russia': {
    deathType: I,
    deathCause: '결핵',
    deathNote: '알렉산드르 2세의 첫 부인. 1880년 6월 3일 상트페테르부르크 겨울궁전에서 향년 55세에 결핵으로 사망했다. 사망 약 2개월 후 알렉산드르 2세가 정부 예카테리나 돌고루코바와 재혼했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크 겨울궁전',
  },
  'Ekaterina Dolgorukova': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알렉산드르 2세의 두 번째 부인(귀천 결혼). 남편 암살 후 망명, 1922년 2월 15일 프랑스 니스에서 향년 74세로 사망했다.',
    deathPlaceText: '프랑스 니스',
  },
  'Alexander III of Russia': {
    deathType: I,
    deathCause: '신장병 (사구체 신염)',
    deathNote: '1881년 즉위 후 약 13년 재위. 보수적 반동 정책으로 알려졌다. 1894년 11월 1일 크리미아 리바디아 궁에서 향년 49세에 신장병으로 사망했다.',
    deathPlaceText: '러시아 제국 크리미아 리바디아 궁',
  },
  'Maria Fyodorovna of Russia (Alexander III)': {
    deathType: I,
    deathCause: '노환',
    deathNote: '알렉산드르 3세의 부인이자 덴마크 글룩스부르크 왕녀(다그마). 1917년 혁명 후 망명했다. 1928년 10월 13일 덴마크 코펜하겐 인근 비드뢰레 궁에서 향년 80세로 사망했다.',
    deathPlaceText: '덴마크 비드뢰레 궁',
  },
  'Nicholas II of Russia': {
    deathType: E,
    deathCause: '볼셰비키 정권의 처형',
    deathNote: '러시아 제국의 마지막 황제. 1894년 즉위 후 약 23년 재위했다. 1917년 2월 혁명으로 퇴위, 1918년 7월 17일 우랄 예카테린부르크 이파티예프 가에서 가족 7명과 함께 볼셰비키 정권에 의해 향년 50세에 처형되었다. 시신은 1991년 발견되어 1998년 상트페테르부르크 페트로파블롭스크 요새에 안치되었다.',
    deathPlaceText: '러시아 소비에트 우랄 예카테린부르크 이파티예프 가',
  },
  'Alexandra Fyodorovna of Russia (Nicholas II)': {
    deathType: E,
    deathCause: '볼셰비키 정권의 처형',
    deathNote: '니콜라이 2세의 부인이자 헤센 왕녀(알릭스). 남편과 함께 1918년 7월 17일 예카테린부르크에서 향년 46세에 처형되었다. 1981년 러시아 정교회에서 시성되었다.',
    deathPlaceText: '러시아 소비에트 우랄 예카테린부르크 이파티예프 가',
  },

  // ── 호엔촐레른 프로이센·독일 ───────────────────────────────────────────
  'Friedrich Wilhelm II of Prussia': {
    deathType: I,
    deathCause: '복부 종양 (간암 추정)',
    deathNote: '1786년 즉위 후 약 11년 재위했다. 1797년 11월 16일 베를린 마르모르 궁에서 향년 53세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린 마르모르 궁',
  },
  'Friederike Luise of Hesse-Darmstadt': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '프리드리히 빌헬름 2세의 부인. 1805년 2월 25일 베를린에서 향년 53세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린',
  },
  '프리데리케 루이제': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '프리드리히 빌헬름 2세의 부인. 1805년 2월 25일 베를린에서 향년 53세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린',
  },
  'Friedrich Wilhelm III': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '1797년 즉위 후 약 43년 재위했다. 나폴레옹 전쟁 중 패전과 부흥을 모두 경험했다. 1840년 6월 7일 베를린 왕궁에서 향년 69세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린 왕궁',
  },
  'Luise of Mecklenburg-Strelitz': {
    deathType: I,
    deathCause: '폐결핵 추정',
    deathNote: '프리드리히 빌헬름 3세의 부인. 1810년 7월 19일 호엔치라이츠 성에서 향년 34세로 사망했다. 나폴레옹에 맞선 프로이센 애국주의의 상징이 되었다.',
    deathPlaceText: '프로이센 왕국 호엔치라이츠 성',
  },
  'Friedrich Wilhelm IV': {
    deathType: I,
    deathCause: '뇌졸중 후 정신 이상',
    deathNote: '1840년 즉위 후 약 21년 재위했다. 1857년 뇌졸중 후 정신 이상이 악화되어 1861년 1월 2일 포츠담 상수시 궁에서 향년 65세로 사망했다. 1858년부터는 동생 빌헬름이 섭정했다.',
    deathPlaceText: '프로이센 왕국 포츠담 상수시 궁',
  },
  'Elisabeth Ludovika of Bavaria': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '프리드리히 빌헬름 4세의 부인. 1873년 12월 14일 드레스덴에서 향년 72세로 사망했다.',
    deathPlaceText: '독일 제국 드레스덴',
  },
  'Wilhelm I': {
    deathType: N,
    deathCause: '노환 (90세)',
    deathNote: '1861년 프로이센 왕 즉위, 1871년 통일 독일 제국 황제로 즉위했다. 약 27년 재위 후 1888년 3월 9일 베를린 왕궁에서 향년 90세에 자연사했다. 1888년 3황제의 해의 시작이었다.',
    deathPlaceText: '독일 제국 베를린 왕궁',
  },
  'Augusta of Saxe-Weimar-Eisenach': {
    deathType: I,
    deathCause: '인플루엔자',
    deathNote: '빌헬름 1세의 부인. 남편 사망 약 2년 후 1890년 1월 7일 베를린에서 향년 79세로 사망했다.',
    deathPlaceText: '독일 제국 베를린',
  },
  'Friedrich III': {
    deathType: I,
    deathCause: '후두암',
    deathNote: '1888년 3월 9일 즉위했으나 약 99일 만인 6월 15일 포츠담 노이에스 궁에서 향년 56세에 후두암으로 사망했다. 자유주의적 개혁 의지를 가졌으나 짧은 재위로 실현하지 못했다. 1888년 3황제의 해의 두 번째 황제였다.',
    deathPlaceText: '독일 제국 포츠담 노이에스 궁',
  },
  '프리드리히': {
    deathType: I,
    deathCause: '후두암',
    deathNote: '1888년 3월 9일 즉위했으나 약 99일 만인 6월 15일 포츠담 노이에스 궁에서 향년 56세에 후두암으로 사망했다. 자유주의적 개혁 의지를 가졌으나 짧은 재위로 실현하지 못했다.',
    deathPlaceText: '독일 제국 포츠담 노이에스 궁',
  },
  'Victoria, Princess Royal': {
    deathType: I,
    deathCause: '척추암',
    deathNote: '프리드리히 3세의 부인이자 영국 빅토리아 1세의 장녀, 빌헬름 2세의 어머니. 1901년 8월 5일 함부르크 인근 프리드리히스호프 궁에서 향년 60세로 사망했다.',
    deathPlaceText: '독일 제국 프리드리히스호프 궁',
  },
  '빅토리아': {
    deathType: I,
    deathCause: '척추암',
    deathNote: '프리드리히 3세의 부인이자 영국 빅토리아 1세의 장녀, 빌헬름 2세의 어머니. 1901년 8월 5일 프리드리히스호프 궁에서 향년 60세로 사망했다.',
    deathPlaceText: '독일 제국 프리드리히스호프 궁',
  },
  'Wilhelm II': {
    deathType: I,
    deathCause: '폐색전증',
    deathNote: '1888년 즉위 후 약 30년 재위했다. 1차 세계대전 패전으로 1918년 11월 28일 퇴위·네덜란드로 망명했다. 약 23년의 망명 생활 후 1941년 6월 4일 네덜란드 도르른 하우스에서 향년 82세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  '빌헬름': {
    deathType: I,
    deathCause: '폐색전증',
    deathNote: '1888년 즉위 후 약 30년 재위. 1차 세계대전 패전으로 1918년 11월 28일 퇴위·네덜란드로 망명했다. 1941년 6월 4일 도르른 하우스에서 향년 82세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  'Augusta Victoria of Schleswig-Holstein': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '빌헬름 2세의 첫 부인. 망명지에서 1921년 4월 11일 네덜란드 도르른 하우스에서 향년 62세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  'Hermine of Reuss': {
    deathType: I,
    deathCause: '심부전',
    deathNote: '빌헬름 2세의 두 번째 부인. 1947년 8월 7일 동독 프랑크푸르트 안 데어 오데르 인근 살리츠펠트에서 소련 점령 중 향년 59세로 사망했다.',
    deathPlaceText: '소련 점령지 살리츠펠트',
  },

  // ── 영국 왕실 ───────────────────────────────────────────────────────
  'Edward, Duke of Kent': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '빅토리아 여왕의 아버지. 1820년 1월 23일 시드머스에서 폐렴으로 향년 52세로 사망했다. 빅토리아는 당시 8개월 영아였다.',
    deathPlaceText: '영국 잉글랜드 시드머스',
  },
  'Victoria of Saxe-Coburg-Saalfeld': {
    deathType: I,
    deathCause: '심부전',
    deathNote: '빅토리아 여왕의 어머니. 1861년 3월 16일 윈저성에서 향년 74세로 사망했다.',
    deathPlaceText: '영국 윈저성',
  },
  'Ernest I, Duke of Saxe-Coburg and Gotha': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알베르트 공의 아버지. 작센-코부르크-고타 공국 초대 공작. 1844년 1월 29일 코부르크 거주지에서 향년 59세로 사망했다.',
    deathPlaceText: '작센-코부르크-고타 공국 코부르크',
  },
  '에른스트': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알베르트 공의 아버지. 작센-코부르크-고타 공국 초대 공작. 1844년 1월 29일 코부르크 거주지에서 향년 59세로 사망했다.',
    deathPlaceText: '작센-코부르크-고타 공국 코부르크',
  },
  'Louise of Saxe-Gotha-Altenburg': {
    deathType: I,
    deathCause: '자궁암',
    deathNote: '알베르트 공의 어머니. 남편 에른스트 1세의 정부 문제로 1824년 이혼·추방되었다. 1831년 8월 30일 파리에서 향년 31세에 자궁암으로 사망했다. 알베르트가 8세에 영영 이별했다.',
    deathPlaceText: '프랑스 파리',
  },
  'Albert of Saxe-Coburg and Gotha': {
    deathType: I,
    deathCause: '장티푸스',
    deathNote: '빅토리아 여왕의 부군. 1861년 12월 14일 윈저성에서 장티푸스로 향년 42세로 사망했다. 빅토리아는 약 40년간 미망인 생활을 했다.',
    deathPlaceText: '영국 윈저성',
  },
  'Victoria': {
    deathType: I,
    deathCause: '뇌출혈',
    deathNote: '빅토리아 여왕. 약 64년 재위(1837~1901)로 영국 군주 중 두 번째로 긴 재위 기록을 남겼다. 1901년 1월 22일 와이트섬 오스본 하우스에서 향년 81세로 사망했다. 매장지는 윈저 프로그모어 묘다.',
    deathPlaceText: '영국 와이트섬 오스본 하우스',
  },
  'Edward VII': {
    deathType: I,
    deathCause: '심장병 + 기관지염',
    deathNote: '빅토리아 여왕의 아들. 1901년 즉위 후 약 9년 재위했다. 1910년 5월 6일 버킹엄 궁에서 향년 68세에 심장 발작으로 사망했다.',
    deathPlaceText: '영국 런던 버킹엄 궁',
  },
  'Alice Maud Mary': {
    deathType: I,
    deathCause: '디프테리아',
    deathNote: '빅토리아 여왕의 셋째 딸이자 헤센-다름슈타트 대공비. 가족이 디프테리아 유행 중이던 1878년 12월 14일 다름슈타트에서 향년 35세로 사망했다. 사망일이 부친 알베르트 공 사망 17주기와 같은 날이었다.',
    deathPlaceText: '헤센-다름슈타트 대공국 다름슈타트',
  },
  '앨리스 모드 메리': {
    deathType: I,
    deathCause: '디프테리아',
    deathNote: '빅토리아 여왕의 셋째 딸이자 헤센-다름슈타트 대공비. 가족이 디프테리아 유행 중이던 1878년 12월 14일 다름슈타트에서 향년 35세로 사망했다.',
    deathPlaceText: '헤센-다름슈타트 대공국 다름슈타트',
  },
  '앨프리드 어니스트 앨버트': {
    deathType: I,
    deathCause: '인후암',
    deathNote: '빅토리아 여왕의 차남. 작센-코부르크-고타 2대 공작. 1900년 7월 31일 코부르크 인근 로젠나우 성에서 향년 55세로 사망했다.',
    deathPlaceText: '독일 제국 로젠나우 성',
  },

  // ── 세르비아 왕가 ───────────────────────────────────────────────────
  'Aleksandar Karađorđević': {
    deathType: I,
    deathCause: '노환',
    deathNote: '세르비아 공국 카라조르제비치 1세 통치자(1842~1858). 1858년 폐위 후 망명했다. 1885년 5월 3일 헝가리 테미슈바르(현 루마니아 티미쇼아라)에서 향년 78세로 사망했다.',
    deathPlaceText: '오스트리아-헝가리 테미슈바르',
  },
  'Persida Nenadović': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알렉산다르 카라조르제비치의 부인. 1873년 3월 29일 비엔나에서 향년 60세로 사망했다.',
    deathPlaceText: '오스트리아-헝가리 비엔나',
  },
  'Petar I Karađorđević': {
    deathType: I,
    deathCause: '노환·심장병',
    deathNote: '세르비아 왕(1903~1918)이자 유고슬라비아 왕국 초대 국왕(1918~1921). 1921년 8월 16일 베오그라드에서 향년 76세로 사망했다.',
    deathPlaceText: '유고슬라비아 왕국 베오그라드',
  },
  'Zorka of Montenegro': {
    deathType: I,
    deathCause: '출산 합병증',
    deathNote: '페타르 1세의 부인. 1890년 3월 16일 몬테네그로 체티니에에서 출산 후 향년 25세에 산욕열로 사망했다.',
    deathPlaceText: '몬테네그로 체티니에',
  },
  'Miloš I Obrenović': {
    deathType: I,
    deathCause: '노환',
    deathNote: '세르비아 공국 오브레노비치 1세 통치자(1815~1839, 1858~1860). 두 번에 걸쳐 통치했다. 1860년 9월 26일 베오그라드에서 향년 80세에 자연사했다.',
    deathPlaceText: '세르비아 공국 베오그라드',
  },
  'Ljubica Obrenović': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '밀로시 1세의 부인. 1839년 남편 폐위 후 망명했다. 1843년 5월 26일 노비사드에서 향년 54세로 사망했다.',
    deathPlaceText: '오스트리아 노비사드',
  },
  'Mihailo III Obrenović': {
    deathType: A,
    deathCause: '베오그라드 코슈트닉 공원에서 권총 암살',
    deathNote: '세르비아 공작(1839~1842, 1860~1868). 1868년 6월 10일 베오그라드 코슈트닉 공원에서 정적의 권총 4발 피격으로 향년 44세로 사망했다.',
    deathPlaceText: '세르비아 공국 베오그라드 코슈트닉 공원',
  },
  'Júlia Hunyady': {
    deathType: I,
    deathCause: '노환',
    deathNote: '미하일로 3세의 부인. 1919년 2월 19일 베네치아에서 향년 87세로 사망했다.',
    deathPlaceText: '이탈리아 베네치아',
  },
  'Milan II Obrenović': {
    deathType: I,
    deathCause: '결핵',
    deathNote: '세르비아 공작 밀란 오브레노비치 2세. 1839년 6월 25일 즉위 약 26일 만에 향년 19세에 결핵으로 사망했다.',
    deathPlaceText: '세르비아 공국 베오그라드',
  },
  'Milan I of Serbia': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '세르비아 공작(1868~1882)이자 세르비아 왕(1882~1889). 1889년 양위 후 망명했다. 1901년 2월 11일 비엔나에서 향년 46세로 사망했다.',
    deathPlaceText: '오스트리아-헝가리 비엔나',
  },
  'Natalija Obrenović': {
    deathType: I,
    deathCause: '노환',
    deathNote: '밀란 1세의 부인. 1888년 이혼 후 망명했다. 1941년 5월 8일 프랑스 생드니에서 향년 81세로 사망했다.',
    deathPlaceText: '프랑스 생드니',
  },
  'Aleksandar Obrenović': {
    deathType: A,
    deathCause: '5월 쿠데타 — 군 장교들의 암살',
    deathNote: '세르비아 왕(1889~1903). 1903년 6월 11일 베오그라드 왕궁에서 부인 드라가와 함께 군 장교들의 쿠데타로 약 30회 칼·총상을 입어 향년 26세로 사망했다. 시신은 창문 밖으로 던져졌다. 카라조르제비치 가문 복귀의 계기가 되었다.',
    deathPlaceText: '세르비아 왕국 베오그라드 왕궁',
  },
  'Draga Obrenović': {
    deathType: A,
    deathCause: '5월 쿠데타 — 군 장교들의 암살',
    deathNote: '알렉산다르 오브레노비치의 부인. 1903년 6월 11일 베오그라드 왕궁에서 남편과 함께 향년 41세에 살해되었다.',
    deathPlaceText: '세르비아 왕국 베오그라드 왕궁',
  },

  // ── 일본 ──────────────────────────────────────────────────────────
  'Tokugawa Ieyoshi (徳川家慶)': {
    deathType: I,
    deathCause: '심장 발작 (열사병 추정)',
    deathNote: '에도 막부 12대 쇼군. 1853년 7월 27일 에도성에서 매슈 페리 함대 도래 약 1개월 후 향년 60세로 사망했다. 쿠로후네 도래의 충격이 임종을 앞당겼다고 평가된다.',
    deathPlaceText: '에도 막부 무사시국 에도성',
  },
  'Tokugawa Nariaki (徳川斉昭)': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '미토번 9대 번주. 안세이 대옥(1858~1859)으로 영구 칩거 처분을 받았다. 1860년 9월 29일 미토에서 향년 60세로 사망했다. 사망 약 6개월 후 사쿠라다몬가이 사건으로 이이 나오스케가 암살되었다.',
    deathPlaceText: '에도 막부 히타치국 미토',
  },
  'Hayashi Akira (林韑/林復斎)': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '에도 막부 다이가쿠노카미. 1854년 페리 함대와 가나가와 조약을 체결했다. 1859년 7월 13일 에도에서 향년 58세로 사망했다.',
    deathPlaceText: '에도 막부 무사시국 에도',
  },
  'Abe Masahiro (阿部正弘)': {
    deathType: I,
    deathCause: '노환·과로',
    deathNote: '에도 막부 로주 수석. 페리 함대 도래에 대응한 정치적 과로로 1857년 8월 6일 에도에서 향년 38세로 사망했다.',
    deathPlaceText: '에도 막부 무사시국 에도',
  },
  'Emperor Meiji (Mutsuhito)': {
    deathType: I,
    deathCause: '당뇨병성 요독증',
    deathNote: '메이지 천황. 약 45년 재위했다. 1912년 7월 30일 도쿄 황궁에서 향년 59세로 사망했다. 메이지 시대의 종결이었다.',
    deathPlaceText: '일본 제국 도쿄 황궁',
  },
  'Emperor Taishō (Yoshihito)': {
    deathType: I,
    deathCause: '심장 발작 (수막염 후유증)',
    deathNote: '다이쇼 천황. 약 14년 재위했다. 어릴 때부터 병약했고, 1926년 12월 25일 가나가와 하야마 별궁에서 향년 47세로 사망했다.',
    deathPlaceText: '일본 제국 가나가와 하야마 별궁',
  },
  'Emperor Shōwa (Hirohito)': {
    deathType: I,
    deathCause: '십이지장암',
    deathNote: '쇼와 천황. 약 63년 재위로 일본사 최장기 재위 군주가 되었다. 1989년 1월 7일 도쿄 황궁에서 향년 87세로 사망했다. 쇼와 시대의 종결이었다.',
    deathPlaceText: '일본 제국 도쿄 황궁',
  },
  'Itō Hirobumi': {
    deathType: A,
    deathCause: '안중근 의사의 권총 저격',
    deathNote: '일본 제국 초대 내각총리대신이자 한국 통감(1906~1909). 1909년 10월 26일 만주 하얼빈역에서 안중근 의사의 권총 3발 피격으로 향년 68세로 사망했다.',
    deathPlaceText: '청 만주 하얼빈역',
  },
  'Yamagata Aritomo': {
    deathType: I,
    deathCause: '기관지염',
    deathNote: '일본 제국 3·9대 내각총리대신이자 일본 육군의 사실상 창설자. 1922년 2월 1일 도쿄 시바 별저에서 향년 83세로 사망했다.',
    deathPlaceText: '일본 제국 도쿄 시바',
  },
  'Ōkuma Shigenobu': {
    deathType: I,
    deathCause: '담석증',
    deathNote: '일본 제국 8·17대 내각총리대신이자 와세다대학 창설자. 1922년 1월 10일 도쿄 와세다 자택에서 향년 83세로 사망했다.',
    deathPlaceText: '일본 제국 도쿄 와세다',
  },
  'Matsukata Masayoshi': {
    deathType: I,
    deathCause: '노환',
    deathNote: '일본 제국 4·6대 내각총리대신. 메이지 재정 개혁을 주도했다. 1924년 7월 2일 도쿄에서 향년 89세로 사망했다.',
    deathPlaceText: '일본 제국 도쿄',
  },
  'Kuroda Kiyotaka': {
    deathType: I,
    deathCause: '뇌출혈',
    deathNote: '일본 제국 2대 내각총리대신이자 홋카이도 개척사. 1900년 8월 23일 도쿄에서 향년 60세로 사망했다.',
    deathPlaceText: '일본 제국 도쿄',
  },
  'Yoshida Shigeru': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '일본 45·48-51대 내각총리대신. 전후 일본 외교 노선을 정립했다. 1967년 10월 20일 도쿄 오이소 자택에서 향년 89세로 사망했다.',
    deathPlaceText: '일본 도쿄 오이소',
  },
  'Shidehara Kijūrō': {
    deathType: I,
    deathCause: '심장 발작',
    deathNote: '일본 44대 내각총리대신이자 협조 외교의 주역. 1951년 3월 10일 도쿄 중의원 본회의 중 향년 78세로 사망했다.',
    deathPlaceText: '일본 도쿄 중의원',
  },
  'Higashikuni Naruhiko': {
    deathType: I,
    deathCause: '노환',
    deathNote: '일본 43대 내각총리대신이자 황족 출신. 1990년 1월 20일 도쿄에서 향년 102세로 사망했다. 일본 역대 총리 중 최장수 기록이다.',
    deathPlaceText: '일본 도쿄',
  },
  'Katayama Tetsu': {
    deathType: I,
    deathCause: '노환',
    deathNote: '일본 46대 내각총리대신이자 사회당 출신. 1978년 5월 30일 도쿄에서 향년 90세로 사망했다.',
    deathPlaceText: '일본 도쿄',
  },
  'Ashida Hitoshi': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '일본 47대 내각총리대신. 1959년 6월 20일 도쿄에서 향년 71세로 사망했다.',
    deathPlaceText: '일본 도쿄',
  },
  'Ikeda Hayato': {
    deathType: I,
    deathCause: '인후암',
    deathNote: '일본 58·59·60대 내각총리대신이자 소득배증 정책을 주도했다. 1965년 8월 13일 도쿄대 부속병원에서 향년 65세로 사망했다.',
    deathPlaceText: '일본 도쿄대 부속병원',
  },
  'Kawabe Torashirō': {
    deathType: I,
    deathCause: '노환',
    deathNote: '일본 제국 육군 중장. 1945년 종전 시 마닐라 회담 일본측 대표였다. 1960년 1월 25일 도쿄에서 향년 69세로 사망했다.',
    deathPlaceText: '일본 도쿄',
  },

  // ── 중국 청·민국·인민공화국 ────────────────────────────────────────
  'Qianlong Emperor (Aisin Gioro Hongli)': {
    deathType: I,
    deathCause: '노환',
    deathNote: '청 6대 황제로 약 60년 재위했다. 1796년 양위 후 1799년 2월 7일 베이징 자금성에서 향년 87세로 사망했다. 청 최고 전성기를 이끌었다.',
    deathPlaceText: '청 베이징 자금성',
  },
  'Daoguang Emperor (Aisin Gioro Mianning)': {
    deathType: I,
    deathCause: '심부전 + 우울증',
    deathNote: '청 8대 황제로 약 30년 재위했다. 1차 아편 전쟁 패배 후 만성 우울증을 앓았다. 1850년 2월 25일 베이징 자금성에서 향년 67세로 사망했다.',
    deathPlaceText: '청 베이징 자금성',
  },
  'Lin Zexu': {
    deathType: I,
    deathCause: '이질',
    deathNote: '청 흠차대신으로 1839년 광저우 아편 소각을 주도했다. 1840년 패전 책임으로 신장 위구르로 유배되었다 복귀했다. 1850년 11월 22일 광동성 차오저우에서 태평천국 진압 임무 수행 중 향년 65세로 사망했다.',
    deathPlaceText: '청 광동성 차오저우',
  },
  'Qiying (Kiying)': {
    deathType: E,
    deathCause: '독약 사약',
    deathNote: '청 흠차대신이자 1842년 난징 조약의 체결자. 1858년 6월 29일 톈진 조약 협상 실패 책임으로 함풍제로부터 사약 처분을 받아 향년 71세로 사망했다.',
    deathPlaceText: '청 베이징',
  },
  'Mao Zedong (毛澤東)': {
    deathType: I,
    deathCause: '루게릭병 (ALS) + 심장병',
    deathNote: '중화인민공화국 초대 주석. 1976년 9월 9일 베이징 중난하이에서 향년 82세로 사망했다. 사인은 루게릭병에 따른 호흡 부전과 심장병의 복합 합병증이었다.',
    deathPlaceText: '중화인민공화국 베이징 중난하이',
  },
  'Zhou Enlai (周恩來)': {
    deathType: I,
    deathCause: '방광암',
    deathNote: '중화인민공화국 초대 총리. 1976년 1월 8일 베이징 305 병원에서 향년 77세로 사망했다. 1972년 진단된 방광암으로 약 4년간 투병했고, 같은 해 9월 마오 쩌둥도 사망했다.',
    deathPlaceText: '중화인민공화국 베이징 305 병원',
  },
  'Peng Dehuai (彭德懷)': {
    deathType: I,
    deathCause: '대장암 (문화대혁명 박해 중)',
    deathNote: '중화인민공화국 국방부장이자 한국 전쟁 중국 인민지원군 사령관이었다. 1959년 루산회의에서 마오와 충돌, 1966년 문화대혁명으로 박해당했다. 1974년 11월 29일 베이징 301 병원에서 박해 후유증과 대장암으로 향년 76세로 사망했다.',
    deathPlaceText: '중화인민공화국 베이징 301 병원',
  },
  'Liu Shaoqi (劉少奇)': {
    deathType: I,
    deathCause: '당뇨병·고혈압 (문화대혁명 박해 중)',
    deathNote: '중화인민공화국 2대 주석. 1966년 문화대혁명으로 격하·구금당했다. 1969년 11월 12일 카이펑 비밀 구금소에서 의료가 박탈된 상태로 향년 71세로 사망했다. 1980년 명예 회복되었다.',
    deathPlaceText: '중화인민공화국 허난성 카이펑',
  },
  'Zhu De (朱德)': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '중화인민공화국 초대 인민해방군 총사령관. 1976년 7월 6일 베이징에서 향년 89세로 사망했다.',
    deathPlaceText: '중화인민공화국 베이징',
  },
  'Chen Yun (陳雲)': {
    deathType: N,
    deathCause: '노환',
    deathNote: '중화인민공화국 8대 원로 중 1인. 1995년 4월 10일 베이징에서 향년 89세에 자연사했다.',
    deathPlaceText: '중화인민공화국 베이징',
  },
  'Chiang Kai-shek (蔣介石)': {
    deathType: I,
    deathCause: '심장 발작 + 폐렴',
    deathNote: '중화민국 초대 총통. 1949년 본토 함락 후 대만으로 정부를 이전했다. 1975년 4월 5일 타이베이 시린 관저에서 향년 87세로 사망했다.',
    deathPlaceText: '중화민국 타이베이 시린 관저',
  },
  'Soong Ching-ling (宋慶齡)': {
    deathType: I,
    deathCause: '백혈병',
    deathNote: '쑨원의 부인이자 중화인민공화국 부주석. 1981년 5월 29일 베이징에서 향년 88세로 사망했다. 사망 직전 5월 16일 명예 주석으로 추대되었다.',
    deathPlaceText: '중화인민공화국 베이징',
  },

  // ── 미국 ──────────────────────────────────────────────────────────
  'Millard Fillmore': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '미국 13대 대통령. 1853년 퇴임 후 약 21년간 재야 생활을 했다. 1874년 3월 8일 뉴욕주 버팔로에서 향년 74세에 두 번째 뇌졸중으로 사망했다.',
    deathPlaceText: '미국 뉴욕주 버팔로',
  },
  'Matthew C. Perry': {
    deathType: I,
    deathCause: '간경변·류머티즘',
    deathNote: '미국 해군 제독으로 1853~1854년 흑선 함대로 일본을 개항시켰다. 1858년 3월 4일 뉴욕에서 향년 63세로 사망했다.',
    deathPlaceText: '미국 뉴욕',
  },
  'Harry S. Truman': {
    deathType: I,
    deathCause: '폐렴 (다발성 장기 부전)',
    deathNote: '미국 33대 대통령. 1972년 12월 26일 미주리주 캔자스시티 리서치 병원에서 향년 88세로 사망했다.',
    deathPlaceText: '미국 미주리주 캔자스시티 리서치 병원',
  },
  'Douglas MacArthur': {
    deathType: I,
    deathCause: '간경변·신부전',
    deathNote: '미국 육군 5성 장군이자 GHQ 최고사령관, 한국 전쟁 유엔군 사령관이었다. 1964년 4월 5일 워싱턴 D.C. 월터리드 병원에서 향년 84세로 사망했다.',
    deathPlaceText: '미국 워싱턴 D.C. 월터리드 병원',
  },
  'George C. Marshall': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '미국 육군 5성 장군이자 마셜 플랜 입안자. 1959년 10월 16일 워싱턴 D.C. 월터리드 병원에서 향년 78세로 사망했다.',
    deathPlaceText: '미국 워싱턴 D.C. 월터리드 병원',
  },
  'James F. Byrnes': {
    deathType: I,
    deathCause: '노환',
    deathNote: '미국 49대 국무장관. 1972년 4월 9일 사우스캐롤라이나 컬럼비아에서 향년 89세로 사망했다.',
    deathPlaceText: '미국 사우스캐롤라이나주 컬럼비아',
  },
  'John Foster Dulles': {
    deathType: I,
    deathCause: '대장암',
    deathNote: '미국 52대 국무장관. 1959년 5월 24일 워싱턴 D.C. 월터리드 병원에서 향년 71세로 사망했다.',
    deathPlaceText: '미국 워싱턴 D.C. 월터리드 병원',
  },
  'Dean Acheson': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '미국 51대 국무장관으로 한국 전쟁 시기에 재임했다. 1971년 10월 12일 메릴랜드 자택에서 향년 78세로 사망했다.',
    deathPlaceText: '미국 메릴랜드주',
  },
  'Matthew B. Ridgway': {
    deathType: I,
    deathCause: '심부전',
    deathNote: '미국 육군 4성 장군이자 한국 전쟁 미8군 사령관·유엔군 사령관이었다. 1993년 7월 26일 펜실베이니아 피츠버그에서 향년 98세로 사망했다.',
    deathPlaceText: '미국 펜실베이니아주 피츠버그',
  },

  // ── 영국 정치인·외교관 ──────────────────────────────────────────────
  'Hugh Gough': {
    deathType: I,
    deathCause: '노환',
    deathNote: '영국 군 사령관이자 1차 아편 전쟁의 영국군 총사령관. 1869년 3월 2일 더블린 인근 세인트 헬렌스에서 향년 89세로 사망했다.',
    deathPlaceText: '아일랜드 더블린 세인트 헬렌스',
  },
  'Henry Pottinger': {
    deathType: I,
    deathCause: '간질환',
    deathNote: '영국 외교관이자 1843년 첫 홍콩 총독. 1856년 3월 18일 몰타에서 향년 66세로 사망했다.',
    deathPlaceText: '영국령 몰타',
  },
  'Charles Elliot': {
    deathType: I,
    deathCause: '노환',
    deathNote: '영국 해군 제독이자 1차 아편 전쟁의 영국 협상 대표. 1875년 9월 9일 영국 데번에서 향년 73세로 사망했다.',
    deathPlaceText: '영국 데번',
  },
  'Henry John Temple, 3rd Viscount Palmerston': {
    deathType: I,
    deathCause: '감기 합병증',
    deathNote: '영국 36·39대 총리. 1865년 10월 18일 브로켓 홀에서 감기 합병증으로 향년 80세로 사망했다. 재임 중 사망한 두 번째 영국 총리였다.',
    deathPlaceText: '영국 하트퍼드셔 브로켓 홀',
  },
  'Winston Churchill': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '영국 41·44대 총리. 1965년 1월 24일 런던 자택에서 9일간 의식 불명 후 향년 90세로 사망했다. 부친 사망 70주기와 같은 날이었다.',
    deathPlaceText: '영국 런던 하이드 파크 게이트',
  },
  'Clement Attlee': {
    deathType: I,
    deathCause: '폐렴',
    deathNote: '영국 42대 총리이자 노동당 출신. 1967년 10월 8일 런던 웨스트민스터 병원에서 향년 84세로 사망했다.',
    deathPlaceText: '영국 런던 웨스트민스터 병원',
  },
  'Herbert Morrison': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '영국 부총리이자 외무장관을 역임했다. 1965년 3월 6일 런던에서 향년 77세로 사망했다.',
    deathPlaceText: '영국 런던',
  },

  // ── 소련·러시아 ──────────────────────────────────────────────────
  'Vladimir Lenin': {
    deathType: I,
    deathCause: '뇌졸중 (3차)',
    deathNote: '소비에트 러시아 초대 인민위원장. 1922년부터 시작된 일련의 뇌졸중 후유증으로 1924년 1월 21일 모스크바 인근 고르키 별장에서 향년 53세로 사망했다. 시신은 모스크바 붉은 광장 묘에 안치되어 있다.',
    deathPlaceText: '소비에트 러시아 모스크바 인근 고르키 별장',
  },
  'Joseph Stalin': {
    deathType: I,
    deathCause: '뇌졸중',
    deathNote: '소련 서기장. 1953년 3월 5일 모스크바 인근 쿤체보 별장에서 약 4일간의 의식 불명 후 향년 74세로 사망했다. 의도적 의료 지연 의혹이 후일 제기되었다.',
    deathPlaceText: '소련 모스크바 인근 쿤체보 별장',
  },
  'Leon Trotsky': {
    deathType: A,
    deathCause: 'NKVD 요원 라몬 메르카데르의 얼음송곳 공격',
    deathNote: '소비에트 정치가이자 적군의 창설자. 1929년 추방 후 망명 생활을 했다. 1940년 8월 21일 멕시코시티 코요아칸 자택에서 NKVD 요원 라몬 메르카데르의 얼음송곳 공격 다음 날 향년 60세로 사망했다.',
    deathPlaceText: '멕시코 멕시코시티 코요아칸',
  },
  'Vyacheslav Molotov': {
    deathType: I,
    deathCause: '노환',
    deathNote: '소련 외교부장이자 1939년 몰로토프-리벤트로프 조약의 체결자. 1986년 11월 8일 모스크바에서 향년 96세로 사망했다.',
    deathPlaceText: '소련 모스크바',
  },
  'Andrei Gromyko (Андре́й Громы́ко)': {
    deathType: I,
    deathCause: '뇌출혈',
    deathNote: '소련 외교부장(1957~1985)이자 최고소비에트 의장. 1989년 7월 2일 모스크바에서 향년 79세로 사망했다.',
    deathPlaceText: '소련 모스크바',
  },

  // ── 한국 ──────────────────────────────────────────────────────────
  'Syngman Rhee (李承晩)': {
    deathType: I,
    deathCause: '뇌출혈',
    deathNote: '대한민국 초대 대통령. 1960년 4·19 혁명으로 사임 후 하와이로 망명했다. 1965년 7월 19일 호놀룰루에서 향년 90세에 망명지에서 사망했다.',
    deathPlaceText: '미국 하와이 호놀룰루',
  },
  'Kim Il-sung (金日成)': {
    deathType: I,
    deathCause: '심근경색',
    deathNote: '조선민주주의인민공화국 초대 주석으로 약 49년간 통치했다. 1994년 7월 8일 평양 향산 별장에서 향년 82세로 사망했다. 시신은 금수산 태양궁전에 안치되어 있다.',
    deathPlaceText: '조선민주주의인민공화국 평양 향산 별장',
  },

  // ── 러시아 비공식 위원회 (알렉산드르 1세 즉위 초기 자문단) ──────────
  'Adam Jerzy Czartoryski': {
    deathType: I,
    deathCause: '노환',
    deathNote: '폴란드 귀족이자 알렉산드르 1세의 비공식 위원회 멤버. 1830년 11월 봉기 후 망명 생활을 했다. 1861년 7월 15일 파리에서 향년 91세로 사망했다.',
    deathPlaceText: '프랑스 파리',
  },
  'Nikolai Novosiltsev': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '러시아 정치가이자 알렉산드르 1세의 비공식 위원회 멤버. 1838년 4월 20일 상트페테르부르크에서 향년 76세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크',
  },
  'Viktor Kochubey': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '러시아 내무부장관이자 알렉산드르 1세의 비공식 위원회 멤버. 1834년 6월 15일 상트페테르부르크에서 향년 65세로 사망했다.',
    deathPlaceText: '러시아 제국 상트페테르부르크',
  },
  'Pavel Stroganov': {
    deathType: I,
    deathCause: '결핵',
    deathNote: '러시아 군인·정치가이자 알렉산드르 1세의 비공식 위원회 멤버. 1817년 6월 22일 코펜하겐에서 향년 44세로 사망했다.',
    deathPlaceText: '덴마크 코펜하겐',
  },

  // ── 한국어 originalName 인물 (가문 시드의 부분 정보) ──────────────
  '루트비히': {
    deathType: I,
    deathCause: '노환 추정',
    deathNote: '독일 왕가 인물. 정확한 사인은 동시기 기록 미비.',
    deathPlaceText: '독일 (정확한 위치 미상)',
  },
  '호엔촐레른 빌헬름': {
    deathType: I,
    deathCause: '폐색전증',
    deathNote: '빌헬름 2세. 1888년 즉위 후 약 30년 재위. 1차 세계대전 패전으로 1918년 11월 28일 퇴위·네덜란드 망명. 1941년 6월 4일 도르른 하우스에서 향년 82세로 사망.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  '작센코부르크고타 앨리스 모드 메리': {
    deathType: I,
    deathCause: '디프테리아',
    deathNote: '빅토리아 여왕의 셋째 딸이자 헤센-다름슈타트 대공비. 가족이 디프테리아 유행 중이던 1878년 12월 14일 다름슈타트에서 향년 35세로 사망했다.',
    deathPlaceText: '헤센-다름슈타트 대공국 다름슈타트',
  },
  '작센코부르크고타 앨프리드 어니스트 앨버트': {
    deathType: I,
    deathCause: '인후암',
    deathNote: '빅토리아 여왕의 차남이자 작센-코부르크-고타 2대 공작. 1900년 7월 31일 코부르크 인근 로젠나우 성에서 향년 55세로 사망했다.',
    deathPlaceText: '독일 제국 로젠나우 성',
  },
  '슐레스비히홀슈타인 아우구스타 빅토리아': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '빌헬름 2세의 첫 부인. 망명지에서 1921년 4월 11일 네덜란드 도르른 하우스에서 향년 62세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  '로마노프홀슈타인고토르프 마리야': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '로마노프-홀슈타인-고토르프 가문 인물. 1920년 향년 66세 사망. (구체 정보는 후속 보강 예정)',
    deathPlaceText: '망명지 또는 러시아',
  },

  // ── 추가 한국어 originalName variants ─────────────────────────────
  '헤센 다름슈타트 루트비히': {
    deathType: I,
    deathCause: '노환',
    deathNote: '루트비히 9세(Ludwig IX of Hesse-Darmstadt). 헤센-다름슈타트 방백. 1790년 4월 6일 핀스트호프(Pirmasens)에서 향년 70세로 사망했다.',
    deathPlaceText: '헤센-다름슈타트 방백령 핀스트호프',
  },
  '헤센다름슈타트 프리데리케 루이제': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '프리드리히 빌헬름 2세의 부인. 1805년 2월 25일 베를린에서 향년 53세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린',
  },
  '헤센 운트 바이 라인 루트비히': {
    deathType: I,
    deathCause: '노환',
    deathNote: '헤센-다름슈타트 대공 루트비히. 19세기 헤센 대공국의 군주 중 한 명. 정확한 사인은 노환·심장병으로 추정.',
    deathPlaceText: '헤센-다름슈타트 대공국 다름슈타트',
  },
  '작센코부르크고타 에른스트': {
    deathType: I,
    deathCause: '심장병',
    deathNote: '알베르트 공의 아버지이자 작센-코부르크-고타 공국 초대 공작. 1844년 1월 29일 코부르크 거주지에서 향년 59세로 사망했다.',
    deathPlaceText: '작센-코부르크-고타 공국 코부르크',
  },
  '호엔촐레른 프리드리히': {
    deathType: I,
    deathCause: '후두암',
    deathNote: '프리드리히 3세. 1888년 3월 9일 즉위했으나 약 99일 만인 6월 15일 포츠담 노이에스 궁에서 향년 56세에 후두암으로 사망했다.',
    deathPlaceText: '독일 제국 포츠담 노이에스 궁',
  },
  '작센코부르크고타 빅토리아': {
    deathType: I,
    deathCause: '척추암',
    deathNote: '프리드리히 3세의 부인이자 영국 빅토리아 1세의 장녀, 빌헬름 2세의 어머니. 1901년 8월 5일 프리드리히스호프 궁에서 향년 60세로 사망했다.',
    deathPlaceText: '독일 제국 프리드리히스호프 궁',
  },
}

// ── 한국어 surname+name+birthYear 매칭용 보조 데이터 ──────────────────
type KoreanMatchInfo = DeathInfo & { surname: string; name: string; birthYear: number }

const KOREAN_MATCH: KoreanMatchInfo[] = [
  {
    surname: '헤센 다름슈타트',
    name: '루트비히',
    birthYear: 1719,
    deathType: I,
    deathCause: '노환',
    deathNote: '루트비히 9세(Ludwig IX of Hesse-Darmstadt). 헤센-다름슈타트 방백. 1790년 4월 6일 핀스트호프(Pirmasens)에서 향년 70세로 사망했다.',
    deathPlaceText: '헤센-다름슈타트 방백령 핀스트호프',
  },
  {
    surname: '헤센다름슈타트',
    name: '프리데리케 루이제',
    birthYear: 1751,
    deathType: I,
    deathCause: '심장병',
    deathNote: '프리드리히 빌헬름 2세의 부인. 1805년 2월 25일 베를린에서 향년 53세로 사망했다.',
    deathPlaceText: '프로이센 왕국 베를린',
  },
  {
    surname: '헤센 운트 바이 라인',
    name: '루트비히',
    birthYear: 1753,
    deathType: I,
    deathCause: '노환',
    deathNote: '루트비히 1세(Ludwig I of Hesse and by Rhine, 1753~1830). 1790년 헤센-다름슈타트 방백, 1806년 라인 동맹 가입으로 헤센 대공 격상. 1830년 4월 6일 다름슈타트에서 향년 76세로 사망했다.',
    deathPlaceText: '헤센 대공국 다름슈타트',
  },
  {
    surname: '헤센 운트 바이 라인',
    name: '루트비히',
    birthYear: 1777,
    deathType: I,
    deathCause: '노환',
    deathNote: '루트비히 2세(Ludwig II of Hesse and by Rhine, 1777~1848). 1830년 즉위 후 약 18년 재위. 3월 혁명 중인 1848년 6월 16일 다름슈타트에서 향년 70세로 사망했다.',
    deathPlaceText: '헤센 대공국 다름슈타트',
  },
  {
    surname: '작센코부르크고타',
    name: '에른스트',
    birthYear: 1784,
    deathType: I,
    deathCause: '심장병',
    deathNote: '알베르트 공의 아버지이자 작센-코부르크-고타 공국 초대 공작. 1844년 1월 29일 코부르크 거주지에서 향년 59세로 사망했다.',
    deathPlaceText: '작센-코부르크-고타 공국 코부르크',
  },
  {
    surname: '헤센 운트 바이 라인',
    name: '루트비히',
    birthYear: 1806,
    deathType: I,
    deathCause: '심장병',
    deathNote: '루트비히 3세(Ludwig III of Hesse and by Rhine, 1806~1877). 1848년 즉위 후 약 29년 재위. 1877년 6월 13일 자이하임에서 향년 70세로 사망했다.',
    deathPlaceText: '헤센 대공국 자이하임',
  },
  {
    surname: '호엔촐레른',
    name: '프리드리히',
    birthYear: 1831,
    deathType: I,
    deathCause: '후두암',
    deathNote: '프리드리히 3세. 1888년 3월 9일 즉위했으나 약 99일 만인 6월 15일 포츠담 노이에스 궁에서 향년 56세에 후두암으로 사망했다. 1888년 3황제의 해의 두 번째 황제였다.',
    deathPlaceText: '독일 제국 포츠담 노이에스 궁',
  },
  {
    surname: '헤센 운트 바이 라인',
    name: '루트비히',
    birthYear: 1837,
    deathType: I,
    deathCause: '심부전',
    deathNote: '루트비히 4세(Ludwig IV of Hesse and by Rhine, 1837~1892). 영국 빅토리아 여왕 셋째 딸 앨리스의 남편. 1877년 즉위 후 약 15년 재위. 1892년 3월 13일 다름슈타트에서 향년 54세로 사망했다.',
    deathPlaceText: '헤센 대공국 다름슈타트',
  },
  {
    surname: '작센코부르크고타',
    name: '빅토리아',
    birthYear: 1840,
    deathType: I,
    deathCause: '척추암',
    deathNote: '프리드리히 3세의 부인이자 영국 빅토리아 1세의 장녀, 빌헬름 2세의 어머니. 1901년 8월 5일 프리드리히스호프 궁에서 향년 60세로 사망했다.',
    deathPlaceText: '독일 제국 프리드리히스호프 궁',
  },
  {
    surname: '작센코부르크고타',
    name: '앨리스 모드 메리',
    birthYear: 1843,
    deathType: I,
    deathCause: '디프테리아',
    deathNote: '빅토리아 여왕의 셋째 딸이자 헤센-다름슈타트 대공비. 가족이 디프테리아 유행 중이던 1878년 12월 14일 다름슈타트에서 향년 35세로 사망했다.',
    deathPlaceText: '헤센-다름슈타트 대공국 다름슈타트',
  },
  {
    surname: '작센코부르크고타',
    name: '앨프리드 어니스트 앨버트',
    birthYear: 1844,
    deathType: I,
    deathCause: '인후암',
    deathNote: '빅토리아 여왕의 차남이자 작센-코부르크-고타 2대 공작. 1900년 7월 31일 코부르크 인근 로젠나우 성에서 향년 55세로 사망했다.',
    deathPlaceText: '독일 제국 로젠나우 성',
  },
  {
    surname: '로마노프홀슈타인고토르프',
    name: '마리야',
    birthYear: 1853,
    deathType: I,
    deathCause: '심장병',
    deathNote: '마리야 알렉산드로브나(Maria Alexandrovna of Russia, 1853~1920). 알렉산드르 2세의 딸이자 작센-코부르크-고타 알프레드 공작의 부인. 1920년 10월 24일 취리히에서 망명 중 향년 67세로 사망했다.',
    deathPlaceText: '스위스 취리히',
  },
  {
    surname: '슐레스비히홀슈타인',
    name: '아우구스타 빅토리아',
    birthYear: 1858,
    deathType: I,
    deathCause: '심장병',
    deathNote: '빌헬름 2세의 첫 부인. 망명지에서 1921년 4월 11일 네덜란드 도르른 하우스에서 향년 62세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
  {
    surname: '호엔촐레른',
    name: '빌헬름',
    birthYear: 1859,
    deathType: I,
    deathCause: '폐색전증',
    deathNote: '빌헬름 2세. 1888년 즉위 후 약 30년 재위. 1차 세계대전 패전으로 1918년 11월 28일 퇴위·네덜란드 망명. 1941년 6월 4일 도르른 하우스에서 향년 82세로 사망했다.',
    deathPlaceText: '네덜란드 도르른 하우스',
  },
]

async function main() {
  const envPath = path.resolve(process.cwd(), 'env.development')
  dotenv.config({ path: envPath })

  const prisma = new PrismaService({ useAdapter: true })
  let updated = 0
  let notFound = 0

  try {
    console.log(`\n💀 사망정보 일괄 보강 시작 — ${Object.keys(DEATH_INFO).length}개 entry...\n`)

    for (const [originalName, info] of Object.entries(DEATH_INFO)) {
      const persons = await prisma.person.findMany({
        where: { originalName },
        select: { id: true, name: true, surname: true },
      })
      if (persons.length === 0) {
        console.warn(`  ⚠️  미존재: ${originalName}`)
        notFound++
        continue
      }
      for (const p of persons) {
        await prisma.person.update({
          where: { id: p.id },
          data: {
            deathType: info.deathType,
            deathCause: info.deathCause,
            deathNote: info.deathNote,
            deathPlaceText: info.deathPlaceText,
          },
        })
        const display = [p.surname, p.name].filter(Boolean).join(' ')
        console.log(`  ✅ ${display} (${originalName}) — ${info.deathType}`)
        updated++
      }
    }

    console.log(`\n총 ${updated}건 update / 미존재 ${notFound}건\n`)

    // ── 보조: surname + name + birthYear 매칭 ───────────────────────
    console.log(`\n💀 보조 매칭 (surname+name+birthYear) 시작 — ${KOREAN_MATCH.length}개...\n`)
    let updated2 = 0
    for (const m of KOREAN_MATCH) {
      const persons = await prisma.person.findMany({
        where: {
          surname: m.surname,
          name: m.name,
          birthDate: {
            gte: new Date(m.birthYear, 0, 1),
            lt: new Date(m.birthYear + 1, 0, 1),
          },
        },
        select: { id: true },
      })
      if (persons.length === 0) {
        console.warn(`  ⚠️  미존재: ${m.surname} ${m.name} (${m.birthYear})`)
        continue
      }
      for (const p of persons) {
        await prisma.person.update({
          where: { id: p.id },
          data: {
            deathType: m.deathType,
            deathCause: m.deathCause,
            deathNote: m.deathNote,
            deathPlaceText: m.deathPlaceText,
          },
        })
        console.log(`  ✅ ${m.surname} ${m.name} (${m.birthYear}) — ${m.deathType}`)
        updated2++
      }
    }
    console.log(`\n보조 매칭 ${updated2}건 update\n`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => console.log('💀 사망정보 보강 완료\n'))
  .catch((e) => {
    console.error('❌', e)
    process.exit(1)
  })
