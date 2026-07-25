import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ExpressAdapter } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { Request, Response, NextFunction } from 'express'
import express, { json, urlencoded } from 'express'

import cookieParser from 'cookie-parser'
import { existsSync } from 'fs'
import { readFileSync } from 'fs'

import { AppConfigService } from '../../../libs/shared/config/index'
import {
  getUploadDirCandidates,
  findUploadFilePath,
} from '../../../libs/shared/upload/upload-path.util'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  console.log('🚀 Starting bootstrap process...')

  try {
    console.log('📍 Step 1: Getting config...')
    const tempApp = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    })
    const configService = tempApp.get(AppConfigService)
    const config = configService.app
    const securityConfig = configService.security
    await tempApp.close()

    console.log('📍 Step 2: Mounting /uploads and creating Nest app...')
    const expressApp = express()
    const uploadCandidates = getUploadDirCandidates(config.uploadPath)
    expressApp.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
      const raw = (req.originalUrl || req.url || '').split('?')[0]
      const subpath = raw.replace(/^\/uploads\/?/, '').replace(/\/+/g, '/')
      if (!subpath || subpath.includes('..')) {
        res.status(400).send('Invalid path')
        return
      }
      const filePath = findUploadFilePath(uploadCandidates, subpath)
      if (!filePath) {
        res.status(404).send('Not found')
        return
      }
      res.sendFile(filePath, (err: Error | null) => {
        if (err && !res.headersSent) res.status(500).send('Error')
      })
    })
    logger.log(
      `📁 업로드 경로 후보: ${uploadCandidates.filter((d) => existsSync(d)).join(', ')}`,
    )
    // 전기 섹션 content 상한(BIOGRAPHY_SECTION_CONTENT_MAX_BYTES=16MB, create-person.dto.ts)이 실효
    // 상한이 되도록 body limit을 그 위(18mb)로 둔다. 이 값이 검증상수보다 작으면 큰 섹션의 저장이
    // 검증(친절한 400) 이전에 raw 413으로 잘려 그 인물의 모든 전기 저장이 진단 불가로 막힌다.
    expressApp.use(json({ limit: '18mb' }))
    expressApp.use(urlencoded({ extended: true, limit: '18mb' }))
    expressApp.use(cookieParser())

    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        ...(securityConfig.useHttps
          ? {
              httpsOptions: {
                key: readFileSync(config.sslKeyPath as string),
                cert: readFileSync(config.sslCertPath as string),
              },
            }
          : {}),
        bodyParser: false,
      },
    )

    console.log('📍 Step 3: Configuring CORS...')
    app.enableCors({
      origin: (origin, cb) => {
        // 개발 환경에서는 모든 origin 허용
        if (config.nodeEnv === 'development') {
          return cb(null, true)
        }
        // 프로덕션 환경에서는 허용된 origin만
        if (!origin) return cb(null, true)
        if (
          config.allowedOrigins.length === 0 ||
          config.allowedOrigins.includes(origin)
        ) {
          return cb(null, true)
        }
        return cb(new Error('Not allowed by CORS'), false as any)
      },
      credentials: true,
      exposedHeaders: ['set-cookie', 'x-request-id'],
    })

    // Swagger 설정
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Papyrus API')
      .setDescription(
        'Historical database management API with advanced features',
      )
      .setVersion('2.0.0')
      .addBearerAuth()
      .addServer(`http://${config.host}:${config.port}`, 'Development server')
      .addServer(`https://${config.host}`, 'Production server')
      .addTag('auth', 'Authentication and authorization')
      .addTag('account', 'User account management')
      .addTag('health', 'System health and monitoring')
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Papyrus API Documentation',
    })

    // 앱 시작
    console.log(`🌐 Starting server on ${config.host}:${config.port}...`)
    await app.listen(config.port, config.host)

    console.log('✅ Server started successfully!')
    logger.log(
      `🚀 Application is running on: ${securityConfig.useHttps ? 'https' : 'http'}://${config.host}:${config.port}`,
    )
    logger.log(
      `📚 API Documentation: http://${config.host}:${config.port}/api-docs`,
    )
    logger.log(`❤️  Health Check: http://${config.host}:${config.port}/health`)
    logger.log(`🌍 Environment: ${config.nodeEnv}`)

    // 종료 신호를 받으면 app.close() 후 반드시 프로세스를 종료한다.
    // (app.close()만 호출하면 DB 풀 등 열린 핸들 때문에 프로세스가 살아남아
    //  8000 포트를 계속 점유 → 재시작 시 EADDRINUSE가 발생한다.)
    let shuttingDown = false
    const shutdown = async (signal: string) => {
      if (shuttingDown) return
      shuttingDown = true
      console.log(`${signal} received, shutting down gracefully`)
      // close가 매달려도 강제 종료되도록 안전장치를 먼저 건다.
      const forceExit = setTimeout(() => process.exit(0), 5000)
      forceExit.unref()
      try {
        await app.close()
      } catch (err) {
        console.error('Error during shutdown:', err)
      } finally {
        process.exit(0)
      }
    }
    process.on('SIGTERM', () => void shutdown('SIGTERM'))
    process.on('SIGINT', () => void shutdown('SIGINT'))

    // 서버가 계속 실행되도록 유지
    console.log('🔄 Server is running and waiting for requests...')
  } catch (error) {
    logger.error('Failed to start application:', error)
    console.error('Full error:', error)
    process.exit(1)
  }
}

// Unhandled rejection/exception 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

bootstrap()
