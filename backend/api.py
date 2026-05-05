from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

import yfinance as yf
import subprocess
import json
import os
import numpy as np
import httpx
import asyncio
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

yf.set_tz_cache_location("cache")

CORE_DIR = os.path.join(os.path.dirname(__file__), '..', 'core')

def run_cpp(exe: str, input_str: str) -> dict:
    path = os.path.join(CORE_DIR, exe)
    result = subprocess.run([path], input=input_str, capture_output=True, text=True)
    if result.stdout:
        return json.loads(result.stdout)
    return {}

# ─────────────────────────────────────────────
# MARKET DATA
# ─────────────────────────────────────────────

@app.get("/ticker")
def get_ticker(sym: str):
    try:
        t = yf.Ticker(sym)
        hist = t.history(period="5d", interval="1d")
        if len(hist) < 2:
            return None
        price = round(float(hist["Close"].iloc[-1]), 2)
        prev  = round(float(hist["Close"].iloc[-2]), 2)
        chg   = round((price - prev) / prev * 100, 2)
        return {"sym": sym.upper(), "price": price, "chg": chg}
    except Exception as e:
        print(f"Erreur ticker {sym}: {e}")
        return None

@app.get("/history")
def get_history(sym: str, tf: str):
    periods = {
        '1m':  ('1d',   '1m'),
        '5m':  ('5d',   '5m'),
        '1h':  ('1mo',  '1h'),
        '1D':  ('1y',   '1d'),
        '1W':  ('5y',   '1wk'),
        '1M':  ('1y',   '1mo'),
        '3M':  ('3y',   '1mo'),
        '6M':  ('10y',  '1mo'),
        '1Y':  ('10y',  '1wk'),
        '5Y':  ('max',  '1wk'),
        'MAX': ('max',  '1mo'),
    }
    period, interval = periods.get(tf, ('1y', '1d'))
    try:
        t = yf.Ticker(sym)
        hist = t.history(period=period, interval=interval)
        return [
            {
                "time":  int(idx.timestamp()),
                "open":  round(float(row["Open"]),  2),
                "high":  round(float(row["High"]),  2),
                "low":   round(float(row["Low"]),   2),
                "close": round(float(row["Close"]), 2),
            }
            for idx, row in hist.iterrows()
        ]
    except Exception as e:
        print(f"Erreur history {sym}: {e}")
        return []

@app.get("/prices")
def get_prices():
    tickers = [
        "AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","JPM",
        "V","XOM","PG","KO","SPY","QQQ","GLD",
        "BTC-USD","ETH-USD","GC=F","CL=F","EURUSD=X"
    ]
    result = []
    for sym in tickers:
        try:
            t = yf.Ticker(sym)
            hist = t.history(period="5d", interval="1d")
            if len(hist) >= 2:
                price = round(float(hist["Close"].iloc[-1]), 2)
                prev  = round(float(hist["Close"].iloc[-2]), 2)
                chg   = round((price - prev) / prev * 100, 2)
                clean = sym.replace("-USD","").replace("=F","").replace("=X","")
                result.append({"sym": clean, "price": price, "chg": chg})
        except:
            continue
    return result

@app.get("/price_at_date")
def price_at_date(sym: str, date: str):
    try:
        d   = datetime.strptime(date, "%Y-%m-%d")
        end = (d + timedelta(days=7)).strftime("%Y-%m-%d")
        t   = yf.Ticker(sym)
        hist = t.history(start=date, end=end, interval="1d")
        if len(hist) == 0:
            return None
        price = round(float(hist["Close"].iloc[0]), 2)
        actual_date = hist.index[0].strftime("%Y-%m-%d")
        return {"sym": sym.upper(), "price": price, "date": actual_date}
    except Exception as e:
        print(f"Erreur price_at_date {sym}: {e}")
        return None

# ─────────────────────────────────────────────
# FUNDAMENTALS & STATS
# ─────────────────────────────────────────────

@app.get("/news")
def get_news(sym: str):
    try:
        t = yf.Ticker(sym)
        result = []
        for item in t.news[:10]:
            result.append({
                "title":  item.get("content", {}).get("title", ""),
                "source": item.get("content", {}).get("provider", {}).get("displayName", ""),
                "url":    item.get("content", {}).get("canonicalUrl", {}).get("url", ""),
                "time":   item.get("content", {}).get("pubDate", ""),
            })
        return result
    except Exception as e:
        print(f"Erreur news {sym}: {e}")
        return []

@app.get("/fundamentals")
def get_fundamentals(sym: str):
    try:
        info = yf.Ticker(sym).info
        return {
            "market_cap":  info.get("marketCap"),
            "pe_ratio":    info.get("trailingPE"),
            "eps":         info.get("trailingEps"),
            "div_yield":   info.get("dividendYield"),
            "week52_high": info.get("fiftyTwoWeekHigh"),
            "week52_low":  info.get("fiftyTwoWeekLow"),
            "volume":      info.get("volume"),
            "avg_volume":  info.get("averageVolume"),
            "beta":        info.get("beta"),
            "sector":      info.get("sector"),
        }
    except Exception as e:
        print(f"Erreur fundamentals {sym}: {e}")
        return {}

@app.get("/statistics")
def get_statistics(sym: str):
    try:
        info = yf.Ticker(sym).info
        return {
            "open":       info.get("open"),
            "high":       info.get("dayHigh"),
            "low":        info.get("dayLow"),
            "prev_close": info.get("previousClose"),
            "avg_50":     info.get("fiftyDayAverage"),
            "avg_200":    info.get("twoHundredDayAverage"),
        }
    except Exception as e:
        print(f"Erreur statistics {sym}: {e}")
        return {}

# ─────────────────────────────────────────────
# C++ ENGINES
# ─────────────────────────────────────────────

@app.get("/indicators")
def get_indicators(sym: str, tf: str = "1D"):
    periods = {
        '1m':  ('1d',   '1m'),
        '5m':  ('5d',   '5m'),
        '1h':  ('1mo',  '1h'),
        '1D':  ('1y',   '1d'),
        '1W':  ('5y',   '1wk'),
        '1M':  ('10y',  '1mo'),
        '3M':  ('3y',   '1mo'),
        '6M':  ('10y',  '1mo'),
        '1Y':  ('10y',  '1wk'),
        '5Y':  ('max',  '1wk'),
        'MAX': ('max',  '1mo'),
    }
    period, interval = periods.get(tf, ('1y', '1d'))
    try:
        t    = yf.Ticker(sym)
        hist = t.history(period=period, interval=interval)
        closes = [round(float(x), 2) for x in hist["Close"].tolist()]
        highs  = [round(float(x), 2) for x in hist["High"].tolist()]
        lows   = [round(float(x), 2) for x in hist["Low"].tolist()]
        times  = [int(idx.timestamp()) for idx in hist.index]
        input_str  = "\n".join(f"{c} {h} {l}" for c,h,l in zip(closes,highs,lows))
        indicators = run_cpp("indicators.exe", input_str)
        indicators["times"]  = times
        indicators["closes"] = closes
        return indicators
    except Exception as e:
        print(f"Erreur indicators {sym}: {e}")
        return {}

@app.get("/risk")
def get_risk(syms: str):
    try:
        sym_list  = syms.split(",")
        spy_hist  = yf.Ticker("SPY").history(period="1y", interval="1d")
        spy_prices = [round(float(x), 4) for x in spy_hist["Close"].tolist()]
        input_lines = [" ".join(map(str, spy_prices))]
        for sym in sym_list:
            hist = yf.Ticker(sym.strip()).history(period="1y", interval="1d")
            if len(hist) == 0:
                continue
            prices = [round(float(x), 4) for x in hist["Close"].tolist()]
            input_lines.append(f"{sym.strip()} " + " ".join(map(str, prices)))
        return run_cpp("risk.exe", "\n".join(input_lines))
    except Exception as e:
        print(f"Erreur risk: {e}")
        return {}

# ─────────────────────────────────────────────
# AI ANALYSIS
# ─────────────────────────────────────────────

@app.get("/ai_analysis")
def ai_analysis(sym: str):
    try:
        t    = yf.Ticker(sym)
        info = t.info

        fundamentals = {
            "pe_ratio":       info.get("trailingPE"),
            "eps":            info.get("trailingEps"),
            "market_cap":     info.get("marketCap"),
            "beta":           info.get("beta"),
            "div_yield":      info.get("dividendYield"),
            "week52_high":    info.get("fiftyTwoWeekHigh"),
            "week52_low":     info.get("fiftyTwoWeekLow"),
            "profit_margin":  info.get("profitMargins"),
            "revenue_growth": info.get("revenueGrowth"),
            "debt_to_equity": info.get("debtToEquity"),
            "roe":            info.get("returnOnEquity"),
            "sector":         info.get("sector"),
            "name":           info.get("longName"),
        }

        hist    = t.history(period="2y", interval="1d")
        closes  = [round(float(x), 4) for x in hist["Close"].tolist()]
        highs   = [round(float(x), 4) for x in hist["High"].tolist()]
        lows    = [round(float(x), 4) for x in hist["Low"].tolist()]
        volumes = [round(float(x), 0) for x in hist["Volume"].tolist()]

        input_str  = "\n".join(f"{c} {h} {l}" for c,h,l in zip(closes,highs,lows))
        indicators = run_cpp("indicators.exe", input_str)

        def last_valid(arr):
            for v in reversed(arr):
                if v is not None: return round(v, 4)
            return None

        tech = {
            "rsi":           last_valid(indicators.get("rsi", [])),
            "macd_line":     last_valid(indicators.get("macd_line", [])),
            "macd_signal":   last_valid(indicators.get("macd_signal", [])),
            "macd_hist":     last_valid(indicators.get("macd_hist", [])),
            "bb_upper":      last_valid(indicators.get("bb_upper", [])),
            "bb_middle":     last_valid(indicators.get("bb_middle", [])),
            "bb_lower":      last_valid(indicators.get("bb_lower", [])),
            "sma20":         last_valid(indicators.get("sma20", [])),
            "sma50":         last_valid(indicators.get("sma50", [])),
            "sma200":        last_valid(indicators.get("sma200", [])),
            "atr":           last_valid(indicators.get("atr", [])),
            "current_price": closes[-1] if closes else None,
        }

        zscore = 0
        if len(closes) >= 20:
            recent = closes[-20:]
            mean_p = np.mean(recent)
            std_p  = np.std(recent)
            zscore = round((closes[-1] - mean_p) / std_p, 4) if std_p > 0 else 0

        momentum = {}
        if len(closes) >= 252:
            momentum["1m"]  = round((closes[-1] - closes[-21])  / closes[-21]  * 100, 2)
            momentum["3m"]  = round((closes[-1] - closes[-63])  / closes[-63]  * 100, 2)
            momentum["6m"]  = round((closes[-1] - closes[-126]) / closes[-126] * 100, 2)
            momentum["12m"] = round((closes[-1] - closes[-252]) / closes[-252] * 100, 2)

        spy_closes  = [round(float(x), 4) for x in yf.Ticker("SPY").history(period="1y", interval="1d")["Close"].tolist()]
        risk_input  = " ".join(map(str, spy_closes)) + "\n"
        risk_input += f"{sym} " + " ".join(map(str, closes[-len(spy_closes):]))
        risk        = run_cpp("risk.exe", risk_input)

        news_items = []
        try:
            for item in t.news[:8]:
                title = item.get("content", {}).get("title", "")
                if title: news_items.append(title)
        except:
            pass

        avg_vol   = round(np.mean(volumes[-20:]), 0) if len(volumes) >= 20 else None
        curr_vol  = volumes[-1] if volumes else None
        vol_ratio = round(curr_vol / avg_vol, 2) if avg_vol and curr_vol else None

        return {
            "sym":          sym.upper(),
            "fundamentals": fundamentals,
            "technical":    tech,
            "zscore":       zscore,
            "momentum":     momentum,
            "risk":         risk,
            "news":         news_items,
            "volume_ratio": vol_ratio,
        }

    except Exception as e:
        print(f"Erreur ai_analysis {sym}: {e}")
        import traceback; traceback.print_exc()
        return {}

from ml_engine import train_and_predict, sentiment_score as get_sentiment
from scoring   import score_technical, score_fundamental, score_risk, score_momentum, compute_final_score

@app.get("/full_analysis")
async def full_analysis(sym: str):
    try:
        loop = asyncio.get_event_loop()

        print(f"[1/5] Fetching data for {sym}...")
        ai_data = ai_analysis(sym)
        if not ai_data:
            return {"error": "Données introuvables"}

        print(f"[2/5] Training Random Forest...")
        ml_result = await loop.run_in_executor(None, train_and_predict, sym)

        print(f"[3/5] Running FinBERT sentiment...")
        sentiment = await loop.run_in_executor(None, get_sentiment, ai_data.get("news", []))

        print(f"[4/5] Computing scores...")
        tech_s     = score_technical(ai_data.get("technical", {}))
        fund_s     = score_fundamental(ai_data.get("fundamentals", {}))
        risk_s     = score_risk(ai_data.get("risk", {}))
        momentum_s = score_momentum(ai_data.get("momentum", {}), ai_data.get("zscore", 0))
        ml_score   = round(ml_result["prob_up"] * 100) if ml_result else 50
        sent_score = round(sentiment["score"] * 100)

        final = compute_final_score(
            tech_score=tech_s["score"],
            fund_score=fund_s["score"],
            ml_score=ml_score,
            sentiment_score=sent_score,
            risk_score=risk_s["score"],
            momentum_score=momentum_s["score"],
        )

        print(f"[5/5] Done. Score: {final['final']}/100 — {final['signal']}")

        return {
            "sym":         sym.upper(),
            "name":        ai_data.get("fundamentals", {}).get("name", sym),
            "price":       ai_data.get("technical", {}).get("current_price"),
            "score":       final,
            "technical":   tech_s,
            "fundamental": fund_s,
            "risk":        risk_s,
            "momentum":    momentum_s,
            "ml":          ml_result,
            "sentiment":   sentiment,
            "raw_data":    ai_data,
        }

    except Exception as e:
        print(f"Erreur full_analysis {sym}: {e}")
        import traceback; traceback.print_exc()
        return {"error": str(e)}

@app.get("/claude_analysis")
async def claude_analysis(sym: str):
    try:
        print(f"Starting claude_analysis for {sym}...")
        data = await full_analysis(sym)
        if "error" in data:
            return data

        score    = data["score"]
        tech     = data["technical"]
        fund     = data["fundamental"]
        risk     = data["risk"]
        momentum = data["momentum"]
        ml       = data["ml"]
        sent     = data["sentiment"]
        raw      = data["raw_data"]
        fund_raw = raw.get("fundamentals", {})
        tech_raw = raw.get("technical", {})
        news     = raw.get("news", [])

        prompt = f"""You are a professional quantitative analyst. Analyze {sym} ({data.get('name', sym)}) based on the following data.

=== SCORES (0-100) ===
Global Score:  {score['final']}/100
Signal:        {score['signal']}
Technical:     {tech['score']}/100
Fundamental:   {fund['score']}/100
ML Prob Up:    {ml['prob_up']*100 if ml else 50:.1f}%
Sentiment:     {sent['score']*100:.1f}/100 ({sent['label']})
Risk:          {risk['score']}/100
Momentum:      {momentum['score']}/100

=== TECHNICAL ===
RSI: {tech_raw.get('rsi', 'N/A')}
MACD Hist: {tech_raw.get('macd_hist', 'N/A')}
Z-Score: {raw.get('zscore', 'N/A')}
MA Cross: {tech.get('details', {}).get('cross', {}).get('type', 'none')}

=== FUNDAMENTALS ===
P/E: {fund_raw.get('pe_ratio', 'N/A')}
EPS: {fund_raw.get('eps', 'N/A')}
Revenue Growth: {fund_raw.get('revenue_growth', 'N/A')}
ROE: {fund_raw.get('roe', 'N/A')}
Debt/Equity: {fund_raw.get('debt_to_equity', 'N/A')}
Profit Margin: {fund_raw.get('profit_margin', 'N/A')}
Beta: {fund_raw.get('beta', 'N/A')}
Sector: {fund_raw.get('sector', 'N/A')}

=== RISK ===
Sharpe: {raw.get('risk', {}).get('sharpe', 'N/A')}
Max DD: {raw.get('risk', {}).get('max_dd', 'N/A')}%
Vol: {raw.get('risk', {}).get('vol', 'N/A')}%
VaR 95%: {raw.get('risk', {}).get('var95', 'N/A')}%

=== MOMENTUM ===
1M: {raw.get('momentum', {}).get('1m', 'N/A')}%
3M: {raw.get('momentum', {}).get('3m', 'N/A')}%
6M: {raw.get('momentum', {}).get('6m', 'N/A')}%
12M: {raw.get('momentum', {}).get('12m', 'N/A')}%

=== ML MODEL ===
RF Accuracy: {ml['accuracy']*100 if ml else 'N/A':.1f}%
Top Features: {list(ml['importance'].items())[:3] if ml else 'N/A'}

=== NEWS ===
{chr(10).join(f"- {n}" for n in news[:5])}

Respond ONLY with valid JSON (no markdown, no backticks):
{{
  "thesis": "3-4 sentence investment thesis",
  "bull_case": ["point 1", "point 2", "point 3"],
  "bear_case": ["risk 1", "risk 2", "risk 3"],
  "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
  "price_target": <number or null>,
  "stop_loss": <number or null>,
  "time_horizon": "short/medium/long term",
  "conviction": "low/medium/high"
}}"""

        print("Calling Claude API...")
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-sonnet-4-5",
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
            claude_data = response.json()
            print("Claude full response:", json.dumps(claude_data, indent=2))
            text = claude_data["content"][0]["text"]
            claude_json = json.loads(text.replace("```json","").replace("```","").strip())

        return {**data, "claude": claude_json}

    except Exception as e:
        print(f"Erreur claude_analysis {sym}: {e}")
        import traceback; traceback.print_exc()
        return {"error": str(e)}

@app.get("/news_feed")
async def news_feed():
    try:
        loop = asyncio.get_event_loop()
        
        tickers = {
            "Tech":    ["AAPL","MSFT","NVDA","GOOGL","META"],
            "Finance": ["JPM","GS","BAC","MS","V"],
            "Macro":   ["SPY","QQQ","TLT","GLD","DXY"],
            "Crypto":  ["BTC-USD","ETH-USD","SOL-USD"],
        }

        all_news = []
        seen_titles = set()

        for sector, syms in tickers.items():
            for sym in syms:
                try:
                    t = yf.Ticker(sym)
                    for item in t.news[:3]:
                        title = item.get("content", {}).get("title", "")
                        if not title or title in seen_titles:
                            continue
                        seen_titles.add(title)
                        all_news.append({
                            "title":   title,
                            "source":  item.get("content", {}).get("provider", {}).get("displayName", ""),
                            "url":     item.get("content", {}).get("canonicalUrl", {}).get("url", ""),
                            "time":    item.get("content", {}).get("pubDate", ""),
                            "sector":  sector,
                            "ticker":  sym,
                        })
                except:
                    continue

        # Sentiment sur chaque news
        sentiment = await loop.run_in_executor(
            None,
            get_sentiment,
            [n["title"] for n in all_news[:20]]
        )

        for i, news in enumerate(all_news[:20]):
            score = sentiment["details"][i] if i < len(sentiment["details"]) else 0
            news["sentiment"] = "bullish" if score > 0.1 else "bearish" if score < -0.1 else "neutral"
            news["sentiment_score"] = round(score, 3)

        # Trie par date
        all_news.sort(key=lambda x: x.get("time", ""), reverse=True)
        return all_news

    except Exception as e:
        print(f"Erreur news_feed: {e}")
        return []
    
@app.get("/yield_curve")
def yield_curve():
    try:
        maturities = {
            '1M': '^IRX', '3M': '^IRX', '6M': '^FVX',
            '1Y': '^FVX', '2Y': '^FVX', '5Y': '^FVX',
            '10Y': '^TNX', '30Y': '^TYX'
        }
        tickers_map = {
            '3M': 'BIL', '6M': 'BIL',
            '1Y': 'SHY', '2Y': 'SHY',
            '5Y': 'IEF', '10Y': '^TNX', '30Y': '^TYX'
        }
        result = []
        yields_data = {
            '3M':  yf.Ticker('^IRX').history(period='1d')['Close'].iloc[-1] if len(yf.Ticker('^IRX').history(period='1d')) > 0 else 0,
            '2Y':  yf.Ticker('^IRX').history(period='1d')['Close'].iloc[-1] if len(yf.Ticker('^IRX').history(period='1d')) > 0 else 0,
            '5Y':  yf.Ticker('^FVX').history(period='1d')['Close'].iloc[-1] if len(yf.Ticker('^FVX').history(period='1d')) > 0 else 0,
            '10Y': yf.Ticker('^TNX').history(period='1d')['Close'].iloc[-1] if len(yf.Ticker('^TNX').history(period='1d')) > 0 else 0,
            '30Y': yf.Ticker('^TYX').history(period='1d')['Close'].iloc[-1] if len(yf.Ticker('^TYX').history(period='1d')) > 0 else 0,
        }
        for mat, yld in yields_data.items():
            result.append({"maturity": mat, "yield": round(float(yld), 2)})
        return result
    except Exception as e:
        print(f"Erreur yield_curve: {e}")
        return []

@app.get("/macro_dashboard")
def macro_dashboard():
    try:
        vix = yf.Ticker('^VIX').history(period='1d')
        dxy = yf.Ticker('DX-Y.NYB').history(period='1d')
        tnx = yf.Ticker('^TNX').history(period='1d')
        irx = yf.Ticker('^IRX').history(period='1d')

        vix_val  = round(float(vix['Close'].iloc[-1]), 2)  if len(vix)  > 0 else 'N/A'
        dxy_val  = round(float(dxy['Close'].iloc[-1]), 2)  if len(dxy)  > 0 else 'N/A'
        tnx_val  = round(float(tnx['Close'].iloc[-1]), 2)  if len(tnx)  > 0 else 'N/A'
        irx_val  = round(float(irx['Close'].iloc[-1]), 2)  if len(irx)  > 0 else 'N/A'
        spread   = round(tnx_val - irx_val, 2) if isinstance(tnx_val, float) and isinstance(irx_val, float) else 'N/A'

        return {
            "fed_rate":       5.25,
            "ecb_rate":       4.50,
            "boe_rate":       5.25,
            "boj_rate":       0.10,
            "next_fomc":      "07 Mai",
            "next_ecb":       "06 Jun",
            "cpi_us":         3.2,
            "core_cpi":       3.8,
            "pce":            2.7,
            "unemployment":   3.9,
            "nfp":            "+275K Mar",
            "sahm_rule":      "0.26%",
            "vix":            vix_val,
            "spread_10y_2y":  spread,
            "dxy":            dxy_val,
            "tnx":            tnx_val,
        }
    except Exception as e:
        print(f"Erreur macro_dashboard: {e}")
        return {}
@app.get("/vix")
def get_vix():
    try:
        vix = yf.Ticker('^VIX')
        hist = vix.history(period="1y", interval="1d")
        
        closes = [round(float(x), 2) for x in hist["Close"].tolist()]
        current = closes[-1]
        high52w = round(max(closes), 2)
        low52w  = round(min(closes), 2)
        avg30d  = round(sum(closes[-30:]) / 30, 2)

        if current < 15:
            signal = "😌 Zone calme"
        elif current < 20:
            signal = "✅ Zone normale"
        elif current < 30:
            signal = "⚠️ Zone vigilance"
        else:
            signal = "🔴 Zone panique"

        history = [
            {"time": int(idx.timestamp()), "close": round(float(row["Close"]), 2)}
            for idx, row in hist.iterrows()
        ]

        return {
            "current":  current,
            "high52w":  high52w,
            "low52w":   low52w,
            "avg30d":   avg30d,
            "signal":   signal,
            "history":  history,
        }
    except Exception as e:
        print(f"Erreur vix: {e}")
        return {}
@app.get("/fear_greed")
def fear_greed():
    try:
        # 1. Market Momentum — SPY vs SMA 125j
        spy_hist = yf.Ticker("SPY").history(period="1y", interval="1d")
        spy_closes = [float(x) for x in spy_hist["Close"].tolist()]
        spy_current = spy_closes[-1]
        sma125 = np.mean(spy_closes[-125:])
        momentum_score = min(100, max(0, 50 + (spy_current - sma125) / sma125 * 500))

        # 2. Market Volatility — VIX vs moyenne 50j
        vix_hist = yf.Ticker("^VIX").history(period="1y", interval="1d")
        vix_closes = [float(x) for x in vix_hist["Close"].tolist()]
        vix_current = vix_closes[-1]
        vix_avg50 = np.mean(vix_closes[-50:])
        # VIX élevé = fear, VIX bas = greed
        vol_score = min(100, max(0, 50 - (vix_current - vix_avg50) / vix_avg50 * 200))

        # 3. Safe Haven Demand — SPY vs TLT (bonds)
        tlt_hist = yf.Ticker("TLT").history(period="1mo", interval="1d")
        tlt_closes = [float(x) for x in tlt_hist["Close"].tolist()]
        spy_1m = (spy_closes[-1] - spy_closes[-21]) / spy_closes[-21] * 100
        tlt_1m = (tlt_closes[-1] - tlt_closes[-21]) / tlt_closes[-21] * 100
        # Actions > obligations = greed
        safe_haven_score = min(100, max(0, 50 + (spy_1m - tlt_1m) * 3))

        # 4. Junk Bond Demand — JNK vs LQD spread
        jnk_hist = yf.Ticker("JNK").history(period="1mo", interval="1d")
        lqd_hist = yf.Ticker("LQD").history(period="1mo", interval="1d")
        jnk_closes = [float(x) for x in jnk_hist["Close"].tolist()]
        lqd_closes = [float(x) for x in lqd_hist["Close"].tolist()]
        jnk_perf = (jnk_closes[-1] - jnk_closes[-21]) / jnk_closes[-21] * 100
        lqd_perf = (lqd_closes[-1] - lqd_closes[-21]) / lqd_closes[-21] * 100
        junk_score = min(100, max(0, 50 + (jnk_perf - lqd_perf) * 5))

        # 5. Put/Call Ratio — options SPY
        try:
            spy_ticker = yf.Ticker("SPY")
            exp = spy_ticker.options[0]
            chain = spy_ticker.option_chain(exp)
            put_vol  = chain.puts["volume"].sum()
            call_vol = chain.calls["volume"].sum()
            pc_ratio = put_vol / call_vol if call_vol > 0 else 1
            # PC ratio élevé = fear (beaucoup de puts)
            pc_score = min(100, max(0, 50 - (pc_ratio - 1) * 50))
        except:
            pc_score = 50

        # 6. Stock Strength — 52W Highs vs Lows via QQQ/IWM
        qqq_hist = yf.Ticker("QQQ").history(period="1y", interval="1d")
        qqq_closes = [float(x) for x in qqq_hist["Close"].tolist()]
        qqq_52w_high = max(qqq_closes)
        qqq_52w_low  = min(qqq_closes)
        qqq_current  = qqq_closes[-1]
        strength_score = min(100, max(0, (qqq_current - qqq_52w_low) / (qqq_52w_high - qqq_52w_low) * 100))

        # 7. Market Breadth — SPY vs RSI calculé C++
        input_str = "\n".join(f"{c} {c} {c}" for c in spy_closes)
        core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'indicators.exe')
        result = subprocess.run([core_path], input=input_str, capture_output=True, text=True)
        indicators = json.loads(result.stdout) if result.stdout else {}
        rsi_vals = [v for v in indicators.get("rsi", []) if v is not None]
        rsi_current = rsi_vals[-1] if rsi_vals else 50
        breadth_score = rsi_current  # RSI SPY comme proxy breadth

        # Score final
        scores = {
            "momentum":    round(momentum_score),
            "volatility":  round(vol_score),
            "safe_haven":  round(safe_haven_score),
            "junk_bonds":  round(junk_score),
            "put_call":    round(pc_score),
            "strength":    round(strength_score),
            "breadth":     round(breadth_score),
        }

        final = round(np.mean(list(scores.values())))

        if final >= 75:
            label = "Extreme Greed"
        elif final >= 55:
            label = "Greed"
        elif final >= 45:
            label = "Neutral"
        elif final >= 25:
            label = "Fear"
        else:
            label = "Extreme Fear"

        return {
            "value":  final,
            "label":  label,
            "scores": scores,
        }

    except Exception as e:
        print(f"Erreur fear_greed: {e}")
        import traceback; traceback.print_exc()
        return {}