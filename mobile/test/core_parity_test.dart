import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:kyra_mobile/midi_encoder.dart';
import 'package:kyra_mobile/mxit_buffer.dart';
import 'package:kyra_mobile/mxit_compressor.dart';

void main() {
  late Map<String, dynamic> fixtures;

  setUpAll(() async {
    final file = File('../fixtures/parity-fixtures.json');
    fixtures = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
  });

  test('compression parity fixtures stay stable', () {
    final samples = fixtures['compressionSamples'] as List<dynamic>;

    for (final sample in samples) {
      final item = Map<String, dynamic>.from(sample as Map);
      final compressed = mxitCompress(item['input'] as String);

      expect(compressed.toJson(), item['compressed']);
      expect(mxitDecompress(compressed.text), item['decompressed']);
    }
  });

  test('encoding parity fixtures stay stable', () {
    final samples = fixtures['encodingSamples'] as List<dynamic>;
    final encodedEvents = <dynamic>[];

    for (final sample in samples) {
      final item = Map<String, dynamic>.from(sample as Map);
      final event = encode(
        item['input'] as String,
        item['role'] as String,
      );
      final stableEvent = Map<String, dynamic>.from(event.toJson())..remove('ts');

      expect(stableEvent, item['event']);
      encodedEvents.add(event);
    }

    expect(logToContext(encodedEvents.cast()), fixtures['logContext']);
  });

  test('buffer pruning matches the JS contract', () {
    final bufferCase = Map<String, dynamic>.from(fixtures['bufferPruneCase'] as Map);
    final buffer = MXitBuffer(
      maxEvents: (bufferCase['maxEvents'] as num).toInt(),
    );

    for (final input in bufferCase['inputs'] as List<dynamic>) {
      final item = Map<String, dynamic>.from(input as Map);
      buffer.push(item['text'] as String, item['role'] as String);
    }

    final stableLog = buffer.getLog().map((event) {
      final stable = Map<String, dynamic>.from(event.toJson());
      stable.remove('ts');
      return stable;
    }).toList(growable: false);

    expect(stableLog, bufferCase['expectedLog']);
    expect(buffer.toContext(), bufferCase['expectedContext']);

    final stats = buffer.stats();
    final expectedStats = Map<String, dynamic>.from(bufferCase['expectedStats'] as Map);

    expect(stats['count'], expectedStats['count']);
    expect(stats['maxEvents'], expectedStats['maxEvents']);
    expect(stats['dominantDomain'], expectedStats['dominantDomain']);
    expect(stats['avgVelocity'], expectedStats['avgVelocity']);
    expect(stats['oldestTs'], isA<int>());
    expect(stats['newestTs'], isA<int>());
  });
}
