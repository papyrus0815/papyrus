/**
 * 프로젝트 빌드 - API / Web 빌드 실행
 */

async function runApiBuild(): Promise<void> {
  const button = document.getElementById('buildApiButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 빌드 중...'

    const success = await window.electronAPI.buildApi()

    if (success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ API 빌드 완료', 'API 서버가 성공적으로 빌드되었습니다.')
      } else {
        alert('✅ API 빌드 완료\n\nAPI 서버가 성공적으로 빌드되었습니다.')
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ API 빌드 실패', '실시간 콘솔에서 로그를 확인하세요.')
      } else {
        alert('❌ API 빌드 실패\n\n실시간 콘솔에서 로그를 확인하세요.')
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ API 빌드 실패', message)
    } else {
      alert('❌ API 빌드 실패\n\n' + message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

async function runWebBuild(): Promise<void> {
  const button = document.getElementById('buildWebButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 빌드 중...'

    const success = await window.electronAPI.buildWeb()

    if (success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Web 빌드 완료', '웹 앱이 성공적으로 빌드되었습니다.')
      } else {
        alert('✅ Web 빌드 완료\n\n웹 앱이 성공적으로 빌드되었습니다.')
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Web 빌드 실패', '실시간 콘솔에서 로그를 확인하세요.')
      } else {
        alert('❌ Web 빌드 실패\n\n실시간 콘솔에서 로그를 확인하세요.')
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Web 빌드 실패', message)
    } else {
      alert('❌ Web 빌드 실패\n\n' + message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

window.runApiBuild = runApiBuild
window.runWebBuild = runWebBuild
