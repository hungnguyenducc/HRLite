pipeline {
    agent any

    triggers {
        githubPush()
    }

    environment {
        DATABASE_URL     = 'postgresql://hrlite_test:hrlite_test@hrlite_test_db:5432/hrlite_test'
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
                sh 'docker compose -f docker-compose.test.yml up -d --wait'
                sh 'npx prisma db push --force-reset'
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
                sh 'JEST_JUNIT_OUTPUT_DIR=./reports JEST_JUNIT_OUTPUT_NAME=integration.xml npx jest --selectProjects integration --runInBand --testTimeout=30000 --ci --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'reports/integration.xml'
                }
            }
        }

        stage('Coverage') {
            steps {
                sh 'npx jest --coverage --ci --runInBand'
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

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    echo "Stopping old container..."
                    docker stop hrlite_app || true
                    docker rm hrlite_app || true

                    echo "Starting new container..."
                    docker run -d \
                        --name hrlite_app \
                        --network hrlite_default \
                        -p 3000:3000 \
                        -e DATABASE_URL=postgresql://hrlite:hrlite@hrlite_db:5432/hrlite \
                        -e NEXTAUTH_SECRET=${DEPLOY_NEXTAUTH_SECRET:-local-deploy-secret-change-in-production} \
                        -e NEXTAUTH_URL=http://localhost:3000 \
                        -e NODE_ENV=production \
                        --restart unless-stopped \
                        hrlite:latest

                    echo "Waiting for health check..."
                    sleep 10

                    HEALTH=$(docker exec hrlite_app wget -qO- http://localhost:3000/api/health 2>/dev/null || echo "FAIL")
                    if echo "$HEALTH" | grep -q "ok"; then
                        echo "Deploy thanh cong! App dang chay tai http://localhost:3000"
                    else
                        echo "WARNING: Health check chua san sang, kiem tra logs: docker logs hrlite_app"
                    fi
                '''
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
