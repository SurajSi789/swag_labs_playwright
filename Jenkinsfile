// =============================================================================
// Jenkins CI/CD pipeline — Swag Labs Playwright BDD framework
// -----------------------------------------------------------------------------
// Required Jenkins plugins / global tools (configure once under "Manage Jenkins"):
//   • NodeJS plugin              → tool name  : 'NodeJS-20'
//   • SonarQube Scanner plugin   → server name : 'SonarQube'  , tool : 'SonarScanner'
//   • Allure plugin              → tool name  : 'Allure'
// Optional credentials:
//   • 'ai-api-key' (Secret text) → enables AI self-healing during the run
// =============================================================================

pipeline {
  agent any

  tools {
    nodejs 'NodeJS-20'
  }

  parameters {
    choice(
      name: 'SUITE',
      choices: ['regression', 'smoke', 'sanity', 'all'],
      description: 'Which tagged test suite to execute'
    )
    booleanParam(
      name: 'AI_HEALING',
      defaultValue: false,
      description: 'Enable AI locator self-healing (needs the "ai-api-key" credential)'
    )
  }

  environment {
    CI = 'true'
    HEADLESS = 'true'
    // Off unless explicitly enabled — keeps CI deterministic & free of API cost.
    AI_HEALING_ENABLED = "${params.AI_HEALING}"
  }

  options {
    timestamps()
    ansiColor('xterm')
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        sh 'node --version && npm --version'
        sh 'npm ci'
        // --with-deps installs OS libraries the browsers need on Linux agents.
        sh 'npx playwright install --with-deps chromium'
      }
    }

    stage('Type check') {
      steps {
        sh 'npm run typecheck'
      }
    }

    stage('Generate BDD specs') {
      steps {
        sh 'npx bddgen'
      }
    }

    stage('Run tests') {
      steps {
        // Inject the AI key only when the toggle is on; otherwise run key-less.
        script {
          def runTests = {
            if (params.SUITE == 'all') {
              sh 'npx playwright test'
            } else {
              sh "npx playwright test --grep @${params.SUITE}"
            }
          }
          if (params.AI_HEALING) {
            withCredentials([string(credentialsId: 'ai-api-key', variable: 'AI_API_KEY')]) {
              runTests()
            }
          } else {
            runTests()
          }
        }
      }
    }

    stage('SonarQube analysis') {
      steps {
        script {
          def scannerHome = tool 'SonarScanner'
          withSonarQubeEnv('SonarQube') {
            sh "${scannerHome}/bin/sonar-scanner"
          }
        }
      }
    }

    stage('Quality gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }
  }

  post {
    always {
      // Publish the interactive Allure report from the raw results.
      allure([
        includeProperties: false,
        jdk: '',
        results: [[path: 'allure-results']]
      ])

      // Keep the Playwright HTML report, JSON results and any self-healing report.
      archiveArtifacts artifacts: 'reports/**, allure-report/**', allowEmptyArchive: true, fingerprint: true

      // Surface healed-locator events in the build log.
      sh 'npm run healing:report || true'
    }
    success {
      echo "✅ Suite '${params.SUITE}' passed."
    }
    failure {
      echo "❌ Suite '${params.SUITE}' failed — see the Allure report for details."
    }
    cleanup {
      cleanWs()
    }
  }
}
