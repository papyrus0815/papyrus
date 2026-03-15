import { RouteObject } from 'react-router-dom'

import { AdministrationDepartmentFormPage } from './administration-department-form.page'
import { AdministrationDepartmentsListPage } from './administration-departments-list.page'
import { DepartmentCategoriesPage } from './department-categories.page'

export const administrationDepartmentsRoutes: RouteObject[] = [
  {
    path: 'administration-departments',
    children: [
      {
        index: true,
        element: <AdministrationDepartmentsListPage />,
      },
      {
        path: 'categories',
        element: <DepartmentCategoriesPage />,
      },
      {
        path: 'new',
        element: <AdministrationDepartmentFormPage />,
      },
      {
        path: ':id/edit',
        element: <AdministrationDepartmentFormPage />,
      },
    ],
  },
]
