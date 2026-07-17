import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToClass } from 'class-transformer'

@Injectable()
export class GlobalValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value
    }
    
    const object = plainToClass(metatype, value)
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
    
    if (errors.length > 0) {
      const errorMessages = this.buildError(errors)
      // 고정 문구 'Validation failed' 대신 실제 제약 위반 첫 메시지를 message로 승격(BE7)
      // — 프론트 토스트가 raw JSON 대신 원인을 안내할 수 있게. 중첩 DTO(sections·date)도 탐색.
      const detail = this.firstMessage(errors)
      throw new BadRequestException({
        message: detail ? `입력값을 확인해 주세요: ${detail}` : 'Validation failed',
        errors: errorMessages,
      })
    }

    return object
  }

  /** 에러 트리(children 포함) DFS로 첫 제약 위반 메시지를 찾는다(BE7). */
  private firstMessage(errors: any[]): string | null {
    for (const error of errors) {
      if (error.constraints) {
        const messages = Object.values(error.constraints) as string[]
        if (messages.length > 0) return messages[0]
      }
      if (error.children?.length > 0) {
        const childMessage = this.firstMessage(error.children)
        if (childMessage) return childMessage
      }
    }
    return null
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object]
    return !types.includes(metatype)
  }

  private buildError(errors: any[]): any[] {
    return errors.map(error => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children: error.children?.length > 0 ? this.buildError(error.children) : undefined,
    }))
  }
}
