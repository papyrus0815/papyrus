import { type RouteObject } from 'react-router-dom'

import { GovernmentCabinetDetailPage } from './government-cabinet-detail.page'
import { GovernmentCatalogPage } from './government-catalog.page'
import { GovernmentDepartmentDetailPage } from './government-department-detail.page'
import { GovernmentPositionsPage } from './government-positions.page'

export const governmentRoutes: RouteObject[] = [
  {
    path: 'government',
    children: [
      { index: true, element: <GovernmentCatalogPage /> },
      {
        path: 'positions',
        element: <GovernmentPositionsPage />,
      },
      {
        path: 'cabinets/:cabinetId',
        element: <GovernmentCabinetDetailPage />,
      },
      {
        path: 'departments/:departmentId',
        element: <GovernmentDepartmentDetailPage />,
      },
    ],
  },
]
