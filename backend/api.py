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

from groq import Groq

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

def groq_complete(prompt: str, max_tokens: int = 500) -> str:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content

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
        {"sym": "AAPL",     "label": "Apple"},
        {"sym": "MSFT",     "label": "Microsoft"},
        {"sym": "NVDA",     "label": "Nvidia"},
        {"sym": "AMZN",     "label": "Amazon"},
        {"sym": "GOOGL",    "label": "Alphabet"},
        {"sym": "META",     "label": "Meta"},
        {"sym": "TSLA",     "label": "Tesla"},
        {"sym": "JPM",      "label": "JPMorgan"},
        {"sym": "V",        "label": "Visa"},
        {"sym": "XOM",      "label": "ExxonMobil"},
        {"sym": "PG",       "label": "Procter & Gamble"},
        {"sym": "KO",       "label": "Coca-Cola"},
        {"sym": "SPY",      "label": "S&P 500 ETF"},
        {"sym": "QQQ",      "label": "Nasdaq ETF"},
        {"sym": "GLD",      "label": "Gold ETF"},
        {"sym": "BTC-USD",  "label": "Bitcoin"},
        {"sym": "ETH-USD",  "label": "Ethereum"},
        {"sym": "GC=F",     "label": "Gold Futures"},
        {"sym": "CL=F",     "label": "WTI Oil"},
        {"sym": "EURUSD=X", "label": "EUR/USD"},
    ]
    result = []
    for t in tickers:
        try:
            hist = yf.Ticker(t["sym"]).history(period="5d", interval="1d")
            if len(hist) >= 2:
                price = round(float(hist["Close"].iloc[-1]), 2)
                prev  = round(float(hist["Close"].iloc[-2]), 2)
                chg   = round((price - prev) / prev * 100, 2)
                clean = t["sym"].replace("-USD","").replace("=F","").replace("=X","")
                result.append({"sym": clean, "label": t["label"], "price": price, "chg": chg})
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

@app.get("/search")
def search(q: str):
    try:
        results = yf.Search(q, max_results=8)
        quotes = results.quotes
        output = []
        for r in quotes:
            output.append({
                "sym":    r.get("symbol", ""),
                "name":   r.get("longname") or r.get("shortname", ""),
                "type":   r.get("quoteType", ""),
                "sector": r.get("sector", ""),
            })
        return output
    except Exception as e:
        print(f"Erreur search: {e}")
        return []


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
import httpx

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")

@app.get("/economic_calendar")
async def economic_calendar():
    try:
        series = {
            "CPI":          "CPIAUCSL",
            "Core CPI":     "CPILFESL",
            "PCE":          "PCEPI",
            "Unemployment": "UNRATE",
            "NFP":          "PAYEMS",
            "GDP":          "GDP",
            "Fed Funds":    "FEDFUNDS",
            "Retail Sales": "RSAFS",
            "Industrial":   "INDPRO",
            "Housing":      "HOUST",
        }

        results = []
        async with httpx.AsyncClient(timeout=30) as client:
            for name, series_id in series.items():
                try:
                    # Dernières observations
                    obs_res = await client.get(
                        "https://api.stlouisfed.org/fred/series/observations",
                        params={
                            "series_id":  series_id,
                            "api_key":    FRED_API_KEY,
                            "file_type":  "json",
                            "sort_order": "desc",
                            "limit":      2,
                        }
                    )
                    obs_data = obs_res.json().get("observations", [])

                    # Prochaine date de release
                    release_res = await client.get(
                        "https://api.stlouisfed.org/fred/series/release",
                        params={
                            "series_id": series_id,
                            "api_key":   FRED_API_KEY,
                            "file_type": "json",
                        }
                    )
                    release_id = release_res.json().get("releases", [{}])[0].get("id")

                    next_date = None
                    if release_id:
                        dates_res = await client.get(
                            "https://api.stlouisfed.org/fred/release/dates",
                            params={
                                "release_id":              release_id,
                                "api_key":                 FRED_API_KEY,
                                "file_type":               "json",
                                "include_release_dates_with_no_data": "true",
                                "sort_order":              "asc",
                                "realtime_start":          datetime.now().strftime("%Y-%m-%d"),
                                "limit":                   1,
                            }
                        )
                        dates = dates_res.json().get("release_dates", [])
                        if dates:
                            next_date = dates[0].get("date")

                    if len(obs_data) >= 1:
                        latest   = obs_data[0]
                        previous = obs_data[1] if len(obs_data) > 1 else None
                        curr_val = float(latest["value"]) if latest["value"] != "." else None
                        prev_val = float(previous["value"]) if previous and previous["value"] != "." else None
                        change   = round(curr_val - prev_val, 3) if curr_val and prev_val else None

                        results.append({
                            "name":        name,
                            "series_id":   series_id,
                            "value":       curr_val,
                            "previous":    prev_val,
                            "change":      change,
                            "last_date":   latest["date"],
                            "next_date":   next_date,
                            "importance":  "High" if name in ["CPI", "NFP", "GDP", "Fed Funds", "Unemployment"] else "Medium",
                        })
                except Exception as e:
                    print(f"Erreur FRED {name}: {e}")
                    continue

        results.sort(key=lambda x: 0 if x["importance"] == "High" else 1)
        return results

    except Exception as e:
        print(f"Erreur economic_calendar: {e}")
        return []
    
@app.get("/weekly_recap")
async def weekly_recap():
    try:
        tickers = ["SPY", "QQQ", "AAPL", "NVDA", "MSFT", "TSLA", "BTC-USD", "GLD", "^VIX"]
        perf = []
        perf_data = []

        for sym in tickers:
            try:
                hist = yf.Ticker(sym).history(period="5d", interval="1d")
                if len(hist) >= 2:
                    start = float(hist["Close"].iloc[0])
                    end   = float(hist["Close"].iloc[-1])
                    chg   = round((end - start) / start * 100, 2)
                    clean = sym.replace("-USD","").replace("^","")
                    perf.append(f"{clean}: {'+' if chg >= 0 else ''}{chg}%")
                    perf_data.append({"sym": clean, "chg": chg})
            except:
                continue

        # Fetch articles + contenu complet
        all_articles = []
        news_tickers = ["SPY", "AAPL", "NVDA", "MSFT", "TSLA", "BTC-USD", "JPM", "GLD"]

        for sym in news_tickers:
            try:
                for item in yf.Ticker(sym).news[:2]:
                    title = item.get("content", {}).get("title", "")
                    url   = item.get("content", {}).get("canonicalUrl", {}).get("url", "")
                    if not title:
                        continue
                    content = ""
                    if url:
                        try:
                            from newspaper import Article as NewsArticle
                            a = NewsArticle(url)
                            a.download()
                            a.parse()
                            content = a.text[:600]
                        except:
                            pass
                    all_articles.append({
                        "title":   title,
                        "content": content if content else title,
                    })
            except:
                continue

        # Déduplique
        seen = set()
        unique_articles = []
        for a in all_articles:
            if a["title"] not in seen:
                seen.add(a["title"])
                unique_articles.append(a)

        articles_text = ""
        for a in unique_articles[:10]:
            articles_text += f"\n--- {a['title']} ---\n{a['content']}\n"

        prompt = f"""You are a senior financial analyst writing a weekly market recap (Monday to Friday).

Weekly performance data:
{chr(10).join(perf)}

Key articles and content from this week:
{articles_text}

Write a professional 3-paragraph weekly recap:
1. Overall market performance with specific numbers from the data
2. Key events and sector highlights based on the articles
3. Macro themes and what to watch next week

Be specific, use real numbers, professional tone."""

        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, groq_complete, prompt, 700)
        return {"recap": text, "performance": perf_data}

    except Exception as e:
        print(f"Erreur weekly_recap: {e}")
        return {"recap": "Error loading weekly recap.", "performance": []}
@app.get("/yesterday_digest")
async def yesterday_digest():
    try:
        all_articles = []
        news_tickers = ["SPY", "AAPL", "NVDA", "MSFT", "TSLA", "JPM", "BTC-USD", "GLD"]

        for sym in news_tickers:
            try:
                for item in yf.Ticker(sym).news[:2]:
                    title  = item.get("content", {}).get("title", "")
                    url    = item.get("content", {}).get("canonicalUrl", {}).get("url", "")
                    source = item.get("content", {}).get("provider", {}).get("displayName", "")
                    if not title:
                        continue
                    content = ""
                    if url:
                        try:
                            from newspaper import Article as NewsArticle
                            a = NewsArticle(url)
                            a.download()
                            a.parse()
                            content = a.text[:600]
                        except:
                            pass
                    all_articles.append({
                        "title":   title,
                        "source":  source,
                        "content": content if content else title,
                    })
            except:
                continue

        # Déduplique
        seen = set()
        unique_articles = []
        for a in all_articles:
            if a["title"] not in seen:
                seen.add(a["title"])
                unique_articles.append(a)

        articles_text = ""
        for a in unique_articles[:12]:
            articles_text += f"\n--- [{a['source']}] {a['title']} ---\n{a['content']}\n"

        prompt = f"""You are a financial analyst writing a morning briefing for traders.

Yesterday's key articles:
{articles_text}

Write a concise morning digest (2-3 paragraphs):
1. Key market moves and drivers from yesterday with specific details from the articles
2. Notable company and macro news
3. What traders should watch today

Professional, specific, actionable. Use details from the actual article content."""

        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, groq_complete, prompt, 600)
        return {"digest": text}

    except Exception as e:
        print(f"Erreur yesterday_digest: {e}")
        return {"digest": "Error loading digest."}


@app.get("/summarize_article")
async def summarize_article(title: str, url: str = ""):
    try:
        article_text = ""

        # Fetch le vrai contenu si URL disponible
        if url:
            try:
                from newspaper import Article
                a = Article(url)
                a.download()
                a.parse()
                article_text = a.text[:3000]
            except:
                pass

        if article_text:
            prompt = f"""You are a financial analyst. Summarize this article for a trader.

Title: {title}

Article content:
{article_text}

Provide:
**Key takeaway** (1 sentence)
**What happened** (2-3 sentences based on the actual content)
**Market impact** — which assets/sectors are affected
**Trading implications** — what traders should watch

Be concise and specific."""
        else:
            prompt = f"""You are a financial analyst. Based on this headline, provide a brief analysis.

Headline: {title}

Provide:
**Key takeaway** (1 sentence)
**Context** (what this likely means for markets)
**Market impact** — which assets/sectors are affected
**Trading implications**

Note: Analysis based on headline only."""

        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, groq_complete, prompt, 500)
        return {"summary": text, "has_content": bool(article_text)}

    except Exception as e:
        print(f"Erreur summarize_article: {e}")
        return {"summary": "Error loading summary.", "has_content": False}

@app.get("/fx_matrix")
def fx_matrix():
    try:
        currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY']
        pairs = {
            'EURUSD': 'EURUSD=X', 'GBPUSD': 'GBPUSD=X', 'USDJPY': 'USDJPY=X',
            'USDCHF': 'USDCHF=X', 'AUDUSD': 'AUDUSD=X', 'USDCAD': 'USDCAD=X',
            'USDCNY': 'USDCNY=X', 'EURGBP': 'EURGBP=X', 'EURJPY': 'EURJPY=X',
            'EURCHF': 'EURCHF=X', 'EURAUD': 'EURAUD=X', 'EURCAD': 'EURCAD=X',
            'GBPJPY': 'GBPJPY=X', 'GBPCHF': 'GBPCHF=X', 'GBPAUD': 'GBPAUD=X',
            'AUDJPY': 'AUDJPY=X', 'CADJPY': 'CADJPY=X', 'CHFJPY': 'CHFJPY=X',
        }

        rates = {}
        changes = {}
        for pair, sym in pairs.items():
            try:
                hist = yf.Ticker(sym).history(period="5d", interval="1d")
                if len(hist) >= 2:
                    rates[pair]   = round(float(hist["Close"].iloc[-1]), 4)
                    prev          = float(hist["Close"].iloc[-2])
                    changes[pair] = round((rates[pair] - prev) / prev * 100, 3)
            except:
                continue

        return {
            "currencies": currencies,
            "rates":      rates,
            "changes":    changes,
        }
    except Exception as e:
        print(f"Erreur fx_matrix: {e}")
        return {}
    
@app.get("/options_chain")
def options_chain(sym: str, expiry: str = ""):
    try:
        t = yf.Ticker(sym)
        
        # Liste des expiries disponibles
        exps = t.options
        if not exps:
            return {"error": "No options available"}
        
        # Prend la première expiry si pas spécifiée
        target_exp = expiry if expiry in exps else exps[0]
        
        # Fetch la chain
        chain = t.option_chain(target_exp)
        spot  = round(float(t.fast_info.last_price), 2)
        
        def process_chain(df, option_type):
            rows = []
            for _, row in df.iterrows():
                try:
                    rows.append({
                        "strike":         round(float(row["strike"]), 2),
                        "bid":            round(float(row["bid"]), 2),
                        "ask":            round(float(row["ask"]), 2),
                        "last":           round(float(row["lastPrice"]), 2),
                        "iv":             round(float(row["impliedVolatility"]) * 100, 2),
                        "oi":             int(row["openInterest"]) if row["openInterest"] else 0,
                        "volume":         int(row["volume"]) if row["volume"] else 0,
                        "itm":            bool(row["inTheMoney"]),
                        "type":           option_type,
                    })
                except:
                    continue
            return rows

        calls = process_chain(chain.calls, "call")
        puts  = process_chain(chain.puts,  "put")

        return {
            "sym":     sym.upper(),
            "spot":    spot,
            "expiry":  target_exp,
            "expiries": list(exps),
            "calls":   calls,
            "puts":    puts,
        }
    except Exception as e:
        print(f"Erreur options_chain {sym}: {e}")
        return {"error": str(e)}


@app.get("/vol_surface")
def vol_surface(sym: str):
    try:
        t    = yf.Ticker(sym)
        spot = float(t.fast_info.last_price)
        exps = t.options[:8]  # Max 8 expiries

        surface_data = []

        for exp in exps:
            try:
                chain = t.option_chain(exp)
                
                # Calcule jours jusqu'à expiry
                exp_date = datetime.strptime(exp, "%Y-%m-%d")
                days     = max((exp_date - datetime.now()).days, 1)

                # Filtre autour du spot (70% à 130%)
                calls = chain.calls
                calls = calls[
                    (calls["strike"] >= spot * 0.70) &
                    (calls["strike"] <= spot * 1.30) &
                    (calls["impliedVolatility"] > 0.01) &
                    (calls["impliedVolatility"] < 5.0)
                ]

                for _, row in calls.iterrows():
                    strike     = float(row["strike"])
                    iv         = float(row["impliedVolatility"]) * 100
                    moneyness  = round(strike / spot, 4)
                    surface_data.append({
                        "expiry":    exp,
                        "days":      days,
                        "strike":    round(strike, 2),
                        "moneyness": moneyness,
                        "iv":        round(iv, 2),
                    })
            except:
                continue

        return {
            "sym":   sym.upper(),
            "spot":  round(spot, 2),
            "data":  surface_data,
        }

    except Exception as e:
        print(f"Erreur vol_surface {sym}: {e}")
        return {"error": str(e)}


@app.get("/options_expiries")
def options_expiries(sym: str):
    try:
        t = yf.Ticker(sym)
        return {"expiries": list(t.options)}
    except Exception as e:
        return {"expiries": []}


@app.get("/greeks")
def get_greeks(S: float, K: float, T: float, r: float, sigma: float):
    try:
        input_str = f"{S} {K} {T} {r} {sigma}"
        core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'greeks.exe')
        result = subprocess.run(
            [core_path],
            input=input_str,
            capture_output=True,
            text=True
        )
        if result.stdout:
            return json.loads(result.stdout)
        return {"error": "No output from C++ engine"}
    except Exception as e:
        print(f"Erreur greeks: {e}")
        return {}
    
@app.get("/sector_heatmap")
def sector_heatmap():
    try:
        sectors = {
            "Technology":        "XLK",
            "Healthcare":        "XLV",
            "Financials":        "XLF",
            "Consumer Disc.":    "XLY",
            "Industrials":       "XLI",
            "Communication":     "XLC",
            "Consumer Staples":  "XLP",
            "Energy":            "XLE",
            "Utilities":         "XLU",
            "Real Estate":       "XLRE",
            "Materials":         "XLB",
        }
        result = []
        for sector, sym in sectors.items():
            try:
                hist = yf.Ticker(sym).history(period="5d", interval="1d")
                if len(hist) >= 2:
                    price   = round(float(hist["Close"].iloc[-1]), 2)
                    prev    = round(float(hist["Close"].iloc[-2]), 2)
                    chg_1d  = round((price - prev) / prev * 100, 2)
                    open_   = round(float(hist["Open"].iloc[0]), 2)
                    chg_5d  = round((price - open_) / open_ * 100, 2)
                    result.append({
                        "sector": sector,
                        "sym":    sym,
                        "price":  price,
                        "chg_1d": chg_1d,
                        "chg_5d": chg_5d,
                    })
            except:
                continue
        return result
    except Exception as e:
        print(f"Erreur sector_heatmap: {e}")
        return []


@app.get("/world_markets")
def world_markets():
    try:
        indices = {
            "S&P 500":      "^GSPC",
            "Nasdaq":       "^IXIC",
            "Dow Jones":    "^DJI",
            "Russell 2000": "^RUT",
            "VIX":          "^VIX",
            "DAX":          "^GDAXI",
            "CAC 40":       "^FCHI",
            "FTSE 100":     "^FTSE",
            "Nikkei 225":   "^N225",
            "Hang Seng":    "^HSI",
            "Shanghai":     "000001.SS",
            "ASX 200":      "^AXJO",
            "Bovespa":      "^BVSP",
            "TSX":          "^GSPTSE",
            "Sensex":       "^BSESN",
        }
        result = []
        for name, sym in indices.items():
            try:
                hist = yf.Ticker(sym).history(period="5d", interval="1d")
                if len(hist) >= 2:
                    price  = round(float(hist["Close"].iloc[-1]), 2)
                    prev   = round(float(hist["Close"].iloc[-2]), 2)
                    chg    = round((price - prev) / prev * 100, 2)
                    result.append({
                        "name":   name,
                        "sym":    sym,
                        "price":  price,
                        "chg":    chg,
                        "region": "Americas" if sym in ["^GSPC","^IXIC","^DJI","^RUT","^VIX","^BVSP","^GSPTSE"] else
                                  "Europe"   if sym in ["^GDAXI","^FCHI","^FTSE"] else "Asia-Pacific",
                    })
            except:
                continue
        return result
    except Exception as e:
        print(f"Erreur world_markets: {e}")
        return []


@app.get("/recession_watch")
async def recession_watch():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Sahm Rule
            sahm_res = await client.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={"series_id": "SAHMREALTIME", "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": 1}
            )
            sahm = sahm_res.json().get("observations", [{}])[0].get("value", "N/A")

            # Unemployment
            unemp_res = await client.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={"series_id": "UNRATE", "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": 2}
            )
            unemp_obs = unemp_res.json().get("observations", [])
            unemp     = float(unemp_obs[0]["value"]) if unemp_obs else None
            unemp_prev= float(unemp_obs[1]["value"]) if len(unemp_obs) > 1 else None

            # GDP Growth
            gdp_res = await client.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={"series_id": "A191RL1Q225SBEA", "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": 2}
            )
            gdp_obs = gdp_res.json().get("observations", [])
            gdp     = float(gdp_obs[0]["value"]) if gdp_obs else None
            gdp_prev= float(gdp_obs[1]["value"]) if len(gdp_obs) > 1 else None

            # Leading Economic Index (Conference Board via FRED)
            lei_res = await client.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={"series_id": "USSLIND", "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": 2}
            )
            lei_obs = lei_res.json().get("observations", [])
            lei     = float(lei_obs[0]["value"]) if lei_obs else None
            lei_prev= float(lei_obs[1]["value"]) if len(lei_obs) > 1 else None

            # Yield Curve 10Y-2Y
            tnx = yf.Ticker("^TNX").history(period="1d")
            irx = yf.Ticker("^IRX").history(period="1d")
            tnx_val  = round(float(tnx["Close"].iloc[-1]), 2) if len(tnx) > 0 else None
            irx_val  = round(float(irx["Close"].iloc[-1]), 2) if len(irx) > 0 else None
            spread   = round(tnx_val - irx_val, 2) if tnx_val and irx_val else None

            # Recession probability
            sahm_float = float(sahm) if sahm != "N/A" else 0
            recession_prob = min(100, max(0,
                (sahm_float / 0.5 * 30) +
                (max(0, -spread) / 2 * 30) +
                (max(0, -gdp) / 4 * 20) +
                (max(0, (lei_prev or 0) - (lei or 0)) / 2 * 20)
            )) if gdp is not None else None

            return {
                "sahm_rule":       round(sahm_float, 2),
                "sahm_threshold":  0.5,
                "unemployment":    unemp,
                "unemployment_prev": unemp_prev,
                "gdp_growth":      gdp,
                "gdp_prev":        gdp_prev,
                "lei":             lei,
                "lei_prev":        lei_prev,
                "yield_spread":    spread,
                "tnx":             tnx_val,
                "irx":             irx_val,
                "recession_prob":  round(recession_prob, 1) if recession_prob is not None else None,
            }
    except Exception as e:
        print(f"Erreur recession_watch: {e}")
        import traceback; traceback.print_exc()
        return {}
    
@app.get("/macro/central_banks")
async def central_banks():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 24):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            fed_hist  = await fred("FEDFUNDS", 60)
            ecb_hist  = await fred("ECBDFR",   60)
            boj_hist  = await fred("IRSTCB01JPM156N", 60)
            boe_hist  = await fred("BOERUKM", 60)

            return {
                "banks": [
                    {
                        "name": "Federal Reserve",
                        "short": "FED",
                        "rate": fed_hist[0][1] if fed_hist else None,
                        "prev": fed_hist[1][1] if len(fed_hist) > 1 else None,
                        "currency": "USD",
                        "next_meeting": "07 May 2025",
                        "bias": "Hawkish",
                        "history": [{"date": d, "rate": r} for d, r in reversed(fed_hist[:24])],
                    },
                    {
                        "name": "European Central Bank",
                        "short": "ECB",
                        "rate": ecb_hist[0][1] if ecb_hist else None,
                        "prev": ecb_hist[1][1] if len(ecb_hist) > 1 else None,
                        "currency": "EUR",
                        "next_meeting": "06 Jun 2025",
                        "bias": "Neutral",
                        "history": [{"date": d, "rate": r} for d, r in reversed(ecb_hist[:24])],
                    },
                    {
                        "name": "Bank of Japan",
                        "short": "BOJ",
                        "rate": boj_hist[0][1] if boj_hist else None,
                        "prev": boj_hist[1][1] if len(boj_hist) > 1 else None,
                        "currency": "JPY",
                        "next_meeting": "31 May 2025",
                        "bias": "Dovish",
                        "history": [{"date": d, "rate": r} for d, r in reversed(boj_hist[:24])],
                    },
                    {
                        "name": "Bank of England",
                        "short": "BOE",
                        "rate": boe_hist[0][1] if boe_hist else None,
                        "prev": boe_hist[1][1] if len(boe_hist) > 1 else None,
                        "currency": "GBP",
                        "next_meeting": "08 May 2025",
                        "bias": "Neutral",
                        "history": [{"date": d, "rate": r} for d, r in reversed(boe_hist[:24])],
                    },
                ]
            }
    except Exception as e:
        print(f"Erreur central_banks: {e}")
        import traceback; traceback.print_exc()
        return {}


@app.get("/macro/inflation")
async def macro_inflation():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 60):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            cpi       = await fred("CPIAUCSL")
            core_cpi  = await fred("CPILFESL")
            pce       = await fred("PCEPI")
            core_pce  = await fred("PCEPILFE")
            cpi_food  = await fred("CPIUFDSL")
            cpi_energy= await fred("CPIENGSL")
            cpi_shelter= await fred("CUSR0000SAH1")
            cpi_services= await fred("CPISVNS")
            hicp_eu   = await fred("CP0000EZ19M086NEST")

            def latest(data): return data[0][1] if data else None
            def prev(data):   return data[1][1] if len(data) > 1 else None
            def chg(data):    return round(latest(data) - prev(data), 2) if latest(data) and prev(data) else None
            def hist(data, n=36): return [{"date": d, "value": v} for d, v in reversed(data[:n])]

            return {
                "usa": {
                    "cpi":          {"value": latest(cpi),        "prev": prev(cpi),        "change": chg(cpi),        "history": hist(cpi)},
                    "core_cpi":     {"value": latest(core_cpi),   "prev": prev(core_cpi),   "change": chg(core_cpi),   "history": hist(core_cpi)},
                    "pce":          {"value": latest(pce),         "prev": prev(pce),         "change": chg(pce),         "history": hist(pce)},
                    "core_pce":     {"value": latest(core_pce),   "prev": prev(core_pce),   "change": chg(core_pce),   "history": hist(core_pce)},
                    "food":         {"value": latest(cpi_food),   "prev": prev(cpi_food),   "change": chg(cpi_food)},
                    "energy":       {"value": latest(cpi_energy), "prev": prev(cpi_energy), "change": chg(cpi_energy)},
                    "shelter":      {"value": latest(cpi_shelter),"prev": prev(cpi_shelter),"change": chg(cpi_shelter)},
                    "services":     {"value": latest(cpi_services),"prev": prev(cpi_services),"change": chg(cpi_services)},
                },
                "europe": {
                    "hicp": {"value": latest(hicp_eu), "prev": prev(hicp_eu), "change": chg(hicp_eu), "history": hist(hicp_eu)},
                },
                "fed_target": 2.0,
            }
    except Exception as e:
        print(f"Erreur macro_inflation: {e}")
        return {}


@app.get("/macro/labour")
async def macro_labour():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 60):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            nfp          = await fred("PAYEMS")
            unemp        = await fred("UNRATE")
            jolts        = await fred("JTSJOL")
            participation= await fred("CIVPART")
            ahe          = await fred("CES0500000003")
            sahm         = await fred("SAHMREALTIME")

            def latest(d): return d[0][1] if d else None
            def prev(d):   return d[1][1] if len(d) > 1 else None
            def chg(d):    return round(latest(d) - prev(d), 2) if latest(d) and prev(d) else None
            def hist(d, n=36): return [{"date": x, "value": v} for x, v in reversed(d[:n])]

            # NFP change mensuel
            nfp_change = round(latest(nfp) - prev(nfp), 0) if latest(nfp) and prev(nfp) else None

            return {
                "nfp":           {"value": latest(nfp),           "change": nfp_change,       "history": hist(nfp)},
                "unemployment":  {"value": latest(unemp),          "prev": prev(unemp),         "change": chg(unemp),   "history": hist(unemp)},
                "jolts":         {"value": latest(jolts),          "prev": prev(jolts),          "change": chg(jolts)},
                "participation": {"value": latest(participation),  "prev": prev(participation),  "change": chg(participation)},
                "ahe":           {"value": latest(ahe),            "prev": prev(ahe),            "change": chg(ahe)},
                "sahm":          {"value": latest(sahm),           "triggered": (latest(sahm) or 0) >= 0.5},
            }
    except Exception as e:
        print(f"Erreur macro_labour: {e}")
        return {}


@app.get("/macro/gdp")
async def macro_gdp():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 20):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            gdp_us  = await fred("A191RL1Q225SBEA")  # US GDP QoQ annualized
            gdp_eu  = await fred("CLVMEURSCAB1GQEA19") # Eurozone GDP
            gdp_uk  = await fred("NGDPRSAXDCGBQ")    # UK GDP

            def latest(d): return d[0][1] if d else None
            def prev(d):   return d[1][1] if len(d) > 1 else None
            def hist(d, n=12): return [{"date": x, "value": v} for x, v in reversed(d[:n])]

            return {
                "countries": [
                    {"name": "United States", "code": "US",  "value": latest(gdp_us), "prev": prev(gdp_us), "unit": "% QoQ ann.", "history": hist(gdp_us)},
                    {"name": "Eurozone",      "code": "EU",  "value": latest(gdp_eu), "prev": prev(gdp_eu), "unit": "Index",       "history": hist(gdp_eu)},
                    {"name": "United Kingdom","code": "UK",  "value": latest(gdp_uk), "prev": prev(gdp_uk), "unit": "Bn GBP",      "history": hist(gdp_uk)},
                ],
            }
    except Exception as e:
        print(f"Erreur macro_gdp: {e}")
        return {}


@app.get("/macro/financial_conditions")
async def financial_conditions():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 5):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            hy_spread  = await fred("BAMLH0A0HYM2")
            ig_spread  = await fred("BAMLC0A0CM")
            ted_spread = await fred("TEDRATE")

        # Live market data
        vix  = yf.Ticker("^VIX").history(period="1d")
        dxy  = yf.Ticker("DX-Y.NYB").history(period="1d")
        tnx  = yf.Ticker("^TNX").history(period="1d")

        def latest(d): return d[0][1] if d else None
        def prev(d):   return d[1][1] if len(d) > 1 else None

        return {
            "vix":        round(float(vix["Close"].iloc[-1]), 2)  if len(vix) > 0  else None,
            "dxy":        round(float(dxy["Close"].iloc[-1]), 2)  if len(dxy) > 0  else None,
            "tnx":        round(float(tnx["Close"].iloc[-1]), 2)  if len(tnx) > 0  else None,
            "hy_spread":  {"value": latest(hy_spread),  "prev": prev(hy_spread),  "unit": "bp"},
            "ig_spread":  {"value": latest(ig_spread),  "prev": prev(ig_spread),  "unit": "bp"},
            "ted_spread": {"value": latest(ted_spread), "prev": prev(ted_spread), "unit": "bp"},
        }
    except Exception as e:
        print(f"Erreur financial_conditions: {e}")
        return {}


@app.get("/macro/yield_curve_history")
async def yield_curve_history():
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            async def fred(series_id: str, limit: int = 12):
                res = await client.get(
                    "https://api.stlouisfed.org/fred/series/observations",
                    params={"series_id": series_id, "api_key": FRED_API_KEY, "file_type": "json", "sort_order": "desc", "limit": limit}
                )
                obs = res.json().get("observations", [])
                return [(o["date"], float(o["value"])) for o in obs if o["value"] != "."]

            series = {
                "1M":  "DGS1MO",
                "3M":  "DGS3MO",
                "6M":  "DGS6MO",
                "1Y":  "DGS1",
                "2Y":  "DGS2",
                "5Y":  "DGS5",
                "10Y": "DGS10",
                "30Y": "DGS30",
            }

            results = {}
            for mat, sid in series.items():
                data = await fred(sid, 2)
                results[mat] = {
                    "current": data[0][1] if data else None,
                    "prev_month": data[1][1] if len(data) > 1 else None,
                }

            # Spread 2s10s
            s2  = results.get("2Y",  {}).get("current")
            s10 = results.get("10Y", {}).get("current")
            s3m = results.get("3M",  {}).get("current")
            spread_2s10s = round(s10 - s2,  2) if s10 and s2  else None
            spread_3m10y = round(s10 - s3m, 2) if s10 and s3m else None

            return {
                "maturities": results,
                "spread_2s10s": spread_2s10s,
                "spread_3m10y": spread_3m10y,
                "inverted": spread_2s10s < 0 if spread_2s10s is not None else None,
            }
    except Exception as e:
        print(f"Erreur yield_curve_history: {e}")
        return {}