// @ts-check
const { AfterAll } = require('../fixtures/fixtures');
const reporter = require('../core/HealingReporter');

/**
 * After every test in a worker finishes, persist the self-healing report.
 * The reporter is a per-process singleton, so with parallel workers each worker
 * writes its own timestamped report plus refreshes `latest.json`.
 */
AfterAll(async () => {
  reporter.flush();
});
