// Papyrus — 맥 로컬 Jenkins(127.0.0.1:8090) 파이프라인
//
// 왜 맥인가: 카페24 VPS는 2GB라 서버 빌드가 안 된다(nx build api 피크 2.2GB · vite build 1.8GB).
// 그래서 빌드는 여기서 하고, 결과물(순수 JS·정적 파일)만 서버로 보낸다. node_modules는 절대 보내지 않는다
// (맥 darwin-arm64 네이티브 바이너리라 서버에서 "Failed to load native binding").
//
// 배포(DEPLOY)는 기본 꺼짐. 켜기 전에 Jenkins에 아래 두 가지가 있어야 한다.
//   1) Credentials: 'cafe24-ssh' — SSH Username with private key (서버 계정·키)
//   2) 파라미터 DEPLOY_HOST — 서버 IP 또는 도메인
pipeline {
  agent any

  options {
    skipDefaultCheckout()
    timestamps()
    ansiColor('xterm')
    timeout(time: 60, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
  }

  parameters {
    booleanParam(name: 'RUN_TESTS', defaultValue: true, description: 'api·web-admin jest 실행 (실패 시 UNSTABLE, 배포는 막힘)')
    booleanParam(name: 'DEPLOY', defaultValue: false, description: '카페24 VPS로 rsync 배포')
    string(name: 'DEPLOY_HOST', defaultValue: '', description: '서버 IP 또는 도메인 (DEPLOY일 때 필수)')
    string(name: 'PUBLIC_API_BASE_URL', defaultValue: '', description: '웹 빌드에 구울 API 주소, 예: https://<도메인>/api (비우면 같은 오리진)')
  }

  environment {
    CI = 'true'
    NX_DAEMON = 'false'
    NX_NO_CLOUD = 'true'
    NODE_OPTIONS = '--max-old-space-size=8192'
    PUPPETEER_SKIP_DOWNLOAD = 'true'
    ELECTRON_SKIP_BINARY_DOWNLOAD = '1'
    DEPLOY_PATH = '/srv/papyrus'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        sh 'node -v && npm -v'
        sh 'npm ci --no-audit --no-fund'
        // web-admin은 workspaces가 아니라 자기 package-lock·node_modules를 따로 갖는다.
        // 루트 npm ci만으로는 @xyflow/react 등이 안 깔려 vite가 "failed to resolve import"로 죽는다
        sh 'npm ci --prefix apps/web-admin --no-audit --no-fund'
      }
    }

    // schema.prisma·Prisma 클라이언트·Nestia SDK는 전부 gitignore 생성물이라 clean checkout에 없다.
    // 순서 고정: nestia가 컨트롤러를 타입체크할 때 @prisma/client 타입이 있어야 한다
    // (없으면 TS2305 "@prisma/client has no exported member ...")
    stage('Generate') {
      steps {
        sh 'npm run db:build'
        sh 'npm run db:generate'
        sh 'npm run build:nestia'
      }
    }

    stage('Build') {
      parallel {
        stage('API') {
          steps {
            // --prod 붙이면 tspc가 TS5023으로 죽는다
            sh 'npx nx build api --skip-nx-cache'
          }
        }
        stage('Web') {
          steps {
            // vite.config는 loadEnv가 아니라 process.env를 직접 읽는다 → 셸 env로 넘긴다
            withEnv(["VITE_API_BASE_URL=${params.PUBLIC_API_BASE_URL}", 'VITE_APP_TITLE=PAPYRUS']) {
              sh 'npx nx build web --skip-nx-cache'
            }
          }
        }
      }
    }

    // 순차 실행 + worker 상한: api·web jest를 동시에 돌리면 CPU를 나눠 먹어
    // 단독으로는 15~25초에 끝나는 RTL suite가 5초 테스트 타임아웃에 걸린다
    stage('Test') {
      when { expression { params.RUN_TESTS } }
      stages {
        stage('api jest') {
          environment {
            // ConfigModule Joi 검증 통과용 더미(접속하지 않음). 없으면 import 시점에 throw → worker 4회 크래시
            DATABASE_URL = 'mysql://ci:ci@127.0.0.1:1/ci'
            JWT_SECRET = 'ci-only-dummy-secret-0123456789abcdef'
          }
          steps {
            catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
              sh 'npx nx test api --skip-nx-cache --ci --maxWorkers=6'
            }
          }
        }
        stage('web-admin jest') {
          steps {
            catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
              sh 'npx nx run web:test --skip-nx-cache --ci --maxWorkers=6 -- --no-watchman'
            }
          }
        }
      }
    }

    stage('Archive') {
      steps {
        // web 산출물은 apps/web-admin/dist (project.json outputs의 dist/web-admin은 실제와 다름)
        archiveArtifacts artifacts: 'dist/apps/api/**, apps/web-admin/dist/**, apps/api/prisma/schema.prisma',
                         fingerprint: true, allowEmptyArchive: false
      }
    }

    stage('Deploy') {
      when {
        allOf {
          expression { params.DEPLOY }
          expression { currentBuild.currentResult == 'SUCCESS' }
        }
      }
      steps {
        script {
          if (!params.DEPLOY_HOST?.trim()) {
            error('DEPLOY_HOST가 비어 있습니다')
          }
        }
        // 프로덕션 번들에 localhost가 구워져 있으면 사용자 브라우저가 자기 PC의 8000번을 호출한다
        // (vite.config.ts는 이제 VITE_API_BASE_URL을 굽지만, 안 넘기면 localhost로 돌아가므로 재발 방지 가드)
        sh '''
          if grep -rl 'localhost:8000' apps/web-admin/dist/assets/ >/dev/null 2>&1; then
            echo "웹 번들에 localhost:8000이 구워져 있습니다 — vite.config.ts production 하드코딩을 먼저 제거하세요" >&2
            exit 1
          fi
        '''
        sshagent(credentials: ['cafe24-ssh']) {
          withEnv(["SRV=${params.DEPLOY_HOST}"]) {
            sh '''
              set -eu
              SSH_OPTS="-o StrictHostKeyChecking=accept-new"
              REMOTE=$(ssh $SSH_OPTS "$SRV" 'echo "$USER@$(hostname)"')
              echo "deploy target: $REMOTE"

              # 1) 서버 소스를 이번 빌드 커밋까지 당긴다. reset --hard 금지:
              #    서버에서 지운 env.development 심볼릭 링크가 되살아나 prisma가 개발 DB를 본다
              ssh $SSH_OPTS "$SRV" "bash -s" <<REMOTE_PULL
                set -eu
                cd "$DEPLOY_PATH"
                OLD_LOCK=\\$(sha256sum package-lock.json | cut -d' ' -f1)
                git fetch --quiet origin
                git merge --ff-only "$GIT_COMMIT"
                rm -f env.development
                NEW_LOCK=\\$(sha256sum package-lock.json | cut -d' ' -f1)
                if [ "\\$OLD_LOCK" != "\\$NEW_LOCK" ]; then
                  echo "package-lock 변경 → npm ci"
                  PUPPETEER_SKIP_DOWNLOAD=true ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --no-audit --no-fund
                fi
REMOTE_PULL

              # 2) 결과물만 전송 (node_modules 금지)
              rsync -az --delete -e "ssh $SSH_OPTS" dist/apps/api/       "$SRV:$DEPLOY_PATH/dist/apps/api/"
              rsync -az --delete -e "ssh $SSH_OPTS" apps/web-admin/dist/ "$SRV:$DEPLOY_PATH/apps/web-admin/dist/"
              rsync -az          -e "ssh $SSH_OPTS" apps/api/prisma/schema.prisma "$SRV:$DEPLOY_PATH/apps/api/prisma/schema.prisma"

              # 3) 마이그레이션 → 클라이언트 생성 → 재시작 → 헬스체크
              #    /health는 DB가 죽어도 200이라 body의 checks.database까지 본다
              ssh $SSH_OPTS "$SRV" "bash -s" <<REMOTE_RUN
                set -eu
                cd "$DEPLOY_PATH"
                set -a; . ./.env; set +a
                npm run db:migrate:deploy
                npm run db:generate
                sudo systemctl restart papyrus-api
                for i in \\$(seq 1 30); do
                  BODY=\\$(curl -s http://127.0.0.1:8000/health || true)
                  if echo "\\$BODY" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{process.exit(JSON.parse(s).checks.database.status==="ok"?0:1)}catch{process.exit(1)}})'; then
                    echo "health ok: \\$BODY"; exit 0
                  fi
                  sleep 2
                done
                echo "health check 실패: \\$BODY" >&2
                exit 1
REMOTE_RUN
            '''
          }
        }
      }
    }
  }

  post {
    always {
      // node_modules까지 지우면 매번 npm ci가 처음부터 돈다 → 빌드 산출물만 정리
      cleanWs(deleteDirs: true, notFailBuild: true, patterns: [
        [pattern: 'dist/**', type: 'INCLUDE'],
        [pattern: 'apps/web-admin/dist/**', type: 'INCLUDE'],
        [pattern: 'coverage/**', type: 'INCLUDE'],
      ])
    }
  }
}
