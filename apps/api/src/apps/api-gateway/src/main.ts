import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { readFileSync } from 'fs'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { AppConfigService } from '../../../libs/shared/config/index'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  console.log('🚀 Starting bootstrap process...')

  try {
    console.log('📍 Step 1: Creating temporary app...')
    // 임시로 앱을 만들어 config 가져오기
    const tempApp = await NestFactory.create(AppModule, { 
      logger: ['error', 'warn', 'log', 'debug', 'verbose'] 
    })
    console.log('📍 Step 2: Getting config service...')
    const configService = tempApp.get(AppConfigService)
    const config = configService.app
    const securityConfig = configService.security
    console.log('📍 Step 3: Closing temporary app...')
    await tempApp.close()

    console.log('📍 Step 4: Creating actual app...')
    // 실제 앱 생성
    const app = await NestFactory.create<NestExpressApplication>(
      AppModule,
      securityConfig.useHttps
        ? {
            httpsOptions: {
              key: readFileSync(config.sslKeyPath as string),
              cert: readFileSync(config.sslCertPath as string),
            },
          }
        : undefined,
    )

    console.log('📍 Step 5: Configuring CORS...')

    // CORS 설정
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

    // 미들웨어
    app.use(cookieParser())

    // 정적 파일 서빙
    app.useStaticAssets(join(process.cwd(), config.uploadPath), {
      prefix: '/uploads',
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

    // 프로세스 종료 방지
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully')
      app.close()
    })

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully')
      app.close()
    })

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
