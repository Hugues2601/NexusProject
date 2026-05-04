import numpy as np

def score_technical(tech: dict) -> dict:
    """Score technique basé sur les indicateurs C++"""
    scores = []
    details = {}

    # RSI (0-100 → score)
    rsi = tech.get("rsi")
    if rsi is not None:
        if rsi < 30:
            s = 85  # Oversold → opportunité achat
        elif rsi < 40:
            s = 70
        elif rsi < 50:
            s = 55
        elif rsi < 60:
            s = 50
        elif rsi < 70:
            s = 40
        else:
            s = 20  # Overbought → attention
        scores.append(s)
        details["rsi"] = {"value": round(rsi, 2), "score": s}

    # MACD
    macd_hist = tech.get("macd_hist")
    macd_line = tech.get("macd_line")
    macd_signal = tech.get("macd_signal")
    if macd_hist is not None:
        if macd_hist > 0 and macd_line > macd_signal:
            s = 75
        elif macd_hist > 0:
            s = 60
        elif macd_hist < 0 and macd_line < macd_signal:
            s = 25
        else:
            s = 40
        scores.append(s)
        details["macd"] = {"value": round(macd_hist, 4), "score": s}

    # Bollinger Bands
    price = tech.get("current_price")
    bb_upper = tech.get("bb_upper")
    bb_lower = tech.get("bb_lower")
    bb_middle = tech.get("bb_middle")
    if all(v is not None for v in [price, bb_upper, bb_lower, bb_middle]):
        bb_pct = (price - bb_lower) / (bb_upper - bb_lower) if (bb_upper - bb_lower) > 0 else 0.5
        if bb_pct < 0.1:
            s = 85
        elif bb_pct < 0.3:
            s = 65
        elif bb_pct < 0.7:
            s = 50
        elif bb_pct < 0.9:
            s = 35
        else:
            s = 15
        scores.append(s)
        details["bollinger"] = {"value": round(bb_pct, 4), "score": s}

    # Prix vs MAs
    sma20  = tech.get("sma20")
    sma50  = tech.get("sma50")
    sma200 = tech.get("sma200")
    if all(v is not None for v in [price, sma20, sma50, sma200]):
        above_count = sum([price > sma20, price > sma50, price > sma200])
        s = [30, 45, 65, 80][above_count]
        scores.append(s)
        details["ma_trend"] = {"above_count": above_count, "score": s}

        # Golden cross / Death cross
        if sma20 > sma50 > sma200:
            scores.append(80)
            details["cross"] = {"type": "golden", "score": 80}
        elif sma20 < sma50 < sma200:
            scores.append(20)
            details["cross"] = {"type": "death", "score": 20}

    final = round(np.mean(scores)) if scores else 50
    return {"score": final, "details": details}


def score_fundamental(fund: dict) -> dict:
    """Score fondamental"""
    scores = []
    details = {}

    # P/E Ratio
    pe = fund.get("pe_ratio")
    if pe is not None and pe > 0:
        if pe < 10:
            s = 85
        elif pe < 15:
            s = 75
        elif pe < 20:
            s = 65
        elif pe < 25:
            s = 55
        elif pe < 35:
            s = 40
        else:
            s = 25
        scores.append(s)
        details["pe_ratio"] = {"value": round(pe, 2), "score": s}

    # EPS
    eps = fund.get("eps")
    if eps is not None:
        s = 70 if eps > 0 else 30
        scores.append(s)
        details["eps"] = {"value": round(eps, 2), "score": s}

    # Revenue Growth
    rev_growth = fund.get("revenue_growth")
    if rev_growth is not None:
        if rev_growth > 0.2:
            s = 85
        elif rev_growth > 0.1:
            s = 70
        elif rev_growth > 0:
            s = 55
        elif rev_growth > -0.1:
            s = 40
        else:
            s = 20
        scores.append(s)
        details["revenue_growth"] = {"value": round(rev_growth * 100, 2), "score": s}

    # ROE
    roe = fund.get("roe")
    if roe is not None:
        if roe > 0.3:
            s = 85
        elif roe > 0.15:
            s = 70
        elif roe > 0:
            s = 50
        else:
            s = 20
        scores.append(s)
        details["roe"] = {"value": round(roe * 100, 2), "score": s}

    # Debt to Equity
    dte = fund.get("debt_to_equity")
    if dte is not None:
        if dte < 0.3:
            s = 85
        elif dte < 0.6:
            s = 70
        elif dte < 1.0:
            s = 55
        elif dte < 2.0:
            s = 35
        else:
            s = 15
        scores.append(s)
        details["debt_to_equity"] = {"value": round(dte, 2), "score": s}

    # Profit Margin
    margin = fund.get("profit_margin")
    if margin is not None:
        if margin > 0.25:
            s = 85
        elif margin > 0.15:
            s = 70
        elif margin > 0.05:
            s = 55
        elif margin > 0:
            s = 35
        else:
            s = 15
        scores.append(s)
        details["profit_margin"] = {"value": round(margin * 100, 2), "score": s}

    final = round(np.mean(scores)) if scores else 50
    return {"score": final, "details": details}


def score_risk(risk: dict) -> dict:
    """Score risk — plus le risque est faible, meilleur est le score"""
    scores = []
    details = {}

    sharpe = risk.get("sharpe")
    if sharpe is not None:
        if sharpe > 2:
            s = 90
        elif sharpe > 1:
            s = 75
        elif sharpe > 0.5:
            s = 60
        elif sharpe > 0:
            s = 45
        else:
            s = 20
        scores.append(s)
        details["sharpe"] = {"value": round(sharpe, 2), "score": s}

    max_dd = risk.get("max_dd")
    if max_dd is not None:
        dd = abs(max_dd)
        if dd < 10:
            s = 85
        elif dd < 20:
            s = 65
        elif dd < 30:
            s = 45
        else:
            s = 25
        scores.append(s)
        details["max_drawdown"] = {"value": round(max_dd, 2), "score": s}

    vol = risk.get("vol")
    if vol is not None:
        if vol < 15:
            s = 85
        elif vol < 25:
            s = 65
        elif vol < 40:
            s = 45
        else:
            s = 25
        scores.append(s)
        details["volatility"] = {"value": round(vol, 2), "score": s}

    beta = risk.get("beta")
    if beta is not None:
        if 0.5 < beta < 1.2:
            s = 75
        elif beta < 1.5:
            s = 55
        else:
            s = 35
        scores.append(s)
        details["beta"] = {"value": round(beta, 2), "score": s}

    final = round(np.mean(scores)) if scores else 50
    return {"score": final, "details": details}


def score_momentum(momentum: dict, zscore: float) -> dict:
    """Score momentum et mean reversion"""
    scores = []
    details = {}

    # Momentum multi-timeframe
    for key, weight in [("1m", 0.2), ("3m", 0.3), ("6m", 0.3), ("12m", 0.2)]:
        m = momentum.get(key)
        if m is not None:
            if m > 20:
                s = 80
            elif m > 10:
                s = 65
            elif m > 0:
                s = 55
            elif m > -10:
                s = 40
            else:
                s = 20
            scores.append(s)
            details[f"momentum_{key}"] = {"value": round(m, 2), "score": s}

    # Z-Score mean reversion
    if zscore is not None:
        if zscore < -2:
            s = 80  # Très oversold → opportunité
        elif zscore < -1:
            s = 65
        elif -1 <= zscore <= 1:
            s = 50
        elif zscore < 2:
            s = 35
        else:
            s = 20  # Très overbought
        scores.append(s)
        details["zscore"] = {"value": round(zscore, 2), "score": s}

    final = round(np.mean(scores)) if scores else 50
    return {"score": final, "details": details}


def compute_final_score(
    tech_score: int,
    fund_score: int,
    ml_score: int,
    sentiment_score: int,
    risk_score: int,
    momentum_score: int,
) -> dict:
    """Score final pondéré"""
    weights = {
        "technical":   0.20,
        "fundamental": 0.25,
        "ml":          0.20,
        "sentiment":   0.10,
        "risk":        0.15,
        "momentum":    0.10,
    }

    final = (
        tech_score       * weights["technical"]   +
        fund_score       * weights["fundamental"] +
        ml_score         * weights["ml"]          +
        sentiment_score  * weights["sentiment"]   +
        risk_score       * weights["risk"]        +
        momentum_score   * weights["momentum"]
    )
    final = round(final)

    if final >= 75:
        signal = "STRONG BUY"
        color  = "#22c55e"
    elif final >= 60:
        signal = "BUY"
        color  = "#86efac"
    elif final >= 45:
        signal = "NEUTRAL"
        color  = "#f0c040"
    elif final >= 30:
        signal = "SELL"
        color  = "#f87171"
    else:
        signal = "STRONG SELL"
        color  = "#ef4444"

    return {
        "final":   final,
        "signal":  signal,
        "color":   color,
        "weights": weights,
        "breakdown": {
            "technical":   tech_score,
            "fundamental": fund_score,
            "ml":          ml_score,
            "sentiment":   sentiment_score,
            "risk":        risk_score,
            "momentum":    momentum_score,
        }
    }