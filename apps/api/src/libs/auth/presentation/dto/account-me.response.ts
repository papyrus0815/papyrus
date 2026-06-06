export interface AccountMeResponseDto {
  id: string
  /** 로그인 계정명 (로그인 ID, 변경 불가) */
  account: string
  /** 표시용 닉네임 (없으면 null → UI는 account로 폴백) */
  displayName: string | null
  /** 대표 인물(아바타)로 지정한 Person ID (없으면 null) */
  representativePersonId: string | null
  /** 대표 인물 이름 (아바타 라벨, 없으면 null) */
  heroName: string | null
  /** 대표 인물 프로필 이미지 (아바타, 없으면 null) */
  heroThumbnail: string | null
  /** 가입 일자 (ISO 8601) */
  createdAt: string
  /** 게이미피케이션: 누적 점수 */
  totalPoints: number
  /** 게이미피케이션: 현재 등급 코드 (BRONZE/SILVER/GOLD/PLATINUM/DIAMOND) */
  gradeCode: string
}
