import { RouteObject } from 'react-router-dom'

import { CompaniesListPage } from './companies-list.page'
import { CompanyFormPage } from './company-form.page'

export const companiesRoutes: RouteObject[] = [
  {
    path: 'companies',
    children: [
      { index: true, element: <CompaniesListPage /> },
      { path: 'new', element: <CompanyFormPage /> },
      { path: ':id/edit', element: <CompanyFormPage /> },
    ],
  },
]
