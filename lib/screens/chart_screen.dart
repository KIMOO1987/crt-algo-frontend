import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:webview_flutter/webview_flutter.dart';
import '../providers/signals_provider.dart';
import '../services/market_data_service.dart';

class ChartScreen extends StatefulWidget {
  final LiveSignal liveSignal;

  const ChartScreen({super.key, required this.liveSignal});

  @override
  State<ChartScreen> createState() => _ChartScreenState();
}

class _ChartScreenState extends State<ChartScreen> {
  late final WebViewController _webViewController;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _initWebView();
    } else {
      _isLoading = false;
    }
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF07080D)) // Matches scaffold background
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            _loadMarketData();
          },
          onWebResourceError: (WebResourceError error) {
            print("[WebView] Resource Error: ${error.description}");
            setState(() {
              _hasError = true;
              _isLoading = false;
            });
          },
        ),
      )
      ..loadFlutterAsset('assets/chart/index.html');
  }

  Future<void> _loadMarketData() async {
    final s = widget.liveSignal.signal;
    try {
      // 1. Fetch candlestick bars from API
      final String tfPart = s.tfAlignment.split('/').first.trim().toLowerCase();
      final List<Map<String, dynamic>> candles = await MarketDataService().fetchMarketCandles(
        s.symbol,
        interval: tfPart.isNotEmpty ? tfPart : '5m',
      );

      if (candles.isEmpty) {
        setState(() {
          _hasError = true;
          _isLoading = false;
        });
        return;
      }

      // 2. Feed candlestick data to JS chart
      final String jsonCandles = jsonEncode(candles);
      await _webViewController.runJavaScript("setChartData($jsonCandles)");

      // 3. Inject entry, TP1-4, and stop-loss price lines
      final double entry = s.entryPrice;
      final double tp1 = s.tp;
      final double tp2 = s.tpSecondary ?? 0.0;
      final double tp3 = s.tp3 ?? 0.0;
      final double tp4 = s.tp4 ?? 0.0;
      final double sl = s.sl;
      final bool isTp1Hit = widget.liveSignal.liveStatus.contains('TP1') || 
                            widget.liveSignal.liveStatus.contains('WIN');

      await _webViewController.runJavaScript("setPriceLevels($entry, $tp1, $tp2, $tp3, $tp4, $sl, $isTp1Hit)");

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      print("[ChartScreen] Error loading chart market data: $e");
      setState(() {
        _hasError = true;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.liveSignal.signal;
    final isBuy = s.side.toUpperCase() == 'BUY' || s.side.toUpperCase() == 'BULLISH';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${s.symbol} CRT CHART',
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ),
            Text(
              '${s.side} • ${s.tfAlignment}'.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                color: isBuy ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
      ),
      body: Stack(
        children: [
          // WebView Container
          if (!_hasError && !kIsWeb)
            WebViewWidget(controller: _webViewController),

          // Fallback UI for Web Preview (WebViews are not supported natively in browser environments)
          if (kIsWeb)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.show_chart, color: Color(0xFFF97316), size: 64),
                    const SizedBox(height: 16),
                    const Text(
                      'TRADINGVIEW CHART PREVIEW',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF141724),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E2235)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('SYMBOL: ${s.symbol}', style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold)),
                          Text('ENTRY: ${s.entryPrice.toStringAsFixed(5)}', style: const TextStyle(fontFamily: 'monospace')),
                          Text('TP-1: ${s.tp.toStringAsFixed(5)}', style: const TextStyle(fontFamily: 'monospace', color: Color(0xFF10B981))),
                          if (s.tpSecondary != null)
                            Text('TP-2: ${s.tpSecondary!.toStringAsFixed(5)}', style: const TextStyle(fontFamily: 'monospace', color: Color(0xFFEAB308))),
                          Text('STOP LOSS: ${s.sl.toStringAsFixed(5)}', style: const TextStyle(fontFamily: 'monospace', color: Color(0xFFEF4444))),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Note: WebView is supported on native Android and iOS devices. In Web mode, the chart is represented by the price levels above.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                    ),
                  ],
                ),
              ),
            ),

          // Error State View
          if (_hasError)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 48),
                    const SizedBox(height: 16),
                    const Text(
                      'FAILED TO LOAD MARKET CHART',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please verify your internet connection or check the symbol name mapping for ${s.symbol}.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _isLoading = true;
                          _hasError = false;
                        });
                        _initWebView();
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('RETRY LOADING'),
                    )
                  ],
                ),
              ),
            ),

          // Loader Overlay
          if (_isLoading)
            Container(
              color: const Color(0xFF07080D),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: Color(0xFFF97316)),
                    const SizedBox(height: 16),
                    Text(
                      'LOADING REALTIME ${s.symbol} CRT LEVELS...',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF71717A),
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
