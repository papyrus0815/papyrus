# Claude Code 작업 가이드 (web-admin)

web-admin 디렉토리에서 작업할 때 자동 로드됩니다. 모노레포 공통 규약은 루트 `CLAUDE.md` 참고.

## 모달 시스템 (공용 토대 필수)

- **토대**: `@/shared/ui/modal`의 `<Modal>`(글래스) + `useModalBehavior` 훅, `register-modal-shell`의 `<RegisterModal>`(솔리드 폼). 새 모달은 반드시 이 중 하나 사용 — Esc·body 스크롤락·포커스 트랩·aria는 `useModalBehavior`가 담당하므로 **직접 구현 금지**.
- **표면(배경/보더/섀도)을 직접 쓰지 말 것.** 단일 진실은 `glassCardMixin`:
  ```ts
  import { glassCardMixin } from '@/shared/styles/mixins'
  const Box = styled.div`
    ${({ theme }) => glassCardMixin(theme)}
    border-radius: 16px;
  `
  ```
  → 다크 `rgba(20,20,20,0.92)` + `blur(24px)`, 라이트 솔리드. 모달 radius 기본은 **16px**.
- 오버레이는 `ModalOverlay`(또는 `OVERLAY_STYLES`) 사용.
- 배경/한 글자 변수 관련 상세 이력은 세션 메모리 `web-admin-modal-foundation`, `dark-theme-inline-hardcode-mapping` 참고.

## 타입체크 / lint

- **타입체크**: `NODE_OPTIONS=--max-old-space-size=12288 npx tsc -p apps/web-admin/tsconfig.json`
  - 기본 힙이면 OOM. **exit code 확인 필수** (vite/esbuild build는 타입을 안 잡음).
  - 첫 실행에서 stale 에러가 나오면 재실행으로 판별.
- **lint**: 전체 lint는 레거시 `no-restricted-syntax`(한 글자 변수명) 노이즈가 많음 → **변경 파일만 단독**으로:
  ```sh
  git diff --name-only -- apps/web-admin/src | tr '\n' '\0' | xargs -0 npx eslint
  ```
  새 코드 변수는 풀네임 사용.
- 로컬 테스트 로그인: `admin` / `1234`, web은 vite HMR(`:8000`).

## 진행 중: 모달 표면 글래스 전면 통일 (2026-06-24)

"왜 인물 등록 모달 배경만 다르냐"에서 출발 → 실측 결과 다크 모달 배경이 **10종**(`rgba(20,20,20,0.92)`·`#171717`·`#212121`·`rgba(25,25,25,..)`·`rgba(20,20,28,..)`·`rgba(15,15,20,..)`·`rgba(30,30,30,..)`·`rgba(18,18,28,..)`·`rgba(20,20,30,..)`·흰색)으로 난립. 사용자 결정 = **전면 통일(글래스)**.

**완료 (커밋됨, 브랜치 `feature/service-manager-v2`, 모달 18파일 + 이 문서)** — styled CSS만 기계적 치환(로직/컴포넌트 reparent 안 함), 표면 → `glassCardMixin` + `border-radius:16px`:
- 솔리드 폼셸 → 글래스: `country-form-shell`(인물/현대국가/역사국가 등록), `register-modal-shell`(`PersonRegisterModalBox`: RegisterModal/왕조/SovereignReign)
- 자체구현 표면 치환: select / country-select / country-search / advanced-country-select / person-select / date-picker / time-picker / position-category-crud / `pages/events/styles/modal.styles`(Modal+SummaryModal) / image-caption / env-config(다크모드 신규 추가)
- radius만 16: person-inline / bio-mention(`person-detail-panel.styles`) / dynasty-members-infographic / cabinet-linkage / cabinets-section
- **검증 통과**: tsc 0 에러(exit 0), 변경 파일 신규 lint 0(잡힌 214건은 전부 기존 레거시).

**다음 세션 할 일**:
1. **(선택) 시각 확인** — 앱 띄워 다크모드에서 인물 등록 모달 + 자식 모달(date-picker·country-select·select·person-select 등)이 글래스로 통일됐는지 확인.
2. **의도적 제외분** (사용자 승인 시 글래스로 포함):
   - `features/auth/login/ui/error-modal.tsx` — 빨강 글로우 아이덴티티라 보류
   - `widgets/country/country-detail/ui/government-category-modal.styles.ts` — `theme.gov.bg` 정부 테마라 보류
   - `widgets/event/event-inline-modal/event-inline-modal.tsx` — 당시 미커밋 WIP라 스킵(여전히 dirty)
   - `sidebar-sheet`(슬라이드 패널) = 모달 아님 → **제외 확정**
3. **follow-up(별도 작업)**:
   - 모달 **내부 요소**(time-picker 선택 셀, position-category `SelectBtn`/`CancelBtn` 등)는 아직 `#212121` 하드코딩 — 이번엔 표면만 통일, 내부 토큰화는 미실시.
   - 구조적 `<Modal>` 컴포넌트 reparent(이미 glassCardMixin인 B계층 + 자체구현 C계층)는 픽셀 변화 없이 회귀 위험만 커서 미실행.
