import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../app_models.dart';
import '../midi_grammar.dart';

class MidiVisualizer extends StatelessWidget {
  const MidiVisualizer({
    super.key,
    required this.events,
    required this.activeEvent,
  });

  final List<MidiEvent> events;
  final MidiEvent? activeEvent;

  @override
  Widget build(BuildContext context) {
    const visibleKeys = 24;
    final focusPitch = activeEvent?.pitch ??
        (events.isNotEmpty ? events.last.pitch : pitchRange['MIN']!);
    final minPitch = pitchRange['MIN']!;
    final maxPitch = pitchRange['MAX']!;
    final clampedStart = math.max(
      minPitch,
      math.min(focusPitch - 12, maxPitch - visibleKeys + 1),
    );
    final recentEvents = events.length > 8 ? events.sublist(events.length - 8) : events;
    final highlightedPitches = recentEvents.map((event) => event.pitch).toSet();
    final range = List<int>.generate(visibleKeys, (index) => clampedStart + index);

    return Container(
      key: const Key('visualizer'),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFF1C261C)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            activeEvent == null
                ? 'No signal yet'
                : '${activeEvent!.noteName} · ${activeEvent!.domain}',
            style: const TextStyle(
              color: Color(0xFFB5D89C),
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 38,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final pitch in range)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        height: pitchToNoteName(pitch).contains('#') ? 22 : 34,
                        decoration: BoxDecoration(
                          color: activeEvent?.pitch == pitch
                              ? const Color(0xFF7EC832)
                              : highlightedPitches.contains(pitch)
                                  ? const Color(0xFF5AB090)
                                  : const Color(0xFF152015),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: activeEvent?.pitch == pitch
                                ? const Color(0xFFB8FF6B)
                                : const Color(0xFF263326),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
