import { RouteObject } from 'react-router-dom'

import { CompanyCategoriesListPage } from './company-categories-list.page'
import { CompanyCategoryFormPage } from './company-category-form.page'

export const companyCategoriesRoutes: RouteObject[] = [
  {
    path: 'company-categories',
    children: [
      { index: true, element: <CompanyCategoriesListPage /> },
      { path: 'new', element: <CompanyCategoryFormPage /> },
      { path: ':id/edit', element: <CompanyCategoryFormPage /> },
    ],
  },
]
