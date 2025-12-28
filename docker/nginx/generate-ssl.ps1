# PowerShell SSL Certificate Generation Script
# Self-signed certificate for development environment

Write-Host "Creating development SSL certificate..." -ForegroundColor Green

# Create SSL directory
if (!(Test-Path "ssl")) {
    New-Item -ItemType Directory -Path "ssl" -Force
}

# Check if OpenSSL is installed
try {
    $null = Get-Command openssl -ErrorAction Stop
    Write-Host "OpenSSL found" -ForegroundColor Green
} catch {
    Write-Host "OpenSSL is not installed." -ForegroundColor Red
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Install Chocolatey: https://chocolatey.org/install" -ForegroundColor Yellow
    Write-Host "2. Install OpenSSL: choco install openssl" -ForegroundColor Yellow
    Write-Host "Or use Git for Windows." -ForegroundColor Yellow
    exit 1
}

# Create configuration file
$configContent = @"
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = KR
ST = Seoul
L = Seoul
O = Evolution
OU = Development
CN = app.civilization.zone
emailAddress = dev@evolution.com

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = app.civilization.zone
DNS.2 = app.civilization.local
DNS.3 = api.civilization.zone
DNS.4 = api.civilization.local
DNS.5 = user.civilization.zone
DNS.6 = user.civilization.local
DNS.7 = localhost
DNS.8 = *.civilization.zone
DNS.9 = *.civilization.local
"@

$configContent | Out-File -FilePath "ssl/server.conf" -Encoding UTF8

try {
    # Generate private key (2048-bit RSA)
    Write-Host "Generating private key..." -ForegroundColor Cyan
    & openssl genrsa -out ssl/server.key 2048

    # Generate Certificate Signing Request (CSR)
    Write-Host "Generating CSR..." -ForegroundColor Cyan
    & openssl req -new -key ssl/server.key -out ssl/server.csr -config ssl/server.conf

    # Generate self-signed certificate (valid for 365 days)
    Write-Host "Generating certificate..." -ForegroundColor Cyan
    & openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -extensions v3_req -extfile ssl/server.conf

    Write-Host "SSL certificate generated successfully!" -ForegroundColor Green
    Write-Host "Location: docker/nginx/ssl/" -ForegroundColor White
    Write-Host "Private key: server.key" -ForegroundColor White
    Write-Host "Certificate: server.crt" -ForegroundColor White
    Write-Host ""
    Write-Host "WARNING: This is a self-signed certificate for development only." -ForegroundColor Yellow
    Write-Host "   Your browser may show security warnings." -ForegroundColor Yellow

} catch {
    Write-Host "Failed to generate SSL certificate: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
