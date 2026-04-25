class CompressionResult {
  const CompressionResult({
    required this.text,
    required this.ratio,
    required this.originalLength,
    required this.compressedLength,
  });

  final String text;
  final double ratio;
  final int originalLength;
  final int compressedLength;

  Map<String, dynamic> toJson() {
    return {
      'text': text,
      'ratio': ratio,
      'originalLength': originalLength,
      'compressedLength': compressedLength,
    };
  }
}

final List<MapEntry<String, String>> abbreviations = List.unmodifiable([
  const MapEntry('thank you', 'ty'),
  const MapEntry('going', 'goin'),
  const MapEntry('because', 'coz'),
  const MapEntry('tonight', '2nyt'),
  const MapEntry('tomorrow', '2moro'),
  const MapEntry('today', '2day'),
  const MapEntry('before', 'b4'),
  const MapEntry('later', 'l8r'),
  const MapEntry('please', 'plz'),
  const MapEntry('thanks', 'thx'),
  const MapEntry('sorry', 'sry'),
  const MapEntry('okay', 'k'),
  const MapEntry('great', 'gr8'),
  const MapEntry('where', 'whr'),
  const MapEntry('when', 'wen'),
  const MapEntry('what', 'wt'),
  const MapEntry('why', 'y'),
  const MapEntry('how', 'hw'),
  const MapEntry('your', 'ur'),
  const MapEntry('they', 'dey'),
  const MapEntry('them', 'dem'),
  const MapEntry('we', 'we'),
  const MapEntry('know', 'knw'),
  const MapEntry('think', 'thnk'),
  const MapEntry('want', 'wnt'),
  const MapEntry('have', 'hv'),
  const MapEntry('make', 'mk'),
  const MapEntry('build', 'bld'),
  const MapEntry('create', 'crt'),
  const MapEntry('need', 'nd'),
  const MapEntry('system', 'sys'),
  const MapEntry('memory', 'mem'),
  const MapEntry('model', 'mdl'),
  const MapEntry('local', 'lcl'),
  const MapEntry('message', 'msg'),
  const MapEntry('information', 'info'),
  const MapEntry('with', 'w/'),
  const MapEntry('this', 'dis'),
  const MapEntry('that', 'dat'),
  const MapEntry('and', 'n'),
  const MapEntry('you', 'u'),
  const MapEntry('are', 'r'),
  const MapEntry('too', '2also'),
  const MapEntry('ate', '8'),
  const MapEntry('for', '4'),
  const MapEntry('to', '2'),
  const MapEntry('the', 'da'),
  const MapEntry('am', 'm'),
]);

final List<MapEntry<String, String>> _sortedAbbreviations = [...abbreviations]
  ..sort((left, right) {
    final bySource = right.key.length.compareTo(left.key.length);
    if (bySource != 0) {
      return bySource;
    }
    return right.value.length.compareTo(left.value.length);
  });

final List<MapEntry<String, String>> _reverseAbbreviations = (() {
  final seenTargets = <String>{};
  final reversed = <MapEntry<String, String>>[];

  for (final entry in _sortedAbbreviations) {
    if (seenTargets.add(entry.value)) {
      reversed.add(MapEntry(entry.value, entry.key));
    }
  }

  reversed.sort((left, right) {
    final bySource = right.key.length.compareTo(left.key.length);
    if (bySource != 0) {
      return bySource;
    }
    return right.value.length.compareTo(left.value.length);
  });

  return List.unmodifiable(reversed);
})();

String _replaceWholePhrase(String input, String source, String target) {
  final pattern = RegExp(
    '(^|[^a-z0-9])${RegExp.escape(source)}(?=[^a-z0-9]|$)',
  );

  return input.replaceAllMapped(pattern, (match) {
    final prefix = match.group(1) ?? '';
    return '$prefix$target';
  });
}

String _tidySpacing(String input) {
  return input
      .replaceAllMapped(RegExp(r'\s+([?!.,;:])'), (match) => match.group(1)!)
      .replaceAllMapped(RegExp(r'([([{])\s+'), (match) => match.group(1)!)
      .replaceAllMapped(RegExp(r'\s+([)\]}])'), (match) => match.group(1)!)
      .replaceAll(RegExp(r'[ \t]+'), ' ')
      .trim();
}

String _applyAbbreviations(
  String input,
  List<MapEntry<String, String>> table,
) {
  var result = input;
  for (final entry in table) {
    result = _replaceWholePhrase(result, entry.key, entry.value);
  }
  return result;
}

CompressionResult mxitCompress(String rawText) {
  final working = _tidySpacing(rawText.toLowerCase());
  final text = _applyAbbreviations(working, _sortedAbbreviations);
  final originalLength = working.length;
  final compressedLength = text.length;
  final ratio = originalLength == 0
      ? 1.0
      : double.parse((compressedLength / originalLength).toStringAsFixed(3));

  return CompressionResult(
    text: text,
    ratio: ratio,
    originalLength: originalLength,
    compressedLength: compressedLength,
  );
}

String mxitDecompress(String compressedText) {
  final working = _tidySpacing(compressedText.toLowerCase());
  return _applyAbbreviations(working, _reverseAbbreviations);
}
