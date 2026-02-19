import { RouteObject } from 'react-router-dom'

import { OrganizationsListPage } from './organizations-list.page'
import { OrganizationFormPage } from './organization-form.page'

export const organizationsRoutes: RouteObject[] = [
  {
    path: 'organizations',
    children: [
      {
        index: true,
        element: <OrganizationsListPage />,
      },
      {
        path: 'new',
        element: <OrganizationFormPage />,
      },
      {
        path: ':id/edit',
        element: <OrganizationFormPage />,
      },
    ],
  },
]
