import 'package:flutter/material.dart';

import '../app_models.dart';

class MessageBubble extends StatelessWidget {
  const MessageBubble({
    super.key,
    required this.message,
    this.onRetry,
  });

  final ChatMessage message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final isUser = message.role == 'user';
    final bubbleColor = isUser
        ? const Color(0xFF101A10)
        : const Color(0xFF0B1612);
    final borderColor = isUser
        ? const Color(0xFF7EC832)
        : const Color(0xFF5AB090);
    final alignment = isUser ? Alignment.centerRight : Alignment.centerLeft;
    final crossAxisAlignment = isUser
        ? CrossAxisAlignment.end
        : CrossAxisAlignment.start;
    final statusText = switch (message.status) {
      ChatMessageStatus.pending => 'pending',
      ChatMessageStatus.failed => 'failed',
      ChatMessageStatus.sent => null,
    };

    return Align(
      alignment: alignment,
      child: FractionallySizedBox(
        widthFactor: 0.88,
        child: Column(
          crossAxisAlignment: crossAxisAlignment,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 6),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: bubbleColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: borderColor.withOpacity(0.45)),
              ),
              child: Column(
                crossAxisAlignment: crossAxisAlignment,
                children: [
                  Text(
                    message.text,
                    style: const TextStyle(
                      color: Color(0xFFF4FFF0),
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        '${message.midiEvent.noteName} · ${message.midiEvent.velocity} · ${message.midiEvent.duration}ms',
                        key: Key('metadata-${message.id}'),
                        style: TextStyle(
                          color: const Color(0xFF7EC832).withOpacity(0.9),
                          fontSize: 11,
                        ),
                      ),
                      if (statusText != null)
                        Text(
                          statusText,
                          style: TextStyle(
                            color: message.status == ChatMessageStatus.failed
                                ? const Color(0xFFFFB3A7)
                                : const Color(0xFF96C874),
                            fontSize: 11,
                          ),
                        ),
                      if (message.status == ChatMessageStatus.failed && onRetry != null)
                        TextButton(
                          onPressed: onRetry,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: const Size(0, 32),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            backgroundColor: const Color(0xFF1B120F),
                            foregroundColor: const Color(0xFFFFD8CF),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('Retry'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
