import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile_model.dart';
import '../services/supabase_service.dart';

// State definitions
abstract class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final ProfileModel profile;
  const AuthAuthenticated(this.profile);
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

// StateNotifier to manage auth state changes
class AuthNotifier extends StateNotifier<AuthState> {
  final SupabaseService _supabaseService = SupabaseService();

  AuthNotifier() : super(const AuthInitial()) {
    _init();
  }

  void _init() {
    // Check initial session
    final session = _supabaseService.client.auth.currentSession;
    if (session != null) {
      fetchProfile();
    } else {
      state = const AuthUnauthenticated();
    }

    // Listen to Supabase auth events
    _supabaseService.client.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      if (event == AuthChangeEvent.signedIn || 
          event == AuthChangeEvent.tokenRefreshed || 
          event == AuthChangeEvent.initialSession) {
        if (_supabaseService.client.auth.currentUser != null) {
          await fetchProfile();
        }
      } else if (event == AuthChangeEvent.signedOut) {
        state = const AuthUnauthenticated();
      }
    });
  }

  Future<void> fetchProfile() async {
    final user = _supabaseService.client.auth.currentUser;
    if (user == null) {
      state = const AuthUnauthenticated();
      return;
    }

    // Ensure the user is immediately marked Authenticated with a fallback
    // so they are never erroneously returned to LoginScreen
    final fallbackProfile = ProfileModel(
      id: user.id,
      email: user.email ?? '',
      fullName: user.userMetadata?['full_name']?.toString() ?? 'TRADER',
      tier: 0,
      role: 'user',
      isPro: false,
      accountSize: 10000.0,
      riskValue: 1.0,
      rewardValue: 2.0,
    );

    if (state is! AuthAuthenticated) {
      state = AuthAuthenticated(fallbackProfile);
    }

    try {
      final profile = await _supabaseService.getProfile();
      if (profile != null) {
        state = AuthAuthenticated(profile);
      }
    } catch (e) {
      print("[AuthNotifier] Background profile sync warning: $e");
    }
  }

  Future<void> signIn(String email, String password) async {
    state = const AuthLoading();
    try {
      final res = await _supabaseService.signIn(email: email, password: password);
      if (res.user != null) {
        await fetchProfile();
      } else {
        state = const AuthError("Invalid email or password");
      }
    } on AuthException catch (e) {
      state = AuthError(e.message);
    } catch (e) {
      final errorStr = e.toString();
      if (errorStr.contains("Failed to fetch") || errorStr.contains("ClientException")) {
        state = const AuthError(
          "Browser CORS blocked localhost. To test in Chrome, run Flutter with: --web-browser-flag \"--disable-web-security\". On a real Android/iOS phone, CORS does not apply.",
        );
      } else {
        state = AuthError("Login failed: $errorStr");
      }
    }
  }

  Future<void> signUp(String email, String password, String fullName) async {
    state = const AuthLoading();
    try {
      await _supabaseService.signUp(email: email, password: password, fullName: fullName);
      // Wait for session
    } on AuthException catch (e) {
      state = AuthError(e.message);
    } catch (e) {
      state = AuthError("An unexpected error occurred: ${e.toString()}");
    }
  }

  Future<void> updateSettings(double accountSize, double riskValue, double rewardValue) async {
    final currentState = state;
    if (currentState is AuthAuthenticated) {
      try {
        final updatedProfile = await _supabaseService.updateProfileSettings(
          accountSize: accountSize,
          riskValue: riskValue,
          rewardValue: rewardValue,
        );
        state = AuthAuthenticated(updatedProfile);
      } catch (e) {
        // Log or handle settings update error silently or through state
      }
    }
  }

  Future<void> signOut() async {
    await _supabaseService.signOut();
  }
}

// Provider definition
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
