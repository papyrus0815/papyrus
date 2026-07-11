import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'

/**
 * 문자열의 UTF-8 **바이트** 길이 상한 검증.
 *
 * MySQL의 `TEXT`(=65535 bytes)·`MEDIUMTEXT` 등은 컬럼 상한이 **문자 수가 아니라 바이트**라,
 * 한글(3B)·이모지(4B)가 섞인 본문은 문자 수로는 여유가 있어도 바이트로는 초과할 수 있다.
 * class-validator의 `@MaxLength`는 UTF-16 코드유닛(대략 문자 수)만 세므로 이 초과를 못 잡는다.
 *
 * 저장 전에 여기서 막지 않으면 MySQL이 'Data too long' 예외를 던지고, 전기 섹션처럼
 * delete-and-recreate를 한 트랜잭션에서 처리하는 경로에서는 저장 **전체가 롤백**되며
 * 사용자에게는 원인 불명의 실패만 남는다. 이 검증으로 친절한 400을 대신 반환한다.
 */
export function MaxByteLength(
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxByteLength',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          // 타입 자체는 @IsString가 검증 — 문자열이 아니면 여기서는 통과시킨다.
          if (typeof value !== 'string') return true
          const [limit] = args.constraints as [number]
          return Buffer.byteLength(value, 'utf8') <= limit
        },
        defaultMessage(args: ValidationArguments) {
          const [limit] = args.constraints as [number]
          return `${args.property}의 길이가 최대 ${limit} 바이트를 초과했습니다.`
        },
      },
    })
  }
}
