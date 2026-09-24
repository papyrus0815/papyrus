import { contextBridge, ipcRenderer } from 'electron'

/**
 * 렌더러(web-admin)에 노출하는 최소 표면.
 *
 * 주의: `window.electron`이라는 이름은 절대 쓰지 않는다.
 * apps/web-admin/src/shared/api/api.service.ts의 getApiBaseUrl()이 그 키를 보고
 * API 주소를 http://localhost:8000으로 갈아끼우는데, 데스크톱 앱은 내부 프록시를 통해
 * 같은 오리진으로 부르는 편이 CORS·쿠키 면에서 유리하다.
 */
contextBridge.exposeInMainWorld('papyrusDesktop', {
  isDesktop: true,
  platform: process.platform,
  getStatus: () => ipcRenderer.invoke('papyrus:status'),
  onLog: (listener: (line: string) => void) => {
    const handler = (_event: unknown, line: string) => listener(line)
    ipcRenderer.on('papyrus:log', handler)
    return () => ipcRenderer.off('papyrus:log', handler)
  },
})
