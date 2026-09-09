import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/supabase_service.dart';
import '../widgets/nav_drawer.dart';

class ResourcesScreen extends StatefulWidget {
  const ResourcesScreen({super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  final _supabase = SupabaseService().client;
  bool _isLoading = true;
  Map<String, dynamic> _invitesMap = {};

  final _tvUsernameController = TextEditingController();

  final List<Map<String, String>> _wallets = [
    {'network': 'USDT (ERC20)', 'address': '0x79adb2f07fc055e2c858d6edf25a37dce43de00a'},
    {'network': 'USDT (TRC20)', 'address': 'TMfFLoNrLm21YDRcA3oej8ZdksSbNKg8Sb'},
    {'network': 'USDT (BEP20)', 'address': '0x79adb2f07fc055e2c858d6edf25a37dce43de00a'},
  ];

  @override
  void initState() {
    super.initState();
    _loadInvites();
  }

  @override
  void dispose() {
    _tvUsernameController.dispose();
    super.dispose();
  }

  Future<void> _loadInvites() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);

    try {
      final data = await _supabase
          .from('tradingview_invites')
          .select()
          .eq('user_id', user.id);

      final Map<String, dynamic> mapped = {};
      for (final inv in data) {
        mapped[inv['indicator_id'] ?? ''] = inv;
      }

      if (mounted) {
        setState(() {
          _invitesMap = mapped;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _requestFreeIndicator(String id, String name) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    if (_tvUsernameController.text.trim().isEmpty) {
      _showSnackBar('Please enter your TradingView username', isError: true);
      return;
    }

    try {
      await _supabase.from('tradingview_invites').upsert({
        'user_id': user.id,
        'tradingview_username': _tvUsernameController.text.trim(),
        'indicator_id': id,
        'indicator_name': name,
        'status': 'pending',
        'payment_method': 'FREE',
        'payment_amount': 0,
        'duration_months': 12,
      });

      _tvUsernameController.clear();
      if (!mounted) return;
      Navigator.pop(context);
      _showSnackBar('Access request submitted! Check TradingView notifications within 24h.');
      _loadInvites();
    } catch (e) {
      _showSnackBar('Failed to submit request: $e', isError: true);
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

  void _openRequestModal(String id, String name) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F111A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'REQUEST ACCESS: $name',
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter your exact TradingView username. Access will be provisioned directly to your TradingView account under "Invite-Only Scripts".',
                style: TextStyle(fontSize: 11, color: Color(0xFF71717A)),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _tvUsernameController,
                decoration: const InputDecoration(
                  labelText: 'TRADINGVIEW USERNAME',
                  hintText: 'e.g. SatoshiNakamoto',
                  prefixIcon: Icon(Icons.person_outline, size: 18),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => _requestFreeIndicator(id, name),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF97316),
                  minimumSize: const Size.fromHeight(48),
                ),
                child: const Text('SUBMIT FOR APPROVAL', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'resources'),
      appBar: AppBar(
        title: const Text(
          'RESOURCES & SCRIPTS',
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
                  // SECTION 1: TRADINGVIEW SCRIPTS
                  const Text(
                    'TRADINGVIEW INDICATORS & SUITES',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 12),

                  // Indicator 1: 7H Profiling (Free)
                  _buildScriptCard(
                    id: '7h-profiling',
                    title: '7H Profiling & Market Cycles',
                    description: 'Automated 7-hour institutional cycle detection, daily profiling, and killzone boundaries.',
                    isFree: true,
                    invite: _invitesMap['7h-profiling'],
                    onAction: () => _openRequestModal('7h-profiling', '7H Profiling & Market Cycles'),
                  ),
                  const SizedBox(height: 12),

                  // Indicator 2: CRT-Algo Ultimate Suite
                  _buildScriptCard(
                    id: 'crt-algo-ultimate',
                    title: 'CRT-Algo +Ultimate Engine',
                    description: 'Full automated Candlestick Range Theory engine with real-time liquidity sweep alerts, dynamic TP1-4 targets, and MT5/cTrader bridge sync.',
                    isFree: false,
                    invite: _invitesMap['crt-algo-ultimate'],
                    onAction: () async {
                      final uri = Uri.parse('https://whop.com/kimoo-crt-pro-e122/kimoo-crt-pro-02/');
                      if (await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
                    },
                  ),
                  const SizedBox(height: 24),

                  // SECTION 2: CRYPTO DEPOSIT WALLETS
                  const Text(
                    'DIRECT CRYPTO SETTLEMENT (USDT)',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'For instant activation via cryptocurrency, deposit to any address below and send transaction hash to support.',
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
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              w['network']!,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10, color: Color(0xFF10B981)),
                            ),
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
                              _showSnackBar('Wallet address copied to clipboard!');
                            },
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 24),

                  // SECTION 3: VIDEO PLAYBOOKS & DOCS
                  const Text(
                    'STRATEGY PLAYBOOKS & DOCUMENTATION',
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 12),
                  _buildDocTile(
                    title: 'CRT Strategy Rules & Entry Playbook',
                    subtitle: 'Master the 3-step CRT confirmation process and session liquidity sweeps.',
                    icon: Icons.menu_book_outlined,
                  ),
                  _buildDocTile(
                    title: 'SFP (Swing Failure Pattern) Guide',
                    subtitle: 'Institutional liquidity grabs and high-probability reversal execution.',
                    icon: Icons.bolt_outlined,
                  ),
                  _buildDocTile(
                    title: 'Risk & Capital Preservation Framework',
                    subtitle: 'Max daily drawdowns, scaling out rules, and prop firm passing guidelines.',
                    icon: Icons.security_outlined,
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildScriptCard({
    required String id,
    required String title,
    required String description,
    required bool isFree,
    required Map<String, dynamic>? invite,
    required VoidCallback onAction,
  }) {
    final status = invite?['status']?.toString();
    Color badgeColor = const Color(0xFF71717A);
    String badgeText = isFree ? 'FREE INCLUDED' : 'PRO / ULTIMATE';

    if (status == 'approved') {
      badgeColor = const Color(0xFF10B981);
      badgeText = 'ACCESS APPROVED';
    } else if (status == 'pending') {
      badgeColor = const Color(0xFFEAB308);
      badgeText = 'PENDING APPROVAL';
    }

    return Container(
      padding: const EdgeInsets.all(16),
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
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 9, color: badgeColor),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(fontSize: 11, color: Color(0xFF71717A), height: 1.4),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: status == 'approved' ? null : onAction,
            icon: Icon(isFree ? Icons.key_outlined : Icons.lock_open, size: 16),
            label: Text(
              status == 'approved'
                  ? 'ACTIVATED ON TRADINGVIEW'
                  : (status == 'pending' ? 'REQUEST SUBMITTED' : (isFree ? 'REQUEST TV ACCESS' : 'UPGRADE & UNLOCK')),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: isFree ? const Color(0xFFF97316) : const Color(0xFF10B981),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(40),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocTile({required String title, required String subtitle, required IconData icon}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F111A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF1E2235)),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFFF97316), size: 24),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF71717A))),
        trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFF52525B)),
        onTap: () {
          _showSnackBar('Detailed guide available in the web portal documentation.');
        },
      ),
    );
  }
}
