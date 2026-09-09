import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/supabase_service.dart';
import '../services/binance_ws_service.dart';
import '../services/symbol_mapper.dart';
import '../widgets/nav_drawer.dart';
import 'chart_screen.dart';
import '../models/signal_model.dart';
import '../providers/signals_provider.dart';
import '../widgets/grade_stars_widget.dart';

class SfpScreen extends ConsumerStatefulWidget {
  const SfpScreen({super.key});

  @override
  ConsumerState<SfpScreen> createState() => _SfpScreenState();
}

class _SfpScreenState extends ConsumerState<SfpScreen> {
  final _supabase = SupabaseService().client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _signals = [];
  String _selectedTab = 'ACTIVE'; // ACTIVE, RADAR, AUDIT, HISTORY
  String _selectedCategory = 'ALL'; // ALL, CRYPTO, FOREX, METALS, INDICES
  String _selectedTf = 'ALL';

  final List<String> _timeframes = ['ALL', '5m', '15m', '30m', '1H', '4H', '1D'];
  final List<String> _categories = ['ALL', 'CRYPTO', 'FOREX', 'METALS', 'INDICES'];

  @override
  void initState() {
    super.initState();
    _loadSfpSignals();
  }

  Future<void> _loadSfpSignals() async {
    setState(() => _isLoading = true);
    try {
      var query = _supabase.from('sfp_signals').select();

      if (_selectedTab == 'ACTIVE') {
        query = query.eq('is_active', true);
      } else if (_selectedTab == 'RADAR') {
        query = query.or('status.ilike.%RADAR%,status.ilike.%PENDING%,phase.ilike.%MANIPULATION%');
      } else if (_selectedTab == 'AUDIT') {
        query = query.eq('is_active', false).inFilter('status', ['WIN', 'LOSS', 'TP1', 'TP2', 'TP3', 'TP4', 'SL']);
      } else if (_selectedTab == 'HISTORY') {
        query = query.eq('is_active', false);
      }

      if (_selectedCategory != 'ALL') {
        query = query.eq('category', _selectedCategory);
      }

      if (_selectedTf != 'ALL') {
        query = query.eq('tf', _selectedTf);
      }

      var data = await query.order('created_at', ascending: false).limit(80);

      // Fallback for active if table has no active flags
      if ((data as List).isEmpty && _selectedTab == 'ACTIVE') {
        final fallback = await _supabase.from('sfp_signals').select().order('created_at', ascending: false).limit(30);
        data = fallback;
      }

      final list = List<Map<String, dynamic>>.from(data);
      final symbols = list.map((m) => m['symbol']?.toString() ?? '').where((s) => s.isNotEmpty).toList();
      if (symbols.isNotEmpty) {
        BinanceWsService().subscribeToSymbols(symbols);
      }

      for (final m in list) {
        if (m['is_active'] == true && (m['status'] ?? '').toString().toUpperCase() == 'ENTRY') {
          _auditSfpCandles(m);
        }
      }

      if (mounted) {
        setState(() {
          _signals = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _auditSfpCandles(Map<String, dynamic> s) async {
    try {
      final symbol = s['symbol'] ?? '';
      final side = (s['direction'] ?? s['side'] ?? 'BUY').toString();
      final entry = (num.tryParse(s['entry_price']?.toString() ?? '0') ?? 0).toDouble();
      final sl = (num.tryParse(s['sl']?.toString() ?? '0') ?? 0).toDouble();
      final tp = (num.tryParse(s['tp']?.toString() ?? '0') ?? 0).toDouble();
      final tp2 = (num.tryParse(s['tp2']?.toString() ?? '0') ?? 0).toDouble();
      final id = s['id']?.toString() ?? '';
      final createdAt = DateTime.tryParse(s['created_at']?.toString() ?? '');

      final detected = await BinanceWsService().inspectPastCandles(
        symbol: symbol,
        side: side,
        entryPrice: entry,
        sl: sl,
        tp1: tp,
        tp2: tp2 > 0 ? tp2 : null,
        createdAt: createdAt,
      );

      if (detected != null && id.isNotEmpty) {
        TargetLatchManager.setLatch(id, detected);
        final shouldDeactivate = detected != 'TP1';
        await SupabaseService().client.from('sfp_signals').update({
          'status': detected,
          'is_active': !shouldDeactivate,
        }).eq('id', id);
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final livePricesAsync = ref.watch(livePricesStreamProvider);
    final livePrices = livePricesAsync.value ?? BinanceWsService().cachedPrices;

    int total = _signals.length;
    int wins = _signals.where((s) {
      final st = (s['status'] ?? s['result'] ?? '').toString().toUpperCase();
      return st.contains('WIN') || st.contains('TP');
    }).length;
    String winRate = total > 0 ? '${((wins / total) * 100).toStringAsFixed(1)}%' : '0.0%';

    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'sfp'),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F111A),
        elevation: 0,
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        title: Row(
          children: [
            const Icon(Icons.radar, color: Color(0xFFF97316), size: 20),
            const SizedBox(width: 8),
            const Text(
              'SFP',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
            ),
            const SizedBox(width: 4),
            Text(
              'HUNTER',
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
            onPressed: _loadSfpSignals,
            tooltip: 'Refresh SFP Signals',
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
          // Sub-Tabs Header (LIVE SWEEPS, RADAR WATCH, VERIFIED AUDIT, TRADE LOG)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFF0F111A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E2235), width: 1)),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildSubTab('ACTIVE', 'LIVE SWEEPS'),
                  const SizedBox(width: 6),
                  _buildSubTab('RADAR', 'RADAR WATCH'),
                  const SizedBox(width: 6),
                  _buildSubTab('AUDIT', 'VERIFIED AUDIT'),
                  const SizedBox(width: 6),
                  _buildSubTab('HISTORY', 'TRADE LOG'),
                ],
              ),
            ),
          ),

          // Overview Stats Panel
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF0F111A).withValues(alpha: 0.5),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetric('TOTAL SWEEPS', '$total'),
                _buildMetric('SWEEP WINS', '$wins', isSuccess: true),
                _buildMetric('WIN RATE', winRate, isSuccess: true),
              ],
            ),
          ),

          // Category & Timeframe Filters Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: const BoxDecoration(
              color: Color(0xFF0F111A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E2235), width: 1)),
            ),
            child: Column(
              children: [
                // Category Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _categories.map((cat) {
                      final isSel = _selectedCategory == cat;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedCategory = cat);
                          _loadSfpSignals();
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFF1E2235) : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isSel ? const Color(0xFFF97316) : const Color(0xFF1E2235),
                            ),
                          ),
                          child: Text(
                            cat,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                              color: isSel ? Colors.white : const Color(0xFF71717A),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 6),
                // Timeframe Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _timeframes.map((tf) {
                      final isSel = _selectedTf == tf;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedTf = tf);
                          _loadSfpSignals();
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isSel ? const Color(0xFFF97316) : Colors.transparent,
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: isSel ? const Color(0xFFF97316) : const Color(0xFF1E2235),
                            ),
                          ),
                          child: Text(
                            tf,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                              color: isSel ? Colors.white : const Color(0xFF71717A),
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

          // Signals List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
                : RefreshIndicator(
                    onRefresh: _loadSfpSignals,
                    child: _signals.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: [
                              SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                              Center(
                                child: Column(
                                  children: [
                                    const Icon(Icons.sensors_off, size: 40, color: Color(0xFF52525B)),
                                    const SizedBox(height: 10),
                                    Text(
                                      'NO SFP SIGNALS IN $_selectedTab',
                                      style: const TextStyle(color: Color(0xFF71717A), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: _signals.length,
                            itemBuilder: (context, idx) {
                              final s = _signals[idx];
                              final symbol = s['symbol'] ?? '---';
                              final side = (s['direction'] ?? s['side'] ?? 'BUY').toString().toUpperCase();
                              final isBuy = side == 'BUY' || side == 'BULLISH';
                              final tf = (s['tf'] ?? '15m').toString().toUpperCase();
                              final entry = (num.tryParse(s['entry_price']?.toString() ?? '0') ?? 0).toDouble();
                              final sl = (num.tryParse(s['sl']?.toString() ?? '0') ?? 0).toDouble();
                              final tp = (num.tryParse(s['tp']?.toString() ?? '0') ?? 0).toDouble();
                              final tp2 = (num.tryParse(s['tp2']?.toString() ?? '0') ?? 0).toDouble();
                              final phase = s['phase'] ?? '';
                              final grade = s['grade'] ?? '';
                              final rawStatus = (s['status'] ?? (s['is_active'] == true ? 'ACTIVE' : 'COMPLETED')).toString().toUpperCase();

                              // Resolve real-time live price
                              final wsPrice = BinanceWsService().getPrice(symbol) ??
                                  livePrices[symbol] ??
                                  livePrices[SymbolMapper.normalizeSymbol(symbol)];
                              final double currentPrice = (wsPrice != null && wsPrice > 0) ? wsPrice : entry;
                              final double pnlPercent = entry > 0 ? ((isBuy ? (currentPrice - entry) : (entry - currentPrice)) / entry * 100) : 0.0;
                              final bool isProfit = pnlPercent >= 0;

                              final signalModel = SignalModel(
                                id: s['id']?.toString() ?? '',
                                symbol: symbol,
                                side: side,
                                strategy: 'SFP_ALGO',
                                tfAlignment: tf,
                                status: rawStatus,
                                entryPrice: entry,
                                sl: sl,
                                tp: tp,
                                tpSecondary: tp2 > 0 ? tp2 : null,
                                tp3: (num.tryParse(s['tp3']?.toString() ?? '0') ?? 0).toDouble(),
                                tp4: (num.tryParse(s['tp4']?.toString() ?? '0') ?? 0).toDouble(),
                                grade: grade.isNotEmpty ? grade : 'NORMAL',
                                createdAt: s['created_at']?.toString() ?? '',
                                isActive: s['is_active'] == true,
                                currentPrice: currentPrice,
                              );

                              final liveStatus = getLiveStatus(signalModel, currentPrice);
                              final liveRR = calculateLiveRR(signalModel, currentPrice);

                              final liveSignal = LiveSignal(
                                signal: signalModel,
                                currentPrice: currentPrice,
                                pnlPercent: pnlPercent,
                                liveStatus: liveStatus,
                                liveRR: liveRR,
                              );

                              Color statusBgColor = const Color(0xFF1E2235);
                              Color statusTextColor = const Color(0xFFF97316);
                              if (liveStatus.contains('TP') || liveStatus.contains('WIN')) {
                                statusBgColor = const Color(0xFF10B981).withValues(alpha: 0.15);
                                statusTextColor = const Color(0xFF10B981);
                              } else if (liveStatus.contains('SL') || liveStatus.contains('Stopped')) {
                                statusBgColor = const Color(0xFFEF4444).withValues(alpha: 0.15);
                                statusTextColor = const Color(0xFFEF4444);
                              } else if (liveStatus.contains('BE')) {
                                statusBgColor = const Color(0xFFEAB308).withValues(alpha: 0.15);
                                statusTextColor = const Color(0xFFEAB308);
                              }

                              return GestureDetector(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => ChartScreen(liveSignal: liveSignal),
                                    ),
                                  );
                                },
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0F111A),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFF1E2235)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Text(
                                                symbol,
                                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: (isBuy ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.15),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  side,
                                                  style: TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 9,
                                                    color: isBuy ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                tf,
                                                style: const TextStyle(fontSize: 10, color: Color(0xFF71717A)),
                                              ),
                                              if (phase.isNotEmpty) ...[
                                                const SizedBox(width: 6),
                                                Text(
                                                  '• $phase',
                                                  style: const TextStyle(fontSize: 9, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold),
                                                ),
                                              ],
                                            ],
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: statusBgColor,
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: statusTextColor.withValues(alpha: 0.3)),
                                            ),
                                            child: Text(
                                              liveStatus,
                                              style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: statusTextColor),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          _buildPriceColumn('ENTRY', entry.toStringAsFixed(entry < 1 ? 6 : (entry < 50 ? 4 : 2))),
                                          _buildPriceColumn(
                                            'LIVE PRICE',
                                            currentPrice.toStringAsFixed(currentPrice < 1 ? 6 : (currentPrice < 50 ? 4 : 2)),
                                            color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                          ),
                                          _buildPriceColumn('STOP LOSS', sl.toStringAsFixed(sl < 1 ? 6 : (sl < 50 ? 4 : 2)), color: const Color(0xFFEF4444)),
                                          _buildPriceColumn('TARGET', tp.toStringAsFixed(tp < 1 ? 6 : (tp < 50 ? 4 : 2)), color: const Color(0xFF10B981)),
                                          _buildPriceColumn('TARGET R:R', calculatePotentialRR(signalModel), color: const Color(0xFF38BDF8)),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text(
                                            'GRADING',
                                            style: TextStyle(
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF52525B),
                                              letterSpacing: 0.8,
                                            ),
                                          ),
                                          GradeStarsWidget(grade: signalModel.grade, starSize: 11, fontSize: 10),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      // Live Realtime RR & PnL Box
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: isProfit
                                              ? const Color(0xFF10B981).withValues(alpha: 0.05)
                                              : const Color(0xFFEF4444).withValues(alpha: 0.05),
                                          border: Border.all(
                                            color: isProfit
                                                ? const Color(0xFF10B981).withValues(alpha: 0.2)
                                                : const Color(0xFFEF4444).withValues(alpha: 0.2),
                                          ),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                Icon(
                                                  Icons.show_chart,
                                                  size: 14,
                                                  color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                                ),
                                                const SizedBox(width: 6),
                                                Text(
                                                  'LIVE PNL: ${isProfit ? "+" : ""}${pnlPercent.toStringAsFixed(2)}%',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                                    fontFamily: 'monospace',
                                                  ),
                                                ),
                                              ],
                                            ),
                                            Text(
                                              liveRR,
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w900,
                                                color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                                fontFamily: 'monospace',
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubTab(String key, String title) {
    final isSel = _selectedTab == key;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedTab = key);
        _loadSfpSignals();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSel ? const Color(0xFFF97316) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isSel ? FontWeight.w900 : FontWeight.bold,
            color: isSel ? Colors.white : const Color(0xFF71717A),
            letterSpacing: 0.5,
          ),
        ),
      ),
    );
  }

  Widget _buildMetric(String label, String value, {bool isSuccess = false}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 8, color: Color(0xFF71717A), fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: isSuccess ? const Color(0xFF10B981) : Colors.white,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }

  Widget _buildPriceColumn(String label, String value, {Color? color}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 8, color: Color(0xFF71717A))),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color ?? Colors.white, fontFamily: 'monospace'),
        ),
      ],
    );
  }
}
