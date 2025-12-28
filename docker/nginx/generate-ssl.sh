#!/bin/bash

# SSL 인증서 생성 스크립트
# 개발 환경용 자체 서명 인증서 생성

set -e

echo "🔐 개발용 SSL 인증서 생성 중..."

# SSL 디렉토리 생성
mkdir -p ssl

# 개인키 생성 (2048비트 RSA)
openssl genrsa -out ssl/server.key 2048

# 인증서 서명 요청(CSR) 생성
openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=KR/ST=Seoul/L=Seoul/O=Evolution/OU=Development/CN=app.civilization.zone/emailAddress=dev@evolution.com"

# 자체 서명 인증서 생성 (365일 유효)
openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt

# SAN(Subject Alternative Names) 확장을 위한 설정 파일 생성
cat > ssl/server.conf << EOF
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
DNS.3 = localhost
DNS.4 = *.civilization.zone
DNS.5 = *.civilization.local
EOF

# SAN이 포함된 새로운 인증서 생성
openssl req -new -key ssl/server.key -out ssl/server.csr -config ssl/server.conf
openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -extensions v3_req -extfile ssl/server.conf

# 권한 설정
chmod 600 ssl/server.key
chmod 644 ssl/server.crt

echo "✅ SSL 인증서 생성 완료!"
echo "📁 위치: docker/nginx/ssl/"
echo "🔑 개인키: server.key"
echo "📜 인증서: server.crt"
echo ""
echo "⚠️  주의: 이는 개발용 자체 서명 인증서입니다."
echo "   브라우저에서 보안 경고가 표시될 수 있습니다."
