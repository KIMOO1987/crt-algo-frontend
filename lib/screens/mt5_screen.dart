import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/supabase_service.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class Mt5Screen extends StatefulWidget {
  const Mt5Screen({super.key});

  @override
  State<Mt5Screen> createState() => _Mt5ScreenState();
}

class _Mt5ScreenState extends State<Mt5Screen> {
  final _supabase = SupabaseService().client;
  bool _isLoading = false;
  String? _userId;
  String? _botToken;
  bool _isBotActive = false;

  // Bot configuration values
  bool _isEnabled = true;
  final _walletController = TextEditingController(text: '1000');
  final _riskController = TextEditingController(text: '1.0');
  final _rrController = TextEditingController(text: '1.5');
  final _maxConcurrentController = TextEditingController(text: '3');
  final _baseCapitalController = TextEditingController(text: '5000');
  String _accountMode = 'Hedging';

  // CBot execution logs
  List<String> _logs = [];
  bool _isLoadingLogs = false;

  @override
  void initState() {
    super.initState();
    _loadMt5Data();
  }

  @override
  void dispose() {
    _walletController.dispose();
    _riskController.dispose();
    _rrController.dispose();
    _maxConcurrentController.dispose();
    _baseCapitalController.dispose();
    super.dispose();
  }

  Future<void> _loadMt5Data() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;
    _userId = user.id;

    setState(() => _isLoading = true);

    try {
      // 1. Load or insert bot token mapping
      var sigData = await _supabase
          .from('bot_signals')
          .select('bot_token, is_active')
          .eq('user_id', user.id)
          .eq('platform', 'MT5')
          .maybeSingle();

      sigData ??= await _supabase
            .from('bot_signals')
            .insert([{'user_id': user.id, 'platform': 'MT5'}])
            .select('bot_token, is_active')
            .single();

      _botToken = sigData['bot_token'];
      _isBotActive = sigData['is_active'] ?? false;

      // 2. Load or insert MT5 configurations
      var authConfig = await _supabase
          .from('mt5_auth')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

      authConfig ??= await _supabase
            .from('mt5_auth')
            .insert([{'user_id': user.id}])
            .select('*')
            .single();

      if (mounted) {
        final config = authConfig;
        setState(() {
          _isEnabled = config['is_enabled'] ?? true;
          _walletController.text = (config['daily_risk_wallet'] ?? 1000).toString();
          _riskController.text = (config['risk_percentage'] ?? 1.0).toString();
          _rrController.text = (config['rr'] ?? 1.5).toString();
          _maxConcurrentController.text = (config['max_concurrent_setups'] ?? 3).toString();
          _baseCapitalController.text = (config['base_capital'] ?? 5000).toString();
          _accountMode = config['account_mode'] ?? 'Hedging';
        });
      }

      if (_botToken != null) {
        _loadLogs(_botToken!);
      }
    } catch (e) {
      _showSnackBar('Error loading MT5 settings: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadLogs(String token) async {
    setState(() => _isLoadingLogs = true);
    try {
      final logsData = await _supabase
          .from('cbot_logs')
          .select('message, created_at, log_type')
          .eq('bot_token', token)
          .order('created_at', ascending: false)
          .limit(20);

      if (mounted) {
        setState(() {
          _logs = logsData.map<String>((log) {
            final time = DateTime.parse(log['created_at']).toLocal().toString().substring(11, 19);
            final typePrefix = log['log_type'] != null ? '[${log['log_type']}] ' : '';
            return '[$time] $typePrefix${log['message']}';
          }).toList();
        });
      }
    } catch (e) {
      print('Error loading cBot logs: $e');
    } finally {
      if (mounted) setState(() => _isLoadingLogs = false);
    }
  }

  Future<void> _toggleBotStatus(bool active) async {
    if (_botToken == null) return;
    setState(() => _isBotActive = active);
    try {
      await _supabase
          .from('bot_signals')
          .update({'is_active': active})
          .eq('bot_token', _botToken!);

      // System Log
      await _supabase.from('cbot_logs').insert({
        'bot_token': _botToken!,
        'message': 'MT5 execution receiver toggled ${active ? 'STARTED' : 'STOPPED'} from Mobile client.',
        'log_type': 'INFO',
      });

      _showSnackBar(active ? 'MT5 Receiver Started!' : 'MT5 Receiver Stopped!');
      _loadLogs(_botToken!);
    } catch (e) {
      setState(() => _isBotActive = !active);
      _showSnackBar('Failed to toggle receiver status: $e', isError: true);
    }
  }

  Future<void> _saveConfig() async {
    if (_userId == null) return;
    setState(() => _isLoading = true);
    try {
      final payload = {
        'is_enabled': _isEnabled,
        'daily_risk_wallet': double.tryParse(_walletController.text) ?? 1000.0,
        'risk_percentage': double.tryParse(_riskController.text) ?? 1.0,
        'rr': double.tryParse(_rrController.text) ?? 1.5,
        'max_concurrent_setups': int.tryParse(_maxConcurrentController.text) ?? 3,
        'base_capital': double.tryParse(_baseCapitalController.text) ?? 5000.0,
        'account_mode': _accountMode,
      };

      await _supabase
          .from('mt5_auth')
          .update(payload)
          .eq('user_id', _userId!);

      _showSnackBar('MT5 settings saved successfully!');
    } catch (e) {
      _showSnackBar('Failed to update config: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
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
    final webhookUrl = _botToken != null ? 'https://api.crtalgo.online/webhook/mt5/$_botToken' : 'Loading...';

    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'mt5'),
      appBar: AppBar(
        title: const Text(
          'META-TRADER 5 CONFIG',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 15),
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFF97316)),
            onPressed: () {
              if (_botToken != null) {
                _loadMt5Data();
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Connection Details Card
                  GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'MT5 SaaS RECEIVER',
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                            ),
                            Row(
                              children: [
                                Text(
                                  _isBotActive ? 'RUNNING' : 'STOPPED',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: _isBotActive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Switch(
                                  value: _isBotActive,
                                  activeThumbColor: const Color(0xFF10B981),
                                  onChanged: _toggleBotStatus,
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'RECEIVER TOKEN',
                          style: TextStyle(fontSize: 8, color: Color(0xFF71717A), fontWeight: FontWeight.bold),
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _botToken ?? 'Not configured',
                                style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 16, color: Color(0xFFF97316)),
                              onPressed: () {
                                if (_botToken != null) {
                                  Clipboard.setData(ClipboardData(text: _botToken!));
                                  _showSnackBar('Receiver Token copied!');
                                }
                              },
                            ),
                          ],
                        ),
                        const Divider(color: Color(0xFF1E2235)),
                        const Text(
                          'WEBHOOK ENDPOINT URL',
                          style: TextStyle(fontSize: 8, color: Color(0xFF71717A), fontWeight: FontWeight.bold),
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                webhookUrl,
                                style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Color(0xFFA1A1AA)),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 16, color: Color(0xFFF97316)),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: webhookUrl));
                                _showSnackBar('Webhook URL copied!');
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 2. Risk Configurations Card
                  GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'MT5 RISK AND CAPITAL SETTINGS',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _walletController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'DAILY RISK WALLET'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _riskController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'RISK PERCENTAGE'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _rrController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'REWARD-RISK (RR)'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _maxConcurrentController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'MAX SETUPS'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _baseCapitalController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'BASE CAPITAL'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                initialValue: _accountMode,
                                decoration: const InputDecoration(labelText: 'ACCOUNT TYPE'),
                                dropdownColor: const Color(0xFF0F111A),
                                items: const [
                                  DropdownMenuItem(value: 'Hedging', child: Text('HEDGING')),
                                  DropdownMenuItem(value: 'Netting', child: Text('NETTING')),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _accountMode = val);
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('SaaS BRIDGE ENABLE', style: TextStyle(fontSize: 12, color: Color(0xFFA1A1AA))),
                            Switch(
                              value: _isEnabled,
                              activeThumbColor: const Color(0xFFF97316),
                              onChanged: (val) => setState(() => _isEnabled = val),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Save Button
                  ElevatedButton(
                    onPressed: _saveConfig,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF97316),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'SAVE MT5 SYSTEM VALUES',
                      style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 3. MT5 Console Log Console
                  const Text(
                    'MT5 SaaS BRIDGE LOGS',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 200,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0B0F),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF1E2235)),
                    ),
                    child: _isLoadingLogs
                        ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
                        : _logs.isEmpty
                            ? const Center(
                                child: Text(
                                  'NO RECENT MT5 LOGS FOUND',
                                  style: TextStyle(fontSize: 10, color: Color(0xFF52525B)),
                                ),
                              )
                            : ListView.builder(
                                itemCount: _logs.length,
                                itemBuilder: (context, idx) {
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6.0),
                                    child: Text(
                                      _logs[idx],
                                      style: const TextStyle(
                                        fontFamily: 'monospace',
                                        fontSize: 9.5,
                                        color: Color(0xFFD4D4D8),
                                      ),
                                    ),
                                  );
                                },
                              ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
