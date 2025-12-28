/**
 * 군부대 라우트 설정
 */

import type { RouteObject } from 'react-router-dom'

import { MilitaryUnitFormPage } from './military-unit-form.page'
import { MilitaryUnitViewPage } from './military-unit-view.page'
import { MilitaryUnitsListPage } from './military-units-list.page'

export const militaryUnitsRoute: RouteObject = {
  path: 'military-units',
  children: [
    {
      index: true,
      element: <MilitaryUnitsListPage />,
    },
    {
      path: 'create',
      element: <MilitaryUnitFormPage />,
    },
    {
      path: ':id',
      element: <MilitaryUnitViewPage />,
    },
    {
      path: 'edit/:id',
      element: <MilitaryUnitFormPage />,
    },
  ],
}

