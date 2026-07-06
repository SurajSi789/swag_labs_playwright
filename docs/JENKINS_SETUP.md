# Jenkins + SonarQube setup guide

One-time setup to run the `swag_labs_playwright` pipeline (`Jenkinsfile`) on a
local Jenkins (`http://localhost:8080`) with SonarQube (`http://localhost:9090`).

> The `Jenkinsfile` references tools by **exact name**: `NodeJS 24`,
> `SonarScanner`, SonarQube server `SonarQube`, and Allure tool `Allure`.
> Use these names verbatim, or edit the `Jenkinsfile` to match yours.

---

## 1. Install plugins

**Manage Jenkins → Plugins → Available**, install (then restart Jenkins):

- **NodeJS** — provides the `NodeJS 24` tool
- **SonarQube Scanner** — server config + `SonarScanner` tool + `waitForQualityGate`
- **Allure** — publishes the Allure report
- **AnsiColor** — `ansiColor('xterm')` in the pipeline options
- **Timestamper** — `timestamps()` in the pipeline options
- **Pipeline** (workflow-aggregator) and **Git** — usually already present
- **Credentials Binding** — for `withCredentials` (usually already present)

---

## 2. Configure global tools

**Manage Jenkins → Tools**:

| Tool                 | Name          | Setup                                              |
| -------------------- | ------------- | -------------------------------------------------- |
| NodeJS               | `NodeJS 24`   | Check "Install automatically", pick Node 20.x      |
| SonarQube Scanner    | `SonarScanner`| Check "Install automatically", latest version      |
| Allure Commandline   | `Allure`      | Check "Install automatically", latest version      |

---

## 3. Configure the SonarQube server

**Manage Jenkins → System → SonarQube servers**:

1. Check **Environment variables** ("Enable injection of SonarQube server
   configuration as build environment variables").
2. Add a server:
   - **Name**: `SonarQube`  ← must match `withSonarQubeEnv('SonarQube')`
   - **Server URL**: `http://localhost:9090`
   - **Server authentication token**: add credential (see step 4).

### Generate a SonarQube token
In SonarQube (`http://localhost:9090`) → **My Account → Security → Generate
Tokens** → create a token (type: *Global Analysis Token* or *Project Analysis
Token* for `swag-labs-playwright`). Copy it.

### Add the token to Jenkins
**Manage Jenkins → Credentials → System → Global → Add Credentials**:
- **Kind**: *Secret text*
- **Secret**: the SonarQube token
- **ID**: e.g. `sonarqube-token`
Then select it in the SonarQube server config above.

### Quality-gate webhook (required for `waitForQualityGate`)
In SonarQube → **Administration → Configuration → Webhooks → Create**:
- **Name**: `Jenkins`
- **URL**: `http://host.docker.internal:8080/sonarqube-webhook/`

> **This project's setup (verified):** SonarQube runs in Docker
> (`sonarqube:lts-community`, `9090→9000`) and **Jenkins runs on the host** (macOS).
> - Jenkins → SonarQube uses `http://localhost:9090` (host reaches the mapped port). ✅
> - SonarQube (container) → Jenkins **cannot** use `localhost` — it must use
>   `http://host.docker.internal:8080/...`, confirmed reachable (HTTP 200). Use the
>   `host.docker.internal` URL above for the webhook.

---

## 4. (Optional) AI self-healing credential

Only if you'll run with the `AI_HEALING` parameter on:
**Credentials → Add** → *Secret text* → your provider API key →
**ID**: `ai-api-key` (matches `withCredentials` in the `Jenkinsfile`).

---

## 5. Configure the pipeline job

The existing `swag_labs_playwright` job is an empty **freestyle** project — it
must be a **Pipeline** job. Either delete & recreate it, or create a new item:

**New Item → name `swag_labs_playwright` → Pipeline → OK**, then:

1. **General** → (optional) check *This project is parameterized* — the
   `Jenkinsfile` already declares `SUITE` and `AI_HEALING` params; they are
   picked up automatically after the first run.
2. **Pipeline** section:
   - **Definition**: *Pipeline script from SCM*
   - **SCM**: *Git*
   - **Repository URL**: `https://github.com/<you>/swag_labs_playwright.git`
   - **Credentials**: add a GitHub PAT credential if the repo is private
     (Credentials → *Username with password* or *Secret text*); leave as *none*
     if public.
   - **Branch Specifier**: `*/main` (or your default branch)
   - **Script Path**: `Jenkinsfile`
3. **Save**.

---

## 6. First run

- Click **Build Now** (first build registers the parameters), then
  **Build with Parameters** to choose `SUITE` (regression/smoke/sanity/all).
- On the build page you'll get the **Allure Report** link (left menu) and
  archived `reports/**`. The **SonarQube analysis** stage publishes to
  `http://localhost:9090/dashboard?id=swag-labs-playwright`, and the
  **Quality Gate** stage fails the build if the gate is red.

---

## 7. Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `ansiColor` / `timestamps` step not found | Install AnsiColor / Timestamper plugins. |
| `Tool type 'nodejs' … not registered` | NodeJS plugin missing or tool not named `NodeJS 24`. |
| Sonar stage: `sonar-scanner: not found` | SonarScanner tool not installed / misnamed. |
| Pipeline hangs at Quality Gate | Webhook missing or using `localhost` — the Sonar container needs `http://host.docker.internal:8080/sonarqube-webhook/`. |
| `waitForQualityGate` returns nothing | Set **Manage Jenkins → System → Jenkins URL** to `http://localhost:8080/`. |
| Browsers fail to launch on agent | The `npx playwright install --with-deps chromium` step needs a Linux agent with sudo, or use the `mcr.microsoft.com/playwright:v1.55.0-jammy` Docker agent. |
| Allure report empty | Ensure tests ran and produced `allure-results/` before the `post` block. |
