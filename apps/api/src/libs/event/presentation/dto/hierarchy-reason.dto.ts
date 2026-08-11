import { ApiProperty } from '@nestjs/swagger'
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator'

/**
 * 계층 연결 사유(EventHierarchyReason) 공용 선언 — Create·Update DTO가 함께 쓰므로
 * update-event.dto.ts에서 hoist(한쪽 파일 소유로 두면 create→update cross-import가 생김).
 */

/**
 * 계층 연결 사유(EventHierarchyReason.reason) 최대 길이 — 한두 문장 요약용.
 * Prisma @db.VarChar(500)·프론트 입력 카운터와 동일 값(프론트는 손 동기화).
 */
export const EVENT_LINK_REASON_MAX = 500

/**
 * 이 사건을 '자식'으로 하는 쌍의 연결 사유 항목(상위와의 연결에 붙는 주석).
 * reason: 문자열=업서트(공백만이면 서버가 삭제로 정규화), null=행 삭제(비우기).
 */
export class HierarchyReasonEntryDto {
  @ApiProperty({ description: '상위 사건 ID (이 사건이 자식인 쌍의 상위)' })
  @IsString()
  @IsNotEmpty()
  parentEventId!: string

  @ApiProperty({
    description: '연결 사유 — 문자열=업서트, null=삭제',
    required: false,
    nullable: true,
  })
  @ValidateIf((entry: HierarchyReasonEntryDto) => entry.reason !== null)
  @IsString()
  @MaxLength(EVENT_LINK_REASON_MAX)
  reason!: string | null
}

/**
 * 이 사건을 '부모'로 하는 쌍의 연결 사유 항목(하위와의 연결에 붙는 주석 — 주 상위 FK 자식).
 */
export class ChildReasonEntryDto {
  @ApiProperty({ description: '하위 사건 ID (이 사건이 부모인 쌍의 자식)' })
  @IsString()
  @IsNotEmpty()
  childEventId!: string

  @ApiProperty({
    description: '연결 사유 — 문자열=업서트, null=삭제',
    required: false,
    nullable: true,
  })
  @ValidateIf((entry: ChildReasonEntryDto) => entry.reason !== null)
  @IsString()
  @MaxLength(EVENT_LINK_REASON_MAX)
  reason!: string | null
}
