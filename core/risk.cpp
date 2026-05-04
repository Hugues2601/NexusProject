#include <iostream>
#include <vector>
#include <cmath>
#include <string>
#include <sstream>
#include <algorithm>
#include <iomanip>

std::vector<double> parseLine(const std::string& line) {
    std::vector<double> v;
    std::istringstream ss(line);
    double x;
    while (ss >> x) v.push_back(x);
    return v;
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

std::vector<double> returns(const std::vector<double>& p) {
    std::vector<double> r;
    for (int i = 1; i < (int)p.size(); i++)
        r.push_back((p[i]-p[i-1])/p[i-1]);
    return r;
}

double sharpe(const std::vector<double>& prices, double rf=0.05) {
    auto r = returns(prices);
    if (r.empty()) return 0;
    double m = mean(r)*252;
    double s = stddev(r)*std::sqrt(252);
    return s==0 ? 0 : (m-rf)/s;
}

double maxDrawdown(const std::vector<double>& prices) {
    double peak=prices[0], dd=0;
    for (auto p : prices) {
        if (p>peak) peak=p;
        dd = std::min(dd, (p-peak)/peak);
    }
    return dd*100;
}

double volatility(const std::vector<double>& prices) {
    auto r = returns(prices);
    return stddev(r)*std::sqrt(252)*100;
}

double beta(const std::vector<double>& prices, const std::vector<double>& bench) {
    auto rp = returns(prices);
    auto rb = returns(bench);
    int n = std::min(rp.size(), rb.size());
    if (n<2) return 1;
    double mp=mean(std::vector<double>(rp.begin(),rp.begin()+n));
    double mb=mean(std::vector<double>(rb.begin(),rb.begin()+n));
    double cov=0, var=0;
    for (int i=0;i<n;i++) {
        cov+=(rp[i]-mp)*(rb[i]-mb);
        var+=(rb[i]-mb)*(rb[i]-mb);
    }
    return var==0?1:cov/var;
}

double varHistorical(const std::vector<double>& prices, double conf=0.95) {
    auto r = returns(prices);
    if (r.empty()) return 0;
    std::vector<double> s = r;
    std::sort(s.begin(), s.end());
    int idx = (int)((1-conf)*s.size());
    return s[idx]*100;
}

double correlation(const std::vector<double>& a, const std::vector<double>& b) {
    auto ra = returns(a);
    auto rb = returns(b);
    int n = std::min(ra.size(), rb.size());
    if (n<2) return 0;
    double ma=mean(std::vector<double>(ra.begin(),ra.begin()+n));
    double mb=mean(std::vector<double>(rb.begin(),rb.begin()+n));
    double cov=0,sa=0,sb=0;
    for (int i=0;i<n;i++) {
        cov+=(ra[i]-ma)*(rb[i]-mb);
        sa +=(ra[i]-ma)*(ra[i]-ma);
        sb +=(rb[i]-mb)*(rb[i]-mb);
    }
    double d=std::sqrt(sa*sb);
    return d==0?0:cov/d;
}

int main() {
    // Format input:
    // Ligne 1: SPY prices
    // Ligne 2+: ticker_name price1 price2 ...
    std::vector<std::string> lines;
    std::string line;
    while (std::getline(std::cin, line))
        if (!line.empty()) lines.push_back(line);

    if (lines.size() < 2) { std::cout << "{}"; return 0; }

    auto spyPrices = parseLine(lines[0]);
    std::vector<std::string> names;
    std::vector<std::vector<double>> allPrices;

    for (int i=1; i<(int)lines.size(); i++) {
        std::istringstream ss(lines[i]);
        std::string name;
        ss >> name;
        names.push_back(name);
        std::vector<double> prices;
        double x;
        while (ss >> x) prices.push_back(x);
        allPrices.push_back(prices);
    }

    // Portfolio prices (equal weighted for simplicity)
    int minLen = spyPrices.size();
    for (auto& p : allPrices) minLen = std::min(minLen, (int)p.size());

    std::vector<double> portPrices(minLen, 0);
    for (auto& p : allPrices)
        for (int i=0; i<minLen; i++)
            portPrices[i] += p[p.size()-minLen+i] / allPrices.size();

    std::vector<double> spyTrimmed(spyPrices.end()-minLen, spyPrices.end());

    std::cout << "{";
    std::cout << "\"sharpe\":"    << std::fixed << std::setprecision(3) << sharpe(portPrices);
    std::cout << ",\"max_dd\":"   << maxDrawdown(portPrices);
    std::cout << ",\"vol\":"      << volatility(portPrices);
    std::cout << ",\"beta\":"     << beta(portPrices, spyTrimmed);
    std::cout << ",\"var95\":"    << varHistorical(portPrices, 0.95);
    std::cout << ",\"var99\":"    << varHistorical(portPrices, 0.99);

    // Correlation matrix
    std::cout << ",\"correlations\":{";
    for (int i=0; i<(int)names.size(); i++) {
        std::cout << "\"" << names[i] << "\":{";
        for (int j=0; j<(int)names.size(); j++) {
            std::cout << "\"" << names[j] << "\":" << correlation(allPrices[i], allPrices[j]);
            if (j<(int)names.size()-1) std::cout << ",";
        }
        std::cout << "}";
        if (i<(int)names.size()-1) std::cout << ",";
    }
    std::cout << "}}";

    return 0;
}