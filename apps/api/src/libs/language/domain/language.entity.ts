export class Language {
  id!: string
  code!: string
  name!: string
  originalName?: string | null

  constructor(data: Language) {
    Object.assign(this, data)
  }
}
