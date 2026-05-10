#include <iostream>
#include <cmath>
#include <sstream>
#include <string>

double normalCDF(double x) {
    return 0.5 * std::erfc(-x / std::sqrt(2.0));
}

double normalPDF(double x) {
    return std::exp(-0.5 * x * x) / std::sqrt(2.0 * M_PI);
}

int main() {
    double S, K, T, r, sigma;

    // Read from stdin: S K T r sigma
    std::cin >> S >> K >> T >> r >> sigma;

    if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
        std::cout << "{\"error\": \"invalid inputs\"}" << std::endl;
        return 1;
    }

    double d1 = (std::log(S / K) + (r + sigma * sigma / 2.0) * T) / (sigma * std::sqrt(T));
    double d2 = d1 - sigma * std::sqrt(T);

    // Prices
    double call = S * normalCDF(d1)  - K * std::exp(-r * T) * normalCDF(d2);
    double put  = K * std::exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);

    // Greeks
    double delta_call = normalCDF(d1);
    double delta_put  = delta_call - 1.0;
    double gamma      = normalPDF(d1) / (S * sigma * std::sqrt(T));
    double theta_call = (-S * normalPDF(d1) * sigma / (2.0 * std::sqrt(T))
                        - r * K * std::exp(-r * T) * normalCDF(d2)) / 365.0;
    double theta_put  = (-S * normalPDF(d1) * sigma / (2.0 * std::sqrt(T))
                        + r * K * std::exp(-r * T) * normalCDF(-d2)) / 365.0;
    double vega       = S * normalPDF(d1) * std::sqrt(T) / 100.0;
    double rho_call   =  K * T * std::exp(-r * T) * normalCDF(d2)  / 100.0;
    double rho_put    = -K * T * std::exp(-r * T) * normalCDF(-d2) / 100.0;

    std::cout << std::fixed;
    std::cout << "{";
    std::cout << "\"price_bs\":"  << call        << ",";
    std::cout << "\"price_put\":" << put         << ",";
    std::cout << "\"delta\":"     << delta_call  << ",";
    std::cout << "\"delta_put\":" << delta_put   << ",";
    std::cout << "\"gamma\":"     << gamma       << ",";
    std::cout << "\"theta\":"     << theta_call  << ",";
    std::cout << "\"theta_put\":" << theta_put   << ",";
    std::cout << "\"vega\":"      << vega        << ",";
    std::cout << "\"rho\":"       << rho_call    << ",";
    std::cout << "\"rho_put\":"   << rho_put;
    std::cout << "}";

    return 0;
}