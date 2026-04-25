import 'app_models.dart';

const Map<String, int> channel = {
  'USER': 0,
  'ASSISTANT': 1,
  'SYSTEM': 2,
  'EMOTION': 3,
  'ENTITY': 4,
  'INTENT': 5,
  'MEMORY_REF': 6,
  'ERROR': 7,
};

final Map<int, String> channelName = {
  for (final entry in channel.entries) entry.value: entry.key,
};

const Map<String, int> pitchRange = {
  'MIN': 36,
  'MAX': 107,
};

const Map<String, int> pitchDomain = {
  'GREETING': 36,
  'FAREWELL': 37,
  'AFFIRMATION': 38,
  'NEGATION': 39,
  'GRATITUDE': 40,
  'APOLOGY': 41,
  'REQUEST': 42,
  'OFFER': 43,
  'QUESTION': 48,
  'ANSWER': 49,
  'STATEMENT': 50,
  'CORRECTION': 51,
  'DEFINITION': 52,
  'EXAMPLE': 53,
  'LIST': 54,
  'SUMMARY': 55,
  'COMMAND': 60,
  'CONFIRM': 61,
  'CANCEL': 62,
  'BUILD': 63,
  'FIX': 64,
  'SEARCH': 65,
  'SEND': 66,
  'SAVE': 67,
  'JOY': 72,
  'FRUSTRATION': 73,
  'CONFUSION': 74,
  'URGENCY': 75,
  'EXCITEMENT': 76,
  'CONCERN': 77,
  'CURIOSITY': 78,
  'NEUTRAL': 79,
  'INIT': 84,
  'RESET': 85,
  'MODE_SWITCH': 86,
  'FEEDBACK': 87,
  'CONTEXT_REF': 88,
  'INJECT': 89,
  'TECH': 96,
  'FINANCE': 97,
  'HEALTH': 98,
  'CREATIVE': 99,
  'COMMUNITY': 100,
  'LOCATION': 101,
  'TIME': 102,
};

final Map<int, String> pitchName = {
  for (final entry in pitchDomain.entries) entry.value: entry.key,
};

const Map<String, int> velocityLevels = {
  'SILENT': 0,
  'WHISPER': 20,
  'SOFT': 40,
  'NORMAL': 64,
  'EMPHASIS': 90,
  'URGENT': 110,
  'PEAK': 127,
};

const Map<String, int> durationLevels = {
  'FLASH': 100,
  'SHORT': 400,
  'NORMAL': 800,
  'EXTENDED': 2000,
  'ANCHOR': 5000,
};

const List<String> _noteNames = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

int _pitch(String name) => pitchDomain[name]!;

int classifyPitch(String compressedText) {
  final text = compressedText.toLowerCase();

  if (RegExp(r'\b(hi|hello|hw r u|sup|yo|ola)\b').hasMatch(text)) {
    return _pitch('GREETING');
  }
  if (RegExp(r'\b(bye|cya|l8r|ttyl|gtg)\b').hasMatch(text)) {
    return _pitch('FAREWELL');
  }
  if (RegExp(r'\b(yes|ya|k|yep|agreed|correct)\b').hasMatch(text)) {
    return _pitch('AFFIRMATION');
  }
  if (RegExp(r'\b(no|nope|nah|wrong|incorrect)\b').hasMatch(text)) {
    return _pitch('NEGATION');
  }
  if (RegExp(r'\b(ty|thx|gr8|appreciate)\b').hasMatch(text)) {
    return _pitch('GRATITUDE');
  }
  if (RegExp(r'\b(sry|my bad|apologies|sorry)\b').hasMatch(text)) {
    return _pitch('APOLOGY');
  }
  if (RegExp(r'\?').hasMatch(text)) {
    return _pitch('QUESTION');
  }
  if (RegExp(r'\b(wt is|define|meaning of|explain)\b').hasMatch(text)) {
    return _pitch('DEFINITION');
  }
  if (RegExp(r'\b(4 example|eg|such as|like)\b').hasMatch(text)) {
    return _pitch('EXAMPLE');
  }
  if (RegExp(r'\b(tldr|summary|recap|in short)\b').hasMatch(text)) {
    return _pitch('SUMMARY');
  }
  if (RegExp(r'\b(bld|mk|crt|code|write|generate)\b').hasMatch(text)) {
    return _pitch('BUILD');
  }
  if (RegExp(r'\b(fix|debug|repair|broke|error|bug)\b').hasMatch(text)) {
    return _pitch('FIX');
  }
  if (RegExp(r'\b(find|search|look|get|fetch)\b').hasMatch(text)) {
    return _pitch('SEARCH');
  }
  if (RegExp(r'\b(send|share|forward|post)\b').hasMatch(text)) {
    return _pitch('SEND');
  }
  if (RegExp(r'\b(save|store|remember|keep)\b').hasMatch(text)) {
    return _pitch('SAVE');
  }
  if (RegExp(r'(!{2,}|so excited|cant wait|amazing)').hasMatch(text)) {
    return _pitch('EXCITEMENT');
  }
  if (RegExp(r'(wtf|ugh|annoying|frustrated|angry)').hasMatch(text)) {
    return _pitch('FRUSTRATION');
  }
  if (RegExp(r'(confused|dont get|huh|lost|idk)').hasMatch(text)) {
    return _pitch('CONFUSION');
  }
  if (RegExp(r'(urgent|asap|now|hurry|quick)').hasMatch(text)) {
    return _pitch('URGENCY');
  }
  if (RegExp(r'(worried|concerned|scared|afraid)').hasMatch(text)) {
    return _pitch('CONCERN');
  }
  if (RegExp(r'(interesting|curious|wonder|y does)').hasMatch(text)) {
    return _pitch('CURIOSITY');
  }
  if (RegExp(r'(code|sys|api|dev|app|bug|deploy|server)').hasMatch(text)) {
    return _pitch('TECH');
  }
  if (RegExp(r'(money|cost|price|pay|budget|revenue)').hasMatch(text)) {
    return _pitch('FINANCE');
  }
  if (RegExp(r'(feel|pain|sick|health|body|mental)').hasMatch(text)) {
    return _pitch('HEALTH');
  }
  if (RegExp(r'(community|ociu|bonteheuwel|youth|ppl)').hasMatch(text)) {
    return _pitch('COMMUNITY');
  }
  if (RegExp(r'(design|art|music|creative|write|story)').hasMatch(text)) {
    return _pitch('CREATIVE');
  }
  if (text.isNotEmpty) {
    return _pitch('STATEMENT');
  }
  return _pitch('NEUTRAL');
}

int calcVelocity(String rawText) {
  final bangs = RegExp(r'!').allMatches(rawText).length;
  final asks = RegExp(r'\?').allMatches(rawText).length;
  final allCaps = RegExp(r'\b[A-Z]{2,}\b').allMatches(rawText).length;
  final ellipsis = RegExp(r'\.\.\.').allMatches(rawText).length;

  var value = velocityLevels['NORMAL']!;
  value += bangs * 15;
  value += asks * 8;
  value += allCaps * 12;
  value -= ellipsis * 5;

  final minimum = velocityLevels['WHISPER']!;
  final maximum = velocityLevels['PEAK']!;
  return value.clamp(minimum, maximum);
}

int calcDuration(String rawText, int pitch) {
  final words = rawText.trim().split(RegExp(r'\s+')).length;
  var base = durationLevels['SHORT']! + words * 80;

  final anchored = {
    _pitch('COMMAND'),
    _pitch('BUILD'),
    _pitch('FIX'),
    _pitch('SAVE'),
    _pitch('INIT'),
    _pitch('CONTEXT_REF'),
  };
  if (anchored.contains(pitch)) {
    base *= 2;
  }

  final ephemeral = {
    _pitch('GREETING'),
    _pitch('FAREWELL'),
    _pitch('AFFIRMATION'),
    _pitch('NEGATION'),
  };
  if (ephemeral.contains(pitch)) {
    base = durationLevels['FLASH']!;
  }

  return base.clamp(0, durationLevels['ANCHOR']!);
}

String pitchToNoteName(int pitch) {
  final octave = (pitch ~/ 12) - 1;
  return '${_noteNames[pitch % 12]}$octave';
}

MidiEvent buildEvent(
  String rawText,
  String compressedText,
  String role,
) {
  final channelValue = channel[role.toUpperCase()] ?? channel['USER']!;
  final pitch = classifyPitch(compressedText);
  final velocity = calcVelocity(rawText);
  final duration = calcDuration(rawText, pitch);
  final noteName = pitchToNoteName(pitch);
  final domain = pitchName[pitch] ?? 'UNKNOWN';

  return MidiEvent(
    channel: channelValue,
    pitch: pitch,
    velocity: velocity,
    duration: duration,
    noteName: noteName,
    domain: domain,
    role: role,
    raw: rawText,
    compressed: compressedText,
    ts: DateTime.now().millisecondsSinceEpoch,
  );
}

String serialiseEvent(MidiEvent event) {
  final roleMarker = event.role.isEmpty
      ? 'U'
      : event.role[0].toUpperCase();
  return '[$roleMarker ch:${event.channel} pit:${event.pitch} dom:${event.domain} vel:${event.velocity} dur:${event.duration}ms] ${event.compressed}';
}

String serialiseLog(Iterable<MidiEvent> events) {
  return events.map(serialiseEvent).join('\n');
}

Map<String, Object> grammarSummary() {
  return {
    'version': '1.0.0',
    'channels': channel.length,
    'pitchDomains': pitchDomain.length,
    'pitchRange': pitchRange,
    'velocityLevels': velocityLevels.length,
    'durationLevels': durationLevels.length,
    'tokenFormat': '[R ch:N pit:NN dom:DOMAIN vel:VVV dur:DDDDms] compressed_text',
  };
}
