import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/signal_model.dart';
import '../services/supabase_service.dart';
import '../services/binance_ws_service.dart';
import '../services/symbol_mapper.dart';
import '../services/notification_service.dart';

// FutureProvider that queries signals or sfp_signals matching active Strategy & Status tabs
final signalsListProvider = FutureProvider<List<SignalModel>>((ref) async {
  final supabase = SupabaseService().client;
  final strategy = ref.watch(strategyFilterProvider).toUpperCase();
  final status = ref.watch(statusFilterProvider).toUpperCase();

  try {
    List<SignalModel> results = [];

    if (strategy == 'SFP') {
      var query = supabase.from('sfp_signals').select('*');
      if (status == 'ACTIVE') {
        query = query.eq('is_active', true);
      } else if (status == 'RADAR') {
        query = query.or('status.ilike.%RADAR%,status.ilike.%PENDING%,phase.ilike.%MANIPULATION%');
      } else if (status == 'AUDIT') {
        query = query.eq('is_active', false).inFilter('status', ['WIN', 'LOSS', 'TP1', 'TP2', 'TP3', 'TP4', 'SL']);
      } else if (status == 'HISTORY') {
        query = query.eq('is_active', false);
      }
      final data = await query.order('created_at', ascending: false).limit(80);
      results = (data as List).map((m) => SignalModel.fromJson(m)).toList();
      if (results.isEmpty && status == 'ACTIVE') {
        final fallback = await supabase.from('sfp_signals').select('*').order('created_at', ascending: false).limit(30);
        results = (fallback as List).map((m) => SignalModel.fromJson(m)).toList();
      }
    } else if (strategy == 'CRT') {
      var query = supabase.from('signals').select('*');
      if (status == 'ACTIVE') {
        query = query.eq('is_active', true);
      } else if (status == 'RADAR') {
        query = query.or('status.ilike.%RADAR%,status.ilike.%PENDING%,status.ilike.%WATCH%');
      } else if (status == 'AUDIT') {
        query = query.eq('is_active', false).inFilter('status', ['WIN', 'LOSS', 'TP1', 'TP2', 'TP3', 'TP4', 'SL', 'TP1 + SL (BE)']);
      } else if (status == 'HISTORY') {
        query = query.eq('is_active', false);
      }
      final data = await query.order('created_at', ascending: false).limit(80);
      results = (data as List).map((m) => SignalModel.fromJson(m)).toList();
      if (results.isEmpty && status == 'ACTIVE') {
        final fallback = await supabase.from('signals').select('*').order('created_at', ascending: false).limit(30);
        results = (fallback as List).map((m) => SignalModel.fromJson(m)).toList();
      }
    } else {
      // ALL SIGNALS: Fetch from both tables
      List crtData = [];
      List sfpData = [];

      if (status == 'ACTIVE') {
        crtData = await supabase.from('signals').select('*').eq('is_active', true).order('created_at', ascending: false).limit(40);
        sfpData = await supabase.from('sfp_signals').select('*').eq('is_active', true).order('created_at', ascending: false).limit(40);
      } else if (status == 'RADAR') {
        crtData = await supabase.from('signals').select('*').or('status.ilike.%RADAR%,status.ilike.%PENDING%,status.ilike.%WATCH%').order('created_at', ascending: false).limit(40);
        sfpData = await supabase.from('sfp_signals').select('*').or('status.ilike.%RADAR%,status.ilike.%PENDING%,phase.ilike.%MANIPULATION%').order('created_at', ascending: false).limit(40);
      } else {
        // AUDIT & HISTORY
        crtData = await supabase.from('signals').select('*').eq('is_active', false).order('created_at', ascending: false).limit(40);
        sfpData = await supabase.from('sfp_signals').select('*').eq('is_active', false).order('created_at', ascending: false).limit(40);
      }

      results = [
        ...crtData.map((m) => SignalModel.fromJson(m)),
        ...sfpData.map((m) => SignalModel.fromJson(m)),
      ];
      results.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }

    final symbols = results.map((s) => s.symbol).toList();
    if (symbols.isNotEmpty) {
      BinanceWsService().subscribeToSymbols(symbols);
    }

    // Proactively audit recent candle wicks for any active signals currently marked ENTRY
    for (final s in results) {
      if (s.isActive && s.status.toUpperCase() == 'ENTRY') {
        _auditSignalCandles(s);
      }
    }

    // Seed initial signals or notify on newly detected incoming signals
    final notifService = NotificationService();
    if (!notifService.isSeeded) {
      notifService.seedSeenSignals(results);
    } else {
      for (final s in results) {
        notifService.checkAndNotify(s);
      }
    }

    return results;
  } catch (e) {
    print("[SignalsProvider] Fetch error: $e");
    try {
      final fallback = await supabase.from('signals').select('*').order('created_at', ascending: false).limit(30);
      return (fallback as List).map((m) => SignalModel.fromJson(m)).toList();
    } catch (_) {
      return [];
    }
  }
});

// Helper: Scan past candles since creation to check if wick crossed TP2, TP1, or SL
void _auditSignalCandles(SignalModel signal) async {
  try {
    final detected = await BinanceWsService().inspectPastCandles(
      symbol: signal.symbol,
      side: signal.side,
      entryPrice: signal.entryPrice,
      sl: signal.sl,
      tp1: signal.tp,
      tp2: signal.tpSecondary,
      createdAt: DateTime.tryParse(signal.createdAt),
    );
    if (detected != null) {
      TargetLatchManager.setLatch(signal.id, detected, signal: signal);
    }
  } catch (_) {}
}

// Periodic auto-refresh stream provider with robust error handling (every 10s)
final activeSignalsStreamProvider = StreamProvider<List<SignalModel>>((ref) async* {
  while (true) {
    final list = await ref.watch(signalsListProvider.future);
    yield list;
    await Future.delayed(const Duration(seconds: 10));
    ref.invalidate(signalsListProvider);
  }
});

// StreamProvider for live market prices from Binance WebSocket & REST poller
final livePricesStreamProvider = StreamProvider<Map<String, double>>((ref) {
  return BinanceWsService().priceStream;
});

// Class representing a Signal bundled with its current Live Price and P&L details
class LiveSignal {
  final SignalModel signal;
  final double currentPrice;
  final double pnlPercent;
  final String liveStatus;
  final String liveRR;

  LiveSignal({
    required this.signal,
    required this.currentPrice,
    required this.pnlPercent,
    required this.liveStatus,
    required this.liveRR,
  });
}

// Filter providers for strategy and status matching web tabs
final strategyFilterProvider = StateProvider<String>((ref) => 'ALL'); // ALL, CRT, SFP
final statusFilterProvider = StateProvider<String>((ref) => 'ACTIVE'); // ACTIVE, RADAR, AUDIT, HISTORY

// Target Latch Manager enforcing one-way progression with persistent disk storage & Supabase sync
class TargetLatchManager {
  static final Map<String, String> _latches = {};
  static bool _prefsLoaded = false;

  static String? getLatch(String signalId) {
    if (signalId.isEmpty) return null;
    _ensurePrefsLoaded();
    return _latches[signalId];
  }

  static void _ensurePrefsLoaded() {
    if (_prefsLoaded) return;
    _prefsLoaded = true;
    SharedPreferences.getInstance().then((prefs) {
      final keys = prefs.getKeys().where((k) => k.startsWith('latch_'));
      for (final k in keys) {
        final id = k.substring(6);
        final val = prefs.getString(k);
        if (val != null && !_latches.containsKey(id)) {
          _latches[id] = val;
        }
      }
    });
  }

  static void setLatch(String signalId, String val, {SignalModel? signal}) {
    if (signalId.isEmpty) return;
    final current = _latches[signalId];
    if (current == 'TP2' && val != 'TP2') return; // Enforce one-way progression
    _latches[signalId] = val;

    // Persist to SharedPreferences
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('latch_$signalId', val);
    });

    // Automatically sync updated status to Supabase so database reflects truth
    if (signal != null) {
      _syncToSupabase(signal, val);
    }
  }

  static Future<void> _syncToSupabase(SignalModel signal, String latchVal) async {
    if (signal.id.isEmpty) return;
    String? newDbStatus;
    bool shouldDeactivate = false;

    if (latchVal == 'TP2') {
      newDbStatus = 'TP2';
      shouldDeactivate = true;
    } else if (latchVal == 'TP1') {
      newDbStatus = 'TP1';
      shouldDeactivate = false;
    } else if (latchVal == 'SL') {
      newDbStatus = 'SL';
      shouldDeactivate = true;
    } else if (latchVal == 'BE') {
      newDbStatus = 'TP1 + SL (BE)';
      shouldDeactivate = true;
    }

    if (newDbStatus != null && newDbStatus != signal.status) {
      try {
        final table = signal.strategy.toUpperCase().contains('SFP') ? 'sfp_signals' : 'signals';
        await SupabaseService().client.from(table).update({
          'status': newDbStatus,
          'is_active': !shouldDeactivate,
        }).eq('id', signal.id);
      } catch (e) {
        print("[TargetLatchManager] Note updating $newDbStatus: $e");
      }
    }
  }
}

// Helper: Calculate potential target R:R (e.g. "1:2.4")
String calculatePotentialRR(SignalModel signal) {
  final entry = signal.entryPrice;
  final sl = signal.sl;
  final tp = (signal.tpSecondary != null && signal.tpSecondary! > 0) ? signal.tpSecondary! : signal.tp;
  final risk = (entry - sl).abs();
  if (risk == 0 || entry == 0) return '1:2.0';
  final reward = (tp - entry).abs();
  return '1:${(reward / risk).toStringAsFixed(1)}';
}

// Provider combining active signals and live prices
final combinedSignalsProvider = Provider<List<LiveSignal>>((ref) {
  final signalsAsync = ref.watch(activeSignalsStreamProvider);
  final livePricesAsync = ref.watch(livePricesStreamProvider);

  final signals = signalsAsync.value ?? [];
  final livePrices = livePricesAsync.value ?? BinanceWsService().cachedPrices;

  return signals.map((signal) {
    // Resolve live price using fast multi-key variation lookup
    final wsPrice = BinanceWsService().getPrice(signal.symbol) ??
        livePrices[signal.symbol] ??
        livePrices[SymbolMapper.normalizeSymbol(signal.symbol)];

    final double currentPrice = (wsPrice != null && wsPrice > 0)
        ? wsPrice
        : ((signal.currentPrice != null && signal.currentPrice! > 0)
            ? signal.currentPrice!
            : signal.entryPrice);

    final entry = signal.entryPrice;
    final isBuy = signal.side.toUpperCase() == 'BUY' || signal.side.toUpperCase() == 'BULLISH';

    // Calculate P&L %
    double pnlPercent = 0.0;
    if (entry > 0 && currentPrice > 0) {
      pnlPercent = (isBuy ? (currentPrice - entry) : (entry - currentPrice)) / entry * 100;
    }

    // Get Live Status Display with latching & auto-sync
    final String liveStatus = getLiveStatus(signal, currentPrice);

    // Get Live Institutional R:R
    final String liveRR = calculateLiveRR(signal, currentPrice);

    return LiveSignal(
      signal: signal,
      currentPrice: currentPrice,
      pnlPercent: pnlPercent,
      liveStatus: liveStatus,
      liveRR: liveRR,
    );
  }).toList();
});

// Filtered signals provider matching the queried strategy & status tab
final filteredSignalsProvider = Provider<List<LiveSignal>>((ref) {
  return ref.watch(combinedSignalsProvider);
});

// Helper: Calculate live status display matching crt-algo-frontend 1:1
String getLiveStatus(SignalModel signal, double currentPrice) {
  final statusUpper = signal.status.toUpperCase();

  // Seed latch from DB status if already confirmed
  if (signal.id.isNotEmpty) {
    if (statusUpper.contains('TP2') || statusUpper == 'WIN') {
      TargetLatchManager.setLatch(signal.id, 'TP2');
    } else if (statusUpper.contains('TP1')) {
      TargetLatchManager.setLatch(signal.id, 'TP1');
    } else if (statusUpper == 'SL' || statusUpper.contains('STOP')) {
      TargetLatchManager.setLatch(signal.id, 'SL');
    } else if (statusUpper.contains('BE')) {
      TargetLatchManager.setLatch(signal.id, 'BE');
    }
  }

  final latched = signal.id.isNotEmpty ? TargetLatchManager.getLatch(signal.id) : null;

  // 1. Target 2 Lock: If already latched or confirmed in DB, NEVER downgrade
  if (statusUpper.contains('TP2') || latched == 'TP2') {
    return 'TP2 REACHED (LIVE)';
  }

  // 2. Real-time organic detection
  if (currentPrice > 0 && signal.entryPrice > 0) {
    final entry = signal.entryPrice;
    final sl = signal.sl;
    final tp1 = signal.tp;
    final tp2 = signal.tpSecondary ?? 0.0;
    final isBuy = signal.side.toUpperCase() == 'BUY' || signal.side.toUpperCase() == 'BULLISH';
    const tolerance = 0.00005; // 0.005% threshold

    // Check TP2 first
    if (tp2 > 0 && ((isBuy && currentPrice >= (tp2 * (1 - tolerance))) || (!isBuy && currentPrice <= (tp2 * (1 + tolerance))))) {
      if (signal.id.isNotEmpty) TargetLatchManager.setLatch(signal.id, 'TP2', signal: signal);
      return 'TP2 REACHED (LIVE)';
    }

    // Check if previously latched at TP1 (Breakeven protection)
    if (latched == 'TP1') {
      if ((isBuy && currentPrice <= (entry * (1 + tolerance))) || (!isBuy && currentPrice >= (entry * (1 - tolerance)))) {
        if (signal.id.isNotEmpty) TargetLatchManager.setLatch(signal.id, 'BE', signal: signal);
        return 'BE REACHED (LIVE)';
      }
      return 'TP1 REACHED (LIVE)';
    }

    // Check Target 1
    if (tp1 > 0 && ((isBuy && currentPrice >= (tp1 * (1 - tolerance))) || (!isBuy && currentPrice <= (tp1 * (1 + tolerance))))) {
      if (signal.id.isNotEmpty) TargetLatchManager.setLatch(signal.id, 'TP1', signal: signal);
      return 'TP1 REACHED (LIVE)';
    }

    // Invalidation Stop Loss (only if TP1 wasn't hit)
    if (sl > 0 && ((isBuy && currentPrice <= (sl * (1 + tolerance))) || (!isBuy && currentPrice >= (sl * (1 - tolerance))))) {
      if (signal.id.isNotEmpty) TargetLatchManager.setLatch(signal.id, 'SL', signal: signal);
      return 'SL HIT (LIVE)';
    }
  }

  // Post-detection checks based on latch
  if (latched == 'TP2') return 'TP2 REACHED (LIVE)';
  if (latched == 'TP1') return 'TP1 REACHED (LIVE)';
  if (latched == 'BE') return 'BE REACHED (LIVE)';
  if (latched == 'SL') return 'SL HIT (LIVE)';

  // Fallback to database status
  switch (statusUpper) {
    case 'PENDING':
      return 'In Progress';
    case 'ENTRY':
      return 'Active';
    case 'TP1':
      return 'TP1 Hit';
    case 'TP1 + SL (BE)':
      return 'Partial TP1';
    case 'SL':
      return 'Stopped Out';
    case 'TP2':
      return 'TP1 / TP2';
    case 'WIN':
      return 'Take Profit';
    default:
      return signal.status.isNotEmpty ? signal.status : 'Active';
  }
}

// Helper: Calculate live risk-to-reward ratio matching crt-algo-frontend 1:1
String calculateLiveRR(SignalModel signal, double currentPrice) {
  final status = signal.status.toUpperCase();
  final latched = signal.id.isNotEmpty ? TargetLatchManager.getLatch(signal.id) : null;
  final entry = signal.entryPrice;
  final sl = signal.sl;
  final tp1 = signal.tp;
  final tp2 = signal.tpSecondary ?? 0.0;
  final risk = (entry - sl).abs();

  if (entry == 0 || sl == 0 || risk == 0) return '0.00R';

  // Final sealed states
  if (status == 'SL' || latched == 'SL') return '-1.00R';
  if ((status.contains('TP2') || latched == 'TP2') && tp2 > 0) {
    final finalRR = (((tp1 - entry).abs() / risk) * 0.5) + (((tp2 - entry).abs() / risk) * 0.5);
    return '+${finalRR.toStringAsFixed(2)}R';
  }
  if ((status.contains('TP1') || status.contains('BE') || latched == 'TP1' || latched == 'BE') && tp1 > 0) {
    final isBuy = signal.side.toUpperCase() == 'BUY' || signal.side.toUpperCase() == 'BULLISH';
    final reward = isBuy ? (currentPrice - entry) : (entry - currentPrice);
    final rr = reward / risk;
    final finalRR = 1.00 + (0.50 * rr);
    return '+${finalRR.toStringAsFixed(2)}R';
  }

  // Active floating calculation
  final isBuy = signal.side.toUpperCase() == 'BUY' || signal.side.toUpperCase() == 'BULLISH';
  final reward = isBuy ? (currentPrice - entry) : (entry - currentPrice);
  final rr = reward / risk;
  return '${rr >= 0 ? '+' : ''}${rr.toStringAsFixed(2)}R';
}

