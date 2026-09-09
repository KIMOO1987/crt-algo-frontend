class SymbolMapper {
  static const Map<String, String> _aliasMap = {
    "NAS100": "US100",
    "USTEC": "US100",
    "NDX": "US100",
    "NASDAQ100": "US100",
    "DJI": "US30",
    "WALLSTREET": "US30",
    "SPX": "US500",
    "SPX500": "US500",
    "GOLD": "XAUUSD",
    "SILVER": "XAGUSD",
    "PLATINUM": "XPTUSD",
    "COPPER": "XCUUSD",
    "XAU": "XAUUSD",
    "XAG": "XAGUSD",
    "XPT": "XPTUSD",
    "XCU": "XCUUSD",
    "BTC": "BTCUSD",
    "ETH": "ETHUSD",
  };

  // Normalizes any input symbol to internal standard (e.g. "BTCUSD", "XAUUSD", "US100", "EURUSD")
  static String normalizeSymbol(String symbol) {
    if (symbol.isEmpty) return "";

    String clean = symbol.toUpperCase().trim();
    if (clean.contains(':')) {
      clean = clean.split(':')[1];
    }

    // Strip perp suffixes (.P, -P, .PERP, -PERP, _PERP, -SWAP, _SWAP)
    clean = clean.replaceAll(RegExp(r'[\.\-_]?(P|PERP|SWAP)$', caseSensitive: false), '');
    clean = clean.replaceAll(RegExp(r'[\/\-_]'), '');

    // Strip currency suffixes for alias checking
    if (clean.endsWith('USDT')) {
      clean = clean.substring(0, clean.length - 4);
    } else if (clean.endsWith('USD')) {
      clean = clean.substring(0, clean.length - 3);
    }

    if (_aliasMap.containsKey(clean)) {
      return _aliasMap[clean]!;
    }

    // Known asset classes check
    const forex = {'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY', 'USDCAD', 'USDCHF', 'EURGBP'};
    const metals = {'XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD'};
    const indices = {'US100', 'US500', 'US30', 'GER40', 'UK100', 'FRA40', 'EU50'};

    final withUsd = '${clean}USD';
    if (forex.contains(withUsd) || metals.contains(withUsd)) {
      return withUsd;
    }
    if (indices.contains(clean)) {
      return clean;
    }
    if (forex.contains(clean) || metals.contains(clean)) {
      return clean;
    }

    // Default for crypto: append USD (e.g. BTC -> BTCUSD, MOODENG -> MOODENGUSD)
    return withUsd;
  }

  // Returns ticker for Binance Futures/Spot stream (e.g. "btcusdt", "moodengusdt", "adausdt", "xptusdt")
  static String? getBinanceSymbol(String symbol) {
    final rawUpper = symbol.toUpperCase().trim();
    if (rawUpper.contains('USDT')) {
      final clean = rawUpper
          .replaceAll(RegExp(r'[\.\-_]?(P|PERP|SWAP)$', caseSensitive: false), '')
          .replaceAll(RegExp(r'[\/\-_]'), '');
      return clean.toLowerCase();
    }
    if (getCategory(symbol) != 'CRYPTO') return null;
    
    final norm = normalizeSymbol(symbol);
    String base = norm;
    if (base.endsWith('USD')) {
      base = base.substring(0, base.length - 3);
    }
    return '${base.toLowerCase()}usdt';
  }

  // Returns all possible key representations of a symbol to guarantee 100% cache hit
  static List<String> getAllKeyVariations(String symbol) {
    final norm = normalizeSymbol(symbol);
    final rawUpper = symbol.toUpperCase().trim();
    final cleanAlpha = rawUpper.replaceAll(RegExp(r'[^A-Z0-9]'), '');
    String base = norm;
    if (base.endsWith('USD')) {
      base = base.substring(0, base.length - 3);
    }

    final keys = <String>{
      norm,
      rawUpper,
      cleanAlpha,
      '$base/USDT',
      '${base}USDT',
      '${base}USDT.P',
      '$base/USD',
      '${base}USD',
      base,
    };

    return keys.toList();
  }

  // Determine asset class
  static String getCategory(String symbol) {
    final norm = normalizeSymbol(symbol);

    const metals = {'XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD'};
    if (metals.contains(norm) || norm.startsWith('XAU') || norm.startsWith('XAG') || norm.startsWith('XPT')) {
      return 'METALS';
    }

    const indices = {'US100', 'US500', 'US30', 'GER40', 'UK100', 'FRA40', 'EU50'};
    if (indices.contains(norm)) {
      return 'INDICES';
    }

    const forex = {'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY', 'USDCAD', 'USDCHF', 'EURGBP', 'GBPAUD', 'EURAUD'};
    if (forex.contains(norm) || norm.endsWith('JPY')) {
      return 'FOREX';
    }

    return 'CRYPTO';
  }
}
