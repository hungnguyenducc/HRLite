pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }

    environment {
        DATABASE_URL     = 'postgresql://hrlite_test:hrlite_test@localhost:5433/hrlite_test'
        NEXTAUTH_SECRET  = 'jenkins-test-secret'
        NEXTAUTH_URL     = 'http://localhost:3000'
        NODE_ENV         = 'test'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'node --version && npm --version'
                sh 'npm ci'
                sh 'npx prisma generate'
            }
        }

        stage('Lint & Format') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Prettier') {
                    steps {
                        sh 'npm run format:check'
                    }
                }
            }
        }

        stage('Test DB Up') {
            steps {
                sh 'apk add --no-cache docker-cli docker-cli-compose'
                sh 'docker compose -f docker-compose.test.yml up -d --wait'
                sh 'npx dotenv -e .env.test -- npx prisma db push --force-reset'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'JEST_JUNIT_OUTPUT_DIR=./reports JEST_JUNIT_OUTPUT_NAME=unit.xml npm run test:unit -- --ci --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/unit.xml'
                }
            }
        }

        stage('Integration Tests') {
            steps {
                sh 'JEST_JUNIT_OUTPUT_DIR=./reports JEST_JUNIT_OUTPUT_NAME=integration.xml npm run test:integration -- --ci --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/integration.xml'
                }
            }
        }

        stage('Coverage') {
            steps {
                sh 'npm run test:coverage -- --ci'
            }
            post {
                always {
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'docs/tests/test-reports/coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Docker Build') {
            when {
                branch 'main'
            }
            steps {
                sh "docker build -t hrlite:\${BUILD_NUMBER} -t hrlite:latest ."
            }
        }
    }

    post {
        always {
            sh 'docker compose -f docker-compose.test.yml down || true'
        }
        success {
            echo 'Pipeline thanh cong!'
        }
        failure {
            echo 'Pipeline that bai. Kiem tra logs.'
        }
    }
}
