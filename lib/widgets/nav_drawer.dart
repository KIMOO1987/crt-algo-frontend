import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../screens/dashboard_screen.dart';
import '../screens/pro_terminal_screen.dart';
import '../screens/sfp_screen.dart';
import '../screens/api_trading_screen.dart';
import '../screens/ctrader_screen.dart';
import '../screens/mt5_screen.dart';
import '../screens/journal_screen.dart';
import '../screens/alerts_screen.dart';
import '../screens/notifications_settings_screen.dart';
import '../screens/resources_screen.dart';
import '../screens/payments_screen.dart';
import '../screens/bot_docs_screen.dart';

class NavDrawer extends ConsumerWidget {
  final String activeRoute;

  const NavDrawer({super.key, required this.activeRoute});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    if (authState is! AuthAuthenticated) return const Drawer();

    final p = authState.profile;

    return Drawer(
      backgroundColor: const Color(0xFF07080D),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(20),
          bottomRight: Radius.circular(20),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Section
          DrawerHeader(
            decoration: const BoxDecoration(
              color: Color(0xFF0F111A),
              border: Border(
                bottom: BorderSide(color: Color(0xFF1E2235), width: 1),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      p.fullName?.toUpperCase() ?? 'TRADER',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 1.0,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF97316).withValues(alpha: 0.15),
                        border: Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.3)),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        p.role == 'admin' ? 'ADMIN' : (p.tier >= 2 ? 'PRO' : (p.tier == 1 ? 'STARTER' : 'FREE')),
                        style: const TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFFF97316),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  p.email,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF71717A),
                    fontFamily: 'monospace',
                  ),
                ),
                const SizedBox(height: 10),
                // License copy row
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: p.id));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('License key copied to clipboard!')),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141724),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF1E2235)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'LICENSE: ${p.id}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 8,
                              fontFamily: 'monospace',
                              color: Color(0xFFD4D4D8),
                            ),
                          ),
                        ),
                        const Icon(Icons.copy, size: 10, color: Color(0xFFF97316)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Menu Items Grouped List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
              children: [
                // GROUP 1: CRT SECTION
                _buildGroupHeader('CRT SECTION'),
                _buildMenuItem(
                  context: context,
                  label: 'CRT DASHBOARD',
                  icon: Icons.dashboard_outlined,
                  route: 'dashboard',
                  destination: const DashboardScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'PRO TERMINAL CHART',
                  icon: Icons.candlestick_chart_outlined,
                  route: 'chart',
                  destination: const ProTerminalScreen(),
                ),

                const SizedBox(height: 8),
                // GROUP 2: SFP SECTION
                _buildGroupHeader('SFP SECTION'),
                _buildMenuItem(
                  context: context,
                  label: 'SFP HUNTER & RADAR',
                  icon: Icons.bolt_outlined,
                  route: 'sfp',
                  destination: const SfpScreen(),
                ),

                const SizedBox(height: 8),
                // GROUP 3: BOT BRIDGES
                _buildGroupHeader('EXECUTION & BOT BRIDGES'),
                _buildMenuItem(
                  context: context,
                  label: 'API TRADING (OKX/BYBIT)',
                  icon: Icons.api_outlined,
                  route: 'api_trading',
                  destination: const ApiTradingScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'CTRADER CONFIG',
                  icon: Icons.settings_input_component_outlined,
                  route: 'ctrader',
                  destination: const CTraderScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'MT5 CONFIG',
                  icon: Icons.terminal_outlined,
                  route: 'mt5',
                  destination: const Mt5Screen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'CFD BOT DOCS',
                  icon: Icons.description_outlined,
                  route: 'bot_docs',
                  destination: const BotDocsScreen(),
                ),

                const SizedBox(height: 8),
                // GROUP 4: JOURNAL & ANALYTICS
                _buildGroupHeader('ANALYTICS & JOURNAL'),
                _buildMenuItem(
                  context: context,
                  label: 'TRADE JOURNAL',
                  icon: Icons.book_outlined,
                  route: 'journal',
                  destination: const JournalScreen(),
                ),

                const SizedBox(height: 8),
                // GROUP 5: ACCOUNT & SETTINGS
                _buildGroupHeader('ACCOUNT & SETTINGS'),
                _buildMenuItem(
                  context: context,
                  label: 'MOBILE NOTIFICATIONS',
                  icon: Icons.notifications_active_outlined,
                  route: 'notifications',
                  destination: const NotificationsSettingsScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'TELEGRAM ALERTS',
                  icon: Icons.send_outlined,
                  route: 'alerts',
                  destination: const AlertsScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'RESOURCES & SCRIPTS',
                  icon: Icons.auto_graph_outlined,
                  route: 'resources',
                  destination: const ResourcesScreen(),
                ),
                _buildMenuItem(
                  context: context,
                  label: 'MEMBERSHIP & PLANS',
                  icon: Icons.credit_card_outlined,
                  route: 'payments',
                  destination: const PaymentsScreen(),
                ),
              ],
            ),
          ),

          // Footer / Logout Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Color(0xFF1E2235), width: 1),
              ),
            ),
            child: InkWell(
              onTap: () {
                ref.read(authProvider.notifier).signOut();
              },
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.logout, color: Color(0xFFEF4444), size: 18),
                  SizedBox(width: 10),
                  Text(
                    'SIGN OUT',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFEF4444),
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGroupHeader(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 12, top: 8, bottom: 4),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.w900,
          color: Color(0xFF52525B),
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildMenuItem({
    required BuildContext context,
    required String label,
    required IconData icon,
    required String route,
    required Widget destination,
  }) {
    final isActive = activeRoute == route;

    return Container(
      margin: const EdgeInsets.only(bottom: 4.0),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFFF97316).withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        border: isActive
            ? Border.all(color: const Color(0xFFF97316).withValues(alpha: 0.3))
            : Border.all(color: Colors.transparent),
      ),
      child: ListTile(
        visualDensity: const VisualDensity(vertical: -3),
        leading: Icon(
          icon,
          color: isActive ? const Color(0xFFF97316) : const Color(0xFF71717A),
          size: 18,
        ),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isActive ? FontWeight.w900 : FontWeight.bold,
            color: isActive ? Colors.white : const Color(0xFFD4D4D8),
            letterSpacing: 0.8,
          ),
        ),
        onTap: () {
          // Close drawer
          Navigator.pop(context);
          
          if (isActive) return;

          // Replace current page with clean transition
          Navigator.pushReplacement(
            context,
            PageRouteBuilder(
              pageBuilder: (context, animation, secondaryAnimation) => destination,
              transitionsBuilder: (context, animation, secondaryAnimation, child) {
                return FadeTransition(opacity: animation, child: child);
              },
            ),
          );
        },
      ),
    );
  }
}
