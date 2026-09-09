import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/supabase_service.dart';
import 'auth_provider.dart';

// Dashboard filters state model
class DashboardFilters {
  final double accountSize;
  final double riskValue;
  final double rewardValue;
  final String timeframe;
  final String assetClass;
  final String tfAlignment;
  final String? dateFrom;
  final String? dateTo;

  DashboardFilters({
    required this.accountSize,
    required this.riskValue,
    required this.rewardValue,
    this.timeframe = 'all',
    this.assetClass = 'ALL',
    this.tfAlignment = 'ALL',
    this.dateFrom,
    this.dateTo,
  });

  DashboardFilters copyWith({
    double? accountSize,
    double? riskValue,
    double? rewardValue,
    String? timeframe,
    String? assetClass,
    String? tfAlignment,
    String? dateFrom,
    String? dateTo,
  }) {
    return DashboardFilters(
      accountSize: accountSize ?? this.accountSize,
      riskValue: riskValue ?? this.riskValue,
      rewardValue: rewardValue ?? this.rewardValue,
      timeframe: timeframe ?? this.timeframe,
      assetClass: assetClass ?? this.assetClass,
      tfAlignment: tfAlignment ?? this.tfAlignment,
      dateFrom: dateFrom ?? this.dateFrom,
      dateTo: dateTo ?? this.dateTo,
    );
  }
}

// Notifier to hold filter states
class DashboardFiltersNotifier extends StateNotifier<DashboardFilters> {
  DashboardFiltersNotifier(ProfileModelInitialValues profile)
      : super(DashboardFilters(
          accountSize: profile.accountSize,
          riskValue: profile.riskValue,
          rewardValue: profile.rewardValue,
        ));

  void updateFilters({
    double? accountSize,
    double? riskValue,
    double? rewardValue,
    String? timeframe,
    String? assetClass,
    String? tfAlignment,
    String? dateFrom,
    String? dateTo,
  }) {
    state = state.copyWith(
      accountSize: accountSize,
      riskValue: riskValue,
      rewardValue: rewardValue,
      timeframe: timeframe,
      assetClass: assetClass,
      tfAlignment: tfAlignment,
      dateFrom: dateFrom,
      dateTo: dateTo,
    );
  }
}

// Helper structure to pass initial configuration values from profile
class ProfileModelInitialValues {
  final double accountSize;
  final double riskValue;
  final double rewardValue;
  ProfileModelInitialValues(this.accountSize, this.riskValue, this.rewardValue);
}

// Filter provider mapping User profile details
final dashboardFiltersProvider = StateNotifierProvider<DashboardFiltersNotifier, DashboardFilters>((ref) {
  final authState = ref.watch(authProvider);
  if (authState is AuthAuthenticated) {
    return DashboardFiltersNotifier(
      ProfileModelInitialValues(
        authState.profile.accountSize,
        authState.profile.riskValue,
        authState.profile.rewardValue,
      ),
    );
  }
  return DashboardFiltersNotifier(ProfileModelInitialValues(10000.0, 1.0, 2.0));
});

// FutureProvider that runs the Supabase RPC queries dynamically when filters change
final dashboardStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final authState = ref.watch(authProvider);
  if (authState is! AuthAuthenticated) {
    return {};
  }

  final filters = ref.watch(dashboardFiltersProvider);
  final supabase = SupabaseService().client;

  final response = await supabase.rpc('get_client_dashboard_data', params: {
    'p_user_id': authState.profile.id,
    'p_account_size': filters.accountSize,
    'p_risk_percent': filters.riskValue,
    'p_reward_ratio': filters.rewardValue,
    'p_timeframe': filters.timeframe,
    'p_asset_class': filters.assetClass,
    'p_tf_alignment': filters.tfAlignment,
    'p_date_from': filters.dateFrom != null && filters.dateFrom!.isNotEmpty
        ? DateTime.parse(filters.dateFrom!).toUtc().toIso8601String()
        : null,
    'p_date_to': filters.dateTo != null && filters.dateTo!.isNotEmpty
        ? DateTime.parse(filters.dateTo!).add(const Duration(hours: 23, minutes: 59, seconds: 59)).toUtc().toIso8601String()
        : null,
  });

  return Map<String, dynamic>.from(response as Map);
});
