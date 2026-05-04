import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import yfinance as yf
import json
import os
import subprocess

def compute_features(closes, highs, lows, volumes):
    """Calcule toutes les features pour le Random Forest via C++"""
    input_str = "\n".join(f"{c} {h} {l}" for c,h,l in zip(closes,highs,lows))
    core_path = os.path.join(os.path.dirname(__file__), '..', 'core', 'indicators.exe')
    result = subprocess.run([core_path], input=input_str, capture_output=True, text=True)
    indicators = json.loads(result.stdout)

    def last_valid(arr, n=1):
        valid = [v for v in arr if v is not None]
        if len(valid) < n: return [None] * n
        return valid[-n:]

    features = []
    n = len(closes)

    for i in range(60, n):
        rsi        = indicators["rsi"][i]
        macd_hist  = indicators["macd_hist"][i]
        bb_upper   = indicators["bb_upper"][i]
        bb_lower   = indicators["bb_lower"][i]
        bb_middle  = indicators["bb_middle"][i]
        sma20      = indicators["sma20"][i]
        sma50      = indicators["sma50"][i]
        sma200     = indicators["sma200"][i]
        atr        = indicators["atr"][i]
        price      = closes[i]

        if any(v is None for v in [rsi, macd_hist, bb_upper, bb_lower, bb_middle, sma20, sma50, sma200, atr]):
            features.append(None)
            continue

        # Bollinger %B
        bb_pct = (price - bb_lower) / (bb_upper - bb_lower) if (bb_upper - bb_lower) > 0 else 0.5

        # Price vs MAs
        price_vs_sma20  = (price - sma20)  / sma20
        price_vs_sma50  = (price - sma50)  / sma50
        price_vs_sma200 = (price - sma200) / sma200

        # Z-Score 20j
        recent = closes[i-20:i]
        mean_p = np.mean(recent)
        std_p  = np.std(recent)
        zscore = (price - mean_p) / std_p if std_p > 0 else 0

        # Momentum
        mom1m = (price - closes[i-21])  / closes[i-21]  if i >= 21  else 0
        mom3m = (price - closes[i-63])  / closes[i-63]  if i >= 63  else 0
        mom6m = (price - closes[i-126]) / closes[i-126] if i >= 126 else 0

        # Volume ratio
        avg_vol = np.mean(volumes[i-20:i])
        vol_ratio = volumes[i] / avg_vol if avg_vol > 0 else 1

        # ATR ratio
        atr_ratio = atr / price if price > 0 else 0

        features.append([
            rsi / 100,
            macd_hist,
            bb_pct,
            price_vs_sma20,
            price_vs_sma50,
            price_vs_sma200,
            zscore,
            mom1m,
            mom3m,
            mom6m,
            vol_ratio,
            atr_ratio,
        ])

    return features

def train_and_predict(sym: str):
    """Entraîne un Random Forest sur les données historiques et prédit la direction"""
    try:
        t = yf.Ticker(sym)
        hist = t.history(period="5y", interval="1d")

        if len(hist) < 300:
            return None

        closes  = [round(float(x), 4) for x in hist["Close"].tolist()]
        highs   = [round(float(x), 4) for x in hist["High"].tolist()]
        lows    = [round(float(x), 4) for x in hist["Low"].tolist()]
        volumes = [round(float(x), 0) for x in hist["Volume"].tolist()]

        features = compute_features(closes, highs, lows, volumes)

        # Labels : 1 si le prix monte dans 10 jours, 0 sinon
        X, y = [], []
        for i, f in enumerate(features):
            actual_i = i + 60
            if f is None: continue
            if actual_i + 10 >= len(closes): continue
            future_return = (closes[actual_i + 10] - closes[actual_i]) / closes[actual_i]
            label = 1 if future_return > 0 else 0
            X.append(f)
            y.append(label)

        if len(X) < 100:
            return None

        # Train sur 80%, test sur 20%
        split = int(len(X) * 0.8)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        scaler = StandardScaler()
        X_train_s = scaler.fit_transform(X_train)
        X_test_s  = scaler.transform(X_test)

        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=6,
            min_samples_leaf=10,
            random_state=42
        )
        rf.fit(X_train_s, y_train)

        # Accuracy sur test set
        accuracy = rf.score(X_test_s, y_test)

        # Prédiction sur le dernier point
        last_feature = features[-1]
        if last_feature is None:
            return None

        last_scaled = scaler.transform([last_feature])
        proba = rf.predict_proba(last_scaled)[0]

        # Feature importance
        feature_names = ['RSI','MACD_hist','BB_%B','vs_SMA20','vs_SMA50','vs_SMA200','Z-Score','Mom_1m','Mom_3m','Mom_6m','Vol_ratio','ATR_ratio']
        importance = dict(zip(feature_names, [round(x, 4) for x in rf.feature_importances_]))

        return {
            "prob_up":    round(float(proba[1]), 4),
            "prob_down":  round(float(proba[0]), 4),
            "accuracy":   round(float(accuracy), 4),
            "signal":     "BUY" if proba[1] > 0.55 else "SELL" if proba[1] < 0.45 else "NEUTRAL",
            "confidence": round(abs(proba[1] - 0.5) * 2, 4),
            "importance": importance,
            "n_samples":  len(X),
        }

    except Exception as e:
        print(f"Erreur ML {sym}: {e}")
        import traceback
        traceback.print_exc()
        return None


def sentiment_score(news_titles: list) -> dict:
    """Score sentiment sur les news avec FinBERT"""
    try:
        from transformers import pipeline
        pipe = pipeline(
            "text-classification",
            model="ProsusAI/finbert",
            truncation=True,
            max_length=512
        )
        if not news_titles:
            return {"score": 0.5, "label": "neutral", "details": []}

        results = []
        for title in news_titles[:5]:
            if not title: continue
            res = pipe(title)[0]
            score = res["score"]
            if res["label"] == "positive":
                results.append(score)
            elif res["label"] == "negative":
                results.append(-score)
            else:
                results.append(0)

        if not results:
            return {"score": 0.5, "label": "neutral", "details": []}

        avg = np.mean(results)
        normalized = round((avg + 1) / 2, 4)  # -1/+1 → 0/1

        label = "bullish" if avg > 0.1 else "bearish" if avg < -0.1 else "neutral"

        return {
            "score":   normalized,
            "label":   label,
            "raw":     round(float(avg), 4),
            "details": results
        }

    except Exception as e:
        print(f"Erreur sentiment: {e}")
        return {"score": 0.5, "label": "neutral", "details": []}