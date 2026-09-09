import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'symbol_mapper.dart';
import 'market_data_service.dart';

class BinanceWsService {
  static final BinanceWsService _instance = BinanceWsService._internal();
  factory BinanceWsService() => _instance;
  BinanceWsService._internal();

  WebSocketChannel? _channel;
  final StreamController<Map<String, double>> _priceStreamController =
      StreamController<Map<String, double>>.broadcast();
  final Map<String, double> _cachedPrices = {};
  final Map<String, double> _cachedHighs = {};
  final Map<String, double> _cachedLows = {};
  List<String> _currentSubscribedSymbols = [];
  Timer? _futuresPollerTimer;
  Timer? _nonCryptoPollerTimer;
  Timer? _throttleTimer;
  bool _hasPendingEmission = false;
  final Dio _dio = Dio();

  Stream<Map<String, double>> get priceStream => _priceStreamController.stream;
  Map<String, double> get cachedPrices => _cachedPrices;

  // Instant lookup for any symbol variation
  double? getPrice(String symbol) {
    if (_cachedPrices.containsKey(symbol)) return _cachedPrices[symbol];
    final norm = SymbolMapper.normalizeSymbol(symbol);
    if (_cachedPrices.containsKey(norm)) return _cachedPrices[norm];
    for (final v in SymbolMapper.getAllKeyVariations(symbol)) {
      if (_cachedPrices.containsKey(v)) return _cachedPrices[v];
    }
    return null;
  }

  double? get24hHigh(String symbol) {
    final norm = SymbolMapper.normalizeSymbol(symbol);
    return _cachedHighs[norm] ?? _cachedHighs[symbol];
  }

  double? get24hLow(String symbol) {
    final norm = SymbolMapper.normalizeSymbol(symbol);
    return _cachedLows[norm] ?? _cachedLows[symbol];
  }

  // Subscribes to symbols: starts Spot WS + 2s Futures REST + Forex/Metals poller
  void subscribeToSymbols(List<String> symbols) {
    if (symbols.isEmpty) return;

    // 1. Instant REST call so prices appear immediately without delay
    _pollFuturesQuotes();

    // 2. Separate spot crypto from non-crypto
    final cryptoTickers = <String>[];
    final nonCryptoSymbols = <String>[];

    for (final s in symbols) {
      final cat = SymbolMapper.getCategory(s);
      final ticker = SymbolMapper.getBinanceSymbol(s);
      if (ticker != null) {
        cryptoTickers.add(ticker);
      }
      if (cat != 'CRYPTO' && !s.toUpperCase().contains('USDT')) {
        nonCryptoSymbols.add(s);
      }
    }

    // 3. Connect to Binance Spot WebSocket (wss://stream.binance.com:9443)
    final uniqueCrypto = cryptoTickers.toSet().toList()..sort();
    final tempCurrent = List<String>.from(_currentSubscribedSymbols)..sort();
    if (uniqueCrypto.join(',') != tempCurrent.join(',')) {
      _currentSubscribedSymbols = uniqueCrypto;
      if (uniqueCrypto.isNotEmpty) {
        _connectSpotWs(uniqueCrypto);
      } else {
        _closeConnection();
      }
    }

    // 4. Start dedicated 2-second poller for Binance Futures (covers perps like MOODENG, GRASS, LTC, WIF, KAITO, S, etc.)
    _startFuturesPoller();

    // 5. Start polling loop for Non-Crypto (Forex, Metals, Indices)
    _startNonCryptoPoller(nonCryptoSymbols.toSet().toList());
  }

  // Periodic 2-second poller for Binance Futures tickers (all 766 contracts in 1 fast HTTP request)
  void _startFuturesPoller() {
    _futuresPollerTimer?.cancel();
    _futuresPollerTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      _pollFuturesQuotes();
    });
  }

  Future<void> _pollFuturesQuotes() async {
    try {
      final res = await _dio.get(
        'https://fapi.binance.com/fapi/v1/ticker/24hr',
        options: Options(receiveTimeout: const Duration(seconds: 3)),
      );
      if (res.statusCode == 200 && res.data is List) {
        final List list = res.data;
        for (final item in list) {
          if (item is Map && item['symbol'] != null) {
            final sym = item['symbol'].toString();
            final double? price = double.tryParse(item['lastPrice']?.toString() ?? '');
            final double? high = double.tryParse(item['highPrice']?.toString() ?? '');
            final double? low = double.tryParse(item['lowPrice']?.toString() ?? '');
            if (price != null && price > 0) {
              _cacheAllVariations(sym, price);
            }
            if (high != null) {
              _cachedHighs[sym] = high;
              _cachedHighs[SymbolMapper.normalizeSymbol(sym)] = high;
            }
            if (low != null) {
              _cachedLows[sym] = low;
              _cachedLows[SymbolMapper.normalizeSymbol(sym)] = low;
            }
          }
        }
        _throttleNotify();
      }
    } catch (_) {
      // Fallback to simple price endpoint if 24hr has hiccup
      try {
        final res = await _dio.get(
          'https://fapi.binance.com/fapi/v1/ticker/price',
          options: Options(receiveTimeout: const Duration(seconds: 2)),
        );
        if (res.statusCode == 200 && res.data is List) {
          for (final item in (res.data as List)) {
            if (item is Map && item['symbol'] != null && item['price'] != null) {
              final double? p = double.tryParse(item['price'].toString());
              if (p != null && p > 0) {
                _cacheAllVariations(item['symbol'].toString(), p);
              }
            }
          }
          _throttleNotify();
        }
      } catch (_) {}
    }
  }

  // Binance Spot WebSocket connection (reliable, emits hundreds of events per second)
  void _connectSpotWs(List<String> binanceSymbols) {
    _closeConnection();

    final streams = binanceSymbols.map((s) => '$s@ticker').join('/');
    final url = 'wss://stream.binance.com:9443/stream?streams=$streams';

    try {
      _channel = WebSocketChannel.connect(Uri.parse(url));

      _channel!.stream.listen(
        (message) {
          try {
            final Map<String, dynamic> rawData = jsonDecode(message);
            final data = rawData['data'] ?? rawData;

            if (data != null && data['s'] != null && data['c'] != null) {
              final String rawSymbol = data['s'] as String;
              final double closePrice = double.tryParse(data['c'] as String) ?? 0.0;
              if (closePrice > 0) {
                _cacheAllVariations(rawSymbol, closePrice);
                _throttleNotify();
              }
            }
          } catch (e) {
            print("[Binance WS] Parsing Error: $e");
          }
        },
        onError: (err) {
          print("[Binance WS] WebSocket Error: $err");
          _reconnect(binanceSymbols);
        },
        onDone: () {
          print("[Binance WS] Connection closed.");
        },
        cancelOnError: false,
      );
    } catch (e) {
      print("[Binance WS] Connection Exception: $e");
    }
  }

  void _reconnect(List<String> binanceSymbols) {
    Future.delayed(const Duration(seconds: 4), () {
      if (_currentSubscribedSymbols.isNotEmpty) {
        _connectSpotWs(binanceSymbols);
      }
    });
  }

  // Polling loop for Forex, Metals, Indices every 4 seconds
  void _startNonCryptoPoller(List<String> nonCryptoSymbols) {
    _nonCryptoPollerTimer?.cancel();
    if (nonCryptoSymbols.isEmpty) return;

    _pollQuotes(nonCryptoSymbols);
    _nonCryptoPollerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _pollQuotes(nonCryptoSymbols);
    });
  }

  Future<void> _pollQuotes(List<String> nonCryptoSymbols) async {
    for (final s in nonCryptoSymbols) {
      try {
        final price = await MarketDataService().fetchMarketQuote(s);
        if (price != null && price > 0) {
          _cacheAllVariations(s, price);
        }
      } catch (_) {}
    }
    _throttleNotify();
  }

  // Saves a price under every normalized and raw variation
  void _cacheAllVariations(String symbol, double price) {
    final keys = SymbolMapper.getAllKeyVariations(symbol);
    for (final k in keys) {
      _cachedPrices[k] = price;
    }
  }

  // Inspects past candles since trade creation to detect if wick hit TP2, TP1, or SL
  Future<String?> inspectPastCandles({
    required String symbol,
    required String side,
    required double entryPrice,
    required double sl,
    required double tp1,
    double? tp2,
    DateTime? createdAt,
  }) async {
    if (entryPrice <= 0 || sl <= 0 || tp1 <= 0) return null;

    try {
      final candles = await MarketDataService().fetchMarketCandles(symbol, interval: '5m', limit: '30');
      if (candles.isEmpty) return null;

      final isBuy = side.toUpperCase() == 'BUY' || side.toUpperCase() == 'BULLISH';
      final cutoffMs = createdAt != null
          ? createdAt.subtract(const Duration(minutes: 5)).millisecondsSinceEpoch ~/ 1000
          : 0;

      double maxHigh = -double.infinity;
      double minLow = double.infinity;

      for (final c in candles) {
        final time = (c['time'] as num).toInt();
        if (time >= cutoffMs) {
          final high = (c['high'] as num).toDouble();
          final low = (c['low'] as num).toDouble();
          if (high > maxHigh) maxHigh = high;
          if (low < minLow) minLow = low;
        }
      }

      const tolerance = 0.00005;

      if (isBuy) {
        if (tp2 != null && tp2 > 0 && maxHigh >= (tp2 * (1 - tolerance))) {
          return 'TP2';
        }
        if (maxHigh >= (tp1 * (1 - tolerance))) {
          return 'TP1';
        }
        if (minLow <= (sl * (1 + tolerance))) {
          return 'SL';
        }
      } else {
        if (tp2 != null && tp2 > 0 && minLow <= (tp2 * (1 + tolerance))) {
          return 'TP2';
        }
        if (minLow <= (tp1 * (1 + tolerance))) {
          return 'TP1';
        }
        if (maxHigh >= (sl * (1 - tolerance))) {
          return 'SL';
        }
      }
    } catch (_) {}
    return null;
  }

  // Throttled notification so Riverpod doesn't rebuild too frequently (100ms)
  void _throttleNotify() {
    if (_throttleTimer != null && _throttleTimer!.isActive) {
      _hasPendingEmission = true;
      return;
    }
    _notifyStream();
    _throttleTimer = Timer(const Duration(milliseconds: 100), () {
      if (_hasPendingEmission) {
        _hasPendingEmission = false;
        _notifyStream();
      }
    });
  }

  void _notifyStream() {
    if (!_priceStreamController.isClosed) {
      _priceStreamController.add(Map<String, double>.from(_cachedPrices));
    }
  }

  void _closeConnection() {
    _channel?.sink.close();
    _channel = null;
  }

  void dispose() {
    _futuresPollerTimer?.cancel();
    _nonCryptoPollerTimer?.cancel();
    _throttleTimer?.cancel();
    _closeConnection();
    _priceStreamController.close();
  }
}

