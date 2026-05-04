from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

yf.set_tz_cache_location("cache")

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
        print(f"{sym}: {price} ({chg}%)")
        return {"sym": sym.upper(), "price": price, "chg": chg}
    except Exception as e:
        print(f"Erreur ticker {sym}: {e}")
        return None

@app.get("/history")
def get_history(sym: str, tf: str):
    periods = {
        '1m':  ('1d',    '1m'),
        '5m':  ('5d',    '5m'),
        '1h':  ('1mo',   '1h'),
        '1D':  ('1y',    '1d'),
        '1W':  ('5y',    '1wk'),
        '1M':  ('1y',    '1mo'),
        '3M':  ('3y',    '1mo'),
        '6M':  ('10y',   '1mo'),
        '1Y':  ('10y',   '1wk'),
        '5Y':  ('max',   '1wk'),
        'MAX': ('max',   '1mo'),
    }
    period, interval = periods.get(tf, ('1y', '1d'))
    try:
        t = yf.Ticker(sym)
        hist = t.history(period=period, interval=interval)
        result = []
        for idx, row in hist.iterrows():
            result.append({
                "time": int(idx.timestamp()),
                "open":  round(float(row["Open"]),  2),
                "high":  round(float(row["High"]),  2),
                "low":   round(float(row["Low"]),   2),
                "close": round(float(row["Close"]), 2),
            })
        return result
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
@app.get("/news")
def get_news(sym: str):
    try:
        t = yf.Ticker(sym)
        news = t.news
        result = []
        for item in news[:10]:
            result.append({
                "title": item.get("content", {}).get("title", ""),
                "source": item.get("content", {}).get("provider", {}).get("displayName", ""),
                "url": item.get("content", {}).get("canonicalUrl", {}).get("url", ""),
                "time": item.get("content", {}).get("pubDate", ""),
            })
        return result
    except Exception as e:
        print(f"Erreur news {sym}: {e}")
        return []
@app.get("/fundamentals")
def get_fundamentals(sym: str):
    try:
        t = yf.Ticker(sym)
        info = t.info
        return {
            "market_cap":    info.get("marketCap"),
            "pe_ratio":      info.get("trailingPE"),
            "eps":           info.get("trailingEps"),
            "div_yield":     info.get("dividendYield"),
            "week52_high":   info.get("fiftyTwoWeekHigh"),
            "week52_low":    info.get("fiftyTwoWeekLow"),
            "volume":        info.get("volume"),
            "avg_volume":    info.get("averageVolume"),
            "beta":          info.get("beta"),
            "sector":        info.get("sector"),
        }
    except Exception as e:
        print(f"Erreur fundamentals {sym}: {e}")
        return {}
@app.get("/statistics")
def get_statistics(sym: str):
    try:
        t = yf.Ticker(sym)
        info = t.info
        hist = t.history(period="1d")
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
    
import subprocess
import json
import os

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
        t = yf.Ticker(sym)
        hist = t.history(period=period, interval=interval)
        closes = [round(float(x), 2) for x in hist["Close"].tolist()]
        highs  = [round(float(x), 2) for x in hist["High"].tolist()]
        lows   = [round(float(x), 2) for x in hist["Low"].tolist()]
        times  = [int(idx.timestamp()) for idx in hist.index]

        input_str = "\n".join(f"{c} {h} {l}" for c,h,l in zip(closes,highs,lows))
        core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'indicators.exe')
        result = subprocess.run(
            [core_path],
            input=input_str,
            capture_output=True,
            text=True
        )
        indicators = json.loads(result.stdout)
        indicators["times"]  = times
        indicators["closes"] = closes
        return indicators
    except Exception as e:
        print(f"Erreur indicators {sym}: {e}")
        return {}
    
@app.get("/price_at_date")
def price_at_date(sym: str, date: str):
    try:
        from datetime import datetime, timedelta
        d = datetime.strptime(date, "%Y-%m-%d")
        # Cherche sur une fenetre de 7 jours pour gérer weekends/fériés
        end = (d + timedelta(days=7)).strftime("%Y-%m-%d")
        t = yf.Ticker(sym)
        hist = t.history(start=date, end=end, interval="1d")
        if len(hist) == 0:
            return None
        price = round(float(hist["Close"].iloc[0]), 2)
        actual_date = hist.index[0].strftime("%Y-%m-%d")
        return {"sym": sym.upper(), "price": price, "date": actual_date}
    except Exception as e:
        print(f"Erreur price_at_date {sym}: {e}")
        return None
@app.get("/risk")
def get_risk(syms: str):
    try:
        sym_list = syms.split(",")
        
        # Fetch historique SPY + chaque ticker
        spy = yf.Ticker("SPY")
        spy_hist = spy.history(period="1y", interval="1d")
        spy_prices = [round(float(x), 4) for x in spy_hist["Close"].tolist()]

        input_lines = [" ".join(map(str, spy_prices))]

        for sym in sym_list:
            t = yf.Ticker(sym.strip())
            hist = t.history(period="1y", interval="1d")
            if len(hist) == 0:
                continue
            prices = [round(float(x), 4) for x in hist["Close"].tolist()]
            input_lines.append(f"{sym.strip()} " + " ".join(map(str, prices)))

        input_str = "\n".join(input_lines)
        core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'risk.exe')
        result = subprocess.run(
            [core_path],
            input=input_str,
            capture_output=True,
            text=True
        )
        return json.loads(result.stdout)
    except Exception as e:
        print(f"Erreur risk: {e}")
        return {}
    
from datetime import datetime, timedelta
import numpy as np

@app.get("/ai_analysis")
def ai_analysis(sym: str):
    try:
        t = yf.Ticker(sym)
        
        # 1. Fundamentals
        info = t.info
        fundamentals = {
            "pe_ratio":      info.get("trailingPE"),
            "eps":           info.get("trailingEps"),
            "market_cap":    info.get("marketCap"),
            "beta":          info.get("beta"),
            "div_yield":     info.get("dividendYield"),
            "week52_high":   info.get("fiftyTwoWeekHigh"),
            "week52_low":    info.get("fiftyTwoWeekLow"),
            "profit_margin": info.get("profitMargins"),
            "revenue_growth":info.get("revenueGrowth"),
            "debt_to_equity":info.get("debtToEquity"),
            "roe":           info.get("returnOnEquity"),
            "sector":        info.get("sector"),
            "name":          info.get("longName"),
        }

        # 2. Prix historiques 2 ans
        hist = t.history(period="2y", interval="1d")
        closes = [round(float(x), 4) for x in hist["Close"].tolist()]
        highs  = [round(float(x), 4) for x in hist["High"].tolist()]
        lows   = [round(float(x), 4) for x in hist["Low"].tolist()]
        volumes= [round(float(x), 0) for x in hist["Volume"].tolist()]

        # 3. Indicateurs techniques via C++
        input_str = "\n".join(f"{c} {h} {l}" for c,h,l in zip(closes,highs,lows))
        core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'indicators.exe')
        result = subprocess.run([core_path], input=input_str, capture_output=True, text=True)
        indicators = json.loads(result.stdout)

        # Dernières valeurs des indicateurs
        def last_valid(arr):
            for v in reversed(arr):
                if v is not None: return round(v, 4)
            return None

        tech = {
            "rsi":         last_valid(indicators.get("rsi", [])),
            "macd_line":   last_valid(indicators.get("macd_line", [])),
            "macd_signal": last_valid(indicators.get("macd_signal", [])),
            "macd_hist":   last_valid(indicators.get("macd_hist", [])),
            "bb_upper":    last_valid(indicators.get("bb_upper", [])),
            "bb_middle":   last_valid(indicators.get("bb_middle", [])),
            "bb_lower":    last_valid(indicators.get("bb_lower", [])),
            "sma20":       last_valid(indicators.get("sma20", [])),
            "sma50":       last_valid(indicators.get("sma50", [])),
            "sma200":      last_valid(indicators.get("sma200", [])),
            "atr":         last_valid(indicators.get("atr", [])),
            "current_price": closes[-1] if closes else None,
        }

        # 4. Z-Score mean reversion
        if len(closes) >= 20:
            recent = closes[-20:]
            mean_p = np.mean(recent)
            std_p  = np.std(recent)
            zscore = round((closes[-1] - mean_p) / std_p, 4) if std_p > 0 else 0
        else:
            zscore = 0

        # 5. Momentum
        momentum = {}
        if len(closes) >= 252:
            momentum["1m"]  = round((closes[-1] - closes[-21])  / closes[-21]  * 100, 2)
            momentum["3m"]  = round((closes[-1] - closes[-63])  / closes[-63]  * 100, 2)
            momentum["6m"]  = round((closes[-1] - closes[-126]) / closes[-126] * 100, 2)
            momentum["12m"] = round((closes[-1] - closes[-252]) / closes[-252] * 100, 2)

        # 6. Risk metrics via C++
        spy = yf.Ticker("SPY")
        spy_hist = spy.history(period="1y", interval="1d")
        spy_closes = [round(float(x), 4) for x in spy_hist["Close"].tolist()]

        risk_input = " ".join(map(str, spy_closes)) + "\n"
        risk_input += f"{sym} " + " ".join(map(str, closes[-len(spy_closes):]))
        risk_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'risk.exe')
        risk_result = subprocess.run([risk_path], input=risk_input, capture_output=True, text=True)
        risk = json.loads(risk_result.stdout) if risk_result.stdout else {}

        # 7. News
        news_items = []
        try:
            news = t.news
            for item in news[:8]:
                news_items.append(item.get("content", {}).get("title", ""))
        except:
            pass

        # 8. Volume analysis
        avg_vol = round(np.mean(volumes[-20:]), 0) if len(volumes) >= 20 else None
        curr_vol = volumes[-1] if volumes else None
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
        import traceback
        traceback.print_exc()
        return {}