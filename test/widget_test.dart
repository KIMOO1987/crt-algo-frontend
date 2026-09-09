import 'package:flutter_test/flutter_test.dart';
import 'package:crt_algo_mobile/services/symbol_mapper.dart';

void main() {
  test('SymbolMapper correctly normalizes symbols', () {
    expect(SymbolMapper.normalizeSymbol('BTCUSDT.P'), 'BTCUSD');
    expect(SymbolMapper.normalizeSymbol('EURJPY'), 'EURJPY');
    expect(SymbolMapper.normalizeSymbol('GOLD'), 'XAUUSD');
    expect(SymbolMapper.getBinanceSymbol('BTCUSDT.P'), 'btcusdt');
  });
}

