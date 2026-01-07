/**
 * Logs Manager - 로그 파일 목록 및 조회 관리
 */

/**
 * 로그 파일 목록 불러오기
 */
async function loadLogFiles(): Promise<void> {
  const container = document.getElementById('logFilesList')
  if (!container) return
  container.innerHTML =
    '<div class="empty-state"><div class="empty-icon">⏳</div><div>로그 파일을 불러오는 중...</div></div>'

  try {
    const logData = await window.electronAPI.getLogFiles()

    if (logData.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-icon">📂</div><div>로그 파일이 없습니다</div></div>'
      return
    }

    let html = ''
    for (const category of logData) {
      html += `
              <div style="margin-bottom: 24px;">
                <h3 style="color: #4a9eff; margin-bottom: 12px; font-size: 16px;">
                  📁 ${category.category}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 8px;">
            `

      for (const file of category.files) {
        const date = new Date(file.mtime).toLocaleString('ko-KR')
        const sizeKB = (file.size / 1024).toFixed(2)
        const status = file.name.includes('success') ? '✅' : '❌'

        html += `
                <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'" onclick="viewLogFile('${file.path.replace(/\\/g, '\\\\')}')">
                  <div>
                    <div style="font-family: 'Monaco', 'Courier New', monospace; font-size: 13px; color: rgba(255,255,255,0.9);">
                      ${status} ${file.name}
                    </div>
                    <div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px;">
                      ${date} • ${sizeKB} KB
                    </div>
                  </div>
                  <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); viewLogFile('${file.path.replace(/\\/g, '\\\\')}')">
                    📄 보기
                  </button>
                </div>
              `
      }

      html += '</div></div>'
    }

    container.innerHTML = html
  } catch (error: any) {
    console.error('로그 파일 목록 불러오기 실패:', error)
    if (container) {
      container.innerHTML =
        '<div class="empty-state"><div class="empty-icon">❌</div><div>로그 파일을 불러오는데 실패했습니다</div></div>'
    }
  }
}

/**
 * 로그 파일 보기
 */
async function viewLogFile(filePath: string): Promise<void> {
  try {
    console.log('📄 로그 파일 읽기:', filePath)
    const content = await window.electronAPI.readLogFile(filePath)
    const fileName = filePath.split('/').pop()
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert(`📄 ${fileName}`, content)
    } else {
      alert(`📄 ${fileName}\n\n${content}`)
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 로그 파일 읽기 실패', error.message)
    } else {
      alert('❌ 로그 파일 읽기 실패\n\n' + error.message)
    }
  }
}

// 🌐 전역 등록
window.loadLogFiles = loadLogFiles
window.viewLogFile = viewLogFile

