# PFX에서 KEY와 CRT 추출 (OpenSSL 없이)

Write-Host "🔐 PFX에서 인증서와 키 추출 중..." -ForegroundColor Green

$pfxPath = "ssl\server.pfx"
$password = "development"

if (!(Test-Path $pfxPath)) {
    Write-Host "❌ PFX 파일이 없습니다: $pfxPath" -ForegroundColor Red
    exit 1
}

try {
    # PFX 로드
    $pfxBytes = [System.IO.File]::ReadAllBytes($pfxPath)
    $pfx = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
    $pfx.Import($pfxBytes, $password, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
    
    Write-Host "✅ PFX 로드 완료" -ForegroundColor Green
    
    # 인증서를 PEM 형식으로 내보내기
    $certPem = "-----BEGIN CERTIFICATE-----`n"
    $base64Cert = [Convert]::ToBase64String($pfx.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    for ($i = 0; $i -lt $base64Cert.Length; $i += 64) {
        $certPem += $base64Cert.Substring($i, [Math]::Min(64, $base64Cert.Length - $i)) + "`n"
    }
    $certPem += "-----END CERTIFICATE-----`n"
    [System.IO.File]::WriteAllText("ssl\server.crt", $certPem)
    
    Write-Host "✅ 인증서 파일 생성: ssl\server.crt" -ForegroundColor Green
    
    # 개인키를 PEM 형식으로 내보내기
    $rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($pfx)
    $keyBytes = $rsaKey.ExportRSAPrivateKey()
    
    $keyPem = "-----BEGIN RSA PRIVATE KEY-----`n"
    $base64Key = [Convert]::ToBase64String($keyBytes)
    for ($i = 0; $i -lt $base64Key.Length; $i += 64) {
        $keyPem += $base64Key.Substring($i, [Math]::Min(64, $base64Key.Length - $i)) + "`n"
    }
    $keyPem += "-----END RSA PRIVATE KEY-----`n"
    [System.IO.File]::WriteAllText("ssl\server.key", $keyPem)
    
    Write-Host "✅ 개인키 파일 생성: ssl\server.key" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "✅ 인증서와 키 추출 완료!" -ForegroundColor Green
    Write-Host "📁 ssl\server.crt - 인증서" -ForegroundColor White
    Write-Host "🔑 ssl\server.key - 개인키" -ForegroundColor White
    
} catch {
    Write-Host "❌ 추출 실패: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "스택 트레이스:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Yellow
    exit 1
}




