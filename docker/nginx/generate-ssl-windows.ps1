# PowerShell 네이티브 SSL 인증서 생성 (OpenSSL 불필요)
# Windows에서 자체 서명 인증서 생성

Write-Host "🔐 Windows 네이티브 방식으로 SSL 인증서 생성 중..." -ForegroundColor Green

# SSL 디렉토리 생성
if (!(Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl" -Force
    Write-Host "✅ SSL 디렉토리 생성 완료" -ForegroundColor Green
}

try {
    # Windows 인증서 저장소에 임시 인증서 생성
    Write-Host "📜 자체 서명 인증서 생성 중..." -ForegroundColor Cyan
    
    $cert = New-SelfSignedCertificate `
        -DnsName @(
            "app.civilization.zone",
            "app.civilization.local",
            "api.civilization.zone",
            "api.civilization.local",
            "user.civilization.zone",
            "user.civilization.local",
            "localhost",
            "*.civilization.zone",
            "*.civilization.local"
        ) `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -Provider "Microsoft RSA SChannel Cryptographic Provider" `
        -KeyExportPolicy Exportable `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -Type SSLServerAuthentication `
        -FriendlyName "Evolution Development Certificate" `
        -NotAfter (Get-Date).AddYears(1)
    
    Write-Host "✅ 인증서 생성 완료: $($cert.Thumbprint)" -ForegroundColor Green
    
    # 인증서를 PFX로 내보내기
    $pfxPath = "ssl\server.pfx"
    $password = ConvertTo-SecureString -String "development" -Force -AsPlainText
    
    Export-PfxCertificate `
        -Cert $cert `
        -FilePath $pfxPath `
        -Password $password | Out-Null
    
    Write-Host "✅ PFX 파일 생성 완료" -ForegroundColor Green
    
    # OpenSSL이 있으면 CRT/KEY로 변환 시도
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        Write-Host "📝 OpenSSL로 CRT/KEY 파일 변환 중..." -ForegroundColor Cyan
        
        # PFX에서 개인키 추출
        & openssl pkcs12 -in $pfxPath -nocerts -nodes -passin pass:development -out ssl\server.key
        & openssl pkcs12 -in $pfxPath -clcerts -nokeys -passin pass:development -out ssl\server.crt
        
        # 권한 설정 (Unix 스타일은 Windows에서 작동하지 않지만, 참고용)
        Write-Host "✅ CRT/KEY 파일 생성 완료" -ForegroundColor Green
    } else {
        Write-Host "⚠️  OpenSSL이 없어 CRT/KEY 변환이 불가합니다." -ForegroundColor Yellow
        Write-Host "   PFX 파일만 생성되었습니다: $pfxPath" -ForegroundColor Yellow
        Write-Host "" -ForegroundColor Yellow
        Write-Host "해결 방법:" -ForegroundColor Yellow
        Write-Host "1. OpenSSL 설치: choco install openssl" -ForegroundColor Yellow
        Write-Host "2. 또는 Windows 인증서 저장소에서 직접 사용" -ForegroundColor Yellow
        
        # OpenSSL 없이도 작동하도록 PEM 형식으로 직접 내보내기 시도
        $base64Cert = [Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
        $certPem = "-----BEGIN CERTIFICATE-----`n"
        for ($i = 0; $i -lt $base64Cert.Length; $i += 64) {
            $certPem += $base64Cert.Substring($i, [Math]::Min(64, $base64Cert.Length - $i)) + "`n"
        }
        $certPem += "-----END CERTIFICATE-----"
        $certPem | Out-File -FilePath "ssl\server.crt" -Encoding ASCII
        
        Write-Host "✅ 기본 CRT 파일 생성 완료 (개인키는 PFX에 포함됨)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✅ SSL 인증서 생성 완료!" -ForegroundColor Green
    Write-Host "📁 위치: docker/nginx/ssl/" -ForegroundColor White
    Write-Host "📜 인증서: server.crt" -ForegroundColor White
    Write-Host "🔑 PFX (키 포함): server.pfx" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  주의: 이는 개발용 자체 서명 인증서입니다." -ForegroundColor Yellow
    Write-Host "   브라우저에서 보안 경고가 표시될 수 있습니다." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 권장: mkcert를 사용하면 브라우저가 자동으로 신뢰합니다." -ForegroundColor Cyan
    Write-Host "   설치: choco install mkcert" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ SSL 인증서 생성 실패: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "대안:" -ForegroundColor Yellow
    Write-Host "1. OpenSSL 설치 후 generate-ssl.ps1 실행" -ForegroundColor Yellow
    Write-Host "2. mkcert 설치 후 generate-ssl-simple.ps1 실행 (권장)" -ForegroundColor Yellow
    exit 1
}

