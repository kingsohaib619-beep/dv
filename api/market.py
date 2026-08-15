"""
Dark Venus Signal Pro - Market Data API
----------------------------------------
Serverless function (Vercel Python runtime) that proxies and caches
requests to the Twelve Data API. The API key is read exclusively from
the server-side environment variable TWELVE_DATA_API_KEY and is never
exposed to the frontend.

Endpoint:
    GET /api/market?symbol=XAU/USD&interval=5min&outputsize=150

Response:
    {
      "meta": {"symbol": "...", "interval": "..."},
      "values": [{"datetime": "...", "open": "...", "high": "...", "low": "...", "close": "..."}],
      "cached": false,
      "cache_age": 0
    }
"""

import os
import json
import time
import urllib.request
import urllib.parse
import urllib.error
from http.server import BaseHTTPRequestHandler

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

TWELVE_DATA_BASE_URL = "https://api.twelvedata.com/time_series"

CACHE_TTL = 60          # seconds - data considered "fresh"
STALE_TTL = 300         # seconds - data still usable if fresh fetch fails
RATE_LIMIT_COOLDOWN = 30  # seconds - pause new upstream calls after a 429
REQUEST_TIMEOUT = 8     # seconds - upstream HTTP timeout

ALLOWED_INTERVALS = {"1min", "5min", "15min", "30min", "1h"}

ALLOWED_SYMBOLS = {
    # Forex
    "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "NZD/USD",
    "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD",
    "EUR/CAD", "GBP/CAD", "CHF/JPY",
    # Metals
    "XAU/USD", "XAG/USD",
    # Crypto
    "BTC/USD", "ETH/USD",
}

DEFAULT_OUTPUT_SIZE = 150
MAX_OUTPUT_SIZE = 500

# --------------------------------------------------------------------------
# In-process cache
# --------------------------------------------------------------------------
# NOTE: Vercel serverless functions are stateless between cold starts.
# This in-memory cache only persists across invocations that reuse a
# "warm" instance. It reduces upstream calls and provides a stale
# fallback during that window, but it is not a durable cache. For a
# high-traffic deployment, back this with Redis / Vercel KV instead.

_cache = {}          # key -> {"data": dict, "timestamp": float}
_inflight = {}        # key -> float (timestamp the request started, guards duplicate concurrent fetches)
_rate_limited_until = 0.0  # epoch seconds; while > now(), skip upstream calls


def _cache_key(symbol: str, interval: str, outputsize: int) -> str:
    return f"{symbol}|{interval}|{outputsize}"


def _get_cached(key: str):
    entry = _cache.get(key)
    if not entry:
        return None
    age = time.time() - entry["timestamp"]
    return entry["data"], age


def _set_cached(key: str, data: dict):
    _cache[key] = {"data": data, "timestamp": time.time()}


# --------------------------------------------------------------------------
# Validation helpers
# --------------------------------------------------------------------------

def _validate_symbol(raw: str) -> str:
    if not raw:
        raise ValueError("Missing required parameter: symbol")
    symbol = urllib.parse.unquote(raw).strip().upper()
    if symbol not in ALLOWED_SYMBOLS:
        raise ValueError(f"Unsupported symbol: {symbol}")
    return symbol


def _validate_interval(raw: str) -> str:
    interval = (raw or "5min").strip().lower()
    if interval not in ALLOWED_INTERVALS:
        raise ValueError(f"Unsupported interval: {interval}")
    return interval


def _validate_outputsize(raw: str) -> int:
    if not raw:
        return DEFAULT_OUTPUT_SIZE
    try:
        size = int(raw)
    except (TypeError, ValueError):
        raise ValueError("outputsize must be an integer")
    if size < 10 or size > MAX_OUTPUT_SIZE:
        raise ValueError(f"outputsize must be between 10 and {MAX_OUTPUT_SIZE}")
    return size


# --------------------------------------------------------------------------
# Upstream fetch + normalization
# --------------------------------------------------------------------------

def _fetch_twelve_data(symbol: str, interval: str, outputsize: int) -> dict:
    api_key = os.environ.get("TWELVE_DATA_API_KEY")
    if not api_key:
        raise RuntimeError("Server is not configured: TWELVE_DATA_API_KEY is missing")

    params = {
        "symbol": symbol,
        "interval": interval,
        "outputsize": str(outputsize),
        "apikey": api_key,
        "format": "JSON",
    }
    url = f"{TWELVE_DATA_BASE_URL}?{urllib.parse.urlencode(params)}"

    request = urllib.request.Request(url, headers={"User-Agent": "DarkVenusSignalPro/1.0"})

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            status = response.getcode()
            raw = response.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            raise RateLimitError("Twelve Data rate limit reached") from exc
        raise RuntimeError(f"Upstream HTTP error: {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Upstream connection error: {exc.reason}") from exc
    except TimeoutError as exc:
        raise RuntimeError("Upstream request timed out") from exc

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise RuntimeError("Upstream returned malformed data") from exc

    # Twelve Data reports errors inside a 200 response body as well.
    if isinstance(payload, dict) and payload.get("status") == "error":
        message = str(payload.get("message", "Unknown upstream error"))
        if "run out of API credits" in message.lower() or "limit" in message.lower():
            raise RateLimitError(message)
        raise RuntimeError(message)

    return _normalize_payload(payload, symbol, interval)


def _normalize_payload(payload: dict, symbol: str, interval: str) -> dict:
    """Defensively normalize Twelve Data's response into a stable shape.
    Never raises on malformed individual candles - it simply skips them."""
    raw_values = payload.get("values") if isinstance(payload, dict) else None
    normalized = []

    if isinstance(raw_values, list):
        for item in raw_values:
            if not isinstance(item, dict):
                continue
            try:
                candle = {
                    "datetime": str(item.get("datetime", "")),
                    "open": float(item.get("open")),
                    "high": float(item.get("high")),
                    "low": float(item.get("low")),
                    "close": float(item.get("close")),
                }
            except (TypeError, ValueError):
                # Skip malformed candle rather than crashing the whole response
                continue
            if not candle["datetime"]:
                continue
            normalized.append(candle)

    # Twelve Data returns newest-first; keep chronological order (oldest -> newest)
    normalized.sort(key=lambda c: c["datetime"])

    return {
        "meta": {"symbol": symbol, "interval": interval},
        "values": normalized,
    }


class RateLimitError(Exception):
    pass


# --------------------------------------------------------------------------
# Core handler logic (framework-agnostic so it's easy to test)
# --------------------------------------------------------------------------

def get_market_data(query_params: dict) -> tuple:
    """Returns (status_code, response_dict)."""
    global _rate_limited_until

    try:
        symbol = _validate_symbol(query_params.get("symbol", [None])[0])
        interval = _validate_interval(query_params.get("interval", [None])[0])
        outputsize = _validate_outputsize(query_params.get("outputsize", [None])[0])
    except ValueError as exc:
        return 400, {"error": str(exc)}

    key = _cache_key(symbol, interval, outputsize)
    cached = _get_cached(key)

    # Serve fresh cache immediately, no upstream call needed.
    if cached:
        data, age = cached
        if age <= CACHE_TTL:
            return 200, {**data, "cached": True, "cache_age": round(age)}

    now = time.time()

    # If we recently hit a rate limit, avoid hammering the upstream API.
    if now < _rate_limited_until:
        if cached:
            data, age = cached
            if age <= STALE_TTL:
                return 200, {
                    **data,
                    "cached": True,
                    "cache_age": round(age),
                    "notice": "Market data temporarily rate-limited. Using the latest available data.",
                }
        return 429, {"error": "Market data temporarily rate-limited. Using the latest available data."}

    # Guard against duplicate simultaneous requests for the same key.
    inflight_started = _inflight.get(key)
    if inflight_started and (now - inflight_started) < REQUEST_TIMEOUT:
        if cached:
            data, age = cached
            if age <= STALE_TTL:
                return 200, {**data, "cached": True, "cache_age": round(age)}
        return 202, {"error": "Request already in progress, please retry shortly."}

    _inflight[key] = now
    try:
        fresh_data = _fetch_twelve_data(symbol, interval, outputsize)
        _set_cached(key, fresh_data)
        return 200, {**fresh_data, "cached": False, "cache_age": 0}
    except RateLimitError:
        _rate_limited_until = time.time() + RATE_LIMIT_COOLDOWN
        if cached:
            data, age = cached
            if age <= STALE_TTL:
                return 200, {
                    **data,
                    "cached": True,
                    "cache_age": round(age),
                    "notice": "Market data temporarily rate-limited. Using the latest available data.",
                }
        return 429, {"error": "Market data temporarily rate-limited. Using the latest available data."}
    except RuntimeError as exc:
        # Never expose internal exception details to the client.
        if cached:
            data, age = cached
            if age <= STALE_TTL:
                return 200, {
                    **data,
                    "cached": True,
                    "cache_age": round(age),
                    "notice": "Showing latest cached market data.",
                }
        return 502, {"error": "Market data temporarily unavailable.", "detail": _safe_detail(exc)}
    except Exception:
        # Catch-all so the function never crashes on unexpected upstream shapes.
        if cached:
            data, age = cached
            if age <= STALE_TTL:
                return 200, {**data, "cached": True, "cache_age": round(age)}
        return 500, {"error": "Market data temporarily unavailable."}
    finally:
        _inflight.pop(key, None)


def _safe_detail(exc: Exception) -> str:
    """Only surface a short, safe error category — never raw tracebacks or
    internal paths/keys."""
    message = str(exc)
    if "TWELVE_DATA_API_KEY" in message:
        return "Server configuration error."
    if "timed out" in message.lower():
        return "Upstream timeout."
    if "HTTP error" in message:
        return "Upstream service error."
    return "Upstream error."


# --------------------------------------------------------------------------
# Vercel Python runtime entrypoint
# --------------------------------------------------------------------------

class handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, body: dict):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            query_params = urllib.parse.parse_qs(parsed.query)
            status, body = get_market_data(query_params)
            self._send_json(status, body)
        except Exception:
            # Absolute last-resort safety net: never crash, never leak internals.
            self._send_json(500, {"error": "Internal server error."})
