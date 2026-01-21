import { contextBridge, ipcRenderer } from 'electron';
// Electron API를 안전하게 렌더러 프로세스에 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 전체 상태 조회
    getStatus: () => ipcRenderer.invoke('service:getStatus'),
    // 전체 제어
    startAll: () => ipcRenderer.invoke('service:startAll'),
    stopAll: () => ipcRenderer.invoke('service:stopAll'),
    // Docker 제어
    startDocker: () => ipcRenderer.invoke('service:startDocker'),
    stopDocker: () => ipcRenderer.invoke('service:stopDocker'),
    resetDocker: () => ipcRenderer.invoke('service:resetDocker'),
    // API 서버 제어
    startApi: () => ipcRenderer.invoke('service:startApi'),
    stopApi: () => ipcRenderer.invoke('service:stopApi'),
    // 관리자 웹 서버 제어
    startWebAdmin: () => ipcRenderer.invoke('service:startWebAdmin'),
    stopWebAdmin: () => ipcRenderer.invoke('service:stopWebAdmin'),
    // 사용자 웹 서버 제어
    startWebUser: () => ipcRenderer.invoke('service:startWebUser'),
    stopWebUser: () => ipcRenderer.invoke('service:stopWebUser'),
    // 로그 조회
    getContainerLogs: (containerName) => ipcRenderer.invoke('service:getContainerLogs', containerName),
    getApiLogs: () => ipcRenderer.invoke('service:getApiLogs'),
    getWebAdminLogs: () => ipcRenderer.invoke('service:getWebAdminLogs'),
    getWebUserLogs: () => ipcRenderer.invoke('service:getWebUserLogs'),
    // 실시간 콘솔 로그
    onConsoleLog: (callback) => {
        ipcRenderer.on('console:log', (_event, log) => callback(log));
    },
    // 웹 열기
    openWeb: () => ipcRenderer.invoke('service:openWeb'),
    openExternal: (url) => ipcRenderer.invoke('service:openExternal', url),
    // 개발자 도구
    openDevTools: () => ipcRenderer.invoke('service:openDevTools'),
    // 패키지 업데이트 확인
    checkPackageUpdates: () => ipcRenderer.invoke('service:checkPackageUpdates'),
    // 패키지 업데이트 실행
    updatePackages: (packages) => ipcRenderer.invoke('service:updatePackages', packages),
    updateAllPackages: () => ipcRenderer.invoke('service:updateAllPackages'),
    // 설치된 패키지 목록 가져오기
    getInstalledPackages: () => ipcRenderer.invoke('service:getInstalledPackages'),
    // 패키지 상세 정보 가져오기
    getPackageInfo: (packageName) => ipcRenderer.invoke('service:getPackageInfo', packageName),
    // 포트 체크
    checkPort: (port) => ipcRenderer.invoke('service:checkPort', port),
    // 로그 관리
    getLogFiles: () => ipcRenderer.invoke('service:getLogFiles'),
    readLogFile: (filePath) => ipcRenderer.invoke('service:readLogFile', filePath),
    // API 빌드
    buildApi: () => ipcRenderer.invoke('service:buildApi'),
    // SDK 빌드
    buildSdk: () => ipcRenderer.invoke('service:buildSdk'),
    // 데이터베이스 관리
    runMigration: () => ipcRenderer.invoke('service:runMigration'),
    runDeploy: () => ipcRenderer.invoke('service:runDeploy'),
    runGenerate: () => ipcRenderer.invoke('service:runGenerate'),
    runSeed: () => ipcRenderer.invoke('service:runSeed'),
    openPrismaStudio: () => ipcRenderer.invoke('service:openPrismaStudio'),
    // ========================================
    // Prisma Manager API
    // ========================================
    prisma: {
        buildSchema: () => ipcRenderer.invoke('prisma:buildSchema'),
        validateSchema: () => ipcRenderer.invoke('prisma:validateSchema'),
        generateClient: () => ipcRenderer.invoke('prisma:generateClient'),
        migrate: (migrationName) => ipcRenderer.invoke('prisma:migrate', migrationName),
        deploy: () => ipcRenderer.invoke('prisma:deploy'),
        getMigrations: () => ipcRenderer.invoke('prisma:getMigrations'),
        getMigrationStatus: () => ipcRenderer.invoke('prisma:getMigrationStatus'),
        startStudio: () => ipcRenderer.invoke('prisma:startStudio'),
        stopStudio: () => ipcRenderer.invoke('prisma:stopStudio'),
        runSeed: (environment) => ipcRenderer.invoke('prisma:runSeed', environment),
        getSeedFiles: () => ipcRenderer.invoke('prisma:getSeedFiles'),
        getStatus: () => ipcRenderer.invoke('prisma:getStatus'),
    },
    // ========================================
    // Nestia SDK API
    // ========================================
    nestia: {
        build: () => ipcRenderer.invoke('nestia:build'),
        validate: () => ipcRenderer.invoke('nestia:validate'),
    },
    // ========================================
    // Environment Variables API
    // ========================================
    env: {
        getFiles: () => ipcRenderer.invoke('env:getFiles'),
        read: (fileName) => ipcRenderer.invoke('env:read', fileName),
        write: (fileName, variables) => ipcRenderer.invoke('env:write', fileName, variables),
        delete: (fileName, key) => ipcRenderer.invoke('env:delete', fileName, key),
    },
    // ========================================
    // NX Configuration API
    // ========================================
    nx: {
        getProjects: () => ipcRenderer.invoke('nx:getProjects'),
        readProjectJson: (projectRoot) => ipcRenderer.invoke('nx:readProjectJson', projectRoot),
        saveProjectJson: (projectName, content) => ipcRenderer.invoke('nx:saveProjectJson', projectName, content),
        restoreProjectJsonBackup: (projectName) => ipcRenderer.invoke('nx:restoreProjectJsonBackup', projectName),
        readNestiaConfig: (projectRoot) => ipcRenderer.invoke('nx:readNestiaConfig', projectRoot),
        saveNestiaConfig: (projectName, content) => ipcRenderer.invoke('nx:saveNestiaConfig', projectName, content),
        restoreNestiaConfigBackup: (projectName) => ipcRenderer.invoke('nx:restoreNestiaConfigBackup', projectName),
        readNxJson: () => ipcRenderer.invoke('nx:readNxJson'),
        saveNxJson: (content) => ipcRenderer.invoke('nx:saveNxJson', content),
        restoreNxJsonBackup: () => ipcRenderer.invoke('nx:restoreNxJsonBackup'),
    },
});
