import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../providers/dashboard_provider.dart';
import '../providers/signals_provider.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/stat_card.dart';
import '../widgets/grade_stars_widget.dart';
import 'chart_screen.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      const _AnalyticsDashboardTab(),
      const _ActiveSignalsTab(),
      const _ProfileSettingsTab(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'dashboard'),
      appBar: AppBar(
        title: Row(
          children: [
            const Text(
              'CRT',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5),
            ),
            const SizedBox(width: 4),
            Text(
              'ENGINE',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0xFF10B981),
                        blurRadius: 6,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'WS LIVE',
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF10B981),
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF0F111A),
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: const Color(0xFF71717A),
        selectedFontSize: 11,
        unselectedFontSize: 11,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart_outlined),
            activeIcon: Icon(Icons.bar_chart),
            label: 'ANALYTICS',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sensors_outlined),
            activeIcon: Icon(Icons.sensors),
            label: 'LIVE SIGNALS',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings_outlined),
            activeIcon: Icon(Icons.settings),
            label: 'CONFIG',
          ),
        ],
      ),
    );
  }
}

// 1. ANALYTICS / DASHBOARD TAB
class _AnalyticsDashboardTab extends ConsumerWidget {
  const _AnalyticsDashboardTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardStatsProvider);

    return RefreshIndicator(
      onRefresh: () => ref.refresh(dashboardStatsProvider.future),
      child: statsAsync.when(
        data: (stats) {
          final total = stats['total']?.toString() ?? '0';
          final winRate = stats['winRate']?.toString() ?? '0%';
          final profitUSD = stats['profitUSD']?.toString() ?? '\$0.00';
          final totalRR = stats['totalRR']?.toString() ?? '0.00R';
          
          final wins = stats['totalWins']?.toString() ?? '0';
          final losses = stats['totalLosses']?.toString() ?? '0';
          final be = stats['totalBE']?.toString() ?? '0';

          final profitFactor = stats['profitFactor']?.toString() ?? '1.0';
          final expectancy = stats['expectancy']?.toString() ?? '0.00R';

          final profitVal = double.tryParse(profitUSD.replaceAll('\$', '').replaceAll(',', '')) ?? 0.0;
          final isProfit = profitVal >= 0;

          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              // Header Badge
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.08),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.offline_bolt, color: Color(0xFF10B981), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'INSTITUTIONAL CRT FLOW ACTIVE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF10B981),
                          letterSpacing: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Primary Stats Grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.3,
                children: [
                  StatCard(
                    label: 'Win Rate',
                    value: winRate,
                    icon: Icons.percent,
                    iconColor: const Color(0xFFF97316),
                  ),
                  StatCard(
                    label: 'Net PnL',
                    value: profitUSD,
                    icon: Icons.account_balance_wallet,
                    iconColor: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    changeValue: totalRR,
                    isProfit: isProfit,
                  ),
                  StatCard(
                    label: 'Total Trades',
                    value: total,
                    icon: Icons.swap_horiz,
                    iconColor: const Color(0xFF3B82F6),
                  ),
                  StatCard(
                    label: 'Expectancy',
                    value: expectancy,
                    icon: Icons.trending_up,
                    iconColor: const Color(0xFFA855F7),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Detail Statistics List
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'PERFORMANCE BREAKDOWN',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFA1A1AA),
                          letterSpacing: 1.5,
                        ),
                      ),
                      const Divider(color: Color(0xFF1E2235), height: 24),
                      _buildRow('Winning Setups', wins, const Color(0xFF10B981)),
                      _buildRow('Losing Setups', losses, const Color(0xFFEF4444)),
                      _buildRow('Breakeven (BE) Setups', be, const Color(0xFF71717A)),
                      _buildRow('Profit Factor', profitFactor, const Color(0xFFEAB308)),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: Color(0xFFF97316)),
        ),
        error: (err, stack) => Center(
          child: Text('Error loading stats: $err'),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Color(0xFFD4D4D8)),
          ),
          Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: valueColor),
          ),
        ],
      ),
    );
  }
}

// 2. ACTIVE SIGNALS TAB
class _ActiveSignalsTab extends ConsumerWidget {
  const _ActiveSignalsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final liveSignals = ref.watch(filteredSignalsProvider);
    final signalsAsync = ref.watch(signalsListProvider);
    final selectedStrategy = ref.watch(strategyFilterProvider);
    final selectedStatus = ref.watch(statusFilterProvider);

    return Column(
      children: [
        // Strategy Switcher Header (ALL, CRT-ALGO PRO, SFP PATTERNS)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
          decoration: const BoxDecoration(
            color: Color(0xFF0F111A),
            border: Border(
              bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
            ),
          ),
          child: Column(
            children: [
              // Strategy Pills
              Row(
                children: [
                  _buildStrategyPill(context, ref, 'ALL', 'ALL SIGNALS', selectedStrategy == 'ALL'),
                  const SizedBox(width: 8),
                  _buildStrategyPill(context, ref, 'CRT', 'CRT-ALGO PRO', selectedStrategy == 'CRT'),
                  const SizedBox(width: 8),
                  _buildStrategyPill(context, ref, 'SFP', 'SFP PATTERNS', selectedStrategy == 'SFP'),
                ],
              ),
              const SizedBox(height: 8),
              // Sub-Filter Chips (ACTIVE, RADAR, AUDIT, HISTORY)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildStatusChip(ref, 'ACTIVE', 'LIVE SIGNALS', selectedStatus == 'ACTIVE'),
                    const SizedBox(width: 6),
                    _buildStatusChip(ref, 'RADAR', 'RADAR WATCH', selectedStatus == 'RADAR'),
                    const SizedBox(width: 6),
                    _buildStatusChip(ref, 'AUDIT', 'VERIFIED AUDIT', selectedStatus == 'AUDIT'),
                    const SizedBox(width: 6),
                    _buildStatusChip(ref, 'HISTORY', 'TRADE LOG', selectedStatus == 'HISTORY'),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Signals List with Pull-To-Refresh
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => ref.refresh(signalsListProvider.future),
            child: signalsAsync.when(
              data: (_) {
                if (liveSignals.isEmpty) {
                  return ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.sensors_off, size: 40, color: Color(0xFF71717A)),
                            const SizedBox(height: 12),
                            Text(
                              'NO $selectedStrategy $selectedStatus SIGNALS FOUND',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.5,
                                color: Color(0xFF71717A),
                              ),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => ref.refresh(signalsListProvider.future),
                              icon: const Icon(Icons.refresh, size: 16),
                              label: const Text('REFRESH SIGNALS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1E2235),
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                }

              return ListView.builder(
                padding: const EdgeInsets.all(16.0),
                itemCount: liveSignals.length,
                itemBuilder: (context, index) {
                  final liveSignal = liveSignals[index];
                  final s = liveSignal.signal;
                  final isBuy = s.side.toUpperCase() == 'BUY' || s.side.toUpperCase() == 'BULLISH';
                  final isProfit = liveSignal.pnlPercent >= 0;
                  Color statusColor = Theme.of(context).colorScheme.primary;
                  if (liveSignal.liveStatus.contains('TP') || liveSignal.liveStatus.contains('WIN')) {
                    statusColor = const Color(0xFF10B981);
                  } else if (liveSignal.liveStatus.contains('SL') || liveSignal.liveStatus.contains('Stopped')) {
                    statusColor = const Color(0xFFEF4444);
                  } else if (liveSignal.liveStatus.contains('BE')) {
                    statusColor = const Color(0xFFEAB308);
                  }

                  return Card(
                    margin: const EdgeInsets.only(bottom: 16.0),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Header Bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    s.symbol,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    '${s.strategy} • ${s.tfAlignment}'.toUpperCase(),
                                    style: const TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF71717A),
                                    ),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isBuy
                                      ? const Color(0xFF10B981).withValues(alpha: 0.1)
                                      : const Color(0xFFEF4444).withValues(alpha: 0.1),
                                  border: Border.all(
                                    color: isBuy
                                        ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                        : const Color(0xFFEF4444).withValues(alpha: 0.3),
                                  ),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  s.side.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: isBuy ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(color: Color(0xFF1E2235), height: 24),

                          // Metrics Rows
                          _buildMetricRow('STATUS', liveSignal.liveStatus, statusColor),
                          _buildMetricRow(
                            'LIVE PRICE',
                            liveSignal.currentPrice.toStringAsFixed(s.entryPrice < 1 ? 6 : (s.entryPrice < 50 ? 4 : 2)),
                            isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                          ),
                          _buildMetricRow('ENTRY', s.entryPrice.toStringAsFixed(s.entryPrice < 1 ? 6 : (s.entryPrice < 50 ? 4 : 2)), Colors.white),
                          _buildMetricRow('TARGET R:R', calculatePotentialRR(s), const Color(0xFF38BDF8)),
                          _buildMetricRow('SL (INVALIDATION)', s.sl.toStringAsFixed(s.sl < 1 ? 6 : (s.sl < 50 ? 4 : 2)), const Color(0xFFEF4444)),
                          _buildMetricRow('TP1 (TARGET)', s.tp.toStringAsFixed(s.tp < 1 ? 6 : (s.tp < 50 ? 4 : 2)), const Color(0xFF10B981)),
                          if (s.tpSecondary != null && s.tpSecondary! > 0)
                            _buildMetricRow('TP2 (SECONDARY)', s.tpSecondary!.toStringAsFixed(s.tpSecondary! < 1 ? 6 : (s.tpSecondary! < 50 ? 4 : 2)), const Color(0xFFEAB308)),
                          if (s.tp3 != null && s.tp3! > 0)
                            _buildMetricRow('TP3 (RUNNER)', s.tp3!.toStringAsFixed(s.tp3! < 1 ? 6 : (s.tp3! < 50 ? 4 : 2)), const Color(0xFF38BDF8)),
                          if (s.tp4 != null && s.tp4! > 0)
                            _buildMetricRow('TP4 (MOON)', s.tp4!.toStringAsFixed(s.tp4! < 1 ? 6 : (s.tp4! < 50 ? 4 : 2)), const Color(0xFFA855F7)),
                          _buildCustomMetricRow('GRADING', GradeStarsWidget(grade: s.grade)),
                          if (s.confluences != null && s.confluences!.isNotEmpty)
                            _buildMetricRow('CONFLUENCES', s.confluences!, const Color(0xFFF97316)),

                          const Divider(color: Color(0xFF1E2235), height: 24),

                          // Live P&L Container
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isProfit
                                  ? const Color(0xFF10B981).withValues(alpha: 0.04)
                                  : const Color(0xFFEF4444).withValues(alpha: 0.04),
                              border: Border.all(
                                color: isProfit
                                    ? const Color(0xFF10B981).withValues(alpha: 0.15)
                                    : const Color(0xFFEF4444).withValues(alpha: 0.15),
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'LIVE PNL',
                                      style: TextStyle(
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                        color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                        letterSpacing: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${isProfit ? "+" : ""}${liveSignal.pnlPercent.toStringAsFixed(2)}%',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  liveSignal.liveRR,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: isProfit ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // View Chart Button
                          ElevatedButton(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ChartScreen(liveSignal: liveSignal),
                                ),
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              surfaceTintColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(color: Color(0xFF1E2235)),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.candlestick_chart, size: 16, color: Color(0xFFF97316)),
                                const SizedBox(width: 8),
                                Text(
                                  'VIEW PRO CHART',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.2,
                                    color: Theme.of(context).colorScheme.primary,
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
              );
            },
            loading: () => const Center(
              child: CircularProgressIndicator(color: Color(0xFFF97316)),
            ),
            error: (err, stack) => Center(
              child: Text('Error loading signals: $err'),
            ),
          ),
        ),
      ),
    ],
  );
  }

  Widget _buildStrategyPill(BuildContext context, WidgetRef ref, String key, String label, bool isSelected) {
    return Expanded(
      child: GestureDetector(
        onTap: () => ref.read(strategyFilterProvider.notifier).state = key,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFF97316) : const Color(0xFF141724),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: isSelected ? Colors.white : const Color(0xFF71717A),
              letterSpacing: 0.8,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(WidgetRef ref, String key, String label, bool isSelected) {
    return GestureDetector(
      onTap: () => ref.read(statusFilterProvider.notifier).state = key,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF97316).withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 9,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? const Color(0xFFF97316) : const Color(0xFFA1A1AA),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF52525B)),
          ),
          Text(
            value,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: valueColor),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomMetricRow(String label, Widget content) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF52525B)),
          ),
          content,
        ],
      ),
    );
  }
}

// 3. PROFILE & CONFIGURATION SETTINGS TAB
class _ProfileSettingsTab extends ConsumerStatefulWidget {
  const _ProfileSettingsTab();

  @override
  ConsumerState<_ProfileSettingsTab> createState() => _ProfileSettingsTabState();
}

class _ProfileSettingsTabState extends ConsumerState<_ProfileSettingsTab> {
  final _accountController = TextEditingController();
  final _riskController = TextEditingController();
  final _rewardController = TextEditingController();
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final authState = ref.read(authProvider);
    if (authState is AuthAuthenticated) {
      _accountController.text = authState.profile.accountSize.toStringAsFixed(0);
      _riskController.text = authState.profile.riskValue.toStringAsFixed(1);
      _rewardController.text = authState.profile.rewardValue.toStringAsFixed(1);
    }
  }

  @override
  void dispose() {
    _accountController.dispose();
    _riskController.dispose();
    _rewardController.dispose();
    super.dispose();
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);
    final size = double.tryParse(_accountController.text) ?? 10000.0;
    final risk = double.tryParse(_riskController.text) ?? 1.0;
    final reward = double.tryParse(_rewardController.text) ?? 2.0;

    // 1. Update DB profile values
    await ref.read(authProvider.notifier).updateSettings(size, risk, reward);
    
    // 2. Sync to local dashboard calculations filter
    ref.read(dashboardFiltersProvider.notifier).updateFilters(
          accountSize: size,
          riskValue: risk,
          rewardValue: reward,
        );

    ref.invalidate(dashboardStatsProvider);

    if (!mounted) return;
    setState(() => _isSaving = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Configuration saved and recalculated!'),
        backgroundColor: Color(0xFF10B981),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    if (authState is! AuthAuthenticated) return const SizedBox();

    final p = authState.profile;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // User Card Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        p.fullName?.toUpperCase() ?? 'TRADER',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF97316).withValues(alpha: 0.1),
                          border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.3)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          p.role == 'admin' ? 'ADMIN' : (p.tier == 2 ? 'PRO' : 'ALPHA'),
                          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Color(0xFFF97316)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    p.email,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF71717A), fontFamily: 'monospace'),
                  ),
                  const SizedBox(height: 16),
                  
                  // License key copy row
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141724),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF1E2235)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'LICENSE: ${p.id}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 9, fontFamily: 'monospace', color: Color(0xFFD4D4D8)),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 14, color: Color(0xFFF97316)),
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: p.id));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('License key copied to clipboard!')),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Configuration Inputs
          const Text(
            'RISK MANAGEMENT ENGINE',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF71717A), letterSpacing: 1.5),
          ),
          const SizedBox(height: 12),

          TextFormField(
            controller: _accountController,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'ACCOUNT SIZE (\$)',
              prefixIcon: Icon(Icons.wallet_outlined, size: 20),
            ),
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _riskController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'RISK PER SL (%)',
              prefixIcon: Icon(Icons.percent, size: 20),
            ),
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _rewardController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'REWARD MULTIPLIER (R)',
              prefixIcon: Icon(Icons.trending_up, size: 20),
            ),
          ),
          const SizedBox(height: 24),

          ElevatedButton(
            onPressed: _isSaving ? null : _saveSettings,
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _isSaving
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text(
                    'SAVE CONFIGURATION',
                    style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.5),
                  ),
          ),
        ],
      ),
    );
  }
}
