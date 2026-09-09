import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:webview_flutter/webview_flutter.dart';
import '../services/market_data_service.dart';
import '../services/binance_ws_service.dart';
import '../widgets/nav_drawer.dart';
import 'dashboard_screen.dart';

class ProTerminalScreen extends StatefulWidget {
  final String initialSymbol;

  const ProTerminalScreen({super.key, this.initialSymbol = 'BTCUSDT'});

  @override
  State<ProTerminalScreen> createState() => _ProTerminalScreenState();
}

class _ProTerminalScreenState extends State<ProTerminalScreen> {
  late String _selectedSymbol;
  String _selectedTimeframe = '15m';
  late final WebViewController _webViewController;
  bool _isLoading = true;
  bool _hasError = false;

  final List<String> _popularSymbols = [
    'BTCUSDT',
    'ETHUSDT',
    'SOLUSDT',
    'BNBUSDT',
    'XRPUSDT',
    'XAUUSD',
    'EURUSD',
    'GBPUSD',
    'US100',
  ];

  final List<String> _timeframes = ['5m', '15m', '30m', '1h', '4h', '1D'];

  @override
  void initState() {
    super.initState();
    _selectedSymbol = widget.initialSymbol;
    if (!kIsWeb) {
      _initWebView();
    } else {
      _isLoading = false;
    }
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF07080D))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            _loadMarketData();
          },
          onWebResourceError: (WebResourceError error) {
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
    setState(() => _isLoading = true);
    try {
      final List<Map<String, dynamic>> candles = await MarketDataService().fetchMarketCandles(
        _selectedSymbol,
        interval: _selectedTimeframe,
      );

      if (candles.isEmpty) {
        setState(() {
          _hasError = true;
          _isLoading = false;
        });
        return;
      }

      final String jsonCandles = jsonEncode(candles);
      await _webViewController.runJavaScript("setChartData($jsonCandles)");

      // Subscribe to live price stream for forming candle updates
      BinanceWsService().subscribeToSymbols([_selectedSymbol]);

      setState(() {
        _isLoading = false;
        _hasError = false;
      });
    } catch (e) {
      setState(() {
        _hasError = true;
        _isLoading = false;
      });
    }
  }

  void _onSymbolChanged(String symbol) {
    if (_selectedSymbol == symbol) return;
    setState(() {
      _selectedSymbol = symbol;
    });
    _loadMarketData();
  }

  void _onTimeframeChanged(String tf) {
    if (_selectedTimeframe == tf) return;
    setState(() {
      _selectedTimeframe = tf;
    });
    _loadMarketData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'chart'),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F111A),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          tooltip: 'Back to Dashboard',
          onPressed: () {
            if (Navigator.canPop(context)) {
              Navigator.pop(context);
            } else {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const DashboardScreen()),
              );
            }
          },
        ),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        title: Row(
          children: [
            const Icon(Icons.candlestick_chart, color: Color(0xFFF97316), size: 20),
            const SizedBox(width: 8),
            const Text(
              'PRO',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
            ),
            const SizedBox(width: 4),
            Text(
              'TERMINAL',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
                fontSize: 16,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 20, color: Color(0xFFA1A1AA)),
            onPressed: _loadMarketData,
            tooltip: 'Reload Chart',
          ),
          Builder(
            builder: (scaffoldContext) => IconButton(
              icon: const Icon(Icons.menu, size: 22, color: Colors.white),
              tooltip: 'Menu',
              onPressed: () => Scaffold.of(scaffoldContext).openDrawer(),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          // Control Bar: Symbol Selector & Timeframe Pills
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFF0F111A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E2235), width: 1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Symbol Dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF141724),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF1E2235)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedSymbol,
                      dropdownColor: const Color(0xFF0F111A),
                      icon: const Icon(Icons.arrow_drop_down, color: Color(0xFFF97316), size: 18),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                      items: _popularSymbols.map((s) {
                        return DropdownMenuItem<String>(
                          value: s,
                          child: Text(s),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) _onSymbolChanged(val);
                      },
                    ),
                  ),
                ),

                // Timeframe Selector Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _timeframes.map((tf) {
                      final isSelected = _selectedTimeframe == tf;
                      return GestureDetector(
                        onTap: () => _onTimeframeChanged(tf),
                        child: Container(
                          margin: const EdgeInsets.only(left: 4),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFFF97316) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235),
                            ),
                          ),
                          child: Text(
                            tf,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                              color: isSelected ? Colors.white : const Color(0xFF71717A),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Chart View Area
          Expanded(
            child: Stack(
              children: [
                if (!kIsWeb)
                  WebViewWidget(controller: _webViewController)
                else
                  const Center(
                    child: Text('Web preview mode: interactive chart active on device.'),
                  ),

                // Loading Overlay
                if (_isLoading)
                  Container(
                    color: const Color(0xFF07080D).withValues(alpha: 0.8),
                    child: const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          CircularProgressIndicator(color: Color(0xFFF97316)),
                          SizedBox(height: 16),
                          Text(
                            'STREAMING MARKET DATA...',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.5,
                              color: Color(0xFFF97316),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // Error State
                if (_hasError)
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.cloud_off, size: 48, color: Color(0xFFEF4444)),
                        const SizedBox(height: 12),
                        const Text(
                          'COULD NOT LOAD FEED',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFFEF4444)),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadMarketData,
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('RETRY'),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316)),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
