/**
 * 전역 타입 정의
 */

// Window 인터페이스 확장
declare global {
  // 전역 UI 객체
  var UI: typeof import('../ts/ui').UI | undefined

  interface Window {
    electronAPI: typeof import('../../preload').electronAPI
    cachedStatus: any
    UI: typeof import('../ts/ui').UI
    initApp: () => void
    updateStatus: () => Promise<void>
    clearConsoleLog: () => void
    openDevTools: () => void
    renderServices: () => void
    getServiceStatus: (serviceId: string) => string
    updateServiceButtons: () => void
    handleStart: (serviceId: string) => Promise<void>
    handleStop: (serviceId: string) => Promise<void>
    openUrl: (url: string) => void
    resetDocker: () => Promise<void>
    clearEnvCache: () => void
    switchTab: (tabName: string) => void
    switchPrismaSubTab: (subtabName: string) => void
    showAlert: (title: string, content: string) => void
    closeAlertDialog: () => void
    copyAlertContent: () => Promise<void>
    closePackageModal: () => void
    loadSeedFiles: () => Promise<void>
    refreshPrismaStatus: () => Promise<void>
    buildPrismaSchema: () => Promise<void>
    validatePrismaSchema: () => Promise<void>
    generatePrismaClient: () => Promise<void>
    runPrismaMigration: () => Promise<void>
    checkMigrationStatus: () => Promise<void>
    loadMigrationHistory: () => Promise<void>
    startPrismaStudio: () => Promise<void>
    stopPrismaStudio: () => Promise<void>
    openStudioInBrowser: () => void
    runSeed: () => Promise<void>
    editPrismaSetting: (settingKey: string) => Promise<void>
    openSchemaFile: () => Promise<void>
    showAllPrismaSettings: () => Promise<void>
    buildNestiaSdk: () => Promise<void>
    validateNestiaSdk: () => Promise<void>
    loadLogFiles: () => Promise<void>
    viewLogFile: (filePath: string) => Promise<void>
    loadEnvFiles: () => Promise<void>
    loadEnvVariables: () => Promise<void>
    renderEnvVariablesTable: () => void
    updateEnvVariable: (key: string, value: string) => void
    showAddVariableModal: () => void
    deleteEnvVariable: (key: string) => Promise<void>
    saveAllVariables: () => Promise<void>
    copyEnvRaw: () => void
    loadInstalledPackages: () => Promise<void>
    setPackageFilter: (filter: string) => void
    filterPackages: () => void
    sortPackages: (column: string) => void
    checkPackageUpdates: () => Promise<void>
    updateCheckboxChanged: () => void
    updateSelectedPackages: () => Promise<void>
    updateAllPackagesConfirm: () => Promise<void>
    showPackageDetail: (
      name: string,
      version: string,
      type: string,
    ) => Promise<void>
    loadNxProjects: () => Promise<void>
    selectNxProject: (
      projectName: string,
      projectRoot: string,
      hasNestiaConfig: boolean,
    ) => Promise<void>
    loadProjectJson: (projectRoot: string) => Promise<void>
    saveProjectJson: () => Promise<void>
    validateProjectJson: () => void
    restoreProjectJsonBackup: () => Promise<void>
    loadNestiaConfig: (projectRoot: string) => Promise<void>
    saveNestiaConfig: () => Promise<void>
    restoreNestiaConfigBackup: () => Promise<void>
    loadNxJson: () => Promise<void>
    saveNxJson: () => Promise<void>
    validateNxJson: () => void
    restoreNxJsonBackup: () => Promise<void>
  }
}

export {}
