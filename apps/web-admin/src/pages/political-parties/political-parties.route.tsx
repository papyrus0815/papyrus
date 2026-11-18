import type { RouteObject } from 'react-router-dom'

import { PoliticalPartiesCatalogPage } from './political-parties-catalog.page'

export const politicalPartiesPageRoute: RouteObject = {
  path: 'political-parties',
  element: <PoliticalPartiesCatalogPage />,
}
