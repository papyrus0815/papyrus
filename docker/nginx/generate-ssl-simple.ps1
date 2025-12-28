# 간단한 SSL 인증서 생성 (mkcert 사용)
# mkcert는 로컬 개발용 인증서를 쉽게 생성해주는 도구입니다

Write-Host "🔐 mkcert를 사용한 SSL 인증서 생성..." -ForegroundColor Green

# SSL 디렉토리 생성
if (!(Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl" -Force
}

# mkcert 설치 확인
try {
    $null = Get-Command mkcert -ErrorAction Stop
    Write-Host "✅ mkcert 발견됨" -ForegroundColor Green
} catch {
    Write-Host "❌ mkcert가 설치되지 않았습니다." -ForegroundColor Red
    Write-Host "설치 방법:" -ForegroundColor Yellow
    Write-Host "1. Chocolatey로 설치: choco install mkcert" -ForegroundColor Yellow
    Write-Host "2. Scoop으로 설치: scoop install mkcert" -ForegroundColor Yellow
    Write-Host "3. 수동 다운로드: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OpenSSL 방법을 사용하려면 'npm run ssl:generate'를 실행하세요." -ForegroundColor Cyan
    exit 1
}

try {
    # mkcert 루트 CA 설치 (처음 한 번만)
    Write-Host "🏛️ 루트 CA 설치 중..." -ForegroundColor Cyan
    & mkcert -install

    # 인증서 생성
    Write-Host "📜 인증서 생성 중..." -ForegroundColor Cyan
    & mkcert -key-file ssl/server.key -cert-file ssl/server.crt app.civilization.zone app.civilization.local localhost "*.civilization.zone" "*.civilization.local"

    Write-Host "✅ SSL 인증서 생성 완료!" -ForegroundColor Green
    Write-Host "📁 위치: docker/nginx/ssl/" -ForegroundColor White
    Write-Host "🔑 개인키: server.key" -ForegroundColor White
    Write-Host "📜 인증서: server.crt" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 mkcert로 생성된 인증서는 브라우저에서 신뢰됩니다!" -ForegroundColor Green

} catch {
    Write-Host "❌ SSL 인증서 생성 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}