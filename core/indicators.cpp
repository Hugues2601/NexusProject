#include <iostream>
#include <vector>
#include <cmath>
#include <string>
#include <sstream>
#include <algorithm>
#include <iomanip>

std::vector<double> sma(const std::vector<double>& p, int period) {
    std::vector<double> r(p.size(), -1);
    for (int i = period-1; i < (int)p.size(); i++) {
        double sum = 0;
        for (int j = i-period+1; j <= i; j++) sum += p[j];
        r[i] = sum / period;
    }
    return r;
}

std::vector<double> ema(const std::vector<double>& p, int period) {
    std::vector<double> r(p.size(), -1);
    double k = 2.0 / (period + 1);
    r[period-1] = p[period-1];
    for (int i = period; i < (int)p.size(); i++)
        r[i] = p[i] * k + r[i-1] * (1-k);
    return r;
}

struct BB { std::vector<double> upper, middle, lower; };
BB bollinger(const std::vector<double>& p, int period=20, double n=2.0) {
    BB bb;
    bb.upper.resize(p.size(),-1);
    bb.middle.resize(p.size(),-1);
    bb.lower.resize(p.size(),-1);
    for (int i = period-1; i < (int)p.size(); i++) {
        double sum=0;
        for (int j=i-period+1; j<=i; j++) sum+=p[j];
        double mean=sum/period, var=0;
        for (int j=i-period+1; j<=i; j++) var+=(p[j]-mean)*(p[j]-mean);
        double sd=std::sqrt(var/period);
        bb.middle[i]=mean; bb.upper[i]=mean+n*sd; bb.lower[i]=mean-n*sd;
    }
    return bb;
}

std::vector<double> rsi(const std::vector<double>& p, int period=14) {
    std::vector<double> r(p.size(),-1);
    if ((int)p.size() < period+1) return r;
    double ag=0, al=0;
    for (int i=1; i<=period; i++) {
        double d=p[i]-p[i-1];
        if (d>0) ag+=d; else al-=d;
    }
    ag/=period; al/=period;
    for (int i=period; i<(int)p.size(); i++) {
        if (i>period) {
            double d=p[i]-p[i-1];
            ag=(ag*(period-1)+(d>0?d:0))/period;
            al=(al*(period-1)+(d<0?-d:0))/period;
        }
        r[i] = al==0 ? 100 : 100-(100/(1+ag/al));
    }
    return r;
}

struct MACD {
    std::vector<double> macd_line;
    std::vector<double> signal_line;
    std::vector<double> histogram;
};

MACD macd(const std::vector<double>& p, int fast=12, int slow=26, int signal=9) {
    MACD m;
    m.macd_line.resize(p.size(), -1);
    m.signal_line.resize(p.size(), -1);
    m.histogram.resize(p.size(), -1);

    auto ema_fast = ema(p, fast);
    auto ema_slow = ema(p, slow);

    std::vector<double> macd_vals;
    std::vector<int> macd_idx;

    for (int i=0; i<(int)p.size(); i++) {
        if (ema_fast[i] != -1 && ema_slow[i] != -1) {
            m.macd_line[i] = ema_fast[i] - ema_slow[i];
            macd_vals.push_back(m.macd_line[i]);
            macd_idx.push_back(i);
        }
    }

    if ((int)macd_vals.size() >= signal) {
        double k = 2.0 / (signal + 1);
        m.signal_line[macd_idx[signal-1]] = macd_vals[signal-1];
        for (int i=signal; i<(int)macd_vals.size(); i++) {
            int idx = macd_idx[i];
            int prev_idx = macd_idx[i-1];
            m.signal_line[idx] = macd_vals[i]*k + m.signal_line[prev_idx]*(1-k);
        }
    }

    for (int i=0; i<(int)p.size(); i++) {
        if (m.macd_line[i] != -1 && m.signal_line[i] != -1)
            m.histogram[i] = m.macd_line[i] - m.signal_line[i];
    }

    return m;
}

std::vector<double> atr(const std::vector<double>& high, const std::vector<double>& low, const std::vector<double>& close, int period=14) {
    std::vector<double> tr(high.size(), -1);
    std::vector<double> r(high.size(), -1);
    for (int i=1; i<(int)high.size(); i++) {
        double hl = high[i]-low[i];
        double hc = std::abs(high[i]-close[i-1]);
        double lc = std::abs(low[i]-close[i-1]);
        tr[i] = std::max(hl, std::max(hc, lc));
    }
    double sum=0; int cnt=0;
    for (int i=1; i<=period && i<(int)tr.size(); i++) { sum+=tr[i]; cnt++; }
    if (cnt==period) r[period]=sum/period;
    for (int i=period+1; i<(int)tr.size(); i++)
        if (r[i-1]!=-1) r[i]=(r[i-1]*(period-1)+tr[i])/period;
    return r;
}

void printVec(const std::string& name, const std::vector<double>& v) {
    std::cout << "\"" << name << "\":[";
    for (int i=0; i<(int)v.size(); i++) {
        if (v[i]==-1) std::cout << "null";
        else std::cout << v[i];
        if (i<(int)v.size()-1) std::cout << ",";
    }
    std::cout << "]";
}

// Retourne les rendements journaliers
std::vector<double> returns(const std::vector<double>& prices) {
    std::vector<double> r;
    for (int i = 1; i < (int)prices.size(); i++)
        r.push_back((prices[i] - prices[i-1]) / prices[i-1]);
    return r;
}

double mean(const std::vector<double>& v) {
    double s = 0;
    for (auto x : v) s += x;
    return s / v.size();
}

double stddev(const std::vector<double>& v) {
    double m = mean(v);
    double s = 0;
    for (auto x : v) s += (x-m)*(x-m);
    return std::sqrt(s / v.size());
}

double sharpe(const std::vector<double>& prices, double rf = 0.05) {
    auto r = returns(prices);
    if (r.empty()) return 0;
    double m = mean(r) * 252;
    double s = stddev(r) * std::sqrt(252);
    return s == 0 ? 0 : (m - rf) / s;
}

double maxDrawdown(const std::vector<double>& prices) {
    double peak = prices[0], dd = 0;
    for (auto p : prices) {
        if (p > peak) peak = p;
        dd = std::min(dd, (p - peak) / peak);
    }
    return dd * 100;
}

double volatility(const std::vector<double>& prices) {
    auto r = returns(prices);
    return stddev(r) * std::sqrt(252) * 100;
}

double beta(const std::vector<double>& prices, const std::vector<double>& bench) {
    auto rp = returns(prices);
    auto rb = returns(bench);
    int n = std::min(rp.size(), rb.size());
    if (n < 2) return 1;
    double mp = mean(std::vector<double>(rp.begin(), rp.begin()+n));
    double mb = mean(std::vector<double>(rb.begin(), rb.begin()+n));
    double cov = 0, var = 0;
    for (int i = 0; i < n; i++) {
        cov += (rp[i]-mp)*(rb[i]-mb);
        var += (rb[i]-mb)*(rb[i]-mb);
    }
    return var == 0 ? 1 : cov/var;
}

double varHistorical(const std::vector<double>& prices, double confidence = 0.95) {
    auto r = returns(prices);
    if (r.empty()) return 0;
    std::vector<double> sorted = r;
    std::sort(sorted.begin(), sorted.end());
    int idx = (int)((1 - confidence) * sorted.size());
    return sorted[idx] * 100;
}

double correlation(const std::vector<double>& a, const std::vector<double>& b) {
    auto ra = returns(a);
    auto rb = returns(b);
    int n = std::min(ra.size(), rb.size());
    if (n < 2) return 0;
    double ma = mean(std::vector<double>(ra.begin(), ra.begin()+n));
    double mb = mean(std::vector<double>(rb.begin(), rb.begin()+n));
    double cov = 0, sa = 0, sb = 0;
    for (int i = 0; i < n; i++) {
        cov += (ra[i]-ma)*(rb[i]-mb);
        sa  += (ra[i]-ma)*(ra[i]-ma);
        sb  += (rb[i]-mb)*(rb[i]-mb);
    }
    double denom = std::sqrt(sa*sb);
    return denom == 0 ? 0 : cov/denom;
}

int main() {
    std::vector<double> closes, highs, lows;
    std::string line;
    
    // Format: close high low sur chaque ligne
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        std::istringstream ss(line);
        double c, h, l;
        if (ss >> c >> h >> l) {
            closes.push_back(c);
            highs.push_back(h);
            lows.push_back(l);
        }
    }

    auto sma20  = sma(closes, 20);
    auto sma50  = sma(closes, 50);
    auto sma200 = sma(closes, 200);
    auto ema20  = ema(closes, 20);
    auto ema50  = ema(closes, 50);
    auto bb     = bollinger(closes, 20, 2.0);
    auto rsi14  = rsi(closes, 14);
    auto m      = macd(closes, 12, 26, 9);
    auto atr14  = atr(highs, lows, closes, 14);

    std::cout << "{";
    printVec("sma20",       sma20);       std::cout << ",";
    printVec("sma50",       sma50);       std::cout << ",";
    printVec("sma200",      sma200);      std::cout << ",";
    printVec("ema20",       ema20);       std::cout << ",";
    printVec("ema50",       ema50);       std::cout << ",";
    printVec("bb_upper",    bb.upper);    std::cout << ",";
    printVec("bb_middle",   bb.middle);   std::cout << ",";
    printVec("bb_lower",    bb.lower);    std::cout << ",";
    printVec("rsi",         rsi14);       std::cout << ",";
    printVec("macd_line",   m.macd_line); std::cout << ",";
    printVec("macd_signal", m.signal_line);std::cout << ",";
    printVec("macd_hist",   m.histogram); std::cout << ",";
    printVec("atr",         atr14);
    std::cout << "}";
    return 0;
}