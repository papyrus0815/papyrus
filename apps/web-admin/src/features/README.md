# Features Layer

FSD 아키텍처의 Features 레이어입니다. 비즈니스 기능 단위로 구성됩니다.

## 구조

```
features/
└── event-create/           # 이벤트 생성/수정 기능
    ├── model/              # 상태 관리 (hooks)
    ├── lib/                # 비즈니스 로직 & 유틸리티
    ├── ui/                 # (향후) 작은 UI 컴포넌트
    └── README.md           # 상세 문서
```

## Features vs Widgets vs Pages

### Features (이 레이어)

- **목적**: 재사용 가능한 비즈니스 기능
- **예시**:
  - `event-create` - 이벤트 생성 로직, 상태 관리
  - `user-auth` - 로그인/로그아웃 로직
  - `comment-system` - 댓글 작성/수정/삭제

### Widgets

- **목적**: 독립적으로 동작하는 큰 UI 블록
- **예시**:
  - `event-form` - 이벤트 생성 폼 전체
  - `navigation-bar` - 네비게이션 바
  - `comment-list` - 댓글 목록

### Pages

- **목적**: 라우트와 1:1 매핑되는 페이지
- **예시**:
  - `event-create-page` - /events/create 페이지
  - `event-detail-page` - /events/:id 페이지

## 현재 Features

### event-create

- **상태**: ✅ 완료
- **설명**: 이벤트 생성/수정 기능
- **문서**: [event-create/README.md](./event-create/README.md)
- **주요 모듈**:
  - `model/` - 4개의 상태 관리 hooks
  - `lib/` - 타입 변환, 유효성 검증, 데이터 생성 로직

## 사용 방법

```typescript
// features의 model과 lib를 import
import {
  useEventBasicInfo,
  useMilitaryEventState,
} from '@/features/event-create/model'
import {
  toConflictType,
  buildMilitaryEventData,
} from '@/features/event-create/lib'

// 페이지나 위젯에서 사용
export const EventCreatePage = () => {
  const basicInfo = useEventBasicInfo()
  const militaryState = useMilitaryEventState()

  const handleSubmit = () => {
    const militaryEvent = buildMilitaryEventData(...)
  }
}
```

## 새로운 Feature 추가하기

1. **디렉토리 생성**

   ```bash
   mkdir -p features/new-feature/{model,lib,ui}
   ```

2. **구조 생성**

   ```
   features/new-feature/
   ├── model/
   │   ├── use-feature-state.ts
   │   └── index.ts
   ├── lib/
   │   ├── utils.ts
   │   ├── validators.ts
   │   └── index.ts
   ├── ui/                    # 필요시
   │   └── FeatureComponent.tsx
   └── README.md
   ```

3. **README 작성**
   - 기능 설명
   - 사용 방법
   - API 문서

4. **이 파일 업데이트**
   - "현재 Features" 섹션에 추가
