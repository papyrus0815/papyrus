import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ConfigService } from '@nestjs/config'

@Global()
@Module({
  providers: [
    {
      provide: PrismaClient,
      useFactory: (configService: ConfigService) => {
        const prisma = new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
          datasources: {
            db: {
              url: configService.get<string>('DATABASE_URL'),
            },
          },
        })

        // 에러 로깅
        prisma.$on('error', (event) => {
          console.error('Prisma error:', event)
        })

        return prisma
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaClient) {}

  async onModuleInit() {
    try {
      await this.prisma.$connect()
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect()
      console.log('✅ Database disconnected successfully')
    } catch (error) {
      console.error('❌ Database disconnection failed:', error)
    }
  }
}
