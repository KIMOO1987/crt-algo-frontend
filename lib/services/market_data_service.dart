import 'package:dio/dio.dart';
import 'symbol_mapper.dart';

class MarketDataService {
  final Dio _dio = Dio();

  String _normalizeInterval(String interval) {
    final s = interval.trim().toLowerCase();
    if (s == '1' || s == '1m') return '1m';
    if (s == '5' || s == '5m') return '5m';
    if (s == '15' || s == '15m') return '15m';
    if (s == '30' || s == '30m') return '30m';
    if (s == '60' || s == '1h' || s == 'h1') return '1h';
    if (s == '4h' || s == 'h4' || s == '240') return '4h';
    if (s == '1d' || s == 'd' || s == 'daily') return '1d';
    return '5m';
  }

  // Fetches candlestick bars for charting. Returns a list of candle maps (time, open, high, low, close)
  Future<List<Map<String, dynamic>>> fetchMarketCandles(String symbol, {String interval = '5m', String limit = '500'}) async {
    final category = SymbolMapper.getCategory(symbol);
    final clean = SymbolMapper.normalizeSymbol(symbol);
    final normInterval = _normalizeInterval(interval);

    if (category == 'CRYPTO') {
      final candles = await _fetchBinanceCandles(symbol, clean, normInterval, limit);
      if (candles.isNotEmpty) return candles;
      // Fallback to Yahoo if Binance crypto fails
      return await _fetchYahooCandles(clean, normInterval);
    } else {
      final candles = await _fetchYahooCandles(clean, normInterval);
      if (candles.isNotEmpty) return candles;
      // Fallback to Binance
      return await _fetchBinanceCandles(symbol, clean, normInterval, limit);
    }
  }

  // Fetch from Binance API (Futures first if .P or perp, then Spot)
  Future<List<Map<String, dynamic>>> _fetchBinanceCandles(String rawSymbol, String cleanSymbol, String interval, String limit) async {
    String binanceTicker = rawSymbol.toUpperCase().replaceAll('/', '').replaceAll('-', '').replaceAll('_', '');
    if (binanceTicker.endsWith('.P')) {
      binanceTicker = binanceTicker.substring(0, binanceTicker.length - 2);
    }
    if (!binanceTicker.endsWith('USDT') && !binanceTicker.endsWith('BUSD') && !binanceTicker.endsWith('BTC')) {
      final mapped = SymbolMapper.getBinanceSymbol(cleanSymbol)?.toUpperCase();
      binanceTicker = mapped ?? '${binanceTicker}USDT';
    }

    // 1. Try Binance Futures (fapi) first (supports perps, LTCUSDT, ADAUSDT, HBARUSDT, etc.)
    try {
      final response = await _dio.get(
        'https://fapi.binance.com/fapi/v1/klines',
        queryParameters: {
          'symbol': binanceTicker,
          'interval': interval,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data is List && (response.data as List).isNotEmpty) {
        final List rawData = response.data;
        return rawData.map<Map<String, dynamic>>((d) => {
          'time': (d[0] as num) ~/ 1000,
          'open': double.parse(d[1].toString()),
          'high': double.parse(d[2].toString()),
          'low': double.parse(d[3].toString()),
          'close': double.parse(d[4].toString()),
        }).toList();
      }
    } catch (_) {}

    // 2. Try Binance Spot (api.binance.com)
    try {
      final response = await _dio.get(
        'https://api.binance.com/api/v3/klines',
        queryParameters: {
          'symbol': binanceTicker,
          'interval': interval,
          'limit': limit,
        },
      );

      if (response.statusCode == 200 && response.data is List && (response.data as List).isNotEmpty) {
        final List rawData = response.data;
        return rawData.map<Map<String, dynamic>>((d) => {
          'time': (d[0] as num) ~/ 1000,
          'open': double.parse(d[1].toString()),
          'high': double.parse(d[2].toString()),
          'low': double.parse(d[3].toString()),
          'close': double.parse(d[4].toString()),
        }).toList();
      }
    } catch (e) {
      print("[MarketData] Binance klines failed for $binanceTicker: $e");
    }
    return [];
  }

  // Fetch from Yahoo Finance API directly (Forex, Metals, Indices)
  Future<List<Map<String, dynamic>>> _fetchYahooCandles(String cleanSymbol, String interval) async {
    String yahooInterval = '5m';
    String yahooRange = '5d';
    
    if (interval == '1m') {
      yahooInterval = '1m';
      yahooRange = '1d';
    } else if (interval == '5m') {
      yahooInterval = '5m';
      yahooRange = '5d';
    } else if (interval == '15m') {
      yahooInterval = '15m';
      yahooRange = '5d';
    } else if (interval == '30m') {
      yahooInterval = '30m';
      yahooRange = '5d';
    } else if (interval == '1h') {
      yahooInterval = '60m';
      yahooRange = '1mo';
    } else if (interval == '4h') {
      yahooInterval = '60m';
      yahooRange = '1mo';
    } else if (interval == '1d') {
      yahooInterval = '1d';
      yahooRange = '6mo';
    }

    String yahooSymbol = cleanSymbol;
    if (cleanSymbol == 'XAUUSD' || cleanSymbol == 'GOLD') {
      yahooSymbol = 'GC=F';
    } else if (cleanSymbol == 'XAGUSD' || cleanSymbol == 'SILVER') {
      yahooSymbol = 'SI=F';
    } else if (cleanSymbol == 'XPTUSD' || cleanSymbol == 'PLATINUM' || cleanSymbol.contains('XPT')) {
      yahooSymbol = 'PL=F';
    } else if (cleanSymbol == 'XCUUSD' || cleanSymbol == 'COPPER') {
      yahooSymbol = 'HG=F';
    } else if (cleanSymbol == 'US100' || cleanSymbol == 'NAS100' || cleanSymbol == 'NASDAQ100') {
      yahooSymbol = '%5ENDX';
    } else if (cleanSymbol == 'US500' || cleanSymbol == 'SPX500') {
      yahooSymbol = '%5EGSPC';
    } else if (cleanSymbol == 'US30') {
      yahooSymbol = '%5EDJI';
    } else {
      // Forex pairs (always append =X)
      const forex = {'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'CHFJPY', 'USDCAD', 'USDCHF', 'EURGBP'};
      if (forex.contains(cleanSymbol) || cleanSymbol.endsWith('USD') || cleanSymbol.endsWith('JPY')) {
        yahooSymbol = '$cleanSymbol=X';
      }
    }

    try {
      final url = 'https://query1.finance.yahoo.com/v8/finance/chart/$yahooSymbol?interval=$yahooInterval&range=$yahooRange';
      final response = await _dio.get(
        url,
        options: Options(headers: {'User-Agent': 'Mozilla/5.0'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        final chartData = response.data['chart']['result'][0];
        final List timestamps = chartData['timestamp'] ?? [];
        final Map quotes = chartData['indicators']['quote'][0];
        
        final List opens = quotes['open'] ?? [];
        final List highs = quotes['high'] ?? [];
        final List lows = quotes['low'] ?? [];
        final List closes = quotes['close'] ?? [];

        final List<Map<String, dynamic>> candles = [];

        for (int i = 0; i < timestamps.length; i++) {
          if (opens[i] != null && highs[i] != null && lows[i] != null && closes[i] != null) {
            candles.add({
              'time': timestamps[i],
              'open': (opens[i] as num).toDouble(),
              'high': (highs[i] as num).toDouble(),
              'low': (lows[i] as num).toDouble(),
              'close': (closes[i] as num).toDouble(),
            });
          }
        }
        return candles;
      }
    } catch (e) {
      print("[MarketData] Yahoo chart failed for $yahooSymbol: $e");
    }
    return [];
  }

  // Fetches a single instant price quote for any symbol across Crypto, Metals, Forex, Indices
  Future<double?> fetchMarketQuote(String symbol) async {
    final category = SymbolMapper.getCategory(symbol);
    final clean = SymbolMapper.normalizeSymbol(symbol);

    if (category == 'CRYPTO') {
      final binanceTicker = SymbolMapper.getBinanceSymbol(symbol)?.toUpperCase() ?? '${clean.replaceAll('USD', '')}USDT';
      // 1. Try Binance Futures (fapi)
      try {
        final res = await _dio.get(
          'https://fapi.binance.com/fapi/v1/ticker/price',
          queryParameters: {'symbol': binanceTicker},
          options: Options(receiveTimeout: const Duration(seconds: 4)),
        );
        if (res.statusCode == 200 && res.data != null && res.data['price'] != null) {
          return double.tryParse(res.data['price'].toString());
        }
      } catch (_) {}
      // 2. Try Binance Spot
      try {
        final res = await _dio.get(
          'https://api.binance.com/api/v3/ticker/price',
          queryParameters: {'symbol': binanceTicker},
          options: Options(receiveTimeout: const Duration(seconds: 4)),
        );
        if (res.statusCode == 200 && res.data != null && res.data['price'] != null) {
          return double.tryParse(res.data['price'].toString());
        }
      } catch (_) {}
    } else {
      // Forex / Metals / Indices from Yahoo
      try {
        final candles = await _fetchYahooCandles(clean, '1m');
        if (candles.isNotEmpty) {
          return (candles.last['close'] as num).toDouble();
        }
      } catch (_) {}
    }
    return null;
  }
}
