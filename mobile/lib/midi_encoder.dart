import 'app_models.dart';
import 'midi_grammar.dart';
import 'mxit_compressor.dart';

class DecodedEvent {
  const DecodedEvent({
    required this.role,
    required this.meaning,
    required this.intensity,
    required this.importance,
    required this.text,
  });

  final String role;
  final String meaning;
  final String intensity;
  final String importance;
  final String text;
}

final Set<int> _actionDomains = {
  pitchDomain['REQUEST']!,
  pitchDomain['COMMAND']!,
  pitchDomain['BUILD']!,
  pitchDomain['FIX']!,
  pitchDomain['SEARCH']!,
  pitchDomain['SEND']!,
  pitchDomain['SAVE']!,
};

String _normaliseRole(MidiEvent event) {
  if (event.role.isNotEmpty) {
    return event.role.toLowerCase();
  }

  return (channelName[event.channel] ?? 'USER').toLowerCase();
}

String _describeMeaning(MidiEvent event, String role) {
  final domain = event.domain;

  if (role == 'user' && _actionDomains.contains(event.pitch)) {
    return '$domain request';
  }
  if (role == 'assistant') {
    return '$domain response';
  }
  if (event.pitch == pitchDomain['QUESTION']) {
    return 'QUESTION prompt';
  }

  return '$domain message';
}

String _describeIntensity(int velocity) {
  if (velocity >= velocityLevels['URGENT']!) {
    return 'URGENT ($velocity)';
  }
  if (velocity >= velocityLevels['EMPHASIS']!) {
    return 'EMPHASIS ($velocity)';
  }
  if (velocity >= velocityLevels['NORMAL']!) {
    return 'NORMAL ($velocity)';
  }
  if (velocity >= velocityLevels['SOFT']!) {
    return 'SOFT ($velocity)';
  }
  if (velocity >= velocityLevels['WHISPER']!) {
    return 'WHISPER ($velocity)';
  }
  return 'SILENT ($velocity)';
}

String _describeImportance(int duration) {
  if (duration >= durationLevels['ANCHOR']!) {
    return '${durationLevels['ANCHOR']}ms';
  }
  return '$duration' 'ms';
}

MidiEvent encode(String rawText, String role) {
  final compressed = mxitCompress(rawText);
  return buildEvent(rawText, compressed.text, role);
}

DecodedEvent decode(MidiEvent event) {
  final role = _normaliseRole(event);
  return DecodedEvent(
    role: role,
    meaning: _describeMeaning(event, role),
    intensity: _describeIntensity(event.velocity),
    importance: _describeImportance(event.duration),
    text: event.compressed.isNotEmpty ? event.compressed : mxitCompress(event.raw).text,
  );
}

List<MidiEvent> encodeLog(List<Map<String, String>> messages) {
  return messages.map((message) {
    return encode(
      message['text'] ?? '',
      message['role'] ?? 'user',
    );
  }).toList(growable: false);
}

String logToContext(List<MidiEvent> events) {
  return events.map(serialiseEvent).join('\n');
}

String toPianoRoll(List<MidiEvent> events, {int width = 32}) {
  if (events.isEmpty) {
    return '(empty piano roll)';
  }

  final columnCount = width < 1 ? 1 : width;
  final visibleEvents = events.length > columnCount
      ? events.sublist(events.length - columnCount)
      : [...events];
  final pitches = visibleEvents.map((event) => event.pitch).toSet().toList()
    ..sort((left, right) => right.compareTo(left));

  return pitches.map((pitch) {
    final label = pitchToNoteName(pitch).padRight(3);
    final columns = visibleEvents
        .map((event) => event.pitch == pitch ? '*' : ' ')
        .join()
        .padRight(columnCount);
    return '$label | $columns |';
  }).join('\n');
}
