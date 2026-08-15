/* ==========================================================================
   DARK VENUS SIGNAL PRO — app.js
   Smart Signal Engine: transparent, rule-based technical analysis.
   No real trades are ever executed by this application.
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------------
     0. CONSTANTS & SYMBOL CATALOG
     ------------------------------------------------------------------------ */

  const SYMBOL_GROUPS = {
    Forex: [
      "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "NZD/USD",
      "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD",
      "EUR/CAD", "GBP/CAD", "CHF/JPY",
    ],
    Metals: ["XAU/USD", "XAG/USD"],
    Crypto: ["BTC/USD", "ETH/USD"],
  };

  const ALL_SYMBOLS = Object.values(SYMBOL_GROUPS).flat();

  const CRYPTO_SET = new Set(SYMBOL_GROUPS.Crypto);
  const METAL_SET = new Set(SYMBOL_GROUPS.Metals);

  const REFRESH_INTERVAL_MS = 60 * 1000; // default refresh: 60 seconds
  const SCANNER_SYMBOLS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "GBP/JPY", "ETH/USD", "AUD/USD"];

  const LS_KEYS = {
    favorites: "dvsp_favorites",
    history: "dvsp_history",
    settings: "dvsp_settings",
  };

  /* ------------------------------------------------------------------------
     1. I18N
     ------------------------------------------------------------------------ */

  const I18N = {
    en: {
      brandSub: "SIGNAL PRO", navDashboard: "Dashboard", navSignals: "Signals",
      navMarket: "Market", navHistory: "History", navSettings: "Settings",
      live: "LIVE", closed: "CLOSED",
      lastUpdate: "Last update", open: "Open", high: "High", low: "Low", bid: "Bid", ask: "Ask",
      searchPlaceholder: "Search symbol (e.g. EUR)",
      bbChip: "Bollinger", analyzeNow: "ANALYZE NOW", loadingChart: "Loading chart...",
      rsiLabel: "RSI 14", analyzingMarket: "Analyzing market...", calculating: "Calculating indicators...",
      confidence: "Confidence", sigBuy: "BUY", sigSell: "SELL", sigWait: "WAIT",
      waitDefaultReason: "Waiting for a confirmed setup.",
      confDisclaimer: "Confidence is an internal technical-analysis score, not a probability of winning. It is never a guarantee of profit.",
      whyTitle: "Why this signal?", entryTitle: "Entry Information",
      currentPrice: "Current Price", entryZone: "Suggested Entry Zone", support: "Support",
      resistance: "Resistance", trend: "Trend", volatility: "Volatility",
      riskLabel: "Risk", riskLow: "LOW", riskMedium: "MEDIUM", riskHigh: "HIGH",
      levelsDisclaimer: "These levels are technical estimates only, not guaranteed outcomes.",
      expiryTitle: "Signal Duration", min: "min",
      timerDisclaimer: "This is only an analysis session timer. No trades are executed.",
      scannerTitle: "Market Scanner", strongOnly: "Strong Signals Only",
      sortConfidence: "Sort: Confidence", sortSymbol: "Sort: Symbol", sortSignal: "Sort: Signal",
      scanNow: "Scan Now", scanningMarkets: "Scanning markets...",
      totalSignals: "Total Signals", wins: "Wins", losses: "Losses", winRate: "Win Rate",
      avgConfidence: "Avg. Confidence", currentStreak: "Current Streak", bestStreak: "Best Streak",
      historyTitle: "Signal History", all: "All", clearHistory: "Clear History",
      time: "Time", symbolCol: "Symbol", timeframeCol: "Timeframe", signalCol: "Signal",
      priceCol: "Price", confidenceCol: "Confidence", resultCol: "Result", noHistory: "No signals yet.",
      settingsTitle: "Settings", settingChartTheme: "Chart theme", themeDark: "Dark Venus (default)",
      themeMidnight: "Midnight Blue", settingCandleStyle: "Candle style", candleStyleCandle: "Candles",
      candleStyleBar: "Bars", settingIndicators: "Indicators", settingAutoRefresh: "Auto refresh",
      settingSound: "Sound notifications", settingThreshold: "Signal threshold",
      settingLanguage: "Language", langArabic: "Arabic", langEnglish: "English",
      footerNote: "Technical analysis only. Trading involves risk.",
      trendBullish: "BULLISH", trendBearish: "BEARISH", trendNeutral: "NEUTRAL",
      rateLimited: "Market data temporarily rate-limited. Using the latest available data.",
      marketUnavailable: "Market data temporarily unavailable.",
      cachedNotice: "Showing latest cached market data.",
      newSignalToast: "NEW", win: "WIN", loss: "LOSS", pending: "—",
      reasonEmaBull: "EMA trend bullish", reasonEmaBear: "EMA trend bearish", reasonEmaFlat: "EMA trend mixed",
      reasonRsiAbove: "RSI above 50", reasonRsiBelow: "RSI below 50", reasonRsiMid: "RSI near neutral",
      reasonMomentumPos: "Momentum positive", reasonMomentumNeg: "Momentum negative", reasonMomentumFlat: "Momentum flat",
      reasonBBLower: "Price recovering from lower band", reasonBBUpper: "Price rejecting upper band", reasonBBMid: "Price near middle band",
      reasonCandleBull: "Bullish candle confirmation", reasonCandleBear: "Bearish candle confirmation", reasonCandleNone: "No clear candle confirmation",
      reasonSupport: "Support reaction detected", reasonResistance: "Resistance reaction detected", reasonNoLevel: "No key level reaction",
      reasonBuy: "EMA alignment is bullish, momentum is positive, and price is holding above the middle Bollinger Band.",
      reasonSell: "EMA alignment is bearish, momentum is negative, and price is rejecting the upper Bollinger Band.",
      reasonWait: "Market structure is mixed. EMA trend and RSI do not provide sufficient confirmation.",
    },
    ar: {
      brandSub: "سيجنال برو", navDashboard: "الرئيسية", navSignals: "الإشارات",
      navMarket: "السوق", navHistory: "السجل", navSettings: "الإعدادات",
      live: "مباشر", closed: "مغلق",
      lastUpdate: "آخر تحديث", open: "الافتتاح", high: "الأعلى", low: "الأدنى", bid: "الشراء", ask: "البيع",
      searchPlaceholder: "ابحث عن رمز (مثال: EUR)",
      bbChip: "بولينجر", analyzeNow: "حلّل الآن", loadingChart: "جاري تحميل الرسم البياني...",
      rsiLabel: "RSI 14", analyzingMarket: "جاري تحليل السوق...", calculating: "جاري حساب المؤشرات...",
      confidence: "نسبة الثقة", sigBuy: "شراء", sigSell: "بيع", sigWait: "انتظار",
      waitDefaultReason: "بانتظار إعداد مؤكد.",
      confDisclaimer: "نسبة الثقة هي درجة تحليل فني داخلية، وليست احتمال ربح. وهي ليست ضمانًا للربح أبدًا.",
      whyTitle: "لماذا هذه الإشارة؟", entryTitle: "معلومات الدخول",
      currentPrice: "السعر الحالي", entryZone: "منطقة الدخول المقترحة", support: "الدعم",
      resistance: "المقاومة", trend: "الاتجاه", volatility: "التقلب",
      riskLabel: "المخاطرة", riskLow: "منخفضة", riskMedium: "متوسطة", riskHigh: "مرتفعة",
      levelsDisclaimer: "هذه المستويات تقديرات فنية فقط، وليست نتائج مضمونة.",
      expiryTitle: "مدة الإشارة", min: "دقيقة",
      timerDisclaimer: "هذا مؤقت جلسة تحليل فقط. لا يتم تنفيذ أي صفقات.",
      scannerTitle: "ماسح السوق", strongOnly: "الإشارات القوية فقط",
      sortConfidence: "ترتيب: الثقة", sortSymbol: "ترتيب: الرمز", sortSignal: "ترتيب: الإشارة",
      scanNow: "افحص الآن", scanningMarkets: "جاري فحص الأسواق...",
      totalSignals: "إجمالي الإشارات", wins: "أرباح", losses: "خسائر", winRate: "نسبة الفوز",
      avgConfidence: "متوسط الثقة", currentStreak: "التتابع الحالي", bestStreak: "أفضل تتابع",
      historyTitle: "سجل الإشارات", all: "الكل", clearHistory: "مسح السجل",
      time: "الوقت", symbolCol: "الرمز", timeframeCol: "الإطار الزمني", signalCol: "الإشارة",
      priceCol: "السعر", confidenceCol: "الثقة", resultCol: "النتيجة", noHistory: "لا توجد إشارات بعد.",
      settingsTitle: "الإعدادات", settingChartTheme: "نمط الرسم البياني", themeDark: "دارك فينوس (افتراضي)",
      themeMidnight: "أزرق منتصف الليل", settingCandleStyle: "نمط الشموع", candleStyleCandle: "شموع",
      candleStyleBar: "أعمدة", settingIndicators: "المؤشرات", settingAutoRefresh: "التحديث التلقائي",
      settingSound: "التنبيهات الصوتية", settingThreshold: "عتبة الإشارة",
      settingLanguage: "اللغة", langArabic: "العربية", langEnglish: "الإنجليزية",
      footerNote: "تحليل فني فقط. التداول ينطوي على مخاطر.",
      trendBullish: "صاعد", trendBearish: "هابط", trendNeutral: "محايد",
      rateLimited: "بيانات السوق محدودة مؤقتًا. يتم استخدام آخر البيانات المتاحة.",
      marketUnavailable: "بيانات السوق غير متاحة مؤقتًا.",
      cachedNotice: "يتم عرض آخر بيانات مخزنة مؤقتًا.",
      newSignalToast: "إشارة جديدة", win: "ربح", loss: "خسارة", pending: "—",
      reasonEmaBull: "اتجاه EMA صاعد", reasonEmaBear: "اتجاه EMA هابط", reasonEmaFlat: "اتجاه EMA غير واضح",
      reasonRsiAbove: "RSI فوق 50", reasonRsiBelow: "RSI تحت 50", reasonRsiMid: "RSI قرب المنطقة المحايدة",
      reasonMomentumPos: "الزخم إيجابي", reasonMomentumNeg: "الزخم سلبي", reasonMomentumFlat: "الزخم ثابت",
      reasonBBLower: "السعر يتعافى من النطاق السفلي", reasonBBUpper: "السعر يرتد من النطاق العلوي", reasonBBMid: "السعر قرب النطاق الأوسط",
      reasonCandleBull: "تأكيد شمعة صاعدة", reasonCandleBear: "تأكيد شمعة هابطة", reasonCandleNone: "لا يوجد تأكيد واضح من الشموع",
      reasonSupport: "تفاعل مع مستوى دعم", reasonResistance: "تفاعل مع مستوى مقاومة", reasonNoLevel: "لا يوجد تفاعل مع مستوى رئيسي",
      reasonBuy: "محاذاة EMA صاعدة، والزخم إيجابي، والسعر يحافظ على موقعه فوق نطاق بولينجر الأوسط.",
      reasonSell: "محاذاة EMA هابطة، والزخم سلبي، والسعر يرتد من نطاق بولينجر العلوي.",
      reasonWait: "بنية السوق غير واضحة. اتجاه EMA و RSI لا يقدمان تأكيدًا كافيًا.",
    },
  };

  /* ------------------------------------------------------------------------
     2. STATE
     ------------------------------------------------------------------------ */

  const state = {
    symbol: "XAU/USD",
    interval: "5min",
    candles: [],
    lastFetchAt: 0,
    fetchInFlight: false,
    lastSignal: null,        // { signal, confidence, symbol, interval }
    timerMinutes: 1,
    timerRemaining: 60,
    timerHandle: null,
    refreshHandle: null,
    settings: loadSettings(),
    favorites: loadFavorites(),
    history: loadHistory(),
    lang: "ar",
    charts: { main: null, candleSeries: null, ema9: null, ema21: null, ema50: null, bbUpper: null, bbMid: null, bbLower: null, rsi: null, rsiSeries: null },
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEYS.settings);
      const defaults = {
        chartTheme: "dark", candleStyle: "candle",
        indicators: { ema9: true, ema21: true, ema50: true, bb: true, rsi: true },
        autoRefresh: true, sound: false, threshold: 70, language: "ar",
      };
      return raw ? Object.assign(defaults, JSON.parse(raw)) : defaults;
    } catch (e) { return { chartTheme: "dark", candleStyle: "candle", indicators: { ema9: true, ema21: true, ema50: true, bb: true, rsi: true }, autoRefresh: true, sound: false, threshold: 70, language: "ar" }; }
  }
  function saveSettings() { localStorage.setItem(LS_KEYS.settings, JSON.stringify(state.settings)); }

  function loadFavorites() {
    try { return new Set(JSON.parse(localStorage.getItem(LS_KEYS.favorites) || "[]")); } catch (e) { return new Set(); }
  }
  function saveFavorites() { localStorage.setItem(LS_KEYS.favorites, JSON.stringify([...state.favorites])); }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(LS_KEYS.history) || "[]"); } catch (e) { return []; }
  }
  function saveHistory() { localStorage.setItem(LS_KEYS.history, JSON.stringify(state.history)); }

  /* ------------------------------------------------------------------------
     3. I18N APPLY
     ------------------------------------------------------------------------ */

  function t(key) { return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key; }

  function applyI18n() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.body.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
  }

  /* ------------------------------------------------------------------------
     4. INDICATOR MATH
     ------------------------------------------------------------------------ */

  function ema(values, period) {
    const k = 2 / (period + 1);
    const out = new Array(values.length).fill(null);
    let prev = null;
    for (let i = 0; i < values.length; i++) {
      if (values[i] == null) continue;
      if (prev === null) {
        // seed with SMA of first `period` values once we have enough
        if (i >= period - 1) {
          let sum = 0;
          for (let j = i - period + 1; j <= i; j++) sum += values[j];
          prev = sum / period;
          out[i] = prev;
        }
      } else {
        prev = values[i] * k + prev * (1 - k);
        out[i] = prev;
      }
    }
    return out;
  }

  function sma(values, period) {
    const out = new Array(values.length).fill(null);
    for (let i = period - 1; i < values.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      out[i] = sum / period;
    }
    return out;
  }

  function stdDev(values, period, means) {
    const out = new Array(values.length).fill(null);
    for (let i = period - 1; i < values.length; i++) {
      const mean = means[i];
      if (mean == null) continue;
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) sumSq += Math.pow(values[j] - mean, 2);
      out[i] = Math.sqrt(sumSq / period);
    }
    return out;
  }

  function bollingerBands(closes, period = 20, mult = 2) {
    const mid = sma(closes, period);
    const sd = stdDev(closes, period, mid);
    const upper = closes.map((_, i) => (mid[i] != null && sd[i] != null ? mid[i] + mult * sd[i] : null));
    const lower = closes.map((_, i) => (mid[i] != null && sd[i] != null ? mid[i] - mult * sd[i] : null));
    return { upper, mid, lower };
  }

  function rsi(closes, period = 14) {
    const out = new Array(closes.length).fill(null);
    if (closes.length < period + 1) return out;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    let avgGain = gains / period, avgLoss = losses / period;
    out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return out;
  }

  function atr(candles, period = 14) {
    const trs = candles.map((c, i) => {
      if (i === 0) return c.high - c.low;
      const prevClose = candles[i - 1].close;
      return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
    });
    return sma(trs, period);
  }

  function findSupportResistance(candles, lookback = 40) {
    const slice = candles.slice(-lookback);
    if (slice.length === 0) return { support: null, resistance: null };
    let support = Math.min(...slice.map((c) => c.low));
    let resistance = Math.max(...slice.map((c) => c.high));
    return { support, resistance };
  }

  /* ------------------------------------------------------------------------
     5. SIGNAL ENGINE
     ------------------------------------------------------------------------ */

  function computeSignal(candles) {
    if (!candles || candles.length < 55) return null;

    const closes = candles.map((c) => c.close);
    const ema9arr = ema(closes, 9);
    const ema21arr = ema(closes, 21);
    const ema50arr = ema(closes, 50);
    const rsiArr = rsi(closes, 14);
    const bb = bollingerBands(closes, 20, 2);
    const atrArr = atr(candles, 14);

    const i = closes.length - 1;
    const price = closes[i];
    const prevPrice = closes[i - 1];

    const e9 = ema9arr[i], e21 = ema21arr[i], e50 = ema50arr[i];
    const rsiNow = rsiArr[i];
    const bbUpper = bb.upper[i], bbMid = bb.mid[i], bbLower = bb.lower[i];
    const atrNow = atrArr[i] || 0;

    if (e9 == null || e21 == null || e50 == null || rsiNow == null || bbUpper == null) return null;

    const momentum = ((price - closes[Math.max(0, i - 5)]) / closes[Math.max(0, i - 5)]) * 100;
    const candle = candles[i];
    const bullishCandle = candle.close > candle.open;
    const bearishCandle = candle.close < candle.open;
    const bodyPct = Math.abs(candle.close - candle.open) / Math.max(1e-9, candle.high - candle.low);
    const strongBullCandle = bullishCandle && bodyPct > 0.4;
    const strongBearCandle = bearishCandle && bodyPct > 0.4;

    const { support, resistance } = findSupportResistance(candles, 40);
    const nearSupport = support != null && (price - support) / price < 0.0025;
    const nearResistance = resistance != null && (resistance - price) / price < 0.0025;

    // ---- Weighted scoring (0-100 each side) ----
    let buyScore = 0, sellScore = 0;
    const factors = [];

    // 1. EMA alignment (25 pts)
    if (e9 > e21 && e21 > e50) { buyScore += 25; factors.push({ key: "reasonEmaBull", side: "buy" }); }
    else if (e9 < e21 && e21 < e50) { sellScore += 25; factors.push({ key: "reasonEmaBear", side: "sell" }); }
    else { factors.push({ key: "reasonEmaFlat", side: "neutral" }); }

    // 2. RSI (20 pts)
    if (rsiNow > 52) { buyScore += 20; factors.push({ key: "reasonRsiAbove", side: "buy" }); }
    else if (rsiNow < 48) { sellScore += 20; factors.push({ key: "reasonRsiBelow", side: "sell" }); }
    else { factors.push({ key: "reasonRsiMid", side: "neutral" }); }

    // 3. Momentum (20 pts)
    if (momentum > 0.03) { buyScore += 20; factors.push({ key: "reasonMomentumPos", side: "buy" }); }
    else if (momentum < -0.03) { sellScore += 20; factors.push({ key: "reasonMomentumNeg", side: "sell" }); }
    else { factors.push({ key: "reasonMomentumFlat", side: "neutral" }); }

    // 4. Bollinger Band reaction (15 pts)
    if (prevPrice <= bbLower && price > bbLower) { buyScore += 15; factors.push({ key: "reasonBBLower", side: "buy" }); }
    else if (prevPrice >= bbUpper && price < bbUpper) { sellScore += 15; factors.push({ key: "reasonBBUpper", side: "sell" }); }
    else if (price > bbMid) { buyScore += 6; factors.push({ key: "reasonBBMid", side: "neutral" }); }
    else { sellScore += 6; factors.push({ key: "reasonBBMid", side: "neutral" }); }

    // 5. Candle confirmation (12 pts)
    if (strongBullCandle) { buyScore += 12; factors.push({ key: "reasonCandleBull", side: "buy" }); }
    else if (strongBearCandle) { sellScore += 12; factors.push({ key: "reasonCandleBear", side: "sell" }); }
    else { factors.push({ key: "reasonCandleNone", side: "neutral" }); }

    // 6. Support / resistance reaction (8 pts)
    if (nearSupport) { buyScore += 8; factors.push({ key: "reasonSupport", side: "buy" }); }
    else if (nearResistance) { sellScore += 8; factors.push({ key: "reasonResistance", side: "sell" }); }
    else { factors.push({ key: "reasonNoLevel", side: "neutral" }); }

    buyScore = Math.min(100, buyScore);
    sellScore = Math.min(100, sellScore);

    const threshold = state.settings.threshold || 70;
    let signal = "wait";
    let confidence = Math.max(buyScore, sellScore, 40 + Math.abs(buyScore - sellScore) / 2);

    if (buyScore >= threshold && buyScore > sellScore + 10) {
      signal = "buy";
      confidence = buyScore;
    } else if (sellScore >= threshold && sellScore > buyScore + 10) {
      signal = "sell";
      confidence = sellScore;
    } else {
      signal = "wait";
      confidence = Math.round((100 - Math.abs(buyScore - sellScore)) * 0.55 + Math.max(buyScore, sellScore) * 0.15);
      confidence = Math.min(65, Math.max(35, confidence));
    }

    confidence = Math.round(Math.max(0, Math.min(99, confidence)));

    const trend = e9 > e21 && e21 > e50 ? "trendBullish" : (e9 < e21 && e21 < e50 ? "trendBearish" : "trendNeutral");
    const volatilityPct = (atrNow / price) * 100;
    const volatilityLabel = volatilityPct > 0.35 ? "riskHigh" : volatilityPct > 0.15 ? "riskMedium" : "riskLow";

    let reasonKey = "reasonWait";
    if (signal === "buy") reasonKey = "reasonBuy";
    else if (signal === "sell") reasonKey = "reasonSell";

    return {
      signal, confidence, buyScore, sellScore, factors,
      price, ema9: e9, ema21: e21, ema50: e50, rsi: rsiNow,
      bbUpper, bbMid, bbLower, support, resistance, trend, volatilityLabel,
      reasonKey,
      entryZone: signal === "wait" ? null : [price - atrNow * 0.15, price + atrNow * 0.15],
      series: { ema9: ema9arr, ema21: ema21arr, ema50: ema50arr, bbUpper: bb.upper, bbMid: bb.mid, bbLower: bb.lower, rsi: rsiArr },
    };
  }

  /* ------------------------------------------------------------------------
     6. API CLIENT
     ------------------------------------------------------------------------ */

  async function fetchMarket(symbol, interval) {
    const url = `/api/market?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputsize=150`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    let body;
    try { body = await res.json(); } catch (e) { throw new Error("bad_json"); }

    if (res.status === 429) {
      showToast(t("rateLimited"), "wait");
      const err = new Error("rate_limited");
      err.body = body;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(body.error || "market_unavailable");
      err.body = body;
      throw err;
    }
    if (body.notice) showToast(body.notice, "wait");
    return body;
  }

  /* ------------------------------------------------------------------------
     7. CHART RENDERING (Lightweight Charts)
     ------------------------------------------------------------------------ */

  function initCharts() {
    const container = document.getElementById("chartContainer");
    const chart = LightweightCharts.createChart(container, {
      layout: { background: { color: "transparent" }, textColor: "#94a3b8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11 },
      grid: { vertLines: { color: "rgba(28,39,53,0.6)" }, horzLines: { color: "rgba(28,39,53,0.6)" } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1c2735" },
      timeScale: { borderColor: "#1c2735", timeVisible: true, secondsVisible: false },
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444", borderVisible: false,
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });

    const ema9Series = chart.addLineSeries({ color: "#8b5cf6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema21Series = chart.addLineSeries({ color: "#38bdf8", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const ema50Series = chart.addLineSeries({ color: "#f59e0b", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const bbUpperSeries = chart.addLineSeries({ color: "rgba(148,163,184,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const bbMidSeries = chart.addLineSeries({ color: "rgba(148,163,184,0.3)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    const bbLowerSeries = chart.addLineSeries({ color: "rgba(148,163,184,0.5)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });

    const rsiChart = LightweightCharts.createChart(document.getElementById("rsiContainer"), {
      layout: { background: { color: "transparent" }, textColor: "#94a3b8", fontFamily: "IBM Plex Mono, monospace", fontSize: 10 },
      grid: { vertLines: { color: "rgba(28,39,53,0.6)" }, horzLines: { color: "rgba(28,39,53,0.4)" } },
      rightPriceScale: { borderColor: "#1c2735" },
      timeScale: { borderColor: "#1c2735", visible: false },
      autoSize: true,
      handleScroll: false, handleScale: false,
    });
    const rsiSeries = rsiChart.addLineSeries({ color: "#8b5cf6", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    state.charts = { main: chart, candleSeries, ema9: ema9Series, ema21: ema21Series, ema50: ema50Series, bbUpper: bbUpperSeries, bbMid: bbMidSeries, bbLower: bbLowerSeries, rsi: rsiChart, rsiSeries };

    // Sync time scales
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) rsiChart.timeScale().setVisibleLogicalRange(range);
    });

    applyIndicatorVisibility();
  }

  function toChartTime(datetimeStr) {
    // Twelve Data returns "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD"
    const t = datetimeStr.includes(" ") ? datetimeStr.replace(" ", "T") + "Z" : datetimeStr;
    return Math.floor(new Date(t).getTime() / 1000);
  }

  function renderChart(candles, computed) {
    const { candleSeries, ema9, ema21, ema50, bbUpper, bbMid, bbLower, rsiSeries } = state.charts;
    const candleData = candles.map((c) => ({
      time: toChartTime(c.datetime), open: c.open, high: c.high, low: c.low, close: c.close,
    }));
    candleSeries.setData(candleData);

    if (computed) {
      const times = candles.map((c) => toChartTime(c.datetime));
      const buildLine = (arr) => arr.map((v, idx) => (v == null ? null : { time: times[idx], value: v })).filter(Boolean);
      ema9.setData(buildLine(computed.series.ema9));
      ema21.setData(buildLine(computed.series.ema21));
      ema50.setData(buildLine(computed.series.ema50));
      bbUpper.setData(buildLine(computed.series.bbUpper));
      bbMid.setData(buildLine(computed.series.bbMid));
      bbLower.setData(buildLine(computed.series.bbLower));
      rsiSeries.setData(buildLine(computed.series.rsi));
    }
    state.charts.main.timeScale().fitContent();
    state.charts.rsi.timeScale().fitContent();
  }

  function applyIndicatorVisibility() {
    const ind = state.settings.indicators;
    const { ema9, ema21, ema50, bbUpper, bbMid, bbLower, rsi: rsiChart } = state.charts;
    if (!ema9) return;
    ema9.applyOptions({ visible: !!ind.ema9 });
    ema21.applyOptions({ visible: !!ind.ema21 });
    ema50.applyOptions({ visible: !!ind.ema50 });
    bbUpper.applyOptions({ visible: !!ind.bb });
    bbMid.applyOptions({ visible: !!ind.bb });
    bbLower.applyOptions({ visible: !!ind.bb });
    document.querySelector(".rsi-panel").style.display = ind.rsi ? "" : "none";
  }

  /* ------------------------------------------------------------------------
     8. MARKET STATUS
     ------------------------------------------------------------------------ */

  function isForexOpen(now = new Date()) {
    const day = now.getUTCDay(); // 0 Sun .. 6 Sat
    const hour = now.getUTCHours();
    if (day === 6) return false; // Saturday closed
    if (day === 0 && hour < 22) return false; // Sunday before 22:00 UTC closed
    if (day === 5 && hour >= 22) return false; // Friday after 22:00 UTC closed
    return true;
  }

  function marketStatusFor(symbol) {
    if (CRYPTO_SET.has(symbol)) return { open: true, label: "live" };
    // Metals broadly track forex/futures session hours.
    return { open: isForexOpen(), label: isForexOpen() ? "live" : "closed" };
  }

  /* ------------------------------------------------------------------------
     9. RENDER: MARKET CARD, SIGNAL CARD, WHY LIST, ENTRY INFO
     ------------------------------------------------------------------------ */

  function renderMarketCard(candles, symbol) {
    if (!candles.length) return;
    const last = candles[candles.length - 1];
    const first = candles[0];
    const change = ((last.close - first.close) / first.close) * 100;

    document.getElementById("mcSymbol").textContent = symbol;
    document.getElementById("mcPrice").textContent = formatPrice(last.close, symbol);
    const changeEl = document.getElementById("mcChange");
    changeEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    changeEl.className = "price-change " + (change >= 0 ? "pos" : "neg");

    document.getElementById("mcOpen").textContent = formatPrice(last.open, symbol);
    document.getElementById("mcHigh").textContent = formatPrice(Math.max(...candles.slice(-30).map((c) => c.high)), symbol);
    document.getElementById("mcLow").textContent = formatPrice(Math.min(...candles.slice(-30).map((c) => c.low)), symbol);

    const spread = last.close * 0.00006;
    document.getElementById("mcBid").textContent = formatPrice(last.close - spread, symbol);
    document.getElementById("mcAsk").textContent = formatPrice(last.close + spread, symbol);

    const now = new Date();
    document.getElementById("mcUpdateTime").textContent = now.toLocaleTimeString(state.lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });

    const status = marketStatusFor(symbol);
    const pill = document.getElementById("mcStatus");
    pill.classList.toggle("closed", !status.open);
    pill.innerHTML = `<span class="pulse-dot"></span><span>${t(status.label)}</span>`;

    const headerPulse = document.getElementById("headerMarketStatus");
    headerPulse.innerHTML = `<span class="pulse-dot"></span><span>${t(status.label)}</span>`;
  }

  function formatPrice(value, symbol) {
    if (value == null || isNaN(value)) return "--";
    const decimals = CRYPTO_SET.has(symbol) ? 2 : (symbol.includes("JPY") ? 3 : (METAL_SET.has(symbol) ? 2 : 5));
    return value.toFixed(decimals);
  }

  function renderSignalCard(computed, symbol, interval) {
    const card = document.getElementById("signalCard");
    const skeleton = document.getElementById("signalSkeleton");
    const content = document.getElementById("signalCardContent");
    skeleton.classList.remove("active");
    content.style.display = "";

    if (!computed) {
      card.dataset.state = "wait";
      document.getElementById("signalLabel").textContent = t("sigWait");
      document.getElementById("signalConfidence").textContent = "--%";
      document.getElementById("signalSummary").textContent = t("waitDefaultReason");
      document.getElementById("signalTag").textContent = `${symbol} · ${interval.toUpperCase()}`;
      renderWhyList(null);
      renderEntryInfo(null, symbol);
      return;
    }

    card.dataset.state = computed.signal;
    document.getElementById("signalLabel").textContent = t(computed.signal === "buy" ? "sigBuy" : computed.signal === "sell" ? "sigSell" : "sigWait");
    document.getElementById("signalConfidence").textContent = `${computed.confidence}%`;
    document.getElementById("signalSummary").textContent = t(computed.reasonKey);
    document.getElementById("signalTag").textContent = `${symbol} · ${interval.toUpperCase()}`;

    renderWhyList(computed);
    renderEntryInfo(computed, symbol);

    maybeNotify(computed, symbol, interval);
    recordHistoryIfNew(computed, symbol, interval);
  }

  function renderWhyList(computed) {
    const list = document.getElementById("whyList");
    list.innerHTML = "";
    if (!computed) {
      const li = document.createElement("li");
      li.className = "why-item pending";
      li.textContent = t("calculating");
      list.appendChild(li);
      return;
    }
    computed.factors.forEach((f) => {
      const li = document.createElement("li");
      const isGood = f.side === "buy" || f.side === "sell";
      // A factor is "good" (checkmark) if it agrees with the final signal direction.
      const agrees = (computed.signal === "buy" && f.side === "buy") || (computed.signal === "sell" && f.side === "sell");
      li.className = "why-item " + (computed.signal === "wait" ? "pending" : agrees ? "good" : (isGood ? "bad" : "pending"));
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = computed.signal === "wait" ? "•" : (agrees ? "✓" : (isGood ? "✕" : "•"));
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = t(f.key);
      li.appendChild(mark);
      li.appendChild(label);
      list.appendChild(li);
    });
  }

  function renderEntryInfo(computed, symbol) {
    if (!computed) {
      ["eiPrice", "eiZone", "eiSupport", "eiResistance", "eiTrend", "eiVolatility"].forEach((id) => (document.getElementById(id).textContent = "--"));
      const riskEl = document.getElementById("eiRisk");
      riskEl.dataset.risk = "medium";
      riskEl.textContent = t("riskMedium");
      return;
    }
    document.getElementById("eiPrice").textContent = formatPrice(computed.price, symbol);
    document.getElementById("eiZone").textContent = computed.entryZone
      ? `${formatPrice(computed.entryZone[0], symbol)} - ${formatPrice(computed.entryZone[1], symbol)}`
      : "—";
    document.getElementById("eiSupport").textContent = computed.support != null ? formatPrice(computed.support, symbol) : "--";
    document.getElementById("eiResistance").textContent = computed.resistance != null ? formatPrice(computed.resistance, symbol) : "--";
    document.getElementById("eiTrend").textContent = t(computed.trend);
    document.getElementById("eiVolatility").textContent = t(computed.volatilityLabel);

    const riskEl = document.getElementById("eiRisk");
    riskEl.dataset.risk = computed.volatilityLabel.replace("risk", "").toLowerCase();
    riskEl.textContent = t(computed.volatilityLabel);
  }

  /* ------------------------------------------------------------------------
     10. NOTIFICATIONS / SOUND / TOASTS
     ------------------------------------------------------------------------ */

  function showToast(message, kind, title) {
    const layer = document.getElementById("toastLayer");
    const el = document.createElement("div");
    el.className = "toast" + (kind === "buy" ? " buy" : kind === "sell" ? " sell" : "");
    el.innerHTML = `${title ? `<div class="toast-title">${title}</div>` : ""}<div class="toast-body">${message}</div>`;
    layer.appendChild(el);
    setTimeout(() => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 240);
    }, 4200);
  }

  function maybeNotify(computed, symbol, interval) {
    const key = `${symbol}|${interval}`;
    const changed = !state.lastSignal || state.lastSignal.key !== key || state.lastSignal.signal !== computed.signal;
    if (changed && computed.signal !== "wait") {
      const title = `${t("newSignalToast")} ${t(computed.signal === "buy" ? "sigBuy" : "sigSell")}`;
      const body = `${symbol} · ${interval.toUpperCase()} — ${t("confidence")} ${computed.confidence}%`;
      showToast(body, computed.signal, title);
      playSound(computed.signal);
    }
    state.lastSignal = { key, signal: computed.signal };
  }

  function playSound(signal) {
    if (!state.settings.sound) return;
    if (signal === "wait") return;
    const el = document.getElementById(signal === "buy" ? "sndBuy" : "sndSell");
    if (el) { try { el.currentTime = 0; el.play().catch(() => {}); } catch (e) {} }
  }

  /* ------------------------------------------------------------------------
     11. HISTORY & STATISTICS
     ------------------------------------------------------------------------ */

  function recordHistoryIfNew(computed, symbol, interval) {
    const nowIso = new Date().toISOString();
    const last = state.history[0];
    // Avoid duplicate consecutive entries for the same symbol/interval/signal within 30s
    if (last && last.symbol === symbol && last.interval === interval && last.signal === computed.signal &&
        (Date.now() - new Date(last.time).getTime()) < 30000) {
      return;
    }
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      time: nowIso,
      symbol, interval, signal: computed.signal,
      price: computed.price, confidence: computed.confidence,
      expiryAt: new Date(Date.now() + state.timerMinutes * 60000).toISOString(),
      result: computed.signal === "wait" ? "na" : null,
    };
    state.history.unshift(entry);
    if (state.history.length > 300) state.history.length = 300;
    saveHistory();
    renderHistoryTable();
    renderStats();
  }

  function evaluatePendingHistory(symbol, currentPrice) {
    const now = Date.now();
    let changed = false;
    for (const entry of state.history) {
      if (entry.result !== null) continue;
      if (entry.symbol !== symbol) continue;
      if (new Date(entry.expiryAt).getTime() > now) continue;
      if (entry.signal === "buy") entry.result = currentPrice > entry.price ? "win" : "loss";
      else if (entry.signal === "sell") entry.result = currentPrice < entry.price ? "win" : "loss";
      else entry.result = "na";
      changed = true;
    }
    if (changed) {
      saveHistory();
      renderHistoryTable();
      renderStats();
    }
  }

  let historyFilter = "all";

  function renderHistoryTable() {
    const tbody = document.getElementById("historyTableBody");
    const filtered = state.history.filter((e) => historyFilter === "all" || e.signal === historyFilter);
    tbody.innerHTML = "";
    if (!filtered.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      tr.innerHTML = `<td colspan="7">${t("noHistory")}</td>`;
      tbody.appendChild(tr);
      return;
    }
    filtered.slice(0, 100).forEach((e) => {
      const tr = document.createElement("tr");
      const timeStr = new Date(e.time).toLocaleTimeString(state.lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
      const resultHtml = e.result === "win" ? `<span class="result-win">${t("win")}</span>`
        : e.result === "loss" ? `<span class="result-loss">${t("loss")}</span>`
        : `<span class="result-pending">${t("pending")}</span>`;
      tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${e.symbol}</td>
        <td>${e.interval.replace("min", "M").replace("h", "H")}</td>
        <td><span class="sig-pill ${e.signal}">${t(e.signal === "buy" ? "sigBuy" : e.signal === "sell" ? "sigSell" : "sigWait")}</span></td>
        <td>${formatPrice(e.price, e.symbol)}</td>
        <td>${e.confidence}%</td>
        <td>${resultHtml}</td>`;
      tbody.appendChild(tr);
    });
  }

  function renderStats() {
    const total = state.history.length;
    const buy = state.history.filter((e) => e.signal === "buy").length;
    const sell = state.history.filter((e) => e.signal === "sell").length;
    const wait = state.history.filter((e) => e.signal === "wait").length;
    const wins = state.history.filter((e) => e.result === "win").length;
    const losses = state.history.filter((e) => e.result === "loss").length;
    const decided = wins + losses;
    const winRate = decided > 0 ? Math.round((wins / decided) * 100) : null;
    const avgConf = total > 0 ? Math.round(state.history.reduce((s, e) => s + e.confidence, 0) / total) : null;

    // Streaks based on chronological order (oldest -> newest) of decided trades
    const decidedChrono = state.history.filter((e) => e.result === "win" || e.result === "loss").slice().reverse();
    let curStreak = 0, bestStreak = 0, running = 0, lastType = null;
    decidedChrono.forEach((e) => {
      if (e.result === "win") {
        running = lastType === "win" ? running + 1 : 1;
        lastType = "win";
      } else {
        running = 0;
        lastType = "loss";
      }
      bestStreak = Math.max(bestStreak, running);
    });
    curStreak = lastType === "win" ? running : 0;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statBuy").textContent = buy;
    document.getElementById("statSell").textContent = sell;
    document.getElementById("statWait").textContent = wait;
    document.getElementById("statWins").textContent = wins;
    document.getElementById("statLosses").textContent = losses;
    document.getElementById("statWinRate").textContent = winRate != null ? `${winRate}%` : "--";
    document.getElementById("statAvgConf").textContent = avgConf != null ? `${avgConf}%` : "--";
    document.getElementById("statCurStreak").textContent = curStreak;
    document.getElementById("statBestStreak").textContent = bestStreak;
  }

  /* ------------------------------------------------------------------------
     12. TIMER
     ------------------------------------------------------------------------ */

  function startTimer(minutes) {
    state.timerMinutes = minutes;
    state.timerRemaining = minutes * 60;
    if (state.timerHandle) clearInterval(state.timerHandle);
    updateTimerDisplay();
    state.timerHandle = setInterval(() => {
      state.timerRemaining -= 1;
      if (state.timerRemaining <= 0) {
        state.timerRemaining = state.timerMinutes * 60;
      }
      updateTimerDisplay();
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = Math.floor(state.timerRemaining / 60).toString().padStart(2, "0");
    const s = Math.floor(state.timerRemaining % 60).toString().padStart(2, "0");
    document.getElementById("timerDisplay").textContent = `${m}:${s}`;
  }

  /* ------------------------------------------------------------------------
     13. SCANNER
     ------------------------------------------------------------------------ */

  let scannerData = [];

  async function runScanner() {
    const skeleton = document.getElementById("scannerSkeleton");
    const list = document.getElementById("scannerList");
    skeleton.classList.add("active");
    list.innerHTML = "";

    const results = [];
    for (const sym of SCANNER_SYMBOLS) {
      try {
        const body = await fetchMarket(sym, "5min");
        const candles = body.values || [];
        evaluatePendingHistory(sym, candles.length ? candles[candles.length - 1].close : null);
        const computed = computeSignal(candles);
        results.push({ symbol: sym, computed });
      } catch (e) {
        results.push({ symbol: sym, computed: null, error: true });
      }
    }
    scannerData = results;
    skeleton.classList.remove("active");
    renderScanner();
  }

  function renderScanner() {
    const list = document.getElementById("scannerList");
    const strongOnly = document.getElementById("strongOnlyToggle").checked;
    const sortBy = document.getElementById("scannerSort").value;

    let rows = scannerData.filter((r) => r.computed);
    if (strongOnly) rows = rows.filter((r) => r.computed.signal !== "wait" && r.computed.confidence >= (state.settings.threshold || 70));

    rows = rows.slice().sort((a, b) => {
      if (sortBy === "confidence") return b.computed.confidence - a.computed.confidence;
      if (sortBy === "symbol") return a.symbol.localeCompare(b.symbol);
      if (sortBy === "signal") return a.computed.signal.localeCompare(b.computed.signal);
      return 0;
    });

    list.innerHTML = "";
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "disclaimer-note";
      empty.textContent = t("noHistory");
      list.appendChild(empty);
      return;
    }

    rows.forEach((r) => {
      const row = document.createElement("div");
      row.className = "scanner-row";
      const sig = r.computed.signal;
      const color = sig === "buy" ? "var(--buy)" : sig === "sell" ? "var(--sell)" : "var(--wait)";
      row.innerHTML = `
        <span class="scanner-symbol">${r.symbol}</span>
        <span class="scanner-badge ${sig}">${t(sig === "buy" ? "sigBuy" : sig === "sell" ? "sigSell" : "sigWait")}</span>
        <div class="scanner-bar"><div class="scanner-bar-fill" style="width:${r.computed.confidence}%; background:${color};"></div></div>
        <span class="scanner-conf">${r.computed.confidence}%</span>`;
      row.addEventListener("click", () => {
        document.getElementById("symbolSelect").value = r.symbol;
        state.symbol = r.symbol;
        switchView("dashboard");
        loadMarket(true);
      });
      list.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------------
     14. FAVORITES & SEARCH
     ------------------------------------------------------------------------ */

  function populateSymbolSelect() {
    const select = document.getElementById("symbolSelect");
    select.innerHTML = "";
    Object.entries(SYMBOL_GROUPS).forEach(([group, symbols]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;
      symbols.forEach((sym) => {
        const opt = document.createElement("option");
        opt.value = sym;
        opt.textContent = sym;
        optgroup.appendChild(opt);
      });
      select.appendChild(optgroup);
    });
    select.value = state.symbol;
  }

  function updateFavButton() {
    const btn = document.getElementById("favBtn");
    btn.classList.toggle("active", state.favorites.has(state.symbol));
  }

  function setupSearch() {
    const input = document.getElementById("symbolSearch");
    const resultsEl = document.getElementById("searchResults");
    input.addEventListener("input", () => {
      const q = input.value.trim().toUpperCase();
      resultsEl.innerHTML = "";
      if (!q) { resultsEl.classList.remove("open"); return; }
      const matches = ALL_SYMBOLS.filter((s) => s.includes(q)).slice(0, 8);
      if (!matches.length) { resultsEl.classList.remove("open"); return; }
      matches.forEach((sym) => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = sym;
        item.addEventListener("click", () => {
          state.symbol = sym;
          document.getElementById("symbolSelect").value = sym;
          input.value = "";
          resultsEl.classList.remove("open");
          updateFavButton();
          loadMarket(true);
        });
        resultsEl.appendChild(item);
      });
      resultsEl.classList.add("open");
    });
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !resultsEl.contains(e.target)) resultsEl.classList.remove("open");
    });
  }

  /* ------------------------------------------------------------------------
     15. VIEW SWITCHING
     ------------------------------------------------------------------------ */

  function switchView(view) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view && !btn.dataset.scroll);
    });
    if (view === "market" && scannerData.length === 0) runScanner();
    if (view === "history") { renderHistoryTable(); renderStats(); }
  }

  /* ------------------------------------------------------------------------
     16. MAIN LOAD / REFRESH CYCLE
     ------------------------------------------------------------------------ */

  function showChartLoading(isLoading) {
    document.getElementById("chartSkeleton").classList.toggle("active", isLoading);
    document.getElementById("chartContainer").style.display = isLoading ? "none" : "block";
  }

  function showSignalLoading(isLoading) {
    document.getElementById("signalSkeleton").classList.toggle("active", isLoading);
    document.getElementById("signalCardContent").style.display = isLoading ? "none" : "flex";
  }

  async function loadMarket(userTriggered) {
    if (state.fetchInFlight) return; // prevent parallel/duplicate requests
    state.fetchInFlight = true;
    if (userTriggered) { showChartLoading(true); showSignalLoading(true); }

    try {
      const body = await fetchMarket(state.symbol, state.interval);
      const candles = body.values || [];
      state.candles = candles;
      state.lastFetchAt = Date.now();

      if (candles.length) {
        evaluatePendingHistory(state.symbol, candles[candles.length - 1].close);
        renderMarketCard(candles, state.symbol);
        const computed = computeSignal(candles);
        renderChart(candles, computed);
        renderSignalCard(computed, state.symbol, state.interval);
        document.getElementById("rsiValue").textContent = computed ? computed.rsi.toFixed(1) : "--";
      }
    } catch (err) {
      if (err.message !== "rate_limited") {
        showToast(t("marketUnavailable"), "wait");
      }
      if (!state.candles.length) {
        renderSignalCard(null, state.symbol, state.interval);
      }
    } finally {
      state.fetchInFlight = false;
      showChartLoading(false);
      showSignalLoading(false);
    }
  }

  function scheduleRefresh() {
    if (state.refreshHandle) clearInterval(state.refreshHandle);
    state.refreshHandle = setInterval(() => {
      if (state.settings.autoRefresh) loadMarket(false);
    }, REFRESH_INTERVAL_MS);
  }

  /* ------------------------------------------------------------------------
     17. EVENT WIRING
     ------------------------------------------------------------------------ */

  function wireEvents() {
    // Nav (desktop + mobile)
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchView(btn.dataset.view);
        document.getElementById("mobileNav").classList.remove("open");
        if (btn.dataset.scroll) {
          setTimeout(() => document.getElementById(btn.dataset.scroll).scrollIntoView({ behavior: "smooth" }), 60);
        }
      });
    });

    document.getElementById("hamburgerBtn").addEventListener("click", () => {
      document.getElementById("mobileNav").classList.toggle("open");
    });

    // Symbol select
    document.getElementById("symbolSelect").addEventListener("change", (e) => {
      state.symbol = e.target.value;
      updateFavButton();
      loadMarket(true);
    });

    // Favorites
    document.getElementById("favBtn").addEventListener("click", () => {
      if (state.favorites.has(state.symbol)) state.favorites.delete(state.symbol);
      else state.favorites.add(state.symbol);
      saveFavorites();
      updateFavButton();
    });

    // Timeframe
    document.getElementById("timeframeGroup").addEventListener("click", (e) => {
      const btn = e.target.closest(".tf-btn");
      if (!btn || btn.disabled) return;
      document.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.interval = btn.dataset.tf;
      loadMarket(true);
    });

    // Indicator toggles (chart chips)
    document.getElementById("indicatorToggles").addEventListener("click", (e) => {
      const chip = e.target.closest(".ind-chip");
      if (!chip) return;
      const ind = chip.dataset.ind;
      state.settings.indicators[ind] = !state.settings.indicators[ind];
      chip.classList.toggle("active", state.settings.indicators[ind]);
      const settingCheckbox = document.querySelector(`.setting-ind[data-ind="${ind}"]`);
      if (settingCheckbox) settingCheckbox.checked = state.settings.indicators[ind];
      saveSettings();
      applyIndicatorVisibility();
    });

    // Analyze now
    document.getElementById("analyzeBtn").addEventListener("click", () => loadMarket(true));

    // Timer
    document.getElementById("timerOptions").addEventListener("click", (e) => {
      const btn = e.target.closest(".timer-btn");
      if (!btn) return;
      document.querySelectorAll(".timer-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      startTimer(parseInt(btn.dataset.min, 10));
    });

    // Scanner
    document.getElementById("scanNowBtn").addEventListener("click", runScanner);
    document.getElementById("strongOnlyToggle").addEventListener("change", renderScanner);
    document.getElementById("scannerSort").addEventListener("change", renderScanner);

    // History filters
    document.getElementById("historyFilter").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-btn");
      if (!btn) return;
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      historyFilter = btn.dataset.filter;
      renderHistoryTable();
    });
    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
      if (!confirm("Clear all signal history? / مسح كل سجل الإشارات؟")) return;
      state.history = [];
      saveHistory();
      renderHistoryTable();
      renderStats();
    });

    // Settings
    document.querySelectorAll(".setting-ind").forEach((cb) => {
      cb.addEventListener("change", () => {
        state.settings.indicators[cb.dataset.ind] = cb.checked;
        const chip = document.querySelector(`.ind-chip[data-ind="${cb.dataset.ind}"]`);
        if (chip) chip.classList.toggle("active", cb.checked);
        saveSettings();
        applyIndicatorVisibility();
      });
    });
    document.getElementById("settingAutoRefresh").addEventListener("change", (e) => {
      state.settings.autoRefresh = e.target.checked;
      saveSettings();
    });
    document.getElementById("settingSound").addEventListener("change", (e) => {
      state.settings.sound = e.target.checked;
      saveSettings();
    });
    document.getElementById("settingThreshold").addEventListener("input", (e) => {
      state.settings.threshold = parseInt(e.target.value, 10);
      document.getElementById("thresholdValue").textContent = state.settings.threshold;
      saveSettings();
    });
    document.getElementById("settingChartTheme").addEventListener("change", (e) => {
      state.settings.chartTheme = e.target.value;
      saveSettings();
    });
    document.getElementById("settingCandleStyle").addEventListener("change", (e) => {
      state.settings.candleStyle = e.target.value;
      saveSettings();
    });
    document.getElementById("settingLanguage").addEventListener("change", (e) => {
      state.lang = e.target.value;
      state.settings.language = e.target.value;
      saveSettings();
      applyI18n();
      renderHistoryTable();
      renderStats();
      renderScanner();
      updateFavButton();
      renderSignalCard(state.candles.length ? computeSignal(state.candles) : null, state.symbol, state.interval);
    });
  }

  function applySettingsToUI() {
    document.getElementById("settingChartTheme").value = state.settings.chartTheme;
    document.getElementById("settingCandleStyle").value = state.settings.candleStyle;
    document.getElementById("settingAutoRefresh").checked = state.settings.autoRefresh;
    document.getElementById("settingSound").checked = state.settings.sound;
    document.getElementById("settingThreshold").value = state.settings.threshold;
    document.getElementById("thresholdValue").textContent = state.settings.threshold;
    document.getElementById("settingLanguage").value = state.settings.language;
    Object.entries(state.settings.indicators).forEach(([key, val]) => {
      const cb = document.querySelector(`.setting-ind[data-ind="${key}"]`);
      if (cb) cb.checked = val;
      const chip = document.querySelector(`.ind-chip[data-ind="${key}"]`);
      if (chip) chip.classList.toggle("active", val);
    });
  }

  /* ------------------------------------------------------------------------
     18. INIT
     ------------------------------------------------------------------------ */

  function init() {
    state.lang = state.settings.language || "ar";
    applyI18n();
    populateSymbolSelect();
    updateFavButton();
    setupSearch();
    applySettingsToUI();
    wireEvents();
    initCharts();
    startTimer(1);
    renderHistoryTable();
    renderStats();
    loadMarket(true);
    scheduleRefresh();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
