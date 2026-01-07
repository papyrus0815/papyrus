/**
 * Nestia Manager - Nestia SDK 빌드 및 검증 관리
 */

/**
 * Nestia SDK 빌드
 */
async function buildNestiaSdk(): Promise<void> {
  const button = document.getElementById('buildNestiaButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 빌드 중...'

    console.log('🔨 Nestia SDK 빌드 시작...')
    const result = await window.electronAPI.nestia.build()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Nestia SDK 빌드 완료', result.message)
      } else {
        alert('✅ Nestia SDK 빌드 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Nestia SDK 빌드 실패', result.message)
      } else {
        alert('❌ Nestia SDK 빌드 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Nestia SDK 빌드 실패', error.message)
    } else {
      alert('❌ Nestia SDK 빌드 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * Nestia SDK 검증
 */
async function validateNestiaSdk(): Promise<void> {
  const button = document.getElementById('validateNestiaButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 검증 중...'

    console.log('✅ Nestia SDK 검증 시작...')
    const result = await window.electronAPI.nestia.validate()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Nestia SDK 검증 완료', result.message)
      } else {
        alert('✅ Nestia SDK 검증 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Nestia SDK 검증 실패', result.message)
      } else {
        alert('❌ Nestia SDK 검증 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Nestia SDK 검증 실패', error.message)
    } else {
      alert('❌ Nestia SDK 검증 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

// 🌐 전역 등록
window.buildNestiaSdk = buildNestiaSdk
window.validateNestiaSdk = validateNestiaSdk

