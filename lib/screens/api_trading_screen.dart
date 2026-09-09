import 'package:flutter/material.dart';
import '../services/supabase_service.dart';
import '../services/encryption_helper.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class ApiTradingScreen extends StatefulWidget {
  const ApiTradingScreen({super.key});

  @override
  State<ApiTradingScreen> createState() => _ApiTradingScreenState();
}

class _ApiTradingScreenState extends State<ApiTradingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabase = SupabaseService().client;
  bool _isLoading = false;

  // Form Fields for Active Configuration
  final _apiKeyController = TextEditingController();
  final _secretKeyController = TextEditingController();
  final _passphraseController = TextEditingController();
  
  bool _isEnabled = true;
  String _environment = 'testnet';

  // Major Coins Parameters
  final _walletController = TextEditingController(text: '1000');
  final _riskPercentController = TextEditingController(text: '1.0');
  final _rrController = TextEditingController(text: '2.0');
  final _maxConcurrentController = TextEditingController(text: '3');
  String _alignment = 'Any';
  String _entryMode = 'Moderate';
  String _sweepQuality = 'Standard';
  String _gradeSetting = 'NORMAL';

  // Exchange logs
  List<Map<String, dynamic>> _logs = [];
  bool _isLoadingLogs = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        _loadExchangeConfig();
      }
    });
    
    _loadExchangeConfig();
    _loadLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _apiKeyController.dispose();
    _secretKeyController.dispose();
    _passphraseController.dispose();
    _walletController.dispose();
    _riskPercentController.dispose();
    _rrController.dispose();
    _maxConcurrentController.dispose();
    super.dispose();
  }

  String get _currentExchange => _tabController.index == 0 ? 'okx' : 'bybit';
  String get _currentTable => _tabController.index == 0 ? 'okx_auth' : 'bybit_auth';

  Future<void> _loadExchangeConfig() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() {
      _isLoading = true;
      // Clear inputs
      _apiKeyController.clear();
      _secretKeyController.clear();
      _passphraseController.clear();
    });

    try {
      final data = await _supabase
          .from(_currentTable)
          .select()
          .eq('user_id', user.id)
          .maybeSingle();

      if (data != null && mounted) {
        setState(() {
          _apiKeyController.text = data['api_key'] ?? '';
          _secretKeyController.text = data['encrypted_secret'] != null ? '••••••••••••••••' : '';
          if (_currentExchange == 'okx') {
            _passphraseController.text = data['encrypted_passphrase'] != null ? '••••••••••••••••' : '';
          }
          _isEnabled = data['is_enabled'] ?? true;
          _environment = data['environment'] ?? 'testnet';
          
          _walletController.text = (data['daily_risk_wallet'] ?? 1000).toString();
          _riskPercentController.text = (data['risk_percentage'] ?? 1.0).toString();
          _rrController.text = (data['rr'] ?? 2.0).toString();
          _maxConcurrentController.text = (data['max_concurrent_setups'] ?? 3).toString();
          _alignment = data['alignment'] ?? 'Any';
          _entryMode = data['entry_mode'] ?? 'Moderate';
          _sweepQuality = data['sweep_quality'] ?? 'Standard';
          _gradeSetting = data['grade'] ?? 'NORMAL';
        });
      }
    } catch (e) {
      _showSnackBar('Error loading settings: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _loadLogs() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoadingLogs = true);

    try {
      final data = await _supabase
          .from('exchange_logs')
          .select()
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(30);

      if (mounted) {
        setState(() {
          _logs = List<Map<String, dynamic>>.from(data);
        });
      }
    } catch (e) {
      print('Error loading logs: $e');
    } finally {
      if (mounted) setState(() => _isLoadingLogs = false);
    }
  }

  Future<void> _saveSettings() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_apiKeyController.text.isEmpty) {
      _showSnackBar('API Key is required', isError: true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      // 1. Prepare fields payload
      final payload = <String, dynamic>{
        'user_id': user.id,
        'api_key': _apiKeyController.text,
        'environment': _environment,
        'is_enabled': _isEnabled,
        
        // Trading config mapping
        'daily_risk_wallet': double.tryParse(_walletController.text) ?? 1000.0,
        'risk_percentage': double.tryParse(_riskPercentController.text) ?? 1.0,
        'rr': double.tryParse(_rrController.text) ?? 2.0,
        'max_concurrent_setups': int.tryParse(_maxConcurrentController.text) ?? 3,
        'alignment': _alignment,
        'entry_mode': _entryMode,
        'sweep_quality': _sweepQuality,
        'grade': _gradeSetting,
        'htf_alignment': 'All',
      };

      // 2. Conditionally encrypt keys only if user updated them
      if (_secretKeyController.text != '••••••••••••••••' && _secretKeyController.text.isNotEmpty) {
        payload['encrypted_secret'] = EncryptionHelper.encrypt(_secretKeyController.text);
      }
      if (_currentExchange == 'okx') {
        if (_passphraseController.text != '••••••••••••••••' && _passphraseController.text.isNotEmpty) {
          payload['encrypted_passphrase'] = EncryptionHelper.encrypt(_passphraseController.text);
        }
      }

      // 3. Check if setting exists to do insert or update
      final existing = await _supabase
          .from(_currentTable)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

      if (existing != null) {
        await _supabase
            .from(_currentTable)
            .update(payload)
            .eq('id', existing['id']);
      } else {
        await _supabase
            .from(_currentTable)
            .insert(payload);
      }

      // Log configuration change to database
      await _supabase.from('exchange_logs').insert({
        'user_id': user.id,
        'exchange': _currentExchange,
        'message': 'Configuration updated successfully via Mobile client.',
        'level': 'INFO',
      });

      _showSnackBar('Settings saved successfully!');
      _loadLogs();
    } catch (e) {
      _showSnackBar('Failed to save settings: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'api_trading'),
      appBar: AppBar(
        title: const Text(
          'API TRADING SETUP',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
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
              _loadExchangeConfig();
              _loadLogs();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFF97316),
          labelColor: Colors.white,
          unselectedLabelColor: const Color(0xFF71717A),
          tabs: const [
            Tab(text: 'OKX CONNECTION'),
            Tab(text: 'BYBIT CONNECTION'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Connection Status Card
                  GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_currentExchange.toUpperCase()} CREDENTIALS',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                            ),
                            Row(
                              children: [
                                const Text('BOT ENABLE', style: TextStyle(fontSize: 10, color: Color(0xFFA1A1AA))),
                                Switch(
                                  value: _isEnabled,
                                  activeThumbColor: const Color(0xFFF97316),
                                  onChanged: (val) => setState(() => _isEnabled = val),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        
                        // Inputs
                        TextField(
                          controller: _apiKeyController,
                          decoration: const InputDecoration(
                            labelText: 'API KEY',
                            hintText: 'Enter Exchange API Key',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _secretKeyController,
                          obscureText: true,
                          decoration: const InputDecoration(
                            labelText: 'SECRET KEY',
                            hintText: 'Enter Exchange Secret Key',
                          ),
                        ),
                        if (_currentExchange == 'okx') ...[
                          const SizedBox(height: 12),
                          TextField(
                            controller: _passphraseController,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'PASSPHRASE',
                              hintText: 'Enter Exchange Passphrase',
                            ),
                          ),
                        ],
                        const SizedBox(height: 16),
                        
                        // Environment Selector
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('ENVIRONMENT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            DropdownButton<String>(
                              value: _environment,
                              dropdownColor: const Color(0xFF0F111A),
                              items: const [
                                DropdownMenuItem(value: 'testnet', child: Text('TESTNET / DEMO')),
                                DropdownMenuItem(value: 'live', child: Text('LIVE / PRODUCTION')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _environment = val);
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
                          'TRADING RISK MODULE',
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
                                controller: _riskPercentController,
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
                                decoration: const InputDecoration(labelText: 'MIN RR TARGET'),
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
                        const SizedBox(height: 16),
                        
                        // Sweep Quality Dropdown
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('SWEEP QUALITY', style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA))),
                            DropdownButton<String>(
                              value: _sweepQuality,
                              dropdownColor: const Color(0xFF0F111A),
                              items: const [
                                DropdownMenuItem(value: 'All', child: Text('ALL')),
                                DropdownMenuItem(value: 'Standard', child: Text('STANDARD')),
                                DropdownMenuItem(value: 'Premium', child: Text('PREMIUM')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _sweepQuality = val);
                              },
                            ),
                          ],
                        ),
                        
                        // Entry Mode Dropdown
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('ENTRY MODE', style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA))),
                            DropdownButton<String>(
                              value: _entryMode,
                              dropdownColor: const Color(0xFF0F111A),
                              items: const [
                                DropdownMenuItem(value: 'Aggressive', child: Text('AGGRESSIVE')),
                                DropdownMenuItem(value: 'Moderate', child: Text('MODERATE')),
                                DropdownMenuItem(value: 'Conservative', child: Text('CONSERVATIVE')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _entryMode = val);
                              },
                            ),
                          ],
                        ),

                        // Alignment Dropdown
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('ALIGNMENT TYPE', style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA))),
                            DropdownButton<String>(
                              value: _alignment,
                              dropdownColor: const Color(0xFF0F111A),
                              items: const [
                                DropdownMenuItem(value: 'Any', child: Text('ANY')),
                                DropdownMenuItem(value: 'Bullish', child: Text('BULLISH ONLY')),
                                DropdownMenuItem(value: 'Bearish', child: Text('BEARISH ONLY')),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _alignment = val);
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Save Button
                  ElevatedButton(
                    onPressed: _saveSettings,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF97316),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'SAVE API CONFIGURATION',
                      style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 3. Execution Logs Console
                  const Text(
                    'EXCHANGE SYSTEM LOGS',
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
                                  'NO RECENT EXECUTION LOGS FOUND',
                                  style: TextStyle(fontSize: 10, color: Color(0xFF52525B)),
                                ),
                              )
                            : ListView.builder(
                                itemCount: _logs.length,
                                itemBuilder: (context, idx) {
                                  final log = _logs[idx];
                                  final isError = log['level'] == 'ERROR';
                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 6.0),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '[${log['created_at'].toString().substring(11, 19)}]',
                                          style: const TextStyle(
                                            fontFamily: 'monospace',
                                            fontSize: 9,
                                            color: Color(0xFF71717A),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            log['message'] ?? '',
                                            style: TextStyle(
                                              fontFamily: 'monospace',
                                              fontSize: 9.5,
                                              color: isError ? const Color(0xFFEF4444) : const Color(0xFFD4D4D8),
                                            ),
                                          ),
                                        ),
                                      ],
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
