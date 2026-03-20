# SidePanel (공용 사이드 패널)

## 역할

- 긴 폼, 다단계 입력, **조약 등록**처럼 모달로 두기 부담스러운 UI를 **우측(또는 좌측) 슬라이드 패널**로 표시한다.
- **한 번 구현해 두고** 앱 전역에서 `import { SidePanel } from '@/shared/ui/side-panel'` 로 재사용한다.

## 레이어 (z-index)

| 레이어 | 용도 |
|--------|------|
| `Z_INDEX.DRAWER_OVERLAY` / `DRAWER_CONTENT` | 이 패널 |
| `Z_INDEX.MODAL_OVERLAY` / `MODAL_CONTENT` | 국가 선택, 인물 선택, 날짜 등 **기존 모달** |

드로어가 모달보다 **낮은** z-index이므로, **패널을 연 상태에서** 모달을 열면 모달이 패널 **위**에 뜬다.

## 보조 모달 위치 (정중앙)

날짜·인물 선택 등은 **뷰포트 기준 `position: fixed`** 로 중앙 정렬되도록, 공용 컴포넌트에서 **`createPortal(..., document.body)`** 를 사용한다.  
그래야 사이드 패널·애니메이션(`transform`) 아래에 두었을 때도 창이 **화면 가운데**에만 뜬다.

## API 요약

- `isOpen` / `onClose`: 표시 여부
- `title` / `subtitle` / `footer`: 헤더·하단 고정 액션
- `headerActions`: 헤더 우측(닫기 왼쪽) 보조 액션 — 보조 모달과 겹침을 피하려고 두기도 하나, **긴 폼의 주요 제출(등록·저장)** 은 보통 **`footer`** 가 더 익숙하다.
- `side`: `'end'`(기본, 우측) | `'start'`(좌측)
- `width`: CSS 너비 문자열 (기본 `min(1180px, 100vw)`)
- `closeOnOverlayClick` / `closeOnEscape` / `lockBodyScroll`

## 사용처

- **행정부 → 조약 등록·연결** (`TreatyLinkModal` in `cabinets-section.widget.tsx`): 우측 `SidePanel`, **등록·연결·수정** 은 `footer` 에 배치.

## 확장 시

- **중첩 패널**이 필요하면 별도 이슈로 `z-index` 스택(컨텍스트) 또는 단일 패널 + 내부 라우팅을 검토한다.
- 헤더만 다른 레이아웃이면 `children`만 커스텀하고, **스타일 프리미티브**는 `SidePanelSurface` + `ModalHeader` 등을 `@/shared/ui/side-panel`에서 가져와 조합할 수 있다.
