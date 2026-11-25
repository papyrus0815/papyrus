export type JurisdictionGeometryType = 'POLYGON' | 'LINE'

export interface JurisdictionGeometry {
  type: JurisdictionGeometryType
  coordinates: Array<[number, number]>
  color?: string | null
}

export interface GarrisonMapPoint {
  lat: number
  lng: number
  label?: string | null
}

export interface SubUnitMapPin {
  id: string
  name: string
  abbreviation?: string | null
  unitTypeLabel?: string | null
  garrison?: string | null
  lat: number
  lng: number
}
