/**
 * Packages Manager - 패키지 목록 로드, 필터링, 정렬 및 업데이트 관리
 */

// 1. 패키지 관련 상태 관리 변수
interface Package {
  name: string
  version: string
  type: 'prod' | 'dev'
}

interface PackageUpdate {
  name: string
  current: string
  latest: string
  updateType: string
}

let allPackages: Package[] = []
let availableUpdates: PackageUpdate[] = []
let currentPackageFilter: string = 'all'
let currentSortColumn: string = 'name'
let currentSortDirection: 'asc' | 'desc' = 'asc'

/**
 * 설치된 패키지 목록 로드
 */
async function loadInstalledPackages(): Promise<void> {
  console.log('📦 설치된 패키지 목록 로딩 시작...')
  const tbody = document.getElementById('packageTableBody')
  if (!tbody) return

  tbody.innerHTML =
    '<tr><td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.4);">로딩 중...</td></tr>'

  try {
    const packages = await window.electronAPI.getInstalledPackages()
    allPackages = packages || []

    if (allPackages.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.4);">패키지가 없습니다.</td></tr>'
      updatePackageStats([])
      return
    }

    applyFilterAndRender()
    updatePackageStats(allPackages)
    updateSortHeaders()
  } catch (error: any) {
    console.error('❌ 패키지 목록 로딩 실패:', error)
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 59, 48, 0.9);">❌ 목록 로딩 실패: ${error.message}</td></tr>`
  }
}

/**
 * 패키지 통계(Total, Prod, Dev 개수) 업데이트
 */
function updatePackageStats(packages: Package[]): void {
  const statsEl = document.getElementById('packageStats')
  if (!statsEl) return

  const prodCount = packages.filter((p) => p.type === 'prod').length
  const devCount = packages.filter((p) => p.type === 'dev').length

  statsEl.innerHTML = `
    <span>Total: ${packages.length}</span>
    <span style="color: #34d399;">Prod: ${prodCount}</span>
    <span style="color: #94a3b8;">Dev: ${devCount}</span>
  `
}

/**
 * 패키지 테이블 렌더링
 */
function renderPackageTable(packages: Package[]): void {
  const tbody = document.getElementById('packageTableBody')
  if (!tbody) return

  if (packages.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.4);">검색 결과가 없습니다.</td></tr>'
    return
  }

  tbody.innerHTML = packages
    .map(
      (pkg) => `
    <tr onclick="showPackageDetail('${pkg.name}', '${pkg.version}', '${pkg.type}')">
      <td>${pkg.name}</td>
      <td>${pkg.version}</td>
      <td style="text-align: center;">
        <span class="type-badge ${pkg.type}">${pkg.type === 'dev' ? 'Dev' : 'Prod'}</span>
      </td>
    </tr>
  `,
    )
    .join('')
}

/**
 * 필터 및 검색 적용 후 렌더링 (통합 함수)
 */
function applyFilterAndRender(): void {
  const searchInput = document.getElementById(
    'packageSearch',
  ) as HTMLInputElement
  const searchTerm = searchInput?.value.toLowerCase() || ''

  let filtered = allPackages

  // 1. 타입 필터 적용
  if (currentPackageFilter !== 'all') {
    filtered = filtered.filter((p) => p.type === currentPackageFilter)
  }

  // 2. 검색어 필터 적용
  if (searchTerm) {
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchTerm))
  }

  // 3. 정렬 적용
  filtered = applySorting(filtered)

  renderPackageTable(filtered)
}

/**
 * 필터 버튼 클릭 처리
 */
function setPackageFilter(filter: string): void {
  currentPackageFilter = filter
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === filter)
  })
  applyFilterAndRender()
}

/**
 * 검색창 입력 처리
 */
function filterPackages(): void {
  applyFilterAndRender()
}

/**
 * 정렬 컬럼 변경
 */
function sortPackages(column: string): void {
  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc'
  } else {
    currentSortColumn = column
    currentSortDirection = 'asc'
  }
  updateSortHeaders()
  applyFilterAndRender()
}

/**
 * 테이블 헤더 UI(화살표) 업데이트
 */
function updateSortHeaders(): void {
  document.querySelectorAll('.package-table th').forEach((th) => {
    th.classList.remove('sort-asc', 'sort-desc')
  })

  const headers = document.querySelectorAll('.package-table th')
  const index =
    currentSortColumn === 'name' ? 0 : currentSortColumn === 'version' ? 1 : 2
  if (headers[index]) {
    headers[index].classList.add(`sort-${currentSortDirection}`)
  }
}

/**
 * 정렬 로직 (버전 숫자 비교 포함)
 */
function applySorting(packages: Package[]): Package[] {
  return packages.sort((a, b) => {
    let aVal, bVal

    if (currentSortColumn === 'name') {
      aVal = a.name.toLowerCase()
      bVal = b.name.toLowerCase()
    } else if (currentSortColumn === 'version') {
      // 세만틱 버전 비교를 위해 숫자만 추출
      const aParts = a.version
        .replace(/[^0-9.]/g, '')
        .split('.')
        .map(Number)
      const bParts = b.version
        .replace(/[^0-9.]/g, '')
        .split('.')
        .map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aNum = aParts[i] || 0
        const bNum = bParts[i] || 0
        if (aNum !== bNum)
          return currentSortDirection === 'asc' ? aNum - bNum : bNum - aNum
      }
      return 0
    } else {
      aVal = a.type
      bVal = b.type
    }

    if (currentSortDirection === 'asc')
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
  })
}

/**
 * 패키지 상세 정보 조회 (모달 연동)
 */
async function showPackageDetail(
  name: string,
  version: string,
  type: string,
): Promise<void> {
  if (typeof window.UI !== 'undefined') window.UI.openPackageModal(name)

  const modalBody = document.getElementById('modalPackageBody')
  if (!modalBody) return

  try {
    const info = await window.electronAPI.getPackageInfo(name)
    if (!info) {
      modalBody.innerHTML =
        '<div class="empty-state">정보를 가져올 수 없습니다.</div>'
      return
    }

    modalBody.innerHTML = `
      <div class="package-detail-section">
        <div class="package-detail-label">버전</div>
        <div class="package-detail-value">
          <span class="package-detail-badge">설치됨: ${version}</span>
          ${info.latestVersion ? `<span class="package-detail-badge">최신: ${info.latestVersion}</span>` : ''}
          <span class="package-detail-badge">${type === 'dev' ? 'Dev' : 'Prod'}</span>
        </div>
      </div>
      ${info.description ? `<div class="package-detail-section"><div class="package-detail-label">설명</div><div class="package-detail-description">${info.description}</div></div>` : ''}
      <div class="package-detail-section">
        <div class="package-detail-label">링크</div>
        <div class="package-detail-links">
          ${info.homepage ? `<a href="#" class="package-detail-link" onclick="window.electronAPI.openExternal('${info.homepage}')">🏠 홈페이지</a>` : ''}
          <a href="#" class="package-detail-link" onclick="window.electronAPI.openExternal('https://www.npmjs.com/package/${name}')">📚 NPM</a>
        </div>
      </div>
    `
  } catch (error: any) {
    modalBody.innerHTML = `<div class="empty-state">❌ 로딩 실패: ${error.message}</div>`
  }
}

/**
 * 업데이트 가능 패키지 확인
 */
async function checkPackageUpdates(): Promise<void> {
  const updateList = document.getElementById('updateList')
  if (!updateList) return
  updateList.innerHTML = '<div class="empty-state">⏳ 확인 중...</div>'

  try {
    const updates = await window.electronAPI.checkPackageUpdates()
    availableUpdates = updates || []

    if (availableUpdates.length === 0) {
      updateList.innerHTML =
        '<div class="empty-state">✅ 모든 패키지가 최신입니다!</div>'
      const selectedBtn = document.getElementById('updateSelectedBtn')
      const allBtn = document.getElementById('updateAllBtn')
      if (selectedBtn) (selectedBtn as HTMLElement).style.display = 'none'
      if (allBtn) (allBtn as HTMLElement).style.display = 'none'
      return
    }

    const selectedBtn = document.getElementById('updateSelectedBtn')
    const allBtn = document.getElementById('updateAllBtn')
    if (selectedBtn) (selectedBtn as HTMLElement).style.display = 'inline-block'
    if (allBtn) (allBtn as HTMLElement).style.display = 'inline-block'

    updateList.innerHTML = availableUpdates
      .map(
        (pkg, index) => `
      <div class="update-item">
        <input type="checkbox" class="update-checkbox" data-index="${index}" onchange="updateCheckboxChanged()">
        <div class="update-info">
          <div class="update-name">${pkg.name}</div>
          <div class="update-versions">
            <span class="version-current">${pkg.current}</span> → <span class="version-latest">${pkg.latest}</span>
          </div>
        </div>
        <div class="update-badge ${pkg.updateType}">${pkg.updateType.toUpperCase()}</div>
      </div>
    `,
      )
      .join('')
  } catch (error: any) {
    updateList.innerHTML = `<div class="empty-state">❌ 확인 실패</div>`
  }
}

/**
 * 체크박스 상태 변경 시 버튼 텍스트 업데이트
 */
function updateCheckboxChanged(): void {
  const count = document.querySelectorAll('.update-checkbox:checked').length
  const btn = document.getElementById('updateSelectedBtn')
  if (btn) {
    btn.textContent =
      count > 0 ? `⬆️ 선택 업데이트 (${count})` : '⬆️ 선택 업데이트'
    ;(btn as HTMLButtonElement).disabled = count === 0
  }
}

/**
 * 선택된 패키지 업데이트 실행
 */
async function updateSelectedPackages(): Promise<void> {
  const selectedIndices = Array.from(
    document.querySelectorAll('.update-checkbox:checked'),
  ).map((cb) => parseInt((cb as HTMLInputElement).dataset.index || '0'))

  const packageNames = selectedIndices.map(
    (i) => `${availableUpdates[i].name}@${availableUpdates[i].latest}`,
  )

  if (!confirm(`📦 ${packageNames.length}개 패키지를 업데이트하시겠습니까?`))
    return

  try {
    const updateList = document.getElementById('updateList')
    if (updateList) {
      updateList.innerHTML = '<div class="empty-state">⏳ 업데이트 중...</div>'
    }
    const result = await window.electronAPI.updatePackages(packageNames)
    alert(
      result.success
        ? '✅ 업데이트 완료'
        : '❌ 업데이트 실패: ' + result.message,
    )
    loadInstalledPackages()
    checkPackageUpdates()
  } catch (error: any) {
    alert('❌ 오류 발생: ' + error.message)
  }
}

/**
 * 전체 패키지 업데이트 확인
 */
async function updateAllPackagesConfirm(): Promise<void> {
  if (availableUpdates.length === 0) {
    alert('⚠️ 업데이트 가능한 패키지가 없습니다.')
    return
  }

  const packageNames = availableUpdates.map(
    (pkg) => `${pkg.name}@${pkg.latest}`,
  )

  const confirmed = confirm(
    `📦 모든 업데이트 가능한 패키지(${availableUpdates.length}개)를 업데이트하시겠습니까?\n\n` +
      packageNames.slice(0, 5).join('\n') +
      (availableUpdates.length > 5
        ? `\n... 외 ${availableUpdates.length - 5}개`
        : '') +
      '\n\n⚠️ 이 작업은 수 분이 소요될 수 있습니다.\n' +
      '⚠️ 일부 패키지는 Breaking Changes가 있을 수 있습니다.',
  )

  if (!confirmed) return

  try {
    const updateList = document.getElementById('updateList')
    if (updateList) {
      updateList.innerHTML =
        '<div class="empty-state"><div class="empty-icon">⏳</div><div>전체 업데이트 중... 잠시만 기다려주세요.</div></div>'
    }

    console.log('📦 전체 패키지 업데이트 시작')
    const result = await window.electronAPI.updatePackages(packageNames)

    if (result.success) {
      alert('✅ ' + result.message)
      // 업데이트 목록 다시 확인
      await checkPackageUpdates()
    } else {
      alert('❌ 업데이트 실패!\n\n' + result.message)
      if (updateList) {
        updateList.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>업데이트 실패</div></div>`
      }
    }
  } catch (error: any) {
    console.error('전체 패키지 업데이트 실패:', error)
    alert('❌ 업데이트 중 오류 발생!\n\n' + error.message)
  }
}

// 🌐 전역 등록
window.loadInstalledPackages = loadInstalledPackages
window.setPackageFilter = setPackageFilter
window.filterPackages = filterPackages
window.sortPackages = sortPackages
window.checkPackageUpdates = checkPackageUpdates
window.updateCheckboxChanged = updateCheckboxChanged
window.updateSelectedPackages = updateSelectedPackages
window.updateAllPackagesConfirm = updateAllPackagesConfirm
window.showPackageDetail = showPackageDetail
