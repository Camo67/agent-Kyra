import 'app_models.dart';
import 'midi_encoder.dart';

class MXitBuffer {
  MXitBuffer({
    this.maxEvents = 10,
  });

  final int maxEvents;
  final List<MidiEvent> _log = [];

  MidiEvent push(String rawText, String role) {
    final event = encode(rawText, role);
    _log.add(event);
    _pruneToFit();
    return event;
  }

  void appendEvent(MidiEvent event) {
    _log.add(event);
    _pruneToFit();
  }

  void restoreFromEvents(Iterable<MidiEvent> events) {
    _log
      ..clear()
      ..addAll(events);
    _pruneToFit();
  }

  String toContext() {
    final header = '=MIDI×MXIT MEMORY LOG [${_log.length}/$maxEvents]=';
    final body = logToContext(_log);
    return body.isEmpty ? header : '$header\n$body';
  }

  List<MidiEvent> getLog() {
    return _log.map((event) => event.copyWith()).toList(growable: false);
  }

  void clear() {
    _log.clear();
  }

  Map<String, dynamic> stats() {
    if (_log.isEmpty) {
      return {
        'count': 0,
        'maxEvents': maxEvents,
        'oldestTs': null,
        'newestTs': null,
        'dominantDomain': null,
        'avgVelocity': 0,
      };
    }

    final domainCounts = <String, int>{};
    var velocityTotal = 0;

    for (final event in _log) {
      velocityTotal += event.velocity;
      domainCounts[event.domain] = (domainCounts[event.domain] ?? 0) + 1;
    }

    var dominantDomain = domainCounts.keys.first;
    var dominantCount = domainCounts[dominantDomain] ?? 0;

    for (final entry in domainCounts.entries) {
      if (entry.value > dominantCount) {
        dominantDomain = entry.key;
        dominantCount = entry.value;
      }
    }

    return {
      'count': _log.length,
      'maxEvents': maxEvents,
      'oldestTs': _log.first.ts,
      'newestTs': _log.last.ts,
      'dominantDomain': dominantDomain,
      'avgVelocity': double.parse(
        (velocityTotal / _log.length).toStringAsFixed(2),
      ),
    };
  }

  List<Map<String, dynamic>> toJsonList() {
    return _log.map((event) => event.toJson()).toList(growable: false);
  }

  void _pruneToFit() {
    while (_log.length > maxEvents) {
      var dropIndex = 0;

      for (var index = 1; index < _log.length; index += 1) {
        final current = _log[index];
        final candidate = _log[dropIndex];

        if (current.duration < candidate.duration) {
          dropIndex = index;
          continue;
        }

        if (current.duration == candidate.duration && current.ts < candidate.ts) {
          dropIndex = index;
        }
      }

      _log.removeAt(dropIndex);
    }
  }
}
