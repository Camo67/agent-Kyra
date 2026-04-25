import 'package:flutter/material.dart';

import '../app_models.dart';

class MemoryPanel extends StatelessWidget {
  const MemoryPanel({
    super.key,
    required this.events,
    required this.maxEvents,
    required this.pendingCount,
  });

  final List<MidiEvent> events;
  final int maxEvents;
  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.08,
      minChildSize: 0.08,
      maxChildSize: 0.44,
      snap: true,
      snapSizes: const [0.08, 0.44],
      builder: (context, scrollController) {
        return Container(
          key: const Key('memory-panel'),
          decoration: const BoxDecoration(
            color: Color(0xFF060A06),
            border: Border(
              top: BorderSide(color: Color(0xFF1C261C)),
            ),
          ),
          child: Column(
            children: [
              const SizedBox(height: 8),
              Container(
                width: 44,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFF334233),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Memory ${events.length}/$maxEvents',
                      style: const TextStyle(
                        color: Color(0xFFB5D89C),
                        fontSize: 12,
                      ),
                    ),
                    Text(
                      pendingCount == 0 ? 'Queue clear' : '$pendingCount queued',
                      style: const TextStyle(
                        color: Color(0xFF7EC832),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                  itemCount: events.length,
                  itemBuilder: (context, index) {
                    final event = events[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border(
                          left: BorderSide(
                            color: event.role == 'user'
                                ? const Color(0xFF7EC832)
                                : const Color(0xFF5AB090),
                            width: 2,
                          ),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${event.noteName} · ${event.domain} · ${event.duration}ms',
                            style: const TextStyle(
                              color: Color(0xFF8CB987),
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            event.compressed,
                            style: const TextStyle(
                              color: Color(0xFFF4FFF0),
                              fontSize: 13,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
