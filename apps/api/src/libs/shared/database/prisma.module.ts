import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PrismaClient,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaClient, PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

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
