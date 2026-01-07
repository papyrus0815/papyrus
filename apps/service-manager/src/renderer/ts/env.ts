/**
 * Environment Variables Manager - 환경 변수 파일 CRUD 관리
 */

// 환경 변수 상태
let currentEnvFile: string = ''
let currentEnvVariables: Record<string, string> = {}

/**
 * 환경 변수 파일 목록 로드
 */
async function loadEnvFiles(): Promise<void> {
  try {
    console.log('📋 환경 변수 파일 목록 로드 중...')
    const files = await window.electronAPI.env.getFiles()

    const select = document.getElementById('envFileSelect') as HTMLSelectElement
    if (!select) return
    select.innerHTML = '<option value="">파일을 선택하세요</option>'

    files.forEach((file) => {
      const option = document.createElement('option')
      option.value = file
      option.textContent = file
      select.appendChild(option)
    })

    console.log(`✅ ${files.length}개 환경 변수 파일 로드 완료`)
  } catch (error: any) {
    console.error('❌ 환경 변수 파일 목록 로드 실패:', error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 파일 목록 로드 실패', error.message)
    } else {
      alert('❌ 파일 목록 로드 실패\n\n' + error.message)
    }
  }
}

/**
 * 환경 변수 로드
 */
async function loadEnvVariables(): Promise<void> {
  const select = document.getElementById('envFileSelect') as HTMLSelectElement
  if (!select) return
  currentEnvFile = select.value

  if (!currentEnvFile) {
    const variablesCard = document.getElementById('envVariablesCard')
    const rawCard = document.getElementById('envRawCard')
    if (variablesCard) variablesCard.style.display = 'none'
    if (rawCard) rawCard.style.display = 'none'
    return
  }

  try {
    console.log(`📖 환경 변수 읽기: ${currentEnvFile}`)
    const result = await window.electronAPI.env.read(currentEnvFile)

    if (!result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 환경 변수 읽기 실패', result.message || '알 수 없는 오류')
      } else {
        alert('❌ 환경 변수 읽기 실패\n\n' + (result.message || '알 수 없는 오류'))
      }
      return
    }

    currentEnvVariables = { ...result.variables }

    // 변수 테이블 렌더링
    renderEnvVariablesTable()

    // Raw 내용 표시
    const rawContentEl = document.getElementById('envRawContent')
    if (rawContentEl) rawContentEl.textContent = result.raw

    // 카드 표시
    const variablesCard = document.getElementById('envVariablesCard')
    const rawCard = document.getElementById('envRawCard')
    if (variablesCard) variablesCard.style.display = 'block'
    if (rawCard) rawCard.style.display = 'block'

    console.log(
      `✅ ${Object.keys(currentEnvVariables).length}개 환경 변수 로드 완료`,
    )
  } catch (error: any) {
    console.error('❌ 환경 변수 로드 실패:', error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 환경 변수 로드 실패', error.message)
    } else {
      alert('❌ 환경 변수 로드 실패\n\n' + error.message)
    }
  }
}

/**
 * 환경 변수 테이블 렌더링
 */
function renderEnvVariablesTable(): void {
  const tbody = document.getElementById('envVariablesTable')
  if (!tbody) return

  if (Object.keys(currentEnvVariables).length === 0) {
    tbody.innerHTML = `
            <tr>
              <td colspan="3">
                <div class="empty-state">
                  <div class="empty-icon">⚙️</div>
                  <div>환경 변수가 없습니다</div>
                </div>
              </td>
            </tr>
          `
    return
  }

  // HTML 이스케이프 유틸리티
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  tbody.innerHTML = Object.entries(currentEnvVariables)
    .map(
      ([key, value]) => `
          <tr>
            <td style="font-family: 'Monaco', 'Courier New', monospace; font-size: 12px; font-weight: 600;">
              ${key}
            </td>
            <td>
              <input
                type="text"
                class="search-input"
                value="${escapeHtml(value)}"
                onchange="updateEnvVariable('${escapeHtml(key)}', this.value)"
                style="width: 100%; padding: 8px 12px; font-size: 12px;"
              />
            </td>
            <td style="text-align: center;">
              <button
                class="btn btn-danger btn-sm"
                onclick="deleteEnvVariable('${escapeHtml(key)}')"
                style="padding: 6px 12px;"
              >
                🗑️ 삭제
              </button>
            </td>
          </tr>
        `,
    )
    .join('')
}

/**
 * 환경 변수 업데이트 (메모리)
 */
function updateEnvVariable(key: string, value: string): void {
  currentEnvVariables[key] = value
  console.log(`✏️ 변수 업데이트: ${key} = ${value}`)
}

/**
 * 환경 변수 추가 모달 표시
 */
function showAddVariableModal(): void {
  const key = prompt('새 환경 변수 이름을 입력하세요:\n\n예: NEW_API_KEY')
  if (!key || !key.trim()) return

  const trimmedKey = key.trim()

  if (trimmedKey in currentEnvVariables) {
    alert(`⚠️ 이미 존재하는 변수입니다: ${trimmedKey}`)
    return
  }

  const value = prompt(`'${trimmedKey}' 변수의 값을 입력하세요:`)
  if (value === null) return

  currentEnvVariables[trimmedKey] = value
  renderEnvVariablesTable()

  console.log(`➕ 새 변수 추가: ${trimmedKey} = ${value}`)
}

/**
 * 환경 변수 삭제
 */
async function deleteEnvVariable(key: string): Promise<void> {
  const confirmed = confirm(
    `🗑️ 환경 변수를 삭제하시겠습니까?\n\n변수: ${key}\n\n⚠️ 이 작업은 파일에서도 즉시 삭제됩니다.`,
  )
  if (!confirmed) return

  try {
    console.log(`🗑️ 환경 변수 삭제: ${key}`)
    const result = await window.electronAPI.env.delete(currentEnvFile, key)

    if (result.success) {
      delete currentEnvVariables[key]
      renderEnvVariablesTable()
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ 삭제 완료', result.message)
      } else {
        alert('✅ 삭제 완료\n\n' + result.message)
      }

      // 파일 다시 로드하여 Raw 내용 업데이트
      await loadEnvVariables()
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 삭제 실패', result.message)
      } else {
        alert('❌ 삭제 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    console.error('❌ 환경 변수 삭제 실패:', error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 삭제 실패', error.message)
    } else {
      alert('❌ 삭제 실패\n\n' + error.message)
    }
  }
}

/**
 * 전체 환경 변수 저장
 */
async function saveAllVariables(): Promise<void> {
  if (!currentEnvFile) {
    alert('⚠️ 파일을 선택해주세요.')
    return
  }

  const confirmed = confirm(
    `💾 모든 변경사항을 저장하시겠습니까?\n\n파일: ${currentEnvFile}\n변수 개수: ${Object.keys(currentEnvVariables).length}개\n\n⚠️ 기존 파일은 자동으로 백업됩니다.`,
  )
  if (!confirmed) return

  try {
    console.log(`💾 환경 변수 저장 중... (${currentEnvFile})`)
    const result = await window.electronAPI.env.write(
      currentEnvFile,
      currentEnvVariables,
    )

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert(
          '✅ 저장 완료',
          result.message + '\n\n서버를 재시작하면 변경사항이 적용됩니다.',
        )
      } else {
        alert(
          '✅ 저장 완료\n\n' +
            result.message +
            '\n\n서버를 재시작하면 변경사항이 적용됩니다.',
        )
      }

      // 파일 다시 로드하여 Raw 내용 업데이트
      await loadEnvVariables()
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 저장 실패', result.message)
      } else {
        alert('❌ 저장 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    console.error('❌ 환경 변수 저장 실패:', error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 저장 실패', error.message)
    } else {
      alert('❌ 저장 실패\n\n' + error.message)
    }
  }
}

/**
 * Raw 내용 복사
 */
function copyEnvRaw(): void {
  const contentEl = document.getElementById('envRawContent')
  if (!contentEl) return
  const content = contentEl.textContent || ''
  navigator.clipboard
    .writeText(content)
    .then(() => {
      const btn = document.getElementById('copyRawButton')
      if (!btn) return
      const originalText = btn.textContent || ''
      btn.textContent = '✅ 복사됨'
      setTimeout(() => {
        if (btn) btn.textContent = originalText
      }, 2000)
    })
    .catch((err) => {
      console.error('복사 실패:', err)
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 복사 실패', err.message)
      } else {
        alert('❌ 복사 실패\n\n' + err.message)
      }
    })
}

// 🌐 전역 등록
window.loadEnvFiles = loadEnvFiles
window.loadEnvVariables = loadEnvVariables
window.renderEnvVariablesTable = renderEnvVariablesTable
window.updateEnvVariable = updateEnvVariable
window.showAddVariableModal = showAddVariableModal
window.deleteEnvVariable = deleteEnvVariable
window.saveAllVariables = saveAllVariables
window.copyEnvRaw = copyEnvRaw
