// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * HealingReporter
 * ---------------
 * Collects every self-healing event that happens during a run and persists a
 * structured JSON report. A "healing event" is recorded whenever an element is
 * NOT found by its primary locator and is instead resolved by:
 *   - a static fallback locator (strategy = "fallback"), or
 *   - an AI-suggested locator generated at runtime (strategy = "ai").
 *
 * The report is intentionally process-global (singleton) so that page objects,
 * fixtures and hooks can all contribute to one consolidated file per run.
 */

const REPORT_DIR = path.resolve(__dirname, '../../reports/healing');
const LATEST_REPORT = path.join(REPORT_DIR, 'latest.json');

/** @typedef {'fallback'|'ai'} HealStrategy */

/**
 * @typedef {Object} HealingEvent
 * @property {string}  timestamp     ISO time the heal occurred.
 * @property {string}  page          Page object / logical page name.
 * @property {string}  element       Logical element name (e.g. "Login button").
 * @property {string}  description   Human description used for AI healing.
 * @property {string}  url           URL where healing happened.
 * @property {HealStrategy} strategy  How the element was recovered.
 * @property {string}  failedPrimary The primary locator that failed.
 * @property {string[]} triedFallbacks Fallback locators attempted before success.
 * @property {string}  healedLocator The locator that finally worked.
 * @property {string}  [aiProvider]  AI provider used (when strategy = "ai").
 * @property {string}  [aiModel]     AI model used (when strategy = "ai").
 */

class HealingReporter {
  constructor() {
    /** @type {HealingEvent[]} */
    this.events = [];
    this.runStartedAt = new Date().toISOString();
  }

  /**
   * Record a single healing event.
   * @param {HealingEvent} event
   */
  record(event) {
    this.events.push(event);
    // Console breadcrumb so healing is visible in live test output.
    const tag = event.strategy === 'ai' ? '🤖 AI-HEALED' : '🩹 FALLBACK-HEALED';
    // eslint-disable-next-line no-console
    console.log(
      `${tag} [${event.page} › ${event.element}] ` +
        `"${event.failedPrimary}" → "${event.healedLocator}"` +
        (event.aiModel ? ` (via ${event.aiProvider}/${event.aiModel})` : '')
    );
  }

  /** @returns {boolean} whether any healing occurred this run. */
  hasEvents() {
    return this.events.length > 0;
  }

  /**
   * Build the aggregate report object.
   * @returns {object}
   */
  buildReport() {
    const byStrategy = this.events.reduce(
      (acc, e) => {
        acc[e.strategy] = (acc[e.strategy] || 0) + 1;
        return acc;
      },
      /** @type {Record<string, number>} */ ({})
    );

    return {
      runStartedAt: this.runStartedAt,
      runFinishedAt: new Date().toISOString(),
      totalHeals: this.events.length,
      byStrategy,
      events: this.events,
    };
  }

  /**
   * Flush the collected events to disk. Writes both a timestamped file (for
   * history) and `latest.json` (for easy CI pickup). Safe to call when empty.
   * @returns {string|null} path to the timestamped report, or null if no heals.
   */
  flush() {
    if (!this.hasEvents()) return null;

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const report = this.buildReport();

    const stamp = report.runFinishedAt.replace(/[:.]/g, '-');
    const filePath = path.join(REPORT_DIR, `healing-report-${stamp}.json`);

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    fs.writeFileSync(LATEST_REPORT, JSON.stringify(report, null, 2), 'utf-8');

    // eslint-disable-next-line no-console
    console.log(
      `\n📄 Self-healing report written: ${path.relative(process.cwd(), filePath)} ` +
        `(${report.totalHeals} heal(s))`
    );
    return filePath;
  }

  /** Print a short summary of the last persisted report (used by npm script). */
  static printSummary() {
    if (!fs.existsSync(LATEST_REPORT)) {
      // eslint-disable-next-line no-console
      console.log('No healing report found yet. Run the tests first.');
      return;
    }
    const report = JSON.parse(fs.readFileSync(LATEST_REPORT, 'utf-8'));
    // eslint-disable-next-line no-console
    console.log(`\nSelf-healing summary (${report.runFinishedAt})`);
    // eslint-disable-next-line no-console
    console.log(`  Total heals : ${report.totalHeals}`);
    // eslint-disable-next-line no-console
    console.log(`  By strategy : ${JSON.stringify(report.byStrategy)}`);
    for (const e of report.events) {
      // eslint-disable-next-line no-console
      console.log(`  • [${e.strategy}] ${e.page} › ${e.element}: ${e.healedLocator}`);
    }
  }
}

/** Process-wide singleton so every module reports into one file. */
const reporter = new HealingReporter();

module.exports = reporter;
module.exports.HealingReporter = HealingReporter;
module.exports.printSummary = () => HealingReporter.printSummary();
