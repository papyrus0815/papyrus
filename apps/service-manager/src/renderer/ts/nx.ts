/**
 * NX Configuration Manager - NX 프로젝트 및 설정 파일 관리
 */

interface NxProject {
  name: string
  root: string
  type: 'application' | 'library'
  hasProjectJson: boolean
  hasNestiaConfig: boolean
}

let currentProject: string = ''

/**
 * NX 프로젝트 목록 로드
 */
async function loadNxProjects(): Promise<void> {
  try {
    console.log('📂 [NX] 프로젝트 목록 로드 시작...')
    
    const container = document.getElementById('nxProjectsGrid')
    if (!container) {
      console.error('❌ [NX] nxProjectsGrid 요소를 찾을 수 없습니다')
      return
    }

    console.log('📂 [NX] API 호출 중...')
    const projects = await window.electronAPI.nx.getProjects()
    console.log('📂 [NX] API 응답:', projects)

    if (projects.length === 0) {
      console.log('⚠️ [NX] 프로젝트가 없습니다')
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-text">NX 프로젝트가 없습니다</div>
        </div>
      `
      return
    }

    // 리스트 형태로 표시
    console.log(`📂 [NX] ${projects.length}개 프로젝트 렌더링 중...`)
    const html = projects
      .map(
        (project: NxProject) => `
        <div class="settings-row" style="cursor: pointer;" onclick="selectNxProject('${project.name}', '${project.root}', ${project.hasNestiaConfig})">
          <div>
            <div class="settings-row-label">
              ${project.type === 'application' ? '📱' : '📚'} ${project.name}
            </div>
            <div class="settings-row-description">
              ${project.root}
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="type-badge ${project.type === 'application' ? 'prod' : 'dev'}">
              ${project.type === 'application' ? 'App' : 'Lib'}
            </span>
            <button class="macos-btn macos-btn-secondary macos-btn-sm" onclick="event.stopPropagation(); selectNxProject('${project.name}', '${project.root}', ${project.hasNestiaConfig})">
              편집
            </button>
          </div>
        </div>
      `,
      )
      .join('')

    container.innerHTML = html
    console.log(`✅ [NX] ${projects.length}개 프로젝트 렌더링 완료`)

    // nx.json도 자동 로드
    await loadNxJson()
  } catch (error: any) {
    console.error('❌ [NX] 프로젝트 목록 로드 실패:', error)
    const container = document.getElementById('nxProjectsGrid')
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <div class="empty-state-text">프로젝트 목록 로드 실패: ${error.message}</div>
        </div>
      `
    }
  }
}

/**
 * NX 프로젝트 선택
 */
async function selectNxProject(
  projectName: string,
  projectRoot: string,
  hasNestiaConfig: boolean,
): Promise<void> {
  currentProject = projectName
  console.log(`📂 프로젝트 선택: ${projectName}`)

  // project.json 로드
  await loadProjectJson(projectRoot)

  // 섹션 표시
  const projectJsonSection = document.getElementById('projectJsonSection')
  const projectJsonTitle = document.getElementById('projectJsonTitle')

  if (projectJsonSection) {
    projectJsonSection.style.display = 'block'
    console.log('✅ project.json 섹션 표시')
  }
  if (projectJsonTitle) {
    projectJsonTitle.textContent = `${projectName} - project.json`
  }

  // 스크롤
  projectJsonSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * project.json 로드
 */
async function loadProjectJson(projectRoot: string): Promise<void> {
  try {
    console.log(`📖 project.json 로드: ${projectRoot}`)
    const content = await window.electronAPI.nx.readProjectJson(projectRoot)

    const editor = document.getElementById('projectJsonEditor') as HTMLTextAreaElement
    if (editor) {
      editor.value = JSON.stringify(content, null, 2)
    }
  } catch (error: any) {
    console.error('❌ project.json 로드 실패:', error)
    alert(`❌ project.json 로드 실패!\n\n${error.message}`)
  }
}

/**
 * project.json 저장
 */
async function saveProjectJson(): Promise<void> {
  if (!currentProject) {
    alert('⚠️ 프로젝트를 먼저 선택해주세요.')
    return
  }

  const editor = document.getElementById('projectJsonEditor') as HTMLTextAreaElement
  if (!editor) return

  try {
    // JSON 파싱 검증
    const content = JSON.parse(editor.value)

    const confirmed = confirm(
      `💾 project.json을 저장하시겠습니까?\n\n프로젝트: ${currentProject}\n\n⚠️ 기존 파일은 .backup 확장자로 백업됩니다.`,
    )
    if (!confirmed) return

    console.log(`💾 project.json 저장: ${currentProject}`)
    const result = await window.electronAPI.nx.saveProjectJson(currentProject, content)

    if (result.success) {
      alert(`✅ project.json 저장 완료!\n\n${result.message}`)
    } else {
      alert(`❌ project.json 저장 실패!\n\n${result.message}`)
    }
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      alert(`❌ JSON 형식 오류!\n\n${error.message}\n\n올바른 JSON 형식인지 확인해주세요.`)
    } else {
      alert(`❌ 저장 실패!\n\n${error.message}`)
    }
  }
}

/**
 * project.json 검증
 */
function validateProjectJson(): void {
  const editor = document.getElementById('projectJsonEditor') as HTMLTextAreaElement
  if (!editor) return

  try {
    JSON.parse(editor.value)
    alert('✅ JSON 형식이 올바릅니다!')
  } catch (error: any) {
    alert(`❌ JSON 형식 오류!\n\n${error.message}`)
  }
}

/**
 * project.json 백업 복원
 */
async function restoreProjectJsonBackup(): Promise<void> {
  if (!currentProject) {
    alert('⚠️ 프로젝트를 먼저 선택해주세요.')
    return
  }

  const confirmed = confirm(
    `🔄 project.json 백업을 복원하시겠습니까?\n\n프로젝트: ${currentProject}\n\n⚠️ 현재 내용이 백업 파일로 대체됩니다.`,
  )
  if (!confirmed) return

  try {
    console.log(`🔄 project.json 백업 복원: ${currentProject}`)
    const result = await window.electronAPI.nx.restoreProjectJsonBackup(currentProject)

    if (result.success) {
      alert(`✅ 백업 복원 완료!\n\n${result.message}`)
      // 다시 로드
      const projects = await window.electronAPI.nx.getProjects()
      const project = projects.find((p: NxProject) => p.name === currentProject)
      if (project) {
        await loadProjectJson(project.root)
      }
    } else {
      alert(`❌ 백업 복원 실패!\n\n${result.message}`)
    }
  } catch (error: any) {
    alert(`❌ 백업 복원 실패!\n\n${error.message}`)
  }
}

/**
 * nx.json 로드
 */
async function loadNxJson(): Promise<void> {
  try {
    console.log('📖 nx.json 로드')
    const content = await window.electronAPI.nx.readNxJson()

    const editor = document.getElementById('nxJsonEditor') as HTMLTextAreaElement
    if (editor) {
      editor.value = JSON.stringify(content, null, 2)
    }
  } catch (error: any) {
    console.error('❌ nx.json 로드 실패:', error)
    alert(`❌ nx.json 로드 실패!\n\n${error.message}`)
  }
}

/**
 * nx.json 저장
 */
async function saveNxJson(): Promise<void> {
  const editor = document.getElementById('nxJsonEditor') as HTMLTextAreaElement
  if (!editor) return

  try {
    // JSON 파싱 검증
    const content = JSON.parse(editor.value)

    const confirmed = confirm(
      `💾 nx.json을 저장하시겠습니까?\n\n⚠️ 기존 파일은 .backup 확장자로 백업됩니다.\n⚠️ 이 파일은 전체 워크스페이스에 영향을 줍니다.`,
    )
    if (!confirmed) return

    console.log('💾 nx.json 저장')
    const result = await window.electronAPI.nx.saveNxJson(content)

    if (result.success) {
      alert(`✅ nx.json 저장 완료!\n\n${result.message}`)
    } else {
      alert(`❌ nx.json 저장 실패!\n\n${result.message}`)
    }
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      alert(`❌ JSON 형식 오류!\n\n${error.message}\n\n올바른 JSON 형식인지 확인해주세요.`)
    } else {
      alert(`❌ 저장 실패!\n\n${error.message}`)
    }
  }
}

/**
 * nx.json 검증
 */
function validateNxJson(): void {
  const editor = document.getElementById('nxJsonEditor') as HTMLTextAreaElement
  if (!editor) return

  try {
    JSON.parse(editor.value)
    alert('✅ JSON 형식이 올바릅니다!')
  } catch (error: any) {
    alert(`❌ JSON 형식 오류!\n\n${error.message}`)
  }
}

/**
 * nx.json 백업 복원
 */
async function restoreNxJsonBackup(): Promise<void> {
  const confirmed = confirm(
    `🔄 nx.json 백업을 복원하시겠습니까?\n\n⚠️ 현재 내용이 백업 파일로 대체됩니다.\n⚠️ 이 파일은 전체 워크스페이스에 영향을 줍니다.`,
  )
  if (!confirmed) return

  try {
    console.log('🔄 nx.json 백업 복원')
    const result = await window.electronAPI.nx.restoreNxJsonBackup()

    if (result.success) {
      alert(`✅ 백업 복원 완료!\n\n${result.message}`)
      await loadNxJson()
    } else {
      alert(`❌ 백업 복원 실패!\n\n${result.message}`)
    }
  } catch (error: any) {
    alert(`❌ 백업 복원 실패!\n\n${error.message}`)
  }
}

// 🌐 전역 등록
window.loadNxProjects = loadNxProjects
window.selectNxProject = selectNxProject
window.loadProjectJson = loadProjectJson
window.saveProjectJson = saveProjectJson
window.validateProjectJson = validateProjectJson
window.restoreProjectJsonBackup = restoreProjectJsonBackup
window.loadNxJson = loadNxJson
window.saveNxJson = saveNxJson
window.validateNxJson = validateNxJson
window.restoreNxJsonBackup = restoreNxJsonBackup
