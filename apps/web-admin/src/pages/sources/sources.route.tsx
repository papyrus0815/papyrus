import { RouteObject } from 'react-router-dom'

import { SourcesLibraryPage } from './sources-library.page'

/** /sources — 출처 서고. 좌측 목록·우측 상세를 한 지면이 그린다(셸 사이드바 없음) */
export const sourcesRoutes: RouteObject[] = [{ path: 'sources', element: <SourcesLibraryPage /> }]
