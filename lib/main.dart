import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:google_fonts/google_fonts.dart';

import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'https://api.crtalgo.online',
    // ignore: deprecated_member_use
    anonKey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4MTU0ODQ0MCwiZXhwIjo0OTM3MjIyMDQwLCJyb2xlIjoiYW5vbiJ9.ahMMSCRVknuLoicytMc-oij1CD7anOJgrGMqEzZWci8',
  );

  await NotificationService().initialize();

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'CRT-ALGO Pro',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark, // Enforce dark theme
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF07080D), // Ultra dark slate
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF97316), // Orange
          secondary: Color(0xFF3B82F6), // Blue
          surface: Color(0xFF0F111A),
          error: Color(0xFFEF4444),
          onPrimary: Colors.white,
          onSurface: Color(0xFFE4E4E7),
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).apply(
          bodyColor: const Color(0xFFE4E4E7),
          displayColor: Colors.white,
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF0F111A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF1E2235), width: 1),
          ),
          elevation: 0,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF141724),
          hintStyle: const TextStyle(color: Color(0xFF52525B)),
          labelStyle: const TextStyle(color: Color(0xFFA1A1AA)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1E2235)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1E2235)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFF97316), width: 1.5),
          ),
        ),
        useMaterial3: true,
      ),
      home: _getHomeWidget(authState),
    );
  }

  Widget _getHomeWidget(AuthState state) {
    if (state is AuthInitial) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            color: Color(0xFFF97316),
          ),
        ),
      );
    }
    
    if (state is AuthAuthenticated) {
      return const DashboardScreen();
    }
    
    return const LoginScreen();
  }
}
