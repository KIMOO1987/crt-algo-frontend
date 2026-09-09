import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:encrypt/encrypt.dart' as enc;

class EncryptionHelper {
  static const String masterKey = "SWUjvEg9KZsAHTAbUlk5414m5QbKh1-Kl38gXMur_A8=";

  static String encrypt(String plainText) {
    if (plainText.isEmpty) return "";

    // 1. Generate 8 random bytes for salt
    final random = Random.secure();
    final saltBytes = List<int>.generate(8, (_) => random.nextInt(256));

    // 2. Derive key and IV using MD5 (CryptoJS / OpenSSL EvpBytesToKey format)
    final passwordBytes = utf8.encode(masterKey);
    
    List<int> derivedBytes = [];
    List<int> hash = [];

    while (derivedBytes.length < 48) {
      final input = [...hash, ...passwordBytes, ...saltBytes];
      hash = md5.convert(input).bytes;
      derivedBytes.addAll(hash);
    }

    final keyBytes = derivedBytes.sublist(0, 32);
    final ivBytes = derivedBytes.sublist(32, 48);

    // 3. Encrypt data using AES-256-CBC with derived Key and IV
    final key = enc.Key(Uint8List.fromList(keyBytes));
    final iv = enc.IV(Uint8List.fromList(ivBytes));

    final encrypter = enc.Encrypter(enc.AES(key, mode: enc.AESMode.cbc));
    final encrypted = encrypter.encrypt(plainText, iv: iv);

    // 4. Prefix with "Salted__" (8 bytes)
    final saltedPrefix = utf8.encode("Salted__");
    final combined = [...saltedPrefix, ...saltBytes, ...encrypted.bytes];

    // 5. Return Base64 encoded string
    return base64.encode(combined);
  }
}
