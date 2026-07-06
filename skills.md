# skills.md — Working guide for this framework

> Purpose: give a future contributor (human or AI session) everything needed to
> extend and maintain this framework **without re-discovering it from scratch**.
> Read this before editing. Keep it up to date when you change architecture.

---

## 1. What this project is

End-to-end BDD test framework for the Shopify storefront
`https://sauce-demo.myshopify.com/`, covering **Home**, **Login**, **Signup**.

Stack: **Playwright (JS)** + **playwright-bdd** (Gherkin) + **Page Object Model**
+ a custom **AI self-healing locator** engine with **JSON heal reporting**.

Pinned versions (do not bump blindly): `@playwright/test@1.55.0`,
`playwright-bdd@8.3.1`. Playwright ≥ 1.60 currently breaks playwright-bdd's ESM
loader (`registerESMLoader` is undefined) — if you upgrade one, upgrade both and
re-verify `npx bddgen` runs.

---

## 2. The golden rule of the run lifecycle

**Features are NOT run directly.** `playwright-bdd` compiles `features/**/*.feature`
+ step definitions into generated specs under `tests/` (the config's `testDir`,
set via `outputDir: 'tests'`). Generated specs mirror the per-area sub-folders of
`features/` → `tests/home/`, `tests/login/`, `tests/signup/`. That compile step
is `bddgen`. `tests/` is generated and gitignored — do not hand-edit it.

- `npm test` → runs `bddgen` (via `pretest`) then `playwright test`. **Use this.**
- `npx playwright test` alone → runs whatever is already in `tests/`
  (possibly STALE). If you edited a `.feature`, always `npx bddgen` first.

This "stale generated spec" trap is the #1 gotcha. If a scenario's title in the
output doesn't match your edited feature, you forgot `bddgen`.

---

## 3. Architecture in one screen

```
feature (.feature)  ──bddgen──►  tests/<area>/*.spec.js  ──►  Playwright runner
      │                                                              │
      └── step definitions (src/steps/*.steps.js) ── use ──► page objects (src/pages/*)
                                                                     │
                                          BasePage.fill/click/... ── SelfHealingLocator.resolve()
                                                                     │
                                       primary → static fallbacks → AIHealer → HealingReporter (JSON)
```

- **Fixtures** (`src/fixtures/fixtures.js`) are the single source of `Given/When/Then`
  and expose page objects (`homePage`, `loginPage`, `registerPage`) + a per-scenario
  `world` bag. **Every step file and hook file must import from this module**, or
  they won't share fixtures.
- **Hooks** (`src/steps/hooks.js`) call `reporter.flush()` in `AfterAll` so the
  healing report is written once per worker.

---

## 4. How to add a new page

1. Create `src/pages/MyPage.js` extending `BasePage`, pass a `pageName` to `super`.
2. Declare elements as a static map of **element definitions** (see §5).
3. Add intention-revealing methods (`open()`, `doThing()`, `isLoaded()`).
4. Register it as a fixture in `src/fixtures/fixtures.js`.

## 5. How to add a self-healing element (the important pattern)

Each element = `{ name, description, locators: [...], state? }`:

```js
static elements = {
  signInButton: {
    name: 'Sign In button',                 // shows in logs/reports
    description: 'Submit button that logs the customer in ("Sign In")', // fed to AI healing
    locators: [                             // ORDERED: primary first, 2–3 total
      { by: 'css',  value: '#customer_login input[type="submit"]' },
      { by: 'css',  value: 'input[value="Sign In"]' },
      { by: 'role', value: 'button', options: { name: /sign in/i } },
    ],
    // state: 'visible' (default) | 'attached'  — readiness required to count as a match
  },
};
```

Rules of thumb learned on this site:
- **Prefer input/type-scoped or `name`-scoped CSS** for form fields. Shopify's
  "Sign up / Login with Shop" widget injects **decoy elements that duplicate ids**
  (e.g. a non-input `#first_name`). A bare `#first_name` can resolve to the decoy,
  pass the visibility check, then fail on `.fill()`. Scope to the real form
  (`#create_customer input[name="customer[first_name]"]`).
- Keep the **primary** locator the most stable real attribute; make **fallbacks**
  progressively more generic.
- `description` must be good enough that an AI, given only the DOM + that text,
  can find the element. Write it like you'd tell a human.

Supported `by` strategies: `id`, `css`, `xpath`, `role`, `text`, `placeholder`,
`label`, `testid`, `altText`. (See `SelfHealingLocator._build`.)

## 6. How to add a scenario

1. Add it to the right `features/*.feature` (tag file-level with `@home/@login/@signup`).
2. Implement any new `Given/When/Then` in the matching `src/steps/*.steps.js`,
   importing `{ Given, When, Then }` from `../fixtures/fixtures`.
3. `npm test` (never forget `bddgen`).

---

## 7. Self-healing engine internals (`src/core/`)

- **`SelfHealingLocator.js`** — `resolve(def, pageName)`:
  1. try primary; return if usable (no report).
  2. try each fallback; first usable one → `reporter.record({strategy:'fallback'})`.
  3. all failed → `AIHealer.heal()`; if its selector is usable →
     `reporter.record({strategy:'ai'})`.
  4. else throw a rich error listing everything tried.
  - "Usable" = `locator.first().waitFor({ state, timeout: HEAL_CANDIDATE_TIMEOUT })`.
    **Caveat:** visibility ≠ fillability. If an element can be a non-input decoy,
    scope the locator (see §5) rather than relying on the usability check.

- **`AIHealer.js`** — provider-agnostic client for any OpenAI-compatible
  `/chat/completions` endpoint. Providers preconfigured: `gemini` (default),
  `groq`, `openrouter`. Sends a **pruned, capped** DOM snapshot (scripts/styles/
  svg/etc. stripped, 16k char cap) + element name/description; expects strict
  JSON `{selector, strategy}`. No key → `isAvailable()` false → healing skipped
  gracefully. 20s timeout, `temperature:0`, `response_format: json_object`.

- **`HealingReporter.js`** — process-wide singleton. `record()` logs a breadcrumb
  and buffers the event; `flush()` writes `reports/healing/latest.json` +
  a timestamped history file (only if there were heals). `printSummary()` backs
  `npm run healing:report`.

To manually verify the pipeline without AI, point an element's **primary** locator
at a nonsense selector with a valid fallback and run — you should see a
`🩹 FALLBACK-HEALED` line and a `reports/healing/latest.json` entry.

---

## 8. Site-specific knowledge (saves you hours)

- **hCaptcha** guards the login & registration forms. Automated invalid submits
  do **not** produce the classic "Incorrect email or password" banner — the page
  just reloads with field values retained. So negative tests assert
  **"remain on the login/registration page"**, not an error message. Don't
  "fix" these by hunting for an error banner; it won't reliably appear.
- Real DOM anchors (verified):
  - Login form `#customer_login`: `#customer_email`, `#customer_password`,
    submit `input[value="Sign In"]`.
  - Register form `#create_customer`: fields named `customer[first_name|last_name|email|password]`,
    submit `input[value="Create"]`.
  - Home: `#customer_login_link`, `#customer_register_link`, `#search-field`,
    cart `a[href="/cart"]`, products `#product-1..N`.
  - Header nav links are **duplicated** (desktop + mobile) and some share ids —
    resolvers use `.first()`.

---

## 9. Tags, reporting & CI/CD

**Test tiers (tags).** Every scenario carries tier tags plus its area tag:
- `@smoke` (3) — critical "does it load" checks. `@sanity` (7) — smoke + core
  flows/negatives. `@regression` (11) — everything. Area tags: `@home/@login/@signup`.
- Tags live on the **Feature** line (area + `@regression`) and on individual
  **Scenario** lines (`@smoke`/`@sanity`). They render into the generated test
  title, so selection is just Playwright `--grep @smoke` (see npm scripts).
- To re-tier a scenario, edit the tag line in the `.feature` and re-run `bddgen`.

**Reporting.** Three layers, all wired in `playwright.config.js` `reporter[]`:
- Playwright HTML → `reports/html/`; JSON → `reports/results.json`.
- **Allure** (`allure-playwright`, option is `resultsDir` in v3) → raw results in
  `allure-results/`, rendered with `npm run allure:generate` (needs a JDK).
- Self-healing JSON → `reports/healing/` (see §7).

**SonarQube.** Config in `sonar-project.properties` (`sources=src`, `tests=features`,
generated/report dirs excluded). Run `sonar-scanner` with `SONAR_HOST_URL` +
`SONAR_TOKEN`. No JS coverage is wired yet — the lcov path is commented out; if you
add c8/nyc coverage emitting `coverage/lcov.info`, uncomment it.

**Jenkins.** `Jenkinsfile` (declarative). Params: `SUITE` (regression/smoke/sanity/all)
and `AI_HEALING` (injects the `ai-api-key` credential when on). Stages: Checkout →
Install → Type check → bddgen → Run tests → Sonar → Quality Gate; `post` publishes
Allure + archives `reports/**`. Requires configured Jenkins tools named `NodeJS-20`,
`SonarScanner` (+ server `SonarQube`), and `Allure`. If you rename a scenario tier or
add a suite, update both the npm `test:*` scripts and the `SUITE` choices.

## 10. Commands cheat-sheet

```bash
npm test                 # full suite (bddgen + run)
npm run test:smoke       # @smoke (3) | test:sanity (7) | test:regression (11)
npm run test:login       # only @login (area tag)
npm run test:headed      # visible browser
npm run test:debug       # Playwright Inspector
npm run typecheck        # tsc over // @ts-check sources
npm run report           # open Playwright HTML report
npm run allure:serve     # generate + open Allure (needs Java)
npm run healing:report   # summarise last healing report
npx bddgen               # (re)compile features → tests/ (run after editing .feature)
```

---

## 11. Conventions & gotchas checklist

- [ ] Import `Given/When/Then` **only** from `src/fixtures/fixtures.js`.
- [ ] New custom fixture? Add it to the `PageFixtures` typedef in `fixtures.js`
      too, or `// @ts-check` will flag it as unknown in every step.
- [ ] Run `bddgen` after any `.feature` edit (or just use `npm test`).
- [ ] Tag new scenarios with a tier (`@smoke`/`@sanity`) as appropriate;
      `@regression` is inherited from the Feature line.
- [ ] Give every element a **useful `description`** (AI healing depends on it).
- [ ] Form fields: **scope locators to the owning form / an input type** to dodge
      Shopify's duplicate-id decoys.
- [ ] Negative auth cases assert **"still on the page / not logged in"**, not error text.
- [ ] Don't bump Playwright past 1.55 without also aligning `playwright-bdd`.
- [ ] Keep `npm run typecheck` green — it's a CI gate before the Sonar stage.
- [ ] Secrets (`AI_API_KEY`, `SONAR_TOKEN`) live in `.env`/Jenkins credentials —
      never commit them.
```
