import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { JobController } from '../presentation/job.controller'
import { JobService } from '../application/job.service'
import { JobRepository } from './job.repository'

@Module({
  controllers: [JobController],
  providers: [
    JobService,
    JobRepository,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [JobService],
})
export class JobModule {}
