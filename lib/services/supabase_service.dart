import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile_model.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  final SupabaseClient client = Supabase.instance.client;

  // Sign in user
  Future<AuthResponse> signIn({required String email, required String password}) async {
    return await client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  // Sign up user
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final response = await client.auth.signUp(
      email: email,
      password: password,
    );

    // After sign-up, create profile if session exists
    if (response.user != null) {
      await client.from('profiles').upsert({
        'id': response.user!.id,
        'email': email,
        'full_name': fullName,
        'tier': 0,
        'role': 'user',
        'is_pro': false,
        'account_size': 10000.0,
        'risk_value': 1.0,
        'reward_value': 2.0,
      });
    }

    return response;
  }

  // Sign out
  Future<void> signOut() async {
    await client.auth.signOut();
  }

  // Get current user profile
  Future<ProfileModel?> getProfile() async {
    final user = client.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await client
          .from('profiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      if (response != null) {
        return ProfileModel.fromJson(response);
      }
    } catch (e) {
      print("[SupabaseService] Error loading profile from table: $e");
    }
    
    // Fallback: create empty profile if not found or if query failed
    final newProfile = {
      'id': user.id,
      'email': user.email ?? '',
      'full_name': user.userMetadata?['full_name']?.toString() ?? 'TRADER',
      'tier': 0,
      'role': 'user',
      'is_pro': false,
      'account_size': 10000.0,
      'risk_value': 1.0,
      'reward_value': 2.0,
    };
    
    try {
      await client.from('profiles').upsert(newProfile);
    } catch (e) {
      print("[SupabaseService] Note: Could not auto-upsert profile row: $e");
    }
    return ProfileModel.fromJson(newProfile);
  }

  // Update profile settings
  Future<ProfileModel> updateProfileSettings({
    required double accountSize,
    required double riskValue,
    required double rewardValue,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw Exception("User session not found");

    final response = await client
        .from('profiles')
        .update({
          'account_size': accountSize,
          'risk_value': riskValue,
          'reward_value': rewardValue,
        })
        .eq('id', user.id)
        .select()
        .single();

    return ProfileModel.fromJson(response);
  }
}
