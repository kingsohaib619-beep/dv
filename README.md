# Dark Venus Signal Pro

**Smart Market Intelligence** for forex, metals, and crypto — a transparent, rule-based
technical-analysis dashboard that surfaces one of three signals: **BUY**, **SELL**, or **WAIT**.

> ⚠️ **This is an analytical signal platform, not a trading system.** It never places, connects
> to, or executes real trades (including on Pocket Option or any broker). Confidence scores are
> internal technical-analysis scores, not probabilities of winning, and are never a guarantee of
> profit. Trading involves risk.

---

## 1. Project structure

```
/
├── index.html          Frontend markup (dashboard, scanner, history, settings)
├── style.css            Dark futuristic terminal theme
├── app.js                State, indicators, signal engine, charting, UI logic
├── README.md
├── vercel.json           Vercel deployment configuration
├── requirements.txt      Python backend dependencies (none beyond stdlib)
└── api/
    └── market.py          Serverless function that proxies + caches Twelve Data
```

## 2. How to install

You do not need a build step — this is a static frontend plus one Python serverless
function. You only need:

- [Node.js](https://nodejs.org/) is **not required** for running the app, but you'll want the
  [Vercel CLI](https://vercel.com/docs/cli) for local development and deployment:
  ```bash
  npm install -g vercel
  ```
- Python 3.12 (Vercel provisions this automatically in production; install it locally if you
  want to test `api/market.py` directly).

## 3. How to create a Twelve Data API key

1. Go to [twelvedata.com](https://twelvedata.com/) and create a free account.
2. Open your dashboard and copy your **API Key**.
3. The free tier has request-per-minute limits — the backend's caching layer (see §10) is
   designed specifically to respect this.

## 4. How to configure `TWELVE_DATA_API_KEY`

**Locally**, create a `.env` file (or export the variable in your shell) — do **not** commit it:

```bash
export TWELVE_DATA_API_KEY="your_api_key_here"
```

With the Vercel CLI, you can also run:

```bash
vercel env add TWELVE_DATA_API_KEY development
```

**In production (Vercel dashboard)**:

1. Open your project → **Settings** → **Environment Variables**.
2. Add a variable named `TWELVE_DATA_API_KEY` with your key as the value.
3. Apply it to Production (and Preview/Development if you use those environments).
4. Redeploy so the function picks up the new variable.

The key is read exclusively inside `api/market.py` via `os.environ.get("TWELVE_DATA_API_KEY")`
and is never sent to, or embedded in, the frontend bundle.

## 5. How to run locally

```bash
vercel dev
```

This serves `index.html`/`style.css`/`app.js` as static files and runs `api/market.py` as a
local serverless function at `http://localhost:3000/api/market`.

## 6. How to deploy to Vercel

```bash
vercel login
vercel            # first deploy, follow the prompts
vercel --prod     # promote to production
```

Or connect the GitHub repository directly in the Vercel dashboard for automatic deployments on
every push. Make sure `TWELVE_DATA_API_KEY` is set in the project's environment variables first
(see §4) — without it, `/api/market` will return a `502` with a generic "Market data temporarily
unavailable" error rather than crash.

## 7. How to add symbols

Symbols are validated on **both** the frontend and backend, so add a symbol in two places:

1. **Backend allow-list** — `api/market.py`, the `ALLOWED_SYMBOLS` set:
   ```python
   ALLOWED_SYMBOLS = {
       "EUR/USD", "GBP/USD", ...
       "XAU/USD", "XAG/USD",
       "BTC/USD", "ETH/USD",
   }
   ```
2. **Frontend catalog** — `app.js`, the `SYMBOL_GROUPS` object:
   ```js
   const SYMBOL_GROUPS = {
     Forex: ["EUR/USD", ...],
     Metals: ["XAU/USD", "XAG/USD"],
     Crypto: ["BTC/USD", "ETH/USD"],
   };
   ```
   The symbol picker, search box, and Market Scanner all read from this object automatically.
   To include a new symbol in the scanner's default watchlist, also add it to
   `SCANNER_SYMBOLS`.

Any symbol string must match a format Twelve Data understands (e.g. `"BASE/QUOTE"`).

## 8. How to add indicators

Indicator math lives in `app.js`, section **4. INDICATOR MATH** (`ema`, `sma`, `stdDev`,
`bollingerBands`, `rsi`, `atr`, `findSupportResistance`). To add a new indicator:

1. Write a pure function that takes the `closes`/`candles` array and returns a value or series.
2. Call it inside `computeSignal()` and, if useful, fold it into the weighted scoring described
   in §9 below.
3. To plot it on the chart, add a new `chart.addLineSeries(...)` in `initCharts()` (in
   `renderChart()`/`applyIndicatorVisibility()`), and wire a toggle chip in `index.html`'s
   `#indicatorToggles` plus a checkbox in the Settings view.

## 9. How the signal engine works

The engine is a **transparent, weighted rule-based scorer** — not a neural network or trained
machine-learning model. The UI intentionally calls it the "Smart Signal Engine" rather than
"AI" for that reason.

For the latest closed candles of the selected symbol/timeframe, it computes:

| Factor | Points | Bullish condition | Bearish condition |
|---|---|---|---|
| EMA alignment (9/21/50) | 25 | EMA9 > EMA21 > EMA50 | EMA9 < EMA21 < EMA50 |
| RSI(14) | 20 | RSI > 52 | RSI < 48 |
| 5-candle momentum | 20 | momentum > +0.03% | momentum < -0.03% |
| Bollinger Band reaction | 15 | recovering off lower band | rejecting upper band |
| Candle confirmation | 12 | strong bullish body (>40% of range) | strong bearish body |
| Support/resistance reaction | 8 | price near recent support | price near recent resistance |

Each side accumulates a **BUY score** and a **SELL score** (0–100). The final signal is decided
as:

```
BUY  if buyScore  >= threshold AND buyScore  > sellScore + 10
SELL if sellScore >= threshold AND sellScore > buyScore  + 10
WAIT otherwise
```

`threshold` defaults to **70** and is adjustable in Settings (50–90). The engine deliberately
**prefers WAIT** whenever conditions are mixed or the scores are too close — it never forces a
BUY or SELL from a single indicator alone. The "Why this signal?" panel lists each factor with a
✓ or ✕ so every signal is explainable and auditable.

Confidence displayed to the user is the winning side's score for BUY/SELL, or a lower-bound
composite score for WAIT. **It is a technical-analysis confidence score, not a win probability,**
and the UI always shows the accompanying disclaimer.

## 10. How caching works (backend)

`api/market.py` keeps an in-process cache (`_cache`) keyed by `symbol|interval|outputsize`:

- **`CACHE_TTL = 60s`** — data younger than this is served straight from cache, no upstream call.
- **`STALE_TTL = 300s`** — if a fresh upstream call fails (network error, malformed data, or the
  data is simply older than `CACHE_TTL`), data up to 5 minutes old is still served as a fallback
  rather than showing an error.
- **`RATE_LIMIT_COOLDOWN = 30s`** — after Twelve Data returns HTTP 429 (or a body-level rate-limit
  error), the backend stops issuing new upstream requests for 30 seconds and serves cached/stale
  data instead, returning a clear `"Market data temporarily rate-limited..."` notice.
- **In-flight de-duplication** — a lightweight `_inflight` map prevents two near-simultaneous
  requests for the same symbol/interval from both hitting the upstream API.

> **Note:** because Vercel serverless functions are stateless between cold starts, this cache
> only persists for the lifetime of a "warm" function instance — it is a request-shaving layer,
> not a durable cache. For high-traffic production use, swap the in-memory dict for
> [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or Redis with the same TTL logic.

On the frontend, `app.js` never calls Twelve Data directly — it only calls `/api/market` — and
defaults to a 60-second auto-refresh, with in-flight de-duplication so the user can't trigger
overlapping requests by clicking "Analyze Now" repeatedly.

## 11. Design & UX notes

- Theme tokens (background `#070b12`, cards `#0d131c`, borders `#1c2735`, BUY `#22c55e`,
  SELL `#ef4444`, WAIT `#f59e0b`, accent `#8b5cf6`) live at the top of `style.css` as CSS custom
  properties.
- Fully responsive, mobile-first, no horizontal scrolling, large touch targets on small screens.
- Settings supports English and Arabic (default **Arabic**), switching `dir="rtl"` on `<html>`
  and `<body>` and re-rendering all `data-i18n` strings.
- Sound notifications are **off by default** and only fire on an actual signal change (never
  spammed on every refresh).

## 12. Statistics & history integrity

Win/loss results are only computed once a signal's expiry time has actually passed **and** a
subsequent live price fetch is available for that symbol — the app compares the entry price to
the next observed price after expiry. WAIT signals are never scored as wins or losses, and no
result is fabricated while a signal is still pending (`result: null`, shown as "—").

## 13. Security checklist

- `TWELVE_DATA_API_KEY` only ever exists in the serverless function's environment — grep the
  repo and you will not find it in any HTML/CSS/JS file.
- All query parameters (`symbol`, `interval`, `outputsize`) are validated against allow-lists /
  numeric bounds before any upstream call is made.
- Internal exceptions are never surfaced verbatim to the client; `_safe_detail()` maps them to
  short, generic categories.
- CORS headers are scoped to the `/api/market` route only.

---

Dark Venus Signal PRO — technical analysis only. Trading involves risk.
