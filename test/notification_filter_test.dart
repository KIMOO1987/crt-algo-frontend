import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:crt_algo_mobile/widgets/grade_stars_widget.dart';
import 'package:crt_algo_mobile/services/notification_service.dart';
import 'package:crt_algo_mobile/models/signal_model.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('GradeStarsWidget Tests', () {
    test('Correctly maps grades to star count matching web', () {
      expect(GradeStarsWidget.getStarCount('A++'), equals(5));
      expect(GradeStarsWidget.getStarCount('A+'), equals(4));
      expect(GradeStarsWidget.getStarCount('GOOD'), equals(3));
      expect(GradeStarsWidget.getStarCount('NORMAL'), equals(2));
      expect(GradeStarsWidget.getStarCount('UNKNOWN'), equals(2));
    });

    test('Cleans and formats grade labels', () {
      expect(GradeStarsWidget.getCleanLabel('A++'), equals('A++'));
      expect(GradeStarsWidget.getCleanLabel('A+'), equals('A+'));
      expect(GradeStarsWidget.getCleanLabel('GOOD'), equals('GOOD'));
      expect(GradeStarsWidget.getCleanLabel('NORMAL'), equals('NORMAL'));
    });
  });

  group('NotificationService Filter Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({
        'notif_master_enabled': true,
        'notif_crt_enabled': true,
        'notif_sfp_enabled': true,
        'notif_sound_vibrate': true,
        'notif_selected_grades': ['A++', 'A+'],
        'notif_selected_symbols': ['BTCUSD', 'XAUUSD'],
      });
    });

    test('Allows signal when all criteria match', () async {
      final service = NotificationService();
      final signal = SignalModel(
        id: 'test_1',
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategy: 'CRT_ALGO_PRO',
        tfAlignment: '5M',
        status: 'ACTIVE',
        entryPrice: 65000,
        sl: 64000,
        tp: 67000,
        grade: 'A++',
        createdAt: DateTime.now().toIso8601String(),
        isActive: true,
      );

      final allowed = await service.shouldNotify(signal);
      expect(allowed, isTrue);
    });

    test('Blocks signal when grade is not selected by user', () async {
      final service = NotificationService();
      final signal = SignalModel(
        id: 'test_2',
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategy: 'CRT_ALGO_PRO',
        tfAlignment: '5M',
        status: 'ACTIVE',
        entryPrice: 65000,
        sl: 64000,
        tp: 67000,
        grade: 'NORMAL', // Not in ['A++', 'A+']
        createdAt: DateTime.now().toIso8601String(),
        isActive: true,
      );

      final allowed = await service.shouldNotify(signal);
      expect(allowed, isFalse);
    });

    test('Blocks signal when symbol is not selected by user', () async {
      final service = NotificationService();
      final signal = SignalModel(
        id: 'test_3',
        symbol: 'SOLUSDT', // Not in ['BTCUSD', 'XAUUSD']
        side: 'BUY',
        strategy: 'CRT_ALGO_PRO',
        tfAlignment: '5M',
        status: 'ACTIVE',
        entryPrice: 150,
        sl: 145,
        tp: 160,
        grade: 'A++',
        createdAt: DateTime.now().toIso8601String(),
        isActive: true,
      );

      final allowed = await service.shouldNotify(signal);
      expect(allowed, isFalse);
    });

    test('Blocks signal when master push notifications are toggled off', () async {
      SharedPreferences.setMockInitialValues({
        'notif_master_enabled': false,
        'notif_selected_grades': ['A++'],
        'notif_selected_symbols': ['BTCUSD'],
      });

      final service = NotificationService();
      final signal = SignalModel(
        id: 'test_4',
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategy: 'CRT_ALGO_PRO',
        tfAlignment: '5M',
        status: 'ACTIVE',
        entryPrice: 65000,
        sl: 64000,
        tp: 67000,
        grade: 'A++',
        createdAt: DateTime.now().toIso8601String(),
        isActive: true,
      );

      final allowed = await service.shouldNotify(signal);
      expect(allowed, isFalse);
    });

    test('Blocks SFP signal when SFP toggle is off', () async {
      SharedPreferences.setMockInitialValues({
        'notif_master_enabled': true,
        'notif_crt_enabled': true,
        'notif_sfp_enabled': false, // SFP off
        'notif_selected_grades': ['A++'],
        'notif_selected_symbols': ['BTCUSD'],
      });

      final service = NotificationService();
      final signal = SignalModel(
        id: 'test_5',
        symbol: 'BTCUSDT',
        side: 'BUY',
        strategy: 'SFP_HUNTER',
        tfAlignment: '15M',
        status: 'ACTIVE',
        entryPrice: 65000,
        sl: 64000,
        tp: 67000,
        grade: 'A++',
        createdAt: DateTime.now().toIso8601String(),
        isActive: true,
      );

      final allowed = await service.shouldNotify(signal);
      expect(allowed, isFalse);
    });
  });
}
