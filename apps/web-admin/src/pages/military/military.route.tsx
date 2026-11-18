import { type RouteObject } from 'react-router-dom'

import { MilitaryCatalogPage } from './military-catalog.page'
import { MilitaryUnitDetailPage } from './military-unit-detail.page'

export const militaryRoutes: RouteObject[] = [
  {
    path: 'military',
    children: [
      { index: true, element: <MilitaryCatalogPage /> },
      {
        path: 'units/:unitId',
        element: <MilitaryUnitDetailPage />,
      },
    ],
  },
]
