# Z-Index 전역 관리 시스템

## 📋 개요

z-index를 전역으로 관리하여 레이어링 충돌을 방지하고 일관된 UI 스택을 유지합니다.

## 🎯 계층 구조

```
┌─────────────────────────────────────┐
│ Toast/Notification (10001+)         │ ← 최상위
├─────────────────────────────────────┤
│ Modal Content (10000)               │
├─────────────────────────────────────┤
│ Modal Overlay (9999)                │
├─────────────────────────────────────┤
│ Drawer Content (3001)               │
├─────────────────────────────────────┤
│ Drawer Overlay (3000)               │
├─────────────────────────────────────┤
│ Dialog (2000-2001)                  │
├─────────────────────────────────────┤
│ Header (1000-1999)                  │
├─────────────────────────────────────┤
│ Sidebar & Nav (900-999)             │
├─────────────────────────────────────┤
│ Dropdown & Tooltip (100-899)        │
├─────────────────────────────────────┤
│ Base Content (0-99)                 │ ← 기본
└─────────────────────────────────────┘
```

## 📦 사용 방법

### 1. TypeScript/styled-components

```typescript
import { Z_INDEX } from '@/shared/styles/z-index'

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

const Overlay = styled.div`
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`
```

### 2. CSS 변수

```css
.modal {
  z-index: var(--z-modal-content);
}

.overlay {
  z-index: var(--z-modal-overlay);
}
```

### 3. 인라인 스타일

```tsx
<div style={{ zIndex: Z_INDEX.MODAL_OVERLAY }}>Overlay</div>
```

## 🔢 Z-Index 레벨

| 레벨              | 값    | 용도              |
| ----------------- | ----- | ----------------- |
| `BASE`            | 0     | 기본 컨텐츠       |
| `CONTENT`         | 1     | 일반 컨텐츠       |
| `DROPDOWN`        | 100   | 드롭다운 메뉴     |
| `TOOLTIP`         | 200   | 툴팁              |
| `ACTION_MENU`     | 300   | 액션 메뉴         |
| `SIDEBAR`         | 900   | 사이드바          |
| `NAV`             | 950   | 네비게이션        |
| `HEADER`          | 1000  | 헤더              |
| `STICKY_HEADER`   | 1100  | 고정 헤더         |
| `DIALOG_OVERLAY`  | 2000  | 다이얼로그 배경   |
| `DIALOG_CONTENT`  | 2001  | 다이얼로그 컨텐츠 |
| `DRAWER_OVERLAY`  | 3000  | 드로어 배경       |
| `DRAWER_CONTENT`  | 3001  | 드로어 컨텐츠     |
| `MODAL_OVERLAY`   | 9999  | 모달 배경         |
| `MODAL_CONTENT`   | 10000 | 모달 컨텐츠       |
| `TOAST`           | 10001 | 토스트 알림       |
| `NOTIFICATION`    | 10002 | 알림              |
| `LOADING_OVERLAY` | 10003 | 로딩 오버레이     |

## ✅ 모범 사례

### DO ✅

```typescript
// 전역 상수 사용
import { Z_INDEX } from '@/shared/styles/z-index'

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_CONTENT};
`
```

### DON'T ❌

```typescript
// 하드코딩된 값 사용하지 말것
const Modal = styled.div`
  z-index: 9999; // ❌
`
```

## 🔄 마이그레이션 가이드

기존 코드를 전역 시스템으로 마이그레이션:

```typescript
// Before
const Modal = styled.div`
  z-index: 9999;
`

// After
import { Z_INDEX } from '@/shared/styles/z-index'

const Modal = styled.div`
  z-index: ${Z_INDEX.MODAL_OVERLAY};
`
```

## 📊 현재 상태

### ✅ 적용 완료

#### Country Styles

- `SelectModalOverlay` → `Z_INDEX.MODAL_OVERLAY`
- `SelectModal` → `Z_INDEX.MODAL_CONTENT`
- `SidePanelOverlay` → `Z_INDEX.DRAWER_OVERLAY`
- `SidePanel` → `Z_INDEX.DRAWER_CONTENT`
- `MobileOverlay` → `Z_INDEX.MODAL_OVERLAY`
- `MobileListPane` → `Z_INDEX.MODAL_CONTENT`
- `MobileMenuOverlay` → `Z_INDEX.MODAL_OVERLAY`
- `MobileMenuDrawer` → `Z_INDEX.MODAL_CONTENT`
- `LoadingOverlay` → `Z_INDEX.LOADING_OVERLAY`

#### Header

- `HeaderRoot` → `Z_INDEX.HEADER`
- `MobileOverlay` → `Z_INDEX.MODAL_OVERLAY`
- `MobileMenuModal` → `Z_INDEX.MODAL_CONTENT`
- `MobileModal` → `Z_INDEX.MODAL_CONTENT`

#### History Layout

- `MobileBottomTabBar` → `Z_INDEX.STICKY_HEADER`
- `ModalOverlay` → `Z_INDEX.DIALOG_OVERLAY`
- `QuickMenu` → `Z_INDEX.DIALOG_CONTENT`

#### Shared UI

- `ToastContainer` → `Z_INDEX.TOAST`
- `SpinnerOverlay` → `Z_INDEX.LOADING_OVERLAY`
- `ActionMenu` → `Z_INDEX.DROPDOWN`

### 🔄 적용 예정

- Sidebar 컴포넌트 (998, 999)
- Modal 공통 컴포넌트
- EnvConfigModal
- 기타 페이지별 모달

## 🚀 다음 단계

1. 모든 컴포넌트를 점진적으로 마이그레이션
2. z-index 하드코딩 금지 lint 규칙 추가
3. 문서화 및 팀 공유
