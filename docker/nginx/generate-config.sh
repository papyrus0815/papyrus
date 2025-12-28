#!/bin/bash

# Nginx 설정 파일 생성 스크립트
# 환경 변수를 사용하여 템플릿에서 실제 설정 파일을 생성합니다

set -e

# 환경 변수 파일 로드 (존재하는 경우)
if [ -f .env ]; then
    echo "환경 변수 파일(.env)을 로드합니다..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# 기본값 설정
export DOMAIN_NAME=${DOMAIN_NAME:-app.civilization.zone}
export DOMAIN_LOCAL=${DOMAIN_LOCAL:-app.civilization.local}
export DOMAIN_ALIASES=${DOMAIN_ALIASES:-localhost}
export NGINX_HTTP_PORT=${NGINX_HTTP_PORT:-80}
export NGINX_HTTPS_PORT=${NGINX_HTTPS_PORT:-443}
export API_PORT=${API_PORT:-3000}
export WEB_PORT=${WEB_PORT:-3001}
export MYSQL_PORT=${MYSQL_PORT:-3307}
export MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-evolution}
export MYSQL_DATABASE=${MYSQL_DATABASE:-evolution}
export MYSQL_USER=${MYSQL_USER:-evolution}
export MYSQL_PASSWORD=${MYSQL_PASSWORD:-evolution}
export DOCKER_NETWORK_NAME=${DOCKER_NETWORK_NAME:-evolution-network}
export CORS_ORIGIN=${CORS_ORIGIN:-*}
export CORS_METHODS=${CORS_METHODS:-GET,POST,PUT,DELETE,OPTIONS}
export CORS_HEADERS=${CORS_HEADERS:-DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization}
export CACHE_MAX_AGE=${CACHE_MAX_AGE:-1y}
export GZIP_MIN_LENGTH=${GZIP_MIN_LENGTH:-1024}

echo "환경 변수 설정:"
echo "  도메인: $DOMAIN_NAME, $DOMAIN_LOCAL, $DOMAIN_ALIASES"
echo "  포트: Nginx($NGINX_HTTP_PORT), API($API_PORT), Web($WEB_PORT), MySQL($MYSQL_PORT)"
echo "  네트워크: $DOCKER_NETWORK_NAME"

# 템플릿 파일에서 실제 설정 파일 생성
echo "Nginx 설정 파일을 생성합니다..."

# 메인 설정 파일 생성
envsubst < nginx.conf.template > nginx.conf
echo "✓ nginx.conf 생성 완료"

# 개발 환경 설정 파일 생성
envsubst < conf.d/development.conf.template > conf.d/development.conf
echo "✓ conf.d/development.conf 생성 완료"

echo "모든 설정 파일이 성공적으로 생성되었습니다!"
echo ""
echo "사용법:"
echo "  docker-compose up -d  # Docker 서비스 시작"
echo "  npm run nx:serve:api  # API 서버 시작"
echo "  npm run nx:serve:web  # 웹 서버 시작"
echo ""
echo "접속:"
echo "  웹: http://$DOMAIN_NAME"
echo "  API: http://$DOMAIN_NAME/api"
echo "  Swagger: http://$DOMAIN_NAME/swagger"
