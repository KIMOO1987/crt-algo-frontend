import 'package:flutter/material.dart';
import '../widgets/nav_drawer.dart';
import '../widgets/glass_container.dart';

class BotDocsScreen extends StatelessWidget {
  const BotDocsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07080D),
      drawer: const NavDrawer(activeRoute: 'bot_docs'),
      appBar: AppBar(
        title: const Text(
          'CFD BOT SYSTEM DOCS',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 15),
        ),
        backgroundColor: const Color(0xFF0F111A),
        shape: const Border(
          bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
        ),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          // Hero Header Card
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield_outlined, size: 10, color: Color(0xFF10B981)),
                      SizedBox(width: 4),
                      Text(
                        'CRT-ALGO SECURITY INFRASTRUCTURE',
                        style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'CRT-ALGO INSTITUTIONAL SAAS RECEIVER',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1.2),
                ),
                const SizedBox(height: 8),
                const Text(
                  'High-performance execution bridge for cTrader and MT5. Synchronized with CRT-ALGO AI backend to execute signals with microsecond precision and tier-gated risk management.',
                  style: TextStyle(fontSize: 11, color: Color(0xFFA1A1AA), height: 1.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 1. Tier Differentiation
          const Text(
            '1. TIER EXECUTION MODULES',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.5),
          ),
          const SizedBox(height: 8),
          
          // PRO Tier Box
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('CRT-ALGO PRO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                    Text(
                      'STANDARD TIER',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white.withValues(alpha: 0.6)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildBulletPoint('Target: High-speed, high-frequency signal execution.'),
                _buildBulletPoint('Execution: Immediate Market orders for instant entry.'),
                _buildBulletPoint('Leverage limits: Supports up to 1:100 leverage configurations.'),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // ULTRA Tier Box
          GlassContainer(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'CRT-ALGO ULTRA',
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFFF97316)),
                    ),
                    Text(
                      'CUSTOM PREMIUM TIER',
                      style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFFF97316)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _buildBulletPoint('Target: Precision-focused execution with slippage protection.'),
                _buildBulletPoint('Execution: Limit/Stop orders to ensure clean entries at precise key levels.'),
                _buildBulletPoint('Safeguards: Microsecond latency checks and sweep protection rules.'),
                _buildBulletPoint('Sizing: Advanced lot calculations based on prop firm account rules.'),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Setup Guides
          const Text(
            '2. BRIDGE INSTALLATION GUIDE',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1.5),
          ),
          const SizedBox(height: 8),

          // MT5 Guide
          Card(
            color: const Color(0xFF0F111A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF1E2235)),
            ),
            child: const Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'METATRADER 5 SETUP',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFF97316)),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '1. Copy the downloaded CRT-Receiver.ex5 file to your MT5 Experts directory (File > Open Data Folder > MQL5 > Experts).\n'
                    '2. Open MT5 > Tools > Options > Expert Advisors.\n'
                    '3. Check "Allow WebRequest for listed URL" and add: https://api.crtalgo.online\n'
                    '4. Drag EA onto chart, enter your Receiver Token, and activate "Algo Trading" button.',
                    style: TextStyle(fontSize: 11, color: Color(0xFFD4D4D8), height: 1.6),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),

          // cTrader Guide
          Card(
            color: const Color(0xFF0F111A),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFF1E2235)),
            ),
            child: const Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'cTRADER SETUP',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFF97316)),
                  ),
                  SizedBox(height: 8),
                  Text(
                    '1. Double-click the CRT-Bridge.algo file to load it into cTrader Automate.\n'
                    '2. Select the CRT-Bridge from the Automate sidebar panel.\n'
                    '3. Set your parameters: input your Receiver Token and daily risk wallet size.\n'
                    '4. Click the Play button. The bridge console will print "Connected successfully".',
                    style: TextStyle(fontSize: 11, color: Color(0xFFD4D4D8), height: 1.6),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 4.0, right: 8.0),
            child: Icon(Icons.check_circle_outline, size: 12, color: Color(0xFF10B981)),
          ),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFFD4D4D8), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
