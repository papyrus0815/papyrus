export class AccountEntity {
  constructor(
    public id: string,
    public username: string,
    public passwordHash: string,
    public heroId: string | null,
    public createdAt: Date,
    public totalPoints: number = 0,
    public gradeCode: string = 'BRONZE',
  ) {}
}

export class CurrentAccountDto {
  constructor(
    public id: string,
    public account: string,
    public heroId: string | null,
  ) {}
}
