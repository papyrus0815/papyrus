import { RouteObject } from 'react-router-dom'

import { EthnicityFormPage } from './ethnicity-form.page'
import { EthnicitiesListPage } from './ethnicities-list.page'

export const ethnicitiesRoutes: RouteObject[] = [
  {
    path: 'ethnicities',
    children: [
      {
        index: true,
        element: <EthnicitiesListPage />,
      },
      {
        path: 'new',
        element: <EthnicityFormPage />,
      },
      {
        path: ':id/edit',
        element: <EthnicityFormPage />,
      },
    ],
  },
]
