// @ts-check

/**
 * AIHealer
 * --------
 * Last-resort locator resolver. When every static locator for an element has
 * failed, the SelfHealingLocator asks the AIHealer to look at a pruned snapshot
 * of the live DOM and propose a fresh CSS/XPath selector for the element,
 * described in plain language.
 *
 * Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint
 * works. Three free-tier providers are pre-configured; the active one is chosen
 * via the AI_PROVIDER env var. If no API key is supplied, healing is skipped
 * gracefully (the framework simply relies on static locators).
 */

/** @type {Record<string, { endpoint: string, defaultModel: string }>} */
const PROVIDERS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash',
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
};

class AIHealer {
  constructor() {
    this.enabled = process.env.AI_HEALING_ENABLED !== 'false';
    this.providerKey = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    this.provider = PROVIDERS[this.providerKey] || PROVIDERS.gemini;
    this.apiKey = process.env.AI_API_KEY || '';
    this.model = process.env.AI_MODEL || this.provider.defaultModel;
  }

  /** @returns {boolean} whether AI healing can actually run. */
  isAvailable() {
    return this.enabled && Boolean(this.apiKey);
  }

  /**
   * Ask the AI model to produce a selector for the described element.
   *
   * @param {import('@playwright/test').Page} page
   * @param {{ name: string, description: string }} element
   * @returns {Promise<{ selector: string, strategy: 'css'|'xpath' }|null>}
   */
  async heal(page, element) {
    if (!this.isAvailable()) {
      if (this.enabled && !this.apiKey) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️  AI healing requested for "${element.name}" but AI_API_KEY is not set. Skipping.`
        );
      }
      return null;
    }

    let dom;
    try {
      dom = await this._capturePrunedDom(page);
    } catch {
      return null;
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a web automation expert. Given an HTML fragment and a ' +
          'description of a target UI element, return the single most robust ' +
          'selector that uniquely identifies that element. Prefer stable ' +
          'attributes (id, name, type, aria-label, data-*) over brittle ones ' +
          '(nth-child, absolute paths). Respond with STRICT JSON only, no prose: ' +
          '{"selector": "<selector>", "strategy": "css" | "xpath"}.',
      },
      {
        role: 'user',
        content:
          `Target element name: ${element.name}\n` +
          `Target element description: ${element.description}\n\n` +
          `HTML (pruned):\n${dom}`,
      },
    ];

    try {
      const raw = await this._chat(messages);
      const parsed = this._parseSelector(raw);
      return parsed;
    } catch (err) {
      // eslint-disable-next-line no-console
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`⚠️  AI healing call failed for "${element.name}": ${msg}`);
      return null;
    }
  }

  /**
   * POST an OpenAI-style chat completion request and return the text content.
   * @param {Array<{role:string, content:string}>} messages
   * @returns {Promise<string>}
   */
  async _chat(messages) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(this.provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          messages,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      return data?.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Extract `{selector, strategy}` from a model response, tolerating code
   * fences or minor formatting noise.
   * @param {string} raw
   * @returns {{selector:string, strategy:'css'|'xpath'}|null}
   */
  _parseSelector(raw) {
    if (!raw) return null;
    const cleaned = raw.replace(/```json|```/gi, '').trim();

    // Extract the first top-level `{...}` block by index scanning rather than a
    // regex. A pattern like /\{[\s\S]*\}/ can backtrack super-linearly on
    // adversarial input (ReDoS); indexOf/lastIndexOf are O(n) and can't.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) return null;

    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      if (!obj.selector || typeof obj.selector !== 'string') return null;
      const strategy = obj.strategy === 'xpath' ? 'xpath' : 'css';
      return { selector: obj.selector.trim(), strategy };
    } catch {
      return null;
    }
  }

  /**
   * Capture a trimmed representation of the DOM to keep the prompt small and
   * cheap. Scripts/styles/svg/noscript are stripped and the result is capped.
   * @param {import('@playwright/test').Page} page
   * @returns {Promise<string>}
   */
  async _capturePrunedDom(page) {
    const html = await page.evaluate(() => {
      // cloneNode returns a Node; cast to Element/HTMLElement so
      // querySelectorAll and innerHTML are available (TypeScript checks).
      /** @type {HTMLElement} */
      const clone = /** @type {HTMLElement} */ (document.body.cloneNode(true));
      clone
        .querySelectorAll('script, style, svg, noscript, iframe, link, meta')
        .forEach((n) => n.remove());
      return clone.innerHTML;
    });

    const compact = html.replace(/\s+/g, ' ').trim();
    const MAX = 16000;
    return compact.length > MAX ? `${compact.slice(0, MAX)} <!-- truncated -->` : compact;
  }
}

module.exports = new AIHealer();
module.exports.AIHealer = AIHealer;
