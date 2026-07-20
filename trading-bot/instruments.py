"""
Überwachte Märkte: Anzeigename -> Yahoo-Finance-Ticker.

Hier kannst du Märkte hinzufügen oder entfernen (Zeile löschen oder
mit # auskommentieren). Ticker findest du auf finance.yahoo.com.
"""

INSTRUMENTS = {
    # ---- Forex Majors ----
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "JPY=X",
    "USD/CHF": "CHF=X",
    "USD/CAD": "CAD=X",
    "AUD/USD": "AUDUSD=X",
    "NZD/USD": "NZDUSD=X",

    # ---- Forex Crosses ----
    "EUR/GBP": "EURGBP=X",
    "EUR/JPY": "EURJPY=X",
    "GBP/JPY": "GBPJPY=X",

    # ---- Indizes ----
    "GER40 (DAX)": "^GDAXI",
    "NAS100": "^NDX",
    "US30 (Dow)": "^DJI",
    "SPX500 (S&P)": "^GSPC",

    # ---- Rohstoffe ----
    "GOLD (XAU/USD)": "GC=F",
}
