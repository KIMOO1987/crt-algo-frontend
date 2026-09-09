import 'package:flutter/material.dart';
import '../services/notification_service.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/grade_stars_widget.dart';

class NotificationsSettingsScreen extends StatefulWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  State<NotificationsSettingsScreen> createState() => _NotificationsSettingsScreenState();
}

class _NotificationsSettingsScreenState extends State<NotificationsSettingsScreen> {
  final NotificationService _service = NotificationService();
  bool _isLoading = true;
  bool _isTesting = false;

  late NotificationSettings _settings;
  String _symbolSearch = '';
  final TextEditingController _searchController = TextEditingController();

  final Map<String, List<String>> _groupedSymbols = {
    'CRYPTO ASSETS': [
      'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'LINKUSD', 'SUIUSD', 'PEPEUSD', 'NEARUSD'
    ],
    'METALS & COMMODITIES': [
      'XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD'
    ],
    'FOREX CURRENCIES': [
      'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP'
    ],
    'GLOBAL INDICES': [
      'US100', 'US500', 'US30', 'GER40', 'UK100'
    ],
  };

  @override
  void initState() {
    super.initState();
    _loadCurrentSettings();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCurrentSettings() async {
    final s = await _service.loadSettings();
    if (mounted) {
      setState(() {
        _settings = s;
        _isLoading = false;
      });
    }
  }

  Future<void> _updateSettings(NotificationSettings newSettings) async {
    setState(() {
      _settings = newSettings;
    });
    await _service.saveSettings(newSettings);
  }

  void _selectAllSymbols() {
    final all = NotificationService.allAvailableSymbols;
    _updateSettings(_settings.copyWith(selectedSymbols: List<String>.from(all)));
  }

  void _selectNoSymbols() {
    _updateSettings(_settings.copyWith(selectedSymbols: []));
  }

  void _toggleSymbol(String symbol) {
    final list = List<String>.from(_settings.selectedSymbols);
    if (list.contains(symbol)) {
      list.remove(symbol);
    } else {
      list.add(symbol);
    }
    _updateSettings(_settings.copyWith(selectedSymbols: list));
  }

  void _toggleGrade(String grade) {
    final list = List<String>.from(_settings.selectedGrades);
    if (list.contains(grade)) {
      if (list.length > 1) {
        list.remove(grade);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('At least one quality grade must be selected.'),
            duration: Duration(seconds: 2),
          ),
        );
        return;
      }
    } else {
      list.add(grade);
    }
    _updateSettings(_settings.copyWith(selectedGrades: list));
  }

  Future<void> _sendTestAlert() async {
    setState(() => _isTesting = true);
    await _service.showTestNotification();
    if (mounted) {
      setState(() => _isTesting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF10B981),
          content: Row(
            children: [
              Icon(Icons.check_circle_outline, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Text('Test alert dispatched! Check your notification bar.'),
            ],
          ),
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'notifications'),
      appBar: AppBar(
        backgroundColor: const Color(0xFF07080D),
        elevation: 0,
        centerTitle: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'MOBILE NOTIFICATIONS',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.0,
                color: Colors.white,
              ),
            ),
            Row(
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _isLoading || !_settings.masterEnabled ? const Color(0xFF71717A) : const Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  _isLoading
                      ? 'SYNCING...'
                      : (_settings.masterEnabled ? 'PUSH ENGINE ACTIVE' : 'ALERTS PAUSED'),
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                    color: _isLoading || !_settings.masterEnabled ? const Color(0xFF71717A) : const Color(0xFF10B981),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Send Test Alert',
            icon: _isTesting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF97316)),
                  )
                : const Icon(Icons.send_rounded, color: Color(0xFFF97316), size: 20),
            onPressed: _isLoading || _isTesting ? null : _sendTestAlert,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFF97316)),
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
              children: [
                // SECTION 1: MASTER PUSH TOGGLE
                _buildMasterToggleCard(),

                const SizedBox(height: 16),

                // SECTION 2: SIGNAL STRATEGY & SOUND CHANNELS
                _buildChannelSwitchesCard(),

                const SizedBox(height: 16),

                // SECTION 3: GRADE FILTER SELECTION
                _buildGradeFilterCard(),

                const SizedBox(height: 16),

                // SECTION 4: SYMBOL SELECTION (SELECT ALL / NONE & CHECKBOXES)
                _buildSymbolFilterCard(),

                const SizedBox(height: 24),

                // TEST ALERT FOOTER
                Center(
                  child: TextButton.icon(
                    onPressed: _sendTestAlert,
                    icon: const Icon(Icons.vibration, size: 16, color: Color(0xFFF97316)),
                    label: const Text(
                      'TRIGGER TEST SOUND & VIBRATION',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.0,
                        color: Color(0xFFF97316),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
    );
  }

  Widget _buildMasterToggleCard() {
    final enabled = _settings.masterEnabled;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: enabled
            ? const Color(0xFFF97316).withValues(alpha: 0.08)
            : const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: enabled
              ? const Color(0xFFF97316).withValues(alpha: 0.4)
              : const Color(0xFF1E2235),
          width: 1.2,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: enabled
                        ? const Color(0xFFF97316).withValues(alpha: 0.2)
                        : const Color(0xFF1E2235),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.notifications_active,
                    color: enabled ? const Color(0xFFF97316) : const Color(0xFF71717A),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'PUSH NOTIFICATIONS',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.8,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        enabled
                            ? 'Instant heads-up alerts on mobile'
                            : 'All app push alerts are muted',
                        style: TextStyle(
                          fontSize: 10,
                          color: enabled ? const Color(0xFFFDBA74) : const Color(0xFF71717A),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: enabled,
            activeThumbColor: const Color(0xFFF97316),
            activeTrackColor: const Color(0xFFF97316).withValues(alpha: 0.3),
            inactiveThumbColor: const Color(0xFF71717A),
            inactiveTrackColor: const Color(0xFF141724),
            onChanged: (val) => _updateSettings(_settings.copyWith(masterEnabled: val)),
          ),
        ],
      ),
    );
  }

  Widget _buildChannelSwitchesCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E2235)),
      ),
      child: Column(
        children: [
          _buildSwitchTile(
            icon: Icons.flash_on_rounded,
            iconColor: const Color(0xFFF97316),
            title: 'CRT Pro Signals Alerts',
            subtitle: 'Direct Displacement & Institutional Orders',
            value: _settings.crtEnabled,
            onChanged: (val) => _updateSettings(_settings.copyWith(crtEnabled: val)),
          ),
          const Divider(color: Color(0xFF1E2235), height: 1),
          _buildSwitchTile(
            icon: Icons.track_changes_rounded,
            iconColor: const Color(0xFF38BDF8),
            title: 'SFP Pattern Sweeps Alerts',
            subtitle: 'Swing Failure Pattern multi-timeframe sweeps',
            value: _settings.sfpEnabled,
            onChanged: (val) => _updateSettings(_settings.copyWith(sfpEnabled: val)),
          ),
          const Divider(color: Color(0xFF1E2235), height: 1),
          _buildSwitchTile(
            icon: Icons.volume_up_rounded,
            iconColor: const Color(0xFF10B981),
            title: 'Sound & Haptic Vibration',
            subtitle: 'Play sound and vibrate phone on new signals',
            value: _settings.soundVibrate,
            onChanged: (val) => _updateSettings(_settings.copyWith(soundVibrate: val)),
          ),
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 9,
                    color: Color(0xFF71717A),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            activeThumbColor: const Color(0xFFF97316),
            activeTrackColor: const Color(0xFFF97316).withValues(alpha: 0.3),
            inactiveThumbColor: const Color(0xFF71717A),
            inactiveTrackColor: const Color(0xFF141724),
            onChanged: _settings.masterEnabled ? onChanged : null,
          ),
        ],
      ),
    );
  }

  Widget _buildGradeFilterCard() {
    const grades = ['A++', 'A+', 'GOOD', 'NORMAL'];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E2235)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.workspace_premium_rounded, color: Color(0xFFEAB308), size: 18),
                  SizedBox(width: 8),
                  Text(
                    'SIGNAL QUALITY & GRADING',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  InkWell(
                    onTap: () {
                      _updateSettings(_settings.copyWith(selectedGrades: List.from(grades)));
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'ALL',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFF97316)),
                      ),
                    ),
                  ),
                  const Text(' • ', style: TextStyle(color: Color(0xFF52525B))),
                  InkWell(
                    onTap: () {
                      // Only top tier A++
                      _updateSettings(_settings.copyWith(selectedGrades: ['A++']));
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'A++ ONLY',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF38BDF8)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Only setups matching your selected grades will send notifications.',
            style: TextStyle(fontSize: 9, color: Color(0xFF71717A)),
          ),
          const SizedBox(height: 14),

          // Grade Chips
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: grades.map((g) {
              final isSelected = _settings.selectedGrades.contains(g);
              return InkWell(
                onTap: () => _toggleGrade(g),
                borderRadius: BorderRadius.circular(8),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFF97316).withValues(alpha: 0.15)
                        : const Color(0xFF141724),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235),
                      width: isSelected ? 1.2 : 1.0,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSelected ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                        size: 14,
                        color: isSelected ? const Color(0xFFF97316) : const Color(0xFF71717A),
                      ),
                      const SizedBox(width: 8),
                      GradeStarsWidget(
                        grade: g,
                        starSize: 11,
                        fontSize: 10,
                        showLabel: true,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSymbolFilterCard() {
    final selectedCount = _settings.selectedSymbols.length;
    final totalCount = NotificationService.allAvailableSymbols.length;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(16),
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
                  const Icon(Icons.tune_rounded, color: Color(0xFFF97316), size: 18),
                  const SizedBox(width: 8),
                  const Text(
                    'WATCHLIST SYMBOLS',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.8,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF97316).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '$selectedCount / $totalCount',
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFF97316),
                      ),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  InkWell(
                    onTap: _selectAllSymbols,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF141724),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF1E2235)),
                      ),
                      child: const Text(
                        'SELECT ALL',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: _selectNoSymbols,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF141724),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFF1E2235)),
                      ),
                      child: const Text(
                        'SELECT NONE',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Search Filter Input
          TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _symbolSearch = val.trim().toUpperCase()),
            style: const TextStyle(fontSize: 11, color: Colors.white),
            decoration: InputDecoration(
              isDense: true,
              hintText: 'Search symbol (e.g. BTC, GOLD, EUR)...',
              hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
              prefixIcon: const Icon(Icons.search, size: 16, color: Color(0xFF71717A)),
              suffixIcon: _symbolSearch.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 14, color: Color(0xFF71717A)),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _symbolSearch = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor: const Color(0xFF141724),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF1E2235)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF1E2235)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFFF97316)),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Grouped Symbols List
          ..._groupedSymbols.entries.map((entry) {
            final groupTitle = entry.key;
            final symbols = entry.value.where((s) {
              if (_symbolSearch.isEmpty) return true;
              return s.contains(_symbolSearch);
            }).toList();

            if (symbols.isEmpty) return const SizedBox.shrink();

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 8.0, bottom: 6.0),
                  child: Text(
                    groupTitle,
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: Color(0xFF52525B),
                    ),
                  ),
                ),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: symbols.map((symbol) {
                    final isChecked = _settings.selectedSymbols.contains(symbol);
                    return InkWell(
                      onTap: () => _toggleSymbol(symbol),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        decoration: BoxDecoration(
                          color: isChecked
                              ? const Color(0xFFF97316).withValues(alpha: 0.12)
                              : const Color(0xFF141724),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: isChecked
                                ? const Color(0xFFF97316).withValues(alpha: 0.5)
                                : const Color(0xFF1E2235),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isChecked ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                              size: 13,
                              color: isChecked ? const Color(0xFFF97316) : const Color(0xFF71717A),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              symbol,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: isChecked ? FontWeight.w900 : FontWeight.normal,
                                color: isChecked ? Colors.white : const Color(0xFFA1A1AA),
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 6),
              ],
            );
          }),
        ],
      ),
    );
  }
}
