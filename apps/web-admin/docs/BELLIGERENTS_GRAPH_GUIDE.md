# 🌐 그래프 기반 교전 세력 시스템 - 사용 가이드

## 📋 개요

복잡한 역사적 사건(예: 2차 세계대전)에서 국가 간 관계를 정확히 표현하기 위한 **그래프 기반 시스템**이 구현되었습니다.

### 핵심 특징

✅ **국가 간 관계를 그래프(노드-엣지)로 표현**
- 동맹, 적대, 협력, 불가침, 괴뢰, 점령 등 7가지 관계 타입
- 관계 강도(-100 ~ 100) 표현
- 시간 기반 관계 변화 추적

✅ **AI 자동 진영 분류**
- Union-Find 알고리즘 기반
- 관계를 분석하여 자동으로 진영 클러스터링
- 신뢰도 점수 제공

✅ **시각화**
- SVG 기반 그래프 시각화
- 노드(국가), 엣지(관계) 표현
- 관계 타입별 색상 구분

✅ **레거시 호환**
- 기존 진영 방식(sides)과 병행 사용 가능
- 레거시 데이터를 그래프로 자동 변환

---

## 🎯 사용 시나리오

### 시나리오 1: 2차 세계대전 (최상위 사건)

**문제:**
- 소련은 1939년에는 독일과 협력했지만, 1941년부터는 연합국
- 이탈리아는 1943년까지 추축국, 이후 연합국으로 전환
- 이런 복잡한 관계를 기존 "진영" 방식으로는 표현 불가

**해결:**

```typescript
// 2차 세계대전 사건 등록
const ww2Event = {
  title: "제2차 세계대전",
  startDate: "1939-09-01",
  endDate: "1945-09-02",
  belligerents: {
    graphMode: true,
    countries: [
      { countryId: "uk", countryName: "영국", participation: "full" },
      { countryId: "us", countryName: "미국", participation: "full" },
      { countryId: "ussr", countryName: "소련", participation: "full" },
      { countryId: "germany", countryName: "나치 독일", participation: "full" },
      { countryId: "japan", countryName: "일본 제국", participation: "full" },
      { countryId: "italy", countryName: "이탈리아", participation: "full" },
    ],
    relations: [
      // 연합국 내부 관계
      {
        id: "rel-1",
        fromCountry: "uk",
        toCountry: "us",
        relationType: "allied",
        startDate: "1941-12-08",
        strength: 100,
        description: "대서양 헌장 기반 동맹",
      },
      {
        id: "rel-2",
        fromCountry: "us",
        toCountry: "ussr",
        relationType: "allied",
        startDate: "1941-06-22",
        strength: 80,
        description: "독일 침공 이후 협력",
      },
      // 소련-독일: 초기 협력 -> 적대
      {
        id: "rel-3",
        fromCountry: "ussr",
        toCountry: "germany",
        relationType: "cooperation",
        startDate: "1939-08-23",
        endDate: "1941-06-22",
        strength: 50,
        description: "독소 불가침 조약",
      },
      {
        id: "rel-4",
        fromCountry: "ussr",
        toCountry: "germany",
        relationType: "enemy",
        startDate: "1941-06-22",
        strength: -100,
        description: "바르바로사 작전 이후 전쟁",
      },
      // 추축국 내부 관계
      {
        id: "rel-5",
        fromCountry: "germany",
        toCountry: "italy",
        relationType: "allied",
        startDate: "1936-10-25",
        endDate: "1943-09-08",
        strength: 90,
        description: "베를린-로마 추축",
      },
      // 이탈리아 전환
      {
        id: "rel-6",
        fromCountry: "italy",
        toCountry: "uk",
        relationType: "enemy",
        startDate: "1940-06-10",
        endDate: "1943-09-08",
        strength: -80,
      },
      {
        id: "rel-7",
        fromCountry: "italy",
        toCountry: "us",
        relationType: "allied",
        startDate: "1943-09-08",
        strength: 60,
        description: "이탈리아 항복 후 연합국 가입",
      },
    ],
    // AI가 자동으로 진영 분류
    autoSuggestedSides: [
      {
        name: "연합국",
        memberCountryIds: ["uk", "us", "ussr"],
        confidence: 0.95,
        reasoning: "3개의 동맹 관계로 연결됨",
      },
      {
        name: "추축국",
        memberCountryIds: ["germany", "japan", "italy"],
        confidence: 0.85,
        reasoning: "2개의 동맹 관계로 연결됨",
      },
    ],
  },
}
```

### 시나리오 2: 폴란드 침공 (하위 사건)

**문제:**
- 독일과 소련이 함께 폴란드를 침공
- 하지만 이들은 "동맹"이 아니라 "일시적 협력"
- 부모 사건(2차 세계대전)에서는 적대 관계

**해결:**

```typescript
const polandInvasion = {
  title: "폴란드 침공",
  parentEventId: "ww2-event-id",
  startDate: "1939-09-01",
  endDate: "1939-10-06",
  belligerents: {
    graphMode: true,
    countries: [
      { countryId: "germany", countryName: "나치 독일", participation: "full", commander: "발터 폰 브라우히치", forces: "1,500,000" },
      { countryId: "ussr", countryName: "소련", participation: "full", commander: "미하일 코발료프", forces: "600,000" },
      { countryId: "poland", countryName: "폴란드", participation: "full", commander: "에드바르트 리지비구", forces: "1,000,000" },
    ],
    relations: [
      {
        id: "rel-poland-1",
        fromCountry: "germany",
        toCountry: "ussr",
        relationType: "cooperation",
        startDate: "1939-09-01",
        strength: 70,
        description: "독소 불가침 조약 비밀 의정서에 따른 협력",
      },
      {
        id: "rel-poland-2",
        fromCountry: "germany",
        toCountry: "poland",
        relationType: "enemy",
        startDate: "1939-09-01",
        strength: -100,
      },
      {
        id: "rel-poland-3",
        fromCountry: "ussr",
        toCountry: "poland",
        relationType: "enemy",
        startDate: "1939-09-17",
        strength: -100,
      },
    ],
    autoSuggestedSides: [
      {
        name: "침공 세력 (독일-소련 동맹)",
        memberCountryIds: ["germany", "ussr"],
        confidence: 0.9,
        reasoning: "협력 관계로 연결됨",
      },
      {
        name: "방어 세력",
        memberCountryIds: ["poland"],
        confidence: 1.0,
        reasoning: "단독",
      },
    ],
  },
}
```

---

## 🖥️ UI 사용법

### 1. 모드 선택

사건 등록/수정 페이지에서 "군사 정보" 섹션 상단에서 모드를 선택합니다:

- **🏷️ 진영 방식 (간단)**: 기존 방식, 빠르게 입력
- **🌐 관계 그래프 (정교)**: 새로운 방식, 복잡한 관계 표현

### 2. 국가 추가

"국가 추가" 버튼을 클릭하여 참전국을 추가합니다.

각 국가별로 입력:
- 국가 이름
- 지휘관
- 병력 규모
- 참여도 (전면/제한적/간접/비전투)
- 역할/설명

### 3. 관계 추가

국가 카드에서 "🔗 관계 추가" 버튼을 클릭하여 다른 국가와의 관계를 정의합니다.

**관계 타입:**
- 🤝 동맹 (allied): 공식 동맹 관계
- 🔗 협력 (cooperation): 동맹보다 약한 협력 관계
- ✋ 불가침 (non-aggression): 공격하지 않기로 약속
- ⚖️ 중립 (neutral): 중립 관계
- ⚔️ 적대 (enemy): 전쟁 중
- 🎭 괴뢰 (puppet): 괴뢰국 관계
- 🏴 점령 (occupied): 점령 관계

### 4. AI 자동 분류

"🔥 자동 분류" 버튼을 클릭하면 AI가 국가 간 관계를 분석하여 자동으로 진영을 제안합니다.

- 신뢰도 점수 확인
- "적용" 버튼으로 제안 수락

### 5. 그래프 시각화

하단의 그래프 시각화에서 전체 관계를 한눈에 확인할 수 있습니다.

- 노드(원): 국가
- 엣지(선): 관계
- 색상: 관계 타입
- 두께: 관계 강도

---

## 🔄 레거시 데이터 마이그레이션

기존 진영 방식의 데이터는 자동으로 그래프로 변환됩니다.

**변환 규칙:**
1. 같은 진영 내 국가들은 `allied` 관계
2. 다른 진영 국가들은 `enemy` 관계
3. 관계 강도는 자동 설정 (allied: 100, enemy: -100)

**예시:**

```typescript
// 레거시 (진영 방식)
{
  sides: [
    {
      name: "연합국",
      countries: [
        { countryId: "uk", countryName: "영국" },
        { countryId: "us", countryName: "미국" },
      ],
    },
    {
      name: "추축국",
      countries: [
        { countryId: "germany", countryName: "독일" },
        { countryId: "japan", countryName: "일본" },
      ],
    },
  ],
}

// 자동 변환 (그래프 방식)
{
  countries: [
    { countryId: "uk", countryName: "영국", participation: "full" },
    { countryId: "us", countryName: "미국", participation: "full" },
    { countryId: "germany", countryName: "독일", participation: "full" },
    { countryId: "japan", countryName: "일본", participation: "full" },
  ],
  relations: [
    { fromCountry: "uk", toCountry: "us", relationType: "allied", strength: 100 },
    { fromCountry: "germany", toCountry: "japan", relationType: "allied", strength: 100 },
    { fromCountry: "uk", toCountry: "germany", relationType: "enemy", strength: -100 },
    { fromCountry: "uk", toCountry: "japan", relationType: "enemy", strength: -100 },
    { fromCountry: "us", toCountry: "germany", relationType: "enemy", strength: -100 },
    { fromCountry: "us", toCountry: "japan", relationType: "enemy", strength: -100 },
  ],
}
```

---

## 🛠️ 기술 스택

### 프론트엔드
- **타입 정의**: `types/belligerents-graph.types.ts`
- **유틸리티**: `utils/belligerents-graph.utils.ts`
- **UI 컴포넌트**: `components/belligerents-graph-form.tsx`
- **시각화**: `components/belligerents-graph-visualization.tsx`

### 백엔드
- **DTO**: `apps/api/src/libs/event/presentation/dto/event.response.ts`
- **저장 형식**: JSON (Prisma)

### 알고리즘
- **진영 분류**: Union-Find 알고리즘
- **관계 분석**: 그래프 순회 알고리즘
- **복잡도 계산**: O(N + M) (N: 국가 수, M: 관계 수)

---

## 🎓 고급 기능

### 1. 조약(Treaty) 관리 (향후 구현 가능)

```typescript
interface Treaty {
  id: string
  name: string  // "독소 불가침 조약"
  signDate: string
  violationDate?: string
  signatories: string[]  // 서명국 IDs
  type: 'alliance' | 'non-aggression' | 'trade'
  secretProtocols?: string[]  // 비밀 의정서
}

// 관계에 조약 연결
{
  fromCountry: "germany",
  toCountry: "ussr",
  relationType: "non-aggression",
  basedOnTreaties: ["molotov-ribbentrop-treaty-id"],
}
```

### 2. 동맹(Alliance) 관리

```typescript
interface Alliance {
  id: string
  name: string  // "NATO", "Warsaw Pact"
  formationDate: string
  members: Array<{
    countryId: string
    joinDate: string
    leaveDate?: string
    status: 'founding' | 'joined' | 'left'
  }>
}
```

### 3. 시간 기반 관계 변화 추적

```typescript
// 소련의 진영 변경 이력
{
  countryId: "ussr",
  timeline: [
    {
      startDate: "1939-08-23",
      endDate: "1941-06-22",
      alliance: "독소 협력",
      relationType: "cooperation",
    },
    {
      startDate: "1941-06-22",
      endDate: "1945-09-02",
      alliance: "연합국",
      relationType: "allied",
    },
  ],
}
```

---

## 📊 API 응답 예시

```json
{
  "id": "ww2-event-id",
  "title": "제2차 세계대전",
  "belligerents": {
    "graphMode": true,
    "countries": [
      {
        "countryId": "uk",
        "countryName": "영국",
        "isHistorical": false,
        "commander": "윈스턴 처칠",
        "forces": "5,000,000",
        "participation": "full",
        "description": "유럽 전선 주도"
      }
    ],
    "relations": [
      {
        "id": "rel-1",
        "fromCountry": "uk",
        "toCountry": "us",
        "relationType": "allied",
        "startDate": "1941-12-08",
        "strength": 100,
        "description": "대서양 헌장"
      }
    ],
    "autoSuggestedSides": [
      {
        "name": "연합국",
        "memberCountryIds": ["uk", "us", "ussr"],
        "confidence": 0.95,
        "reasoning": "3개의 동맹 관계로 연결됨"
      }
    ]
  }
}
```

---

## 🐛 문제 해결

### Q1: 그래프 모드로 전환했는데 기존 데이터가 사라졌어요
**A**: 걱정 마세요! 레거시 데이터는 자동으로 그래프로 변환됩니다. "진영 방식"으로 다시 전환하면 원래 데이터를 볼 수 있습니다.

### Q2: AI 자동 분류가 정확하지 않아요
**A**: 관계를 더 많이 정의할수록 정확도가 높아집니다. 또는 "수동 진영 분류"를 사용하세요.

### Q3: 그래프 시각화가 복잡해요
**A**: 줌 인/아웃 기능을 사용하거나, 국가 수를 줄여보세요. 또는 하위 사건으로 분리하는 것도 방법입니다.

### Q4: 시간에 따른 관계 변화를 표현하고 싶어요
**A**: 현재는 `startDate`와 `endDate`로 제한적으로 표현 가능합니다. 향후 타임라인 기능이 추가될 예정입니다.

---

## 🚀 다음 단계

1. **실제 데이터 입력**: 2차 세계대전, 냉전 등 복잡한 사건 등록
2. **피드백 수집**: 사용 편의성 개선
3. **고급 기능 구현**: 조약, 동맹, 타임라인
4. **시각화 개선**: D3.js, vis.js 등 전문 라이브러리 도입

---

## 📞 지원

문제가 있거나 제안 사항이 있으면 알려주세요!

