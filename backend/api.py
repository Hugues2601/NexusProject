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