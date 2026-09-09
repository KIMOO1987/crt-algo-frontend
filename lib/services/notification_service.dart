import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/signal_model.dart';
import 'symbol_mapper.dart';

class NotificationSettings {
  final bool masterEnabled;
  final bool crtEnabled;
  final bool sfpEnabled;
  final bool soundVibrate;
  final List<String> selectedGrades;
  final List<String> selectedSymbols;

  NotificationSettings({
    required this.masterEnabled,
    required this.crtEnabled,
    required this.sfpEnabled,
    required this.soundVibrate,
    required this.selectedGrades,
    required this.selectedSymbols,
  });

  NotificationSettings copyWith({
    bool? masterEnabled,
    bool? crtEnabled,
    bool? sfpEnabled,
    bool? soundVibrate,
    List<String>? selectedGrades,
    List<String>? selectedSymbols,
  }) {
    return NotificationSettings(
      masterEnabled: masterEnabled ?? this.masterEnabled,
      crtEnabled: crtEnabled ?? this.crtEnabled,
      sfpEnabled: sfpEnabled ?? this.sfpEnabled,
      soundVibrate: soundVibrate ?? this.soundVibrate,
      selectedGrades: selectedGrades ?? this.selectedGrades,
      selectedSymbols: selectedSymbols ?? this.selectedSymbols,
    );
  }
}

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _initialized = false;
  final Set<String> _seenSignalIds = {};
  bool _isSeeded = false;
  bool get isSeeded => _isSeeded;

  static const String _keyMaster = 'notif_master_enabled';
  static const String _keyCrt = 'notif_crt_enabled';
  static const String _keySfp = 'notif_sfp_enabled';
  static const String _keySound = 'notif_sound_vibrate';
  static const String _keyGrades = 'notif_selected_grades';
  static const String _keySymbols = 'notif_selected_symbols';

  static const List<String> defaultGrades = ['A++', 'A+', 'GOOD', 'NORMAL'];

  static const List<String> allAvailableSymbols = [
    // Crypto
    'BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD', 'XRPUSD', 'DOGEUSD', 'ADAUSD', 'AVAXUSD', 'LINKUSD', 'SUIUSD', 'PEPEUSD', 'NEARUSD',
    // Metals
    'XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD',
    // Forex
    'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'AUDUSD', 'EURJPY', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP',
    // Indices
    'US100', 'US500', 'US30', 'GER40', 'UK100',
  ];

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _plugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('[NotificationService] Notification tapped: ${response.payload}');
        },
      );

      // Create high-importance Android channel
      final androidPlatform = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlatform != null) {
        await androidPlatform.createNotificationChannel(
          const AndroidNotificationChannel(
            'crt_signals_channel',
            'CRT-ALGO Pro Signals',
            description: 'Institutional real-time signal alerts with sound & vibration',
            importance: Importance.max,
            playSound: true,
            enableVibration: true,
          ),
        );
        // Request runtime permission on Android 13+
        await androidPlatform.requestNotificationsPermission();
      }

      _initialized = true;
      debugPrint('[NotificationService] Initialized successfully');
    } catch (e) {
      debugPrint('[NotificationService] Init error: $e');
    }
  }

  Future<NotificationSettings> loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final master = prefs.getBool(_keyMaster) ?? true;
    final crt = prefs.getBool(_keyCrt) ?? true;
    final sfp = prefs.getBool(_keySfp) ?? true;
    final sound = prefs.getBool(_keySound) ?? true;
    final grades = prefs.getStringList(_keyGrades) ?? List<String>.from(defaultGrades);
    final symbols = prefs.getStringList(_keySymbols) ?? List<String>.from(allAvailableSymbols);

    return NotificationSettings(
      masterEnabled: master,
      crtEnabled: crt,
      sfpEnabled: sfp,
      soundVibrate: sound,
      selectedGrades: grades,
      selectedSymbols: symbols,
    );
  }

  Future<void> saveSettings(NotificationSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyMaster, settings.masterEnabled);
    await prefs.setBool(_keyCrt, settings.crtEnabled);
    await prefs.setBool(_keySfp, settings.sfpEnabled);
    await prefs.setBool(_keySound, settings.soundVibrate);
    await prefs.setStringList(_keyGrades, settings.selectedGrades);
    await prefs.setStringList(_keySymbols, settings.selectedSymbols);
  }

  /// Seeds existing signal IDs so opening the app doesn't fire duplicate past alerts
  void seedSeenSignals(List<SignalModel> signals) {
    for (final s in signals) {
      _seenSignalIds.add(s.id);
    }
    _isSeeded = true;
  }

  /// Evaluates an incoming signal against user notification criteria
  Future<bool> shouldNotify(SignalModel signal) async {
    final settings = await loadSettings();

    // 1. Master toggle check
    if (!settings.masterEnabled) return false;

    // 2. Strategy channel check
    final isSfp = signal.strategy.toUpperCase().contains('SFP');
    if (isSfp && !settings.sfpEnabled) return false;
    if (!isSfp && !settings.crtEnabled) return false;

    // 3. Symbol filter check
    final normalized = SymbolMapper.normalizeSymbol(signal.symbol);
    final variations = SymbolMapper.getAllKeyVariations(signal.symbol);
    final selectedSet = settings.selectedSymbols.toSet();

    bool symbolMatches = selectedSet.contains(normalized) ||
        variations.any((v) => selectedSet.contains(v));

    if (!symbolMatches) {
      // Also check standard stripped tickers (e.g. BTC, ETH)
      final rawUpper = signal.symbol.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
      symbolMatches = selectedSet.any((s) => s.contains(rawUpper) || rawUpper.contains(s));
    }

    if (!symbolMatches) return false;

    // 4. Grading filter check
    final signalGrade = signal.grade.toUpperCase().trim();
    final cleanGrade = _normalizeGrade(signalGrade);
    
    final gradeMatches = settings.selectedGrades.any((g) {
      final userGrade = g.toUpperCase().trim();
      return cleanGrade == userGrade || signalGrade.contains(userGrade);
    });

    if (!gradeMatches) return false;

    return true;
  }

  static String _normalizeGrade(String raw) {
    if (raw.contains('A++')) return 'A++';
    if (raw.contains('A+')) return 'A+';
    if (raw.contains('GOOD')) return 'GOOD';
    if (raw.contains('NORMAL')) return 'NORMAL';
    return raw;
  }

  /// Checks if signal is new and matches filters, then triggers notification
  Future<void> checkAndNotify(SignalModel signal) async {
    if (!_isSeeded) {
      _seenSignalIds.add(signal.id);
      return;
    }

    if (_seenSignalIds.contains(signal.id)) {
      return; // Already alerted or known
    }

    _seenSignalIds.add(signal.id);

    final canNotify = await shouldNotify(signal);
    if (canNotify) {
      await showSignalNotification(signal);
    }
  }

  /// Triggers a native push notification with high priority, sound & vibration
  Future<void> showSignalNotification(SignalModel signal) async {
    try {
      final settings = await loadSettings();
      final isSfp = signal.strategy.toUpperCase().contains('SFP');
      final prefix = isSfp ? '🎯 SFP SWEEP' : '⚡ CRT PRO';
      final side = signal.side.toUpperCase();
      final symbol = signal.symbol;
      final grade = _normalizeGrade(signal.grade);

      final title = '$prefix: $side $symbol';
      final body = 'Entry: ${signal.entryPrice} | TP: ${signal.tp} | SL: ${signal.sl} | Grade: $grade';

      final androidDetails = AndroidNotificationDetails(
        'crt_signals_channel',
        'CRT-ALGO Pro Signals',
        channelDescription: 'Institutional real-time signal alerts',
        importance: Importance.max,
        priority: Priority.high,
        playSound: settings.soundVibrate,
        enableVibration: settings.soundVibrate,
        styleInformation: BigTextStyleInformation(
          body,
          htmlFormatBigText: false,
          contentTitle: title,
          summaryText: 'Grade: $grade',
        ),
      );

      final iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: settings.soundVibrate,
      );

      final notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final notifId = signal.id.hashCode & 0x7FFFFFFF;

      await _plugin.show(
        id: notifId,
        title: title,
        body: body,
        notificationDetails: notificationDetails,
        payload: jsonEncode({'id': signal.id, 'symbol': signal.symbol}),
      );

      debugPrint('[NotificationService] Dispatched push alert: $title');
    } catch (e) {
      debugPrint('[NotificationService] Push alert failed: $e');
    }
  }

  /// Sends a test alert for instant user validation
  Future<void> showTestNotification() async {
    try {
      final settings = await loadSettings();

      final androidDetails = AndroidNotificationDetails(
        'crt_signals_channel',
        'CRT-ALGO Pro Signals',
        channelDescription: 'Institutional real-time signal alerts',
        importance: Importance.max,
        priority: Priority.high,
        playSound: settings.soundVibrate,
        enableVibration: settings.soundVibrate,
      );

      final iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: settings.soundVibrate,
      );

      final notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _plugin.show(
        id: 99999,
        title: '🔔 CRT-ALGO Push Test',
        body: 'Mobile notifications and haptic alerts are active! Quality filtering is ready.',
        notificationDetails: notificationDetails,
        payload: 'test',
      );
    } catch (e) {
      debugPrint('[NotificationService] Test alert error: $e');
    }
  }
}
