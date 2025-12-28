import { Module } from '@nestjs/common'
import { UserService } from '../application/user.service'
import { UserController } from '../presentation/user.controller'
import { UserPrismaRepository } from './user.prisma.repository'
import { PrismaModule } from '../../../libs/shared'

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: 'IUserRepository',
      useClass: UserPrismaRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
