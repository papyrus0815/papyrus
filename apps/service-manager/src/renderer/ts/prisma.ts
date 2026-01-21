/**
 * Prisma Manager - Prisma 스키마, 마이그레이션, Studio, Seed 관리
 */

/**
 * Seed 파일 목록 불러오기
 */
async function loadSeedFiles(): Promise<void> {
  try {
    const files = await window.electronAPI.prisma.getSeedFiles()
    const tableBody = document.getElementById('seedFilesTable')
    if (!tableBody) return

    if (files.length === 0) {
      tableBody.innerHTML = `
          <tr>
            <td colspan="2" class="empty-row">
              <div class="empty-state">
                <div class="empty-icon">📂</div>
                <div>Seed 파일이 없습니다</div>
                <div style="font-size: 12px; margin-top: 8px; color: rgba(255,255,255,0.5);">
                  <code>apps/api/prisma/seeds/</code> 폴더에 <code>.sql</code> 파일을 추가하세요
                </div>
              </div>
            </td>
          </tr>
        `
    } else {
      tableBody.innerHTML = files
        .map(
          (file, index) => `
          <tr>
            <td style="text-align: center; color: rgba(255,255,255,0.6);">${index + 1}</td>
            <td>
              <div style="font-family: 'Monaco', 'Courier New', monospace; font-size: 12px;">
                ${file.name}
              </div>
            </td>
          </tr>
        `,
        )
        .join('')
    }
  } catch (error: any) {
    console.error('Seed 파일 목록 불러오기 실패:', error)
    const tableBody = document.getElementById('seedFilesTable')
    if (!tableBody) return
    tableBody.innerHTML = `
        <tr>
          <td colspan="2" class="empty-row">
            <div class="empty-state">
              <div class="empty-icon">⚠️</div>
              <div>파일 목록을 불러오는데 실패했습니다</div>
            </div>
          </td>
        </tr>
      `
  }
}

/**
 * Prisma 상태 새로고침
 */
async function refreshPrismaStatus(): Promise<void> {
  try {
    const status = await window.electronAPI.prisma.getStatus()

    // 스키마 상태
    const schemaStatusEl = document.getElementById('prismaSchemaStatus')
    if (schemaStatusEl) {
      if (status.schemaValid) {
        schemaStatusEl.innerHTML =
          '<div class="status-dot running"></div><span>유효함</span>'
      } else {
        schemaStatusEl.innerHTML =
          '<div class="status-dot stopped"></div><span>무효 또는 없음</span>'
      }
    }

    // 마이그레이션 상태
    const migrationsStatusEl = document.getElementById('prismaMigrationsStatus')
    if (migrationsStatusEl) {
      if (status.migrationsCount > 0) {
        migrationsStatusEl.innerHTML = `<div class="status-dot running"></div><span>${status.migrationsCount}개 (최신: ${status.lastMigration || 'N/A'})</span>`
      } else {
        migrationsStatusEl.innerHTML =
          '<div class="status-dot stopped"></div><span>마이그레이션 없음</span>'
      }
    }

    // Studio 상태
    const studioStatusEl = document.getElementById('prismaStudioStatus')
    const startStudioBtn = document.getElementById('startStudioBtn')
    const stopStudioBtn = document.getElementById('stopStudioBtn')
    const openStudioBtn = document.getElementById('openStudioBtn')

    if (status.studioRunning) {
      if (studioStatusEl) {
        studioStatusEl.innerHTML =
          '<div class="status-dot running"></div><span>실행 중 (포트: 5555)</span>'
      }
      if (startStudioBtn) (startStudioBtn as HTMLElement).style.display = 'none'
      if (stopStudioBtn)
        (stopStudioBtn as HTMLElement).style.display = 'inline-block'
      if (openStudioBtn)
        (openStudioBtn as HTMLElement).style.display = 'inline-block'
    } else {
      if (studioStatusEl) {
        studioStatusEl.innerHTML =
          '<div class="status-dot stopped"></div><span>중지됨</span>'
      }
      if (startStudioBtn)
        (startStudioBtn as HTMLElement).style.display = 'inline-block'
      if (stopStudioBtn) (stopStudioBtn as HTMLElement).style.display = 'none'
      if (openStudioBtn) (openStudioBtn as HTMLElement).style.display = 'none'
    }
  } catch (error: any) {
    console.error('Prisma 상태 조회 실패:', error)
  }
}

/**
 * Prisma 서브탭 전환
 */
function switchPrismaSubTab(subtabName: string): void {
  console.log('🔄 Prisma 서브탭 전환:', subtabName)

  // 모든 서브탭 버튼 비활성화
  document.querySelectorAll('.prisma-subtab-btn').forEach((btn) => {
    btn.classList.remove('active')
  })

  // 모든 서브탭 콘텐츠 숨기기
  document.querySelectorAll('.prisma-subtab-content').forEach((content) => {
    content.classList.remove('active')
  })

  // 클릭된 버튼 찾아서 활성화
  document.querySelectorAll('.prisma-subtab-btn').forEach((btn) => {
    if (
      btn.textContent?.includes(
        subtabName === 'overview'
          ? '개요'
          : subtabName === 'schema'
            ? '스키마'
            : subtabName === 'migration'
              ? '마이그레이션'
              : subtabName === 'studio'
                ? 'Studio'
                : subtabName === 'seed'
                  ? 'Seed'
                  : '히스토리',
      )
    ) {
      btn.classList.add('active')
    }
  })

  // 선택한 서브탭 콘텐츠 활성화
  const targetContent = document.getElementById(`prisma-subtab-${subtabName}`)
  if (targetContent) {
    targetContent.classList.add('active')
    console.log('✅ 서브탭 활성화:', subtabName)
  } else {
    console.error('❌ 서브탭을 찾을 수 없음:', `prisma-subtab-${subtabName}`)
  }

  // 히스토리 탭이 활성화되면 자동 로드
  if (subtabName === 'history') {
    loadMigrationHistory()
  }

  // Seed 탭이 활성화되면 파일 목록 로드
  if (subtabName === 'seed') {
    loadSeedFiles()
  }

  // 개요 탭이 활성화되면 상태 새로고침
  if (subtabName === 'overview') {
    refreshPrismaStatus()
  }
}

/**
 * 스키마 빌드
 */
async function buildPrismaSchema(): Promise<void> {
  const button = document.getElementById('buildSchemaButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 빌드 중...'

    console.log('📦 스키마 빌드 시작...')
    const result = await window.electronAPI.prisma.buildSchema()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ 스키마 빌드 완료', result.message)
      } else {
        alert('✅ 스키마 빌드 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 스키마 빌드 실패', result.message)
      } else {
        alert('❌ 스키마 빌드 실패\n\n' + result.message)
      }
    }

    await refreshPrismaStatus()
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 스키마 빌드 실패', error.message)
    } else {
      alert('❌ 스키마 빌드 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * 스키마 검증
 */
async function validatePrismaSchema(): Promise<void> {
  const button = document.getElementById('validateSchemaButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 검증 중...'

    console.log('🔍 스키마 검증 시작...')
    const result = await window.electronAPI.prisma.validateSchema()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ 스키마 검증 완료', result.message)
      } else {
        alert('✅ 스키마 검증 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 스키마 검증 실패', result.message)
      } else {
        alert('❌ 스키마 검증 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 스키마 검증 실패', error.message)
    } else {
      alert('❌ 스키마 검증 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * Prisma Client 생성
 */
async function generatePrismaClient(): Promise<void> {
  const button = document.getElementById('generateClientButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 생성 중...'

    console.log('🔄 Prisma Client 생성 시작...')
    const result = await window.electronAPI.prisma.generateClient()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Prisma Client 생성 완료', result.message)
      } else {
        alert('✅ Prisma Client 생성 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Prisma Client 생성 실패', result.message)
      } else {
        alert('❌ Prisma Client 생성 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Prisma Client 생성 실패', error.message)
    } else {
      alert('❌ Prisma Client 생성 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * 마이그레이션 실행
 */
async function runPrismaMigration(): Promise<void> {
  const migrationNameInput = document.getElementById(
    'migrationName',
  ) as HTMLInputElement
  if (!migrationNameInput) return
  const migrationName = migrationNameInput.value.trim()

  if (!migrationName) {
    alert(
      '⚠️ 마이그레이션 이름을 입력해주세요.\n\n예시: add_user_role, create_event_table',
    )
    return
  }

  const confirmed = confirm(
    `🚀 마이그레이션을 실행하시겠습니까?\n\n이름: ${migrationName}\n\n⚠️ 이 작업은 데이터베이스 스키마를 변경합니다.`,
  )
  if (!confirmed) return

  const button = document.getElementById('runMigrationButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> 마이그레이션 중...'

    console.log(`🚀 마이그레이션 실행: ${migrationName}`)
    const result = await window.electronAPI.prisma.migrate(migrationName)

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ 마이그레이션 완료', result.message)
      } else {
        alert('✅ 마이그레이션 완료\n\n' + result.message)
      }
      migrationNameInput.value = ''
      await loadMigrationHistory()
      await refreshPrismaStatus()
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ 마이그레이션 실패', result.message)
      } else {
        alert('❌ 마이그레이션 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ 마이그레이션 실패', error.message)
    } else {
      alert('❌ 마이그레이션 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * 마이그레이션 Deploy (프로덕션)
 */
async function deployPrismaMigration(): Promise<void> {
  const confirmed = confirm(
    `🚀 마이그레이션을 Deploy 하시겠습니까?\n\n⚠️ 이 작업은 데이터베이스에 미적용된 마이그레이션을 모두 적용합니다.\n\n• 개발 환경: migrate dev 사용\n• 프로덕션 환경: migrate deploy 사용`,
  )
  if (!confirmed) return

  const button = document.getElementById('deployMigrationButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> Deploy 중...'

    console.log('🚀 마이그레이션 Deploy 실행')
    const result = await window.electronAPI.prisma.deploy()

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Deploy 완료', result.message)
      } else {
        alert('✅ Deploy 완료\n\n' + result.message)
      }
      await loadMigrationHistory()
      await refreshPrismaStatus()
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Deploy 실패', result.message)
      } else {
        alert('❌ Deploy 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Deploy 실패', error.message)
    } else {
      alert('❌ Deploy 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * 마이그레이션 상태 확인
 */
async function checkMigrationStatus(): Promise<void> {
  try {
    console.log('📊 마이그레이션 상태 확인 중...')
    const result = await window.electronAPI.prisma.getMigrationStatus()

    if (result.success) {
      alert('📊 마이그레이션 상태\n\n' + result.message)
    } else {
      alert('⚠️ 마이그레이션 상태\n\n' + result.message)
    }
  } catch (error: any) {
    alert('❌ 마이그레이션 상태 확인 실패!\n\n' + error.message)
  }
}

/**
 * 마이그레이션 히스토리 로드
 */
async function loadMigrationHistory(): Promise<void> {
  try {
    const migrations = await window.electronAPI.prisma.getMigrations()
    const tbody = document.getElementById('migrationHistoryTable')
    if (!tbody) return

    if (migrations.length === 0) {
      tbody.innerHTML = `
              <tr>
                <td colspan="2" class="empty-row">
                  <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <div>마이그레이션 히스토리가 없습니다</div>
                  </div>
                </td>
              </tr>
            `
    } else {
      tbody.innerHTML = migrations
        .map(
          (m) => `
              <tr>
                <td style="font-family: 'Monaco', 'Menlo', monospace; font-size: 12px;">${m.name}</td>
                <td style="color: rgba(255,255,255,0.6); font-size: 12px;">${m.appliedAt}</td>
              </tr>
            `,
        )
        .join('')
    }
  } catch (error: any) {
    console.error('마이그레이션 히스토리 로드 실패:', error)
  }
}

/**
 * Prisma Studio 시작
 */
async function startPrismaStudio(): Promise<void> {
  try {
    console.log('🎨 Prisma Studio 시작 중...')
    const result = await window.electronAPI.prisma.startStudio()

    if (result.success) {
      alert(
        '✅ Prisma Studio 시작 완료!\n\n' +
          result.message +
          '\n\n브라우저에서 http://localhost:5555 를 열어주세요.',
      )
      await refreshPrismaStatus()
    } else {
      alert('❌ Prisma Studio 시작 실패!\n\n' + result.message)
    }
  } catch (error: any) {
    alert('❌ Prisma Studio 시작 실패!\n\n' + error.message)
  }
}

/**
 * Prisma Studio 중지
 */
async function stopPrismaStudio(): Promise<void> {
  try {
    console.log('🛑 Prisma Studio 중지 중...')
    const result = await window.electronAPI.prisma.stopStudio()

    if (result.success) {
      alert('✅ Prisma Studio 중지 완료!\n\n' + result.message)
      await refreshPrismaStatus()
    } else {
      alert('❌ Prisma Studio 중지 실패!\n\n' + result.message)
    }
  } catch (error: any) {
    alert('❌ Prisma Studio 중지 실패!\n\n' + error.message)
  }
}

/**
 * Studio 브라우저에서 열기
 */
function openStudioInBrowser(): void {
  window.electronAPI.openExternal('http://localhost:5555')
}

/**
 * Seed 실행
 */
async function runSeed(): Promise<void> {
  const environmentSelect = document.getElementById(
    'seedEnvironment',
  ) as HTMLSelectElement
  if (!environmentSelect) return
  const environment = environmentSelect.value

  const confirmed = confirm(
    `🌱 Seed 데이터를 삽입하시겠습니까?\n\n환경: ${environment === 'development' ? 'Development (개발 환경 - 전체 데이터)' : 'Test (테스트 환경)'}\n\n이미 데이터가 있는 경우 중복될 수 있습니다.`,
  )
  if (!confirmed) return

  const button = document.getElementById('runSeedButton')
  if (!button) return
  const originalText = button.innerHTML

  try {
    ;(button as HTMLButtonElement).disabled = true
    button.innerHTML = '<span class="spinner"></span> Seed 실행 중...'

    console.log(`🌱 Seed 실행 중... (환경: ${environment})`)
    const result = await window.electronAPI.prisma.runSeed(
      environment || undefined,
    )

    if (result.success) {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('✅ Seed 완료', result.message)
      } else {
        alert('✅ Seed 완료\n\n' + result.message)
      }
    } else {
      if (typeof UI !== 'undefined' && UI.showAlert) {
        UI.showAlert('❌ Seed 실패', result.message)
      } else {
        alert('❌ Seed 실패\n\n' + result.message)
      }
    }
  } catch (error: any) {
    if (typeof UI !== 'undefined' && UI.showAlert) {
      UI.showAlert('❌ Seed 실패', error.message)
    } else {
      alert('❌ Seed 실패\n\n' + error.message)
    }
  } finally {
    ;(button as HTMLButtonElement).disabled = false
    button.innerHTML = originalText
  }
}

/**
 * Prisma 설정 편집
 */
async function editPrismaSetting(settingKey: string): Promise<void> {
  try {
    // 현재 값 가져오기
    const result = await window.electronAPI.env.read('env.development')
    if (!result.success) {
      alert('❌ 환경 변수를 읽을 수 없습니다.')
      return
    }

    const currentValue = result.variables[settingKey] || ''
    const newValue = prompt(
      `${settingKey} 값을 입력하세요:\n\n현재 값: ${currentValue || '(설정되지 않음)'}`,
      currentValue,
    )

    if (newValue === null) return // 취소

    // 값 업데이트
    const updatedVariables = { ...result.variables, [settingKey]: newValue }
    const writeResult = await window.electronAPI.env.write(
      'env.development',
      updatedVariables,
    )

    if (writeResult.success) {
      alert(`✅ ${settingKey} 업데이트 완료!\n\n${writeResult.message}`)
      await refreshPrismaStatus()
    } else {
      alert(`❌ ${settingKey} 업데이트 실패!\n\n${writeResult.message}`)
    }
  } catch (error: any) {
    alert(`❌ 설정 편집 실패!\n\n${error.message}`)
  }
}

/**
 * 스키마 파일 열기
 */
async function openSchemaFile(): Promise<void> {
  try {
    const schemaPath = 'apps/api/prisma/schema.prisma'
    await window.electronAPI.openExternal(
      `file://${process.cwd()}/${schemaPath}`,
    )
  } catch (error: any) {
    alert(`❌ 파일 열기 실패!\n\n${error.message}`)
  }
}

/**
 * 모든 Prisma 설정 보기
 */
async function showAllPrismaSettings(): Promise<void> {
  try {
    const result = await window.electronAPI.env.read('env.development')
    if (!result.success) {
      alert('❌ 환경 변수를 읽을 수 없습니다.')
      return
    }

    // Prisma 관련 환경 변수만 필터링
    const prismaSettings = Object.entries(result.variables)
      .filter(
        ([key]) =>
          key.includes('DATABASE') ||
          key.includes('PRISMA') ||
          key.includes('MYSQL'),
      )
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    if (prismaSettings) {
      alert(`⚙️ Prisma 관련 설정\n\n${prismaSettings}`)
    } else {
      alert('⚠️ Prisma 관련 설정이 없습니다.')
    }
  } catch (error: any) {
    alert(`❌ 설정 조회 실패!\n\n${error.message}`)
  }
}

// 🌐 전역 등록
window.editPrismaSetting = editPrismaSetting
window.openSchemaFile = openSchemaFile
window.showAllPrismaSettings = showAllPrismaSettings
window.loadSeedFiles = loadSeedFiles
window.refreshPrismaStatus = refreshPrismaStatus
window.switchPrismaSubTab = switchPrismaSubTab
window.buildPrismaSchema = buildPrismaSchema
window.validatePrismaSchema = validatePrismaSchema
window.generatePrismaClient = generatePrismaClient
window.runPrismaMigration = runPrismaMigration
window.deployPrismaMigration = deployPrismaMigration
window.checkMigrationStatus = checkMigrationStatus
window.loadMigrationHistory = loadMigrationHistory
window.startPrismaStudio = startPrismaStudio
window.stopPrismaStudio = stopPrismaStudio
window.openStudioInBrowser = openStudioInBrowser
window.runSeed = runSeed
