import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});

  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabase = SupabaseService().client;
  bool _isLoading = false;

  // Data collections
  List<Map<String, dynamic>> _accounts = [];
  List<Map<String, dynamic>> _strategies = [];
  List<Map<String, dynamic>> _trades = [];
  List<Map<String, dynamic>> _dailyLogs = [];

  // Account Form Controllers
  final _accNameController = TextEditingController();
  final _accIdInputController = TextEditingController(text: 'ACC-01');
  final _accStartingBalanceController = TextEditingController(text: '10000');
  final _accMaxDrawdownController = TextEditingController(text: '500');
  String _accExchange = 'okx';
  String _accType = 'Evaluation';
  String _accStatus = 'Active';

  // Strategy Form Controllers
  final _stratNameController = TextEditingController();
  final _stratTimeframeController = TextEditingController(text: '15m');
  final _stratWinRateTargetController = TextEditingController(text: '65');

  // Trade Log Form Controllers
  String? _selectedAccountId;
  String? _selectedStrategyId;
  final _tradeAssetController = TextEditingController(text: 'GOLD');
  final _tradeTimeframeController = TextEditingController(text: '15m');
  String _tradeDirection = 'BUY';
  final _tradeRiskController = TextEditingController(text: '100');
  final _tradePnlController = TextEditingController(text: '250');
  final _tradeRrController = TextEditingController(text: '2.5');
  String _tradeStatus = 'Win';
  final _tradeEmotionsController = TextEditingController();

  // Daily Journal Form Controllers
  final _dailyReviewController = TextEditingController();
  String _dailyMentalState = 'Focused';
  String _dailyHtfBias = 'Bullish';
  String _dailyRulesFollowed = 'Yes';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadJournalData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _accNameController.dispose();
    _accIdInputController.dispose();
    _accStartingBalanceController.dispose();
    _accMaxDrawdownController.dispose();
    _stratNameController.dispose();
    _stratTimeframeController.dispose();
    _stratWinRateTargetController.dispose();
    _tradeAssetController.dispose();
    _tradeTimeframeController.dispose();
    _tradeRiskController.dispose();
    _tradePnlController.dispose();
    _tradeRrController.dispose();
    _tradeEmotionsController.dispose();
    _dailyReviewController.dispose();
    super.dispose();
  }

  Future<void> _loadJournalData() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      // 1. Fetch Accounts
      final accountsData = await _supabase
          .from('journal_accounts')
          .select()
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      // 2. Fetch Strategies
      final strategiesData = await _supabase
          .from('journal_strategies')
          .select()
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      // 3. Fetch Recent Trades with Account details
      final tradesData = await _supabase
          .from('journal_trades')
          .select('*, journal_accounts(name, exchange)')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(50);

      // 4. Fetch Daily Mindset Logs
      final dailyData = await _supabase
          .from('journal_daily')
          .select()
          .eq('user_id', user.id)
          .order('date', ascending: false)
          .limit(20);

      if (mounted) {
        setState(() {
          _accounts = List<Map<String, dynamic>>.from(accountsData);
          _strategies = List<Map<String, dynamic>>.from(strategiesData);
          _trades = List<Map<String, dynamic>>.from(tradesData);
          _dailyLogs = List<Map<String, dynamic>>.from(dailyData);

          if (_accounts.isNotEmpty && _selectedAccountId == null) {
            _selectedAccountId = _accounts.first['id'].toString();
          }
          if (_strategies.isNotEmpty && _selectedStrategyId == null) {
            _selectedStrategyId = _strategies.first['id'].toString();
          }
        });
      }
    } catch (e) {
      _showSnackBar('Error loading journal: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // --- STATS COMPUTATION ---
  double get _totalPnl {
    double total = 0;
    for (final t in _trades) {
      total += (num.tryParse(t['total_pnl']?.toString() ?? '0') ?? 0).toDouble();
    }
    return total;
  }

  double get _winRate {
    if (_trades.isEmpty) return 0;
    int wins = 0;
    int evaluated = 0;
    for (final t in _trades) {
      final status = (t['status'] ?? '').toString().toLowerCase();
      if (status == 'win') {
        wins++;
        evaluated++;
      } else if (status == 'loss') {
        evaluated++;
      }
    }
    return evaluated > 0 ? (wins / evaluated) * 100 : 0;
  }

  double get _profitFactor {
    double grossProfit = 0;
    double grossLoss = 0;
    for (final t in _trades) {
      final pnl = (num.tryParse(t['total_pnl']?.toString() ?? '0') ?? 0).toDouble();
      if (pnl > 0) grossProfit += pnl;
      if (pnl < 0) grossLoss += pnl.abs();
    }
    if (grossLoss == 0) return grossProfit > 0 ? 99.9 : 0;
    return grossProfit / grossLoss;
  }

  Future<void> _createAccount() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_accNameController.text.isEmpty) {
      _showSnackBar('Please enter an Account Name', isError: true);
      return;
    }

    final startBal = double.tryParse(_accStartingBalanceController.text) ?? 10000.0;
    final maxDd = double.tryParse(_accMaxDrawdownController.text) ?? 500.0;

    try {
      await _supabase.from('journal_accounts').insert({
        'user_id': user.id,
        'account_id_input': _accIdInputController.text.trim().isEmpty ? 'ACC-01' : _accIdInputController.text.trim(),
        'name': _accNameController.text.trim(),
        'exchange': _accExchange,
        'type': _accType,
        'starting_balance': startBal,
        'max_drawdown': maxDd,
        'status': _accStatus,
      });

      _accNameController.clear();
      _accIdInputController.text = 'ACC-${_accounts.length + 2}';
      _showSnackBar('Journal Account created successfully!');
      _loadJournalData();
    } catch (e) {
      _showSnackBar('Failed to create account: $e', isError: true);
    }
  }

  Future<void> _createStrategy() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_stratNameController.text.isEmpty) {
      _showSnackBar('Strategy Name is required', isError: true);
      return;
    }

    final winRate = double.tryParse(_stratWinRateTargetController.text) ?? 60.0;

    try {
      await _supabase.from('journal_strategies').insert({
        'user_id': user.id,
        'name': _stratNameController.text.trim(),
        'timeframe': _stratTimeframeController.text.trim().isEmpty ? '15m' : _stratTimeframeController.text.trim(),
        'win_rate_target': winRate,
      });

      _stratNameController.clear();
      _showSnackBar('Strategy registered successfully!');
      _loadJournalData();
    } catch (e) {
      _showSnackBar('Failed to create strategy: $e', isError: true);
    }
  }

  Future<void> _logTrade() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_selectedAccountId == null) {
      _showSnackBar('Please select or create an account first', isError: true);
      return;
    }

    final risk = double.tryParse(_tradeRiskController.text) ?? 0.0;
    final pnl = double.tryParse(_tradePnlController.text) ?? 0.0;
    final rr = double.tryParse(_tradeRrController.text) ?? 0.0;
    final nextTradeNo = _trades.length + 1;

    try {
      final insertPayload = <String, dynamic>{
        'user_id': user.id,
        'trade_no': nextTradeNo,
        'account_id': _selectedAccountId,
        'asset': _tradeAssetController.text.trim().toUpperCase(),
        'direction': _tradeDirection,
        'risk_amount': risk,
        'realized_rr': rr,
        'total_pnl': pnl,
        'status': _tradeStatus,
        'emotions': _tradeEmotionsController.text.trim(),
        'timeframe': _tradeTimeframeController.text.trim().isEmpty ? '15m' : _tradeTimeframeController.text.trim(),
      };

      if (_selectedStrategyId != null && _selectedStrategyId!.isNotEmpty) {
        insertPayload['strategy_id'] = _selectedStrategyId;
      }

      await _supabase.from('journal_trades').insert(insertPayload);

      _tradeEmotionsController.clear();
      _showSnackBar('Trade logged successfully!');
      _loadJournalData();
    } catch (e) {
      _showSnackBar('Failed to log trade: $e', isError: true);
    }
  }

  Future<void> _saveDailyNote() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_dailyReviewController.text.isEmpty) {
      _showSnackBar('Please write an EOD review note', isError: true);
      return;
    }

    try {
      final todayStr = DateTime.now().toIso8601String().split('T')[0];

      await _supabase.from('journal_daily').upsert({
        'user_id': user.id,
        'date': todayStr,
        'htf_bias': _dailyHtfBias,
        'mental_state': _dailyMentalState,
        'eod_review': _dailyReviewController.text.trim(),
        'rules_followed': _dailyRulesFollowed,
      });

      _dailyReviewController.clear();
      _showSnackBar('EOD Journal Note recorded!');
      _loadJournalData();
    } catch (e) {
      _showSnackBar('Failed to save daily note: $e', isError: true);
    }
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'journal'),
      appBar: AppBar(
        title: const Text(
          'TRADE JOURNAL',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFFF97316),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF71717A),
          tabs: const [
            Tab(text: 'LOG TRADE'),
            Tab(text: 'ACCOUNTS'),
            Tab(text: 'STRATEGIES'),
            Tab(text: 'MINDSET'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : Column(
              children: [
                // Top Performance Metric Bar
                _buildMetricsBanner(),
                // Main Tab Content
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildLogTradeTab(),
                      _buildAccountsTab(),
                      _buildStrategiesTab(),
                      _buildDailyMindsetTab(),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  // --- STATS BANNER ---
  Widget _buildMetricsBanner() {
    final pnl = _totalPnl;
    final isPos = pnl >= 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF0F111A),
        border: Border(bottom: BorderSide(color: Color(0xFF1E2235), width: 1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildBannerStat(
              label: 'NET PNL',
              value: '${isPos ? "+" : ""}\$${pnl.toStringAsFixed(2)}',
              color: isPos ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          ),
          Container(height: 24, width: 1, color: const Color(0xFF1E2235)),
          Expanded(
            child: _buildBannerStat(
              label: 'WIN RATE',
              value: '${_winRate.toStringAsFixed(1)}%',
              color: _winRate >= 50 ? const Color(0xFF10B981) : const Color(0xFFEAB308),
            ),
          ),
          Container(height: 24, width: 1, color: const Color(0xFF1E2235)),
          Expanded(
            child: _buildBannerStat(
              label: 'PROFIT FACTOR',
              value: _profitFactor.toStringAsFixed(2),
              color: const Color(0xFF38BDF8),
            ),
          ),
          Container(height: 24, width: 1, color: const Color(0xFF1E2235)),
          Expanded(
            child: _buildBannerStat(
              label: 'TRADES',
              value: '${_trades.length}',
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBannerStat({required String label, required String value, required Color color}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF71717A), letterSpacing: 0.5),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: color, fontFamily: 'monospace'),
        ),
      ],
    );
  }

  // 1. LOG NEW TRADE TAB
  Widget _buildLogTradeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_accounts.isEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFEAB308).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFEAB308).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFFEAB308), size: 20),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'No Account created yet. Switch to the ACCOUNTS tab to add your first broker account.',
                      style: TextStyle(fontSize: 11, color: Color(0xFFEAB308), fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),

          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'LOG TRADE ENTRY',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                    ),
                    Text(
                      'TRADE #${_trades.length + 1}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10, color: Color(0xFFF97316)),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Account Selector
                if (_accounts.isNotEmpty)
                  DropdownButtonFormField<String>(
                    initialValue: _selectedAccountId,
                    decoration: const InputDecoration(labelText: 'PORTFOLIO / PROP ACCOUNT'),
                    dropdownColor: const Color(0xFF0F111A),
                    items: _accounts.map((acc) {
                      return DropdownMenuItem(
                        value: acc['id'].toString(),
                        child: Text('${acc['name']} (${(acc['exchange'] ?? '').toString().toUpperCase()})'),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedAccountId = val),
                  ),
                const SizedBox(height: 12),

                // Strategy Selector
                if (_strategies.isNotEmpty)
                  DropdownButtonFormField<String>(
                    initialValue: _selectedStrategyId,
                    decoration: const InputDecoration(labelText: 'STRATEGY SETUP (OPTIONAL)'),
                    dropdownColor: const Color(0xFF0F111A),
                    items: [
                      const DropdownMenuItem(value: '', child: Text('None / Discretionary')),
                      ..._strategies.map((s) {
                        return DropdownMenuItem(
                          value: s['id'].toString(),
                          child: Text('${s['name']} (${s['timeframe'] ?? '15m'})'),
                        );
                      }),
                    ],
                    onChanged: (val) => setState(() => _selectedStrategyId = val?.isEmpty == true ? null : val),
                  ),
                if (_strategies.isNotEmpty) const SizedBox(height: 12),

                // Asset & Direction
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: TextField(
                        controller: _tradeAssetController,
                        decoration: const InputDecoration(labelText: 'ASSET / SYMBOL', hintText: 'BTCUSDT or GOLD'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: DropdownButtonFormField<String>(
                        initialValue: _tradeDirection,
                        decoration: const InputDecoration(labelText: 'DIRECTION'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'BUY', child: Text('BUY / LONG', style: TextStyle(color: Color(0xFF10B981)))),
                          DropdownMenuItem(value: 'SELL', child: Text('SELL / SHORT', style: TextStyle(color: Color(0xFFEF4444)))),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _tradeDirection = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Timeframe & Status
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _tradeTimeframeController,
                        decoration: const InputDecoration(labelText: 'TIMEFRAME', hintText: '15m, 1H'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _tradeStatus,
                        decoration: const InputDecoration(labelText: 'OUTCOME'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'Win', child: Text('WIN', style: TextStyle(color: Color(0xFF10B981)))),
                          DropdownMenuItem(value: 'Loss', child: Text('LOSS', style: TextStyle(color: Color(0xFFEF4444)))),
                          DropdownMenuItem(value: 'Break-Even', child: Text('BREAK EVEN', style: TextStyle(color: Color(0xFFEAB308)))),
                          DropdownMenuItem(value: 'Active', child: Text('ACTIVE / OPEN', style: TextStyle(color: Color(0xFF38BDF8)))),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _tradeStatus = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Risk, PnL, RR
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _tradeRiskController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'RISK (\$)'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _tradePnlController,
                        keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: true),
                        decoration: const InputDecoration(labelText: 'NET PNL (\$)'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _tradeRrController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'REALIZED RR'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Emotions / Execution note
                TextField(
                  controller: _tradeEmotionsController,
                  decoration: const InputDecoration(
                    labelText: 'EXECUTION & EMOTIONS NOTE',
                    hintText: 'e.g. Clean sweep entry, waited for candle close',
                  ),
                ),
                const SizedBox(height: 16),

                ElevatedButton(
                  onPressed: _logTrade,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('SUBMIT TRADE TO JOURNAL', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Recent Trades List
          const Text(
            'TRANSACTION HISTORY',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          if (_trades.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Text('NO TRADES LOGGED YET', style: TextStyle(color: Color(0xFF52525B), fontSize: 12)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _trades.length,
              itemBuilder: (context, idx) {
                final trade = _trades[idx];
                final status = (trade['status'] ?? 'Active').toString();
                final isWin = status.toLowerCase() == 'win';
                final isLoss = status.toLowerCase() == 'loss';
                final pnl = (num.tryParse(trade['total_pnl']?.toString() ?? '0') ?? 0).toDouble();
                final accountName = trade['journal_accounts']?['name'] ?? 'General';
                final direction = trade['direction'] ?? 'BUY';

                Color statusColor = const Color(0xFF38BDF8);
                if (isWin) statusColor = const Color(0xFF10B981);
                if (isLoss) statusColor = const Color(0xFFEF4444);
                if (status.toLowerCase().contains('break')) statusColor = const Color(0xFFEAB308);

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F111A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E2235)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          status.toUpperCase(),
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9, color: statusColor),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  '$direction ${trade['asset'] ?? ''}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                if (trade['timeframe'] != null) ...[
                                  const SizedBox(width: 6),
                                  Text(
                                    '${trade['timeframe']}',
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF71717A)),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text('Account: $accountName', style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${pnl >= 0 ? '+' : ''}\$${pnl.toStringAsFixed(2)}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: pnl >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text('${trade['realized_rr'] ?? 0}R', style: const TextStyle(fontSize: 10, color: Color(0xFFA1A1AA))),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // 2. ACCOUNTS VIEW
  Widget _buildAccountsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'REGISTER PORTFOLIO / PROP ACCOUNT',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _accNameController,
                  decoration: const InputDecoration(labelText: 'ACCOUNT NAME', hintText: 'e.g. FTMO 100k Challenge'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _accIdInputController,
                        decoration: const InputDecoration(labelText: 'ACCOUNT ID / NO', hintText: 'e.g. 5048291'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _accExchange,
                        decoration: const InputDecoration(labelText: 'EXCHANGE / PLATFORM'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'okx', child: Text('OKX')),
                          DropdownMenuItem(value: 'bybit', child: Text('BYBIT')),
                          DropdownMenuItem(value: 'mt5', child: Text('MT5')),
                          DropdownMenuItem(value: 'ctrader', child: Text('CTRADER')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _accExchange = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _accStartingBalanceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'STARTING BALANCE (\$)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _accType,
                        decoration: const InputDecoration(labelText: 'TYPE'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'Evaluation', child: Text('EVALUATION')),
                          DropdownMenuItem(value: 'Funded', child: Text('FUNDED')),
                          DropdownMenuItem(value: 'Personal', child: Text('PERSONAL')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _accType = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _accMaxDrawdownController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'MAX DRAWDOWN (\$)'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _accStatus,
                        decoration: const InputDecoration(labelText: 'STATUS'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'Active', child: Text('ACTIVE')),
                          DropdownMenuItem(value: 'Passed', child: Text('PASSED')),
                          DropdownMenuItem(value: 'Failed', child: Text('FAILED')),
                          DropdownMenuItem(value: 'Payout Eligible', child: Text('PAYOUT ELIGIBLE')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _accStatus = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _createAccount,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('CREATE JOURNAL ACCOUNT', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Accounts List
          const Text(
            'ACTIVE JOURNAL ACCOUNTS',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          if (_accounts.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Text('NO ACCOUNTS REGISTERED YET', style: TextStyle(color: Color(0xFF52525B), fontSize: 12)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _accounts.length,
              itemBuilder: (context, idx) {
                final acc = _accounts[idx];
                final startBal = (num.tryParse(acc['starting_balance']?.toString() ?? '0') ?? 0).toDouble();
                
                // Compute current balance by summing trades for this account
                double accPnl = 0;
                for (final t in _trades) {
                  if (t['account_id']?.toString() == acc['id']?.toString()) {
                    accPnl += (num.tryParse(t['total_pnl']?.toString() ?? '0') ?? 0).toDouble();
                  }
                }
                final currentBal = startBal + accPnl;
                final isProfit = accPnl >= 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
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
                          Text(acc['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF97316).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              '${(acc['exchange'] ?? '').toString().toUpperCase()} • ${(acc['type'] ?? 'Personal').toUpperCase()}',
                              style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFFF97316)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text('Account ID: ${acc['account_id_input'] ?? "---"}', style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
                      const Divider(color: Color(0xFF1E2235), height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('STARTING BALANCE', style: TextStyle(fontSize: 8, color: Color(0xFF71717A))),
                              Text('\$${startBal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const Text('CURRENT BALANCE', style: TextStyle(fontSize: 8, color: Color(0xFF71717A))),
                              Text('\$${currentBal.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('TOTAL P&L', style: TextStyle(fontSize: 8, color: Color(0xFF71717A))),
                              Text(
                                '${isProfit ? "+" : ""}\$${accPnl.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // 3. STRATEGIES VIEW
  Widget _buildStrategiesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'REGISTER STRATEGY SETUP',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _stratNameController,
                  decoration: const InputDecoration(labelText: 'STRATEGY NAME', hintText: 'e.g. CRT Gold Sweeps'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _stratTimeframeController,
                        decoration: const InputDecoration(labelText: 'PRIMARY TIMEFRAME', hintText: '15m, 1H, 4H'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _stratWinRateTargetController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'TARGET WIN RATE (%)', hintText: '65'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _createStrategy,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('SAVE STRATEGY CONFIG', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Strategy List
          const Text(
            'REGISTERED STRATEGIES',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          if (_strategies.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Text('NO STRATEGIES REGISTERED', style: TextStyle(color: Color(0xFF52525B), fontSize: 12)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _strategies.length,
              itemBuilder: (context, idx) {
                final strat = _strategies[idx];
                return Card(
                  color: const Color(0xFF0F111A),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: Color(0xFF1E2235)),
                  ),
                  child: ListTile(
                    title: Text(strat['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    subtitle: Text('Timeframe: ${strat['timeframe'] ?? "All"} • Target WR: ${strat['win_rate_target'] ?? 0}%', style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  // 4. DAILY MINDSET VIEW
  Widget _buildDailyMindsetTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'RECORD EOD MENTAL LOG',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.2),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _dailyMentalState,
                        decoration: const InputDecoration(labelText: 'MENTAL STATE'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'Focused', child: Text('FOCUSED')),
                          DropdownMenuItem(value: 'Calm', child: Text('CALM')),
                          DropdownMenuItem(value: 'Anxious', child: Text('ANXIOUS')),
                          DropdownMenuItem(value: 'Greedy', child: Text('GREEDY')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _dailyMentalState = val);
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _dailyHtfBias,
                        decoration: const InputDecoration(labelText: 'HTF BIAS'),
                        dropdownColor: const Color(0xFF0F111A),
                        items: const [
                          DropdownMenuItem(value: 'Bullish', child: Text('BULLISH')),
                          DropdownMenuItem(value: 'Bearish', child: Text('BEARISH')),
                          DropdownMenuItem(value: 'Neutral', child: Text('NEUTRAL')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _dailyHtfBias = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _dailyRulesFollowed,
                  decoration: const InputDecoration(labelText: 'RULES FOLLOWED'),
                  dropdownColor: const Color(0xFF0F111A),
                  items: const [
                    DropdownMenuItem(value: 'Yes', child: Text('YES - 100% DISCIPLINE')),
                    DropdownMenuItem(value: 'Partial', child: Text('PARTIAL - SOME EMOTION')),
                    DropdownMenuItem(value: 'No', child: Text('NO - REVENGE TRADING')),
                  ],
                  onChanged: (val) {
                    if (val != null) setState(() => _dailyRulesFollowed = val);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _dailyReviewController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'EOD REVIEW & LESSONS LEARNED',
                    hintText: 'What went well? Where did you deviate from your trading plan?',
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _saveDailyNote,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('SUBMIT EOD REVIEW', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Daily Mindset History
          const Text(
            'PAST REFLECTIONS',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
          ),
          const SizedBox(height: 8),
          if (_dailyLogs.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Text('NO REFLECTIONS RECORDED YET', style: TextStyle(color: Color(0xFF52525B), fontSize: 12)),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _dailyLogs.length,
              itemBuilder: (context, idx) {
                final d = _dailyLogs[idx];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F111A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E2235)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(d['date']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFF97316))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF141724),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFF1E2235)),
                            ),
                            child: Text(
                              '${d['mental_state'] ?? ''} • ${d['htf_bias'] ?? ''}',
                              style: const TextStyle(fontSize: 9, color: Color(0xFFA1A1AA)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        d['eod_review'] ?? '',
                        style: const TextStyle(fontSize: 11, color: Color(0xFFD4D4D8), height: 1.4),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
