import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/supabase_service.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  final _supabase = SupabaseService().client;
  bool _isLoading = true;
  Map<String, dynamic>? _userProfile;

  final List<Map<String, String>> _wallets = [
    {'network': 'USDT (ERC20)', 'address': '0x79adb2f07fc055e2c858d6edf25a37dce43de00a'},
    {'network': 'USDT (TRC20)', 'address': 'TMfFLoNrLm21YDRcA3oej8ZdksSbNKg8Sb'},
    {'network': 'USDT (BEP20)', 'address': '0x79adb2f07fc055e2c858d6edf25a37dce43de00a'},
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      final p = await _supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      if (mounted) {
        setState(() {
          _userProfile = p;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _activateTrial() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    try {
      final expiry = DateTime.now().add(const Duration(days: 15)).toIso8601String();
      await _supabase.from('profiles').update({
        'tier': 2,
        'plan_type': '15-Day Ultimate Trial',
        'is_pro': true,
        'expiry_date': expiry,
      }).eq('id', user.id);

      _showSnackBar('15-Day Ultimate Trial successfully activated!');
      _loadProfile();
    } catch (e) {
      _showSnackBar('Failed to activate trial: $e', isError: true);
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
    final tier = _userProfile?['tier'] ?? 0;
    final planName = _userProfile?['plan_type'] ?? (tier >= 2 ? 'Pro Tier' : (tier == 1 ? 'Starter Tier' : 'Free Member'));
    final expiry = _userProfile?['expiry_date'];

    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'payments'),
      appBar: AppBar(
        title: const Text(
          'MEMBERSHIP & BILLING',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Current Tier Card
                  GlassContainer(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'CURRENT STATUS: $planName'.toUpperCase(),
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF97316).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.3)),
                              ),
                              child: Text(
                                tier >= 2 ? 'TIER 2 (PRO)' : (tier == 1 ? 'TIER 1' : 'FREE TIER'),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 9, color: Color(0xFFF97316)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          expiry != null ? 'Access Valid Until: $expiry' : 'No active recurring subscription.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                        ),
                        if (tier == 0) ...[
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _activateTrial,
                            icon: const Icon(Icons.card_giftcard, size: 16),
                            label: const Text('ACTIVATE 15-DAY ULTIMATE TRIAL'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              minimumSize: const Size.fromHeight(44),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Plans Comparison Matrix
                  const Text(
                    'UPGRADE OPTIONS',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 12),

                  _buildPlanCard(
                    title: 'CRT STARTER',
                    price: r'$49 / month',
                    features: [
                      'CRT Alpha Radar Scanner',
                      'Active Trade Signals Stream',
                      'Trade Journal & Analytics',
                      'Web & Mobile App Access',
                    ],
                    isRecommended: false,
                    whopUrl: 'https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-02/',
                  ),
                  const SizedBox(height: 12),

                  _buildPlanCard(
                    title: 'PRO ALGO SUITE',
                    price: r'$99 / month',
                    features: [
                      'Everything in Starter',
                      'SFP (Swing Failure Pattern) Engine',
                      'Real-time Telegram Alert Bot',
                      '7H Profiling TV Indicator Access',
                      'Institutional Risk Dashboard',
                    ],
                    isRecommended: true,
                    whopUrl: 'https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-02/',
                  ),
                  const SizedBox(height: 12),

                  _buildPlanCard(
                    title: 'ULTIMATE PROP DESK',
                    price: r'$199 / month',
                    features: [
                      'Full Unrestricted Algo Desk',
                      'cTrader Direct Execution Bridge',
                      'MT5 Multi-Terminal Bridge',
                      'OKX / Bybit API Trading Automations',
                      'VIP Telegram Group Access',
                    ],
                    isRecommended: false,
                    whopUrl: 'https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-yearly-subscription/',
                  ),
                  const SizedBox(height: 24),

                  // Crypto Settlement
                  const Text(
                    'PAY WITH CRYPTOCURRENCY',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Send USDT deposit to any network address below, then contact our team with your TX hash for manual upgrade.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
                  ),
                  const SizedBox(height: 12),
                  ..._wallets.map((w) {
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
                          Text(
                            w['network']!,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Color(0xFF10B981)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              w['address']!,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Color(0xFFD4D4D8)),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 16, color: Color(0xFFF97316)),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: w['address']!));
                              _showSnackBar('Wallet address copied!');
                            },
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }

  Widget _buildPlanCard({
    required String title,
    required String price,
    required List<String> features,
    required bool isRecommended,
    required String whopUrl,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isRecommended ? const Color(0xFFF97316) : const Color(0xFF1E2235),
          width: isRecommended ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1.0)),
              if (isRecommended)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF97316),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('POPULAR', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 8, color: Colors.white)),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFF97316))),
          const Divider(color: Color(0xFF1E2235), height: 20),
          ...features.map((f) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, size: 14, color: Color(0xFF10B981)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(f, style: const TextStyle(fontSize: 11, color: Color(0xFFD4D4D8)))),
                ],
              ),
            );
          }),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () async {
              final uri = Uri.parse(whopUrl);
              if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: isRecommended ? const Color(0xFFF97316) : const Color(0xFF141724),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(42),
            ),
            child: const Text('UPGRADE ON WHOP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
