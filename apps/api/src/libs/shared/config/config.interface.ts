export interface AppConfig {
  // Database
  databaseUrl: string

  // JWT
  jwtSecret: string
  jwtExpiresIn: string
  jwtRefreshExpiresIn: string

  // Server
  port: number
  host: string
  nodeEnv: 'development' | 'production' | 'test'

  // Security
  allowedOrigins: string[]
  sslKeyPath?: string
  sslCertPath?: string

  // Uploads
  uploadPath: string
  maxFileSize: number
}

export interface DatabaseConfig {
  url: string
  logLevel: ('query' | 'info' | 'warn' | 'error')[]
}

export interface JwtConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn: string
}

export interface SecurityConfig {
  allowedOrigins: string[]
  useHttps: boolean
  cookieSettings: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
    maxAge: number
  }
}
