import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/supabase_service.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final _supabase = SupabaseService().client;
  bool _isLoading = true;
  Map<String, dynamic>? _telegramAuth;
  List<Map<String, dynamic>> _alertProfiles = [];

  // Create Profile Form Controllers
  final _profileNameController = TextEditingController();
  final _profileDescController = TextEditingController();
  final List<String> _selectedTickers = ['XAUUSD', 'BTCUSD'];
  final List<String> _selectedTfs = ['M15/H4', '15m'];
  final String _selectedBias = 'All';
  final String _selectedSetups = 'All';
  final String _selectedDirection = 'All';

  final List<String> _availableTickers = [
    'XAUUSD', 'XAGUSD', 'NAS100', 'SPX500', 'US30',
    'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY',
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'
  ];

  final List<String> _availableTfs = [
    'M5/H1', 'M15/H4', 'M30/H6', 'H1/D1',
    '5m', '15m', '1H', '4H', '1D'
  ];

  @override
  void initState() {
    super.initState();
    _loadAlertsData();
  }

  @override
  void dispose() {
    _profileNameController.dispose();
    _profileDescController.dispose();
    super.dispose();
  }

  Future<void> _loadAlertsData() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      // 1. Fetch Telegram Auth status
      final authData = await _supabase
          .from('telegram_auth')
          .select()
          .eq('user_id', user.id)
          .maybeSingle();

      // 2. Fetch Alert Profiles
      final profilesData = await _supabase
          .from('alert_profiles')
          .select()
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _telegramAuth = authData;
          _alertProfiles = List<Map<String, dynamic>>.from(profilesData);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        _showSnackBar('Error loading alerts: $e', isError: true);
      }
    }
  }

  Future<void> _toggleProfileActive(String profileId, bool currentStatus) async {
    try {
      await _supabase
          .from('alert_profiles')
          .update({'is_active': !currentStatus})
          .eq('id', profileId);

      _loadAlertsData();
    } catch (e) {
      _showSnackBar('Failed to update status: $e', isError: true);
    }
  }

  Future<void> _deleteProfile(String profileId) async {
    try {
      await _supabase
          .from('alert_profiles')
          .delete()
          .eq('id', profileId);

      _showSnackBar('Alert profile deleted');
      _loadAlertsData();
    } catch (e) {
      _showSnackBar('Failed to delete profile: $e', isError: true);
    }
  }

  Future<void> _createProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_profileNameController.text.trim().isEmpty) {
      _showSnackBar('Please give your alert profile a name', isError: true);
      return;
    }

    try {
      await _supabase.from('alert_profiles').insert({
        'user_id': user.id,
        'name': _profileNameController.text.trim(),
        'description': _profileDescController.text.trim(),
        'tickers': _selectedTickers,
        'timeframes': _selectedTfs,
        'bias': _selectedBias,
        'setups': _selectedSetups,
        'direction': _selectedDirection,
        'is_active': true,
      });

      _profileNameController.clear();
      _profileDescController.clear();
      if (!mounted) return;
      Navigator.pop(context);
      _showSnackBar('Alert profile activated successfully!');
      _loadAlertsData();
    } catch (e) {
      _showSnackBar('Failed to create profile: $e', isError: true);
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

  void _openCreateProfileModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F111A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'NEW TELEGRAM ALERT PROFILE',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Color(0xFF71717A)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _profileNameController,
                      decoration: const InputDecoration(labelText: 'PROFILE NAME', hintText: 'e.g. Gold & Nasdaq Scalps'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _profileDescController,
                      decoration: const InputDecoration(labelText: 'DESCRIPTION (OPTIONAL)', hintText: 'e.g. 15m CRT breakouts only'),
                    ),
                    const SizedBox(height: 16),

                    const Text('ASSETS / TICKERS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF71717A))),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _availableTickers.map((ticker) {
                        final isSelected = _selectedTickers.contains(ticker);
                        return FilterChip(
                          label: Text(ticker, style: TextStyle(fontSize: 10, color: isSelected ? Colors.white : const Color(0xFF71717A))),
                          selected: isSelected,
                          selectedColor: const Color(0xFFF97316),
                          backgroundColor: const Color(0xFF141724),
                          side: BorderSide(color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235)),
                          onSelected: (val) {
                            setModalState(() {
                              if (val) {
                                _selectedTickers.add(ticker);
                              } else {
                                _selectedTickers.remove(ticker);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    const Text('TIMEFRAMES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF71717A))),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _availableTfs.map((tf) {
                        final isSelected = _selectedTfs.contains(tf);
                        return FilterChip(
                          label: Text(tf, style: TextStyle(fontSize: 10, color: isSelected ? Colors.white : const Color(0xFF71717A))),
                          selected: isSelected,
                          selectedColor: const Color(0xFFF97316),
                          backgroundColor: const Color(0xFF141724),
                          side: BorderSide(color: isSelected ? const Color(0xFFF97316) : const Color(0xFF1E2235)),
                          onSelected: (val) {
                            setModalState(() {
                              if (val) {
                                _selectedTfs.add(tf);
                              } else {
                                _selectedTfs.remove(tf);
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),

                    ElevatedButton(
                      onPressed: _createProfile,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF97316),
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('ACTIVATE ALERT PROFILE', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLinked = _telegramAuth != null && _telegramAuth!['telegram_id'] != null;

    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'alerts'),
      appBar: AppBar(
        title: const Text(
          'TELEGRAM ALERTS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFA1A1AA)),
            onPressed: _loadAlertsData,
            tooltip: 'Reload',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Telegram Connection Status Card
                  GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0088CC).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF0088CC).withValues(alpha: 0.3)),
                              ),
                              child: const Icon(Icons.send_rounded, color: Color(0xFF0088CC), size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Text(
                                        'TELEGRAM BOT STATUS: ',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF71717A)),
                                      ),
                                      Text(
                                        isLinked ? 'CONNECTED' : 'DISCONNECTED',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          color: isLinked ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    isLinked
                                        ? 'Account: @${_telegramAuth!['telegram_username'] ?? _telegramAuth!['telegram_id']}'
                                        : 'Link your Telegram to receive instant real-time trade signals.',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFFD4D4D8)),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        const Divider(color: Color(0xFF1E2235)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                icon: const Icon(Icons.open_in_new, size: 16),
                                label: const Text('OPEN TELEGRAM BOT'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFF0088CC),
                                  side: const BorderSide(color: Color(0xFF0088CC)),
                                ),
                                onPressed: () async {
                                  final uri = Uri.parse('https://t.me/CRTAlgoAlertsBot');
                                  if (await canLaunchUrl(uri)) {
                                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Profiles Header & Create Button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'ACTIVE ALERT PROFILES',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                      ),
                      ElevatedButton.icon(
                        onPressed: _openCreateProfileModal,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('CREATE PROFILE'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF97316),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Profile List
                  if (_alertProfiles.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F111A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E2235)),
                      ),
                      child: const Center(
                        child: Column(
                          children: [
                            Icon(Icons.notifications_off_outlined, color: Color(0xFF52525B), size: 40),
                            SizedBox(height: 12),
                            Text(
                              'NO ALERT PROFILES CREATED',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Tap "CREATE PROFILE" above to configure your customized asset and timeframe notifications.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _alertProfiles.length,
                      itemBuilder: (context, idx) {
                        final p = _alertProfiles[idx];
                        final isActive = p['is_active'] ?? true;
                        final tickers = List<String>.from(p['tickers'] ?? []);
                        final tfs = List<String>.from(p['timeframes'] ?? []);

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F111A),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isActive ? const Color(0xFFF97316).withValues(alpha: 0.3) : const Color(0xFF1E2235),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      p['name'] ?? 'Custom Profile',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                                    ),
                                  ),
                                  Switch(
                                    value: isActive,
                                    activeThumbColor: const Color(0xFFF97316),
                                    onChanged: (val) => _toggleProfileActive(p['id'].toString(), isActive),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFFEF4444)),
                                    onPressed: () => _deleteProfile(p['id'].toString()),
                                  ),
                                ],
                              ),
                              if (p['description'] != null && p['description'].toString().isNotEmpty) ...[
                                Text(
                                  p['description'],
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                                ),
                                const SizedBox(height: 8),
                              ],
                              const SizedBox(height: 6),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Tickers: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF71717A))),
                                  Expanded(
                                    child: Text(
                                      tickers.isEmpty ? 'All' : tickers.join(', '),
                                      style: const TextStyle(fontSize: 10, color: Color(0xFFD4D4D8)),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Timeframes: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF71717A))),
                                  Expanded(
                                    child: Text(
                                      tfs.isEmpty ? 'All' : tfs.join(', '),
                                      style: const TextStyle(fontSize: 10, color: Color(0xFFF97316)),
                                    ),
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
            ),
    );
  }
}
