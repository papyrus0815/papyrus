export class Currency {
  id!: string
  code!: string
  name!: string
  symbol!: string
  thumbnailUrl?: string | null

  constructor(data: Currency) {
    Object.assign(this, data)
  }
}
