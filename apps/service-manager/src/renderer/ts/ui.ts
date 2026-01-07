/**
 * UI Manager - 모든 화면 전환, 알림창, 모달 및 공통 UI 요소 제어
 */

import {
  TABS,
  TAB_LABELS,
  PRISMA_SUBTABS,
  PRISMA_SUBTAB_LABELS,
  TIMING,
} from './utils/constants.js'
import {
  getElementById,
  setElementText,
  setElementHTML,
  escapeHtml as escapeHtmlUtil,
} from './utils/dom.js'

const UI = {
  /**
   * 1. 메인 탭 전환 (서비스, Prisma, 환경 변수 등)
   * 사용자님의 원본 스타일(flex/grid/gap) 로직을 그대로 유지합니다.
   */
  switchTab(tabName: string): void {
    console.log(`🔄 탭 전환 시작: ${tabName}`)

    // 모든 탭 버튼 비활성화
    document
      .querySelectorAll('.tab-btn')
      .forEach((btn) => {
        btn.classList.remove('active')
        const ariaSelected = btn.getAttribute('aria-selected')
        if (ariaSelected !== null) {
          btn.setAttribute('aria-selected', 'false')
        }
      })

    // 모든 탭 콘텐츠 숨기기 (active 클래스 제거)
    const tabIds = [
      TABS.SERVICES,
      TABS.PRISMA,
      TABS.ENV,
      TABS.PACKAGES,
      TABS.LOGS,
    ]
    tabIds.forEach((id) => {
      const tab = getElementById<HTMLElement>(`tab-${id}`)
      if (tab) {
        tab.classList.remove('active')
        // 인라인 스타일 제거하여 CSS가 적용되도록 함
        tab.style.display = ''
        console.log(`  - 탭 숨김: #tab-${id}`)
      }
    })

    // 선택된 버튼 활성화 (텍스트 매칭 로직)
    const label = TAB_LABELS[tabName] || ''
    const clickedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
      (btn) => btn.textContent?.includes(label),
    )
    if (clickedBtn) {
      clickedBtn.classList.add('active')
      clickedBtn.setAttribute('aria-selected', 'true')
      console.log(`  - 버튼 활성화: ${label}`)
    } else {
      console.warn(`  ⚠️ 버튼을 찾을 수 없습니다: ${label}`)
    }

    // 선택된 탭 표시 (active 클래스 추가)
    const tabContent = getElementById<HTMLElement>(`tab-${tabName}`)
    if (tabContent) {
      tabContent.classList.add('active')
      // 인라인 스타일도 제거하여 CSS가 적용되도록 함
      tabContent.style.display = ''
      console.log(`✅ 탭 활성화: #tab-${tabName}`)
    } else {
      console.error(`❌ 탭을 찾을 수 없습니다: #tab-${tabName}`)
    }

    // 탭 진입 시 자동 로드
    const tabLoaders: Record<string, () => void> = {
      [TABS.PACKAGES]: () => {
        if (typeof window.loadInstalledPackages === 'function') {
          window.loadInstalledPackages()
        }
      },
      [TABS.LOGS]: () => {
        if (typeof window.loadLogFiles === 'function') {
          window.loadLogFiles()
        }
      },
      [TABS.ENV]: () => {
        if (typeof window.loadEnvFiles === 'function') {
          window.loadEnvFiles()
        }
      },
      [TABS.PRISMA]: () => {
        if (typeof window.refreshPrismaStatus === 'function') {
          window.refreshPrismaStatus()
        }
      },
    }

    const loader = tabLoaders[tabName]
    if (loader) {
      setTimeout(loader, TIMING.TAB_LOAD_DELAY)
    }
  },

  /**
   * 2. Prisma 서브탭 전환 (개요, 스키마, 마이그레이션 등)
   */
  switchPrismaSubTab(subtabName: string): void {
    console.log('🔄 Prisma 서브탭 전환:', subtabName)

    // 버튼 및 콘텐츠 초기화
    document
      .querySelectorAll('.prisma-subtab-btn')
      .forEach((btn) => btn.classList.remove('active'))
    document
      .querySelectorAll('.prisma-subtab-content')
      .forEach((content) => content.classList.remove('active'))

    // 버튼 활성화 (라벨 매칭)
    const label = PRISMA_SUBTAB_LABELS[subtabName] || ''
    document.querySelectorAll('.prisma-subtab-btn').forEach((btn) => {
      if (btn.textContent?.includes(label)) {
        btn.classList.add('active')
      }
    })

    // 콘텐츠 표시
    const targetContent = getElementById<HTMLElement>(
      `prisma-subtab-${subtabName}`,
    )
    if (targetContent) {
      targetContent.classList.add('active')
    }

    // 서브탭 자동 로드
    const subtabLoaders: Record<string, () => void> = {
      [PRISMA_SUBTABS.HISTORY]: () => {
        if (typeof window.loadMigrationHistory === 'function') {
          window.loadMigrationHistory()
        }
      },
      [PRISMA_SUBTABS.SEED]: () => {
        if (typeof window.loadSeedFiles === 'function') {
          window.loadSeedFiles()
        }
      },
      [PRISMA_SUBTABS.OVERVIEW]: () => {
        if (typeof window.refreshPrismaStatus === 'function') {
          window.refreshPrismaStatus()
        }
      },
    }

    const loader = subtabLoaders[subtabName]
    if (loader) {
      loader()
    }
  },

  /**
   * 3. 공통 알림창(Alert Dialog) 제어
   */
  showAlert(title: string, content: string): void {
    setElementText('alertTitle', title)
    setElementText('alertContent', content)
    const dialog = getElementById<HTMLElement>('alertDialog')
    if (dialog) {
      dialog.style.display = 'flex'
    }
  },

  closeAlertDialog(): void {
    const dialog = getElementById<HTMLElement>('alertDialog')
    if (dialog) {
      dialog.style.display = 'none'
    }
  },

  async copyAlertContent(): Promise<void> {
    const contentEl = getElementById<HTMLElement>('alertContent')
    if (!contentEl) return

    const content = contentEl.textContent || ''
    try {
      await navigator.clipboard.writeText(content)
      const btn = getElementById<HTMLElement>('copyButton')
      if (!btn) return

      const originalText = btn.textContent || ''
      setElementText('copyButton', '✅ 복사됨')
      setTimeout(() => {
        setElementText('copyButton', originalText)
      }, TIMING.COPY_FEEDBACK_DURATION)
    } catch (err) {
      console.error('복사 실패:', err)
    }
  },

  /**
   * 4. 패키지 상세 모달 제어
   */
  openPackageModal(name: string): void {
    const modal = getElementById<HTMLElement>('packageModal')
    if (modal) {
      modal.classList.add('active')
    }
    setElementText('modalPackageName', name)
    setElementHTML(
      'modalPackageBody',
      '<div class="modal-loading"><div class="modal-spinner">⏳</div><div>로딩 중...</div></div>',
    )
  },

  closePackageModal(): void {
    const modal = getElementById<HTMLElement>('packageModal')
    if (modal) {
      modal.classList.remove('active')
    }
  },

  /**
   * 5. 공통 유틸리티: 버튼 로딩 상태 전환
   * 버튼의 원래 상태를 복구하기 위해 dataset을 사용합니다.
   */
  setLoading(
    buttonId: string,
    isLoading: boolean,
    loadingText: string = '처리 중...',
  ): void {
    const btn = getElementById<HTMLButtonElement>(buttonId)
    if (!btn) return

    if (isLoading) {
      btn.disabled = true
      if (!btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML
      }
      btn.innerHTML = `<span class="spinner"></span> ${loadingText}`
    } else {
      btn.disabled = false
      btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML
    }
  },

  /**
   * 6. 보안 유틸리티: HTML 이스케이프
   */
  escapeHtml(text: string): string {
    return escapeHtmlUtil(text)
  },
}

/**
 * 전역 이벤트 리스너 (ESC 키로 모달 닫기)
 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    UI.closePackageModal()
    UI.closeAlertDialog()
  }
})

/**
 * 🌐 HTML에서 바로 호출할 수 있도록 window 객체에 등록 (하위 호환성 유지)
 */
window.UI = UI
window.switchTab = UI.switchTab
window.switchPrismaSubTab = UI.switchPrismaSubTab
window.showAlert = UI.showAlert
window.closeAlertDialog = UI.closeAlertDialog
window.copyAlertContent = UI.copyAlertContent
window.closePackageModal = UI.closePackageModal
