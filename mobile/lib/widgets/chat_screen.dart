import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../app_models.dart';
import '../inference_client.dart';
import '../mxit_buffer.dart';
import 'memory_panel.dart';
import 'message_bubble.dart';
import 'midi_visualizer.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({
    super.key,
    this.transport,
    this.healthPollInterval = const Duration(seconds: 4),
  });

  final InferenceTransport? transport;
  final Duration healthPollInterval;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const _messagesKey = 'kyra_messages';
  static const _bufferKey = 'kyra_buffer';
  static const _settingsKey = 'kyra_settings';
  static const _pendingKey = 'kyra_pending_requests';

  final MXitBuffer _buffer = MXitBuffer(maxEvents: 12);
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  late final InferenceTransport _transport;

  List<ChatMessage> _messages = [];
  List<PendingRequest> _pendingRequests = [];
  AppSettings _settings = AppSettings.defaults();
  ConnectionHealth _health = const ConnectionHealth.initial();
  SharedPreferences? _preferences;
  Timer? _healthTimer;
  MidiEvent? _activeEvent;
  bool _restoring = true;
  bool _flushing = false;

  @override
  void initState() {
    super.initState();
    _transport = widget.transport ?? InferenceClient();
    unawaited(_restoreState());
  }

  @override
  void dispose() {
    _healthTimer?.cancel();
    _inputController.dispose();
    _scrollController.dispose();

    if (widget.transport == null && _transport is InferenceClient) {
      (_transport).close();
    }

    super.dispose();
  }

  Future<void> _restoreState() async {
    final preferences = await SharedPreferences.getInstance();
    final messagesJson = preferences.getString(_messagesKey);
    final bufferJson = preferences.getString(_bufferKey);
    final settingsJson = preferences.getString(_settingsKey);
    final pendingJson = preferences.getString(_pendingKey);

    final restoredMessages = messagesJson == null
        ? <ChatMessage>[]
        : (jsonDecode(messagesJson) as List)
              .map(
                (item) => ChatMessage.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ),
              )
              .toList(growable: false);

    final restoredBufferEvents = bufferJson == null
        ? restoredMessages
              .map((message) => message.midiEvent)
              .toList(growable: false)
        : (jsonDecode(bufferJson) as List)
              .map(
                (item) =>
                    MidiEvent.fromJson(Map<String, dynamic>.from(item as Map)),
              )
              .toList(growable: false);

    final restoredSettings = settingsJson == null
        ? AppSettings.defaults()
        : AppSettings.fromJson(
            Map<String, dynamic>.from(jsonDecode(settingsJson) as Map),
          );

    final restoredPending = pendingJson == null
        ? <PendingRequest>[]
        : (jsonDecode(pendingJson) as List)
              .map(
                (item) => PendingRequest.fromJson(
                  Map<String, dynamic>.from(item as Map),
                ),
              )
              .toList(growable: false);

    _buffer.restoreFromEvents(restoredBufferEvents);

    if (!mounted) {
      return;
    }

    setState(() {
      _preferences = preferences;
      _messages = restoredMessages;
      _settings = restoredSettings;
      _pendingRequests = restoredPending;
      _restoring = false;
      _activeEvent = restoredBufferEvents.isEmpty
          ? null
          : restoredBufferEvents.last;
    });

    _scrollToEnd();
    _startHealthPolling();
    await _refreshHealth(attemptFlush: true);
  }

  void _startHealthPolling() {
    _healthTimer?.cancel();
    _healthTimer = Timer.periodic(widget.healthPollInterval, (_) {
      unawaited(_refreshHealth(attemptFlush: true));
    });
  }

  Future<void> _refreshHealth({bool attemptFlush = false}) async {
    final health = await _transport.health(_settings);
    if (!mounted) {
      return;
    }

    setState(() {
      _health = health;
    });

    if (health.ok && attemptFlush) {
      await _flushQueue();
    }
  }

  Future<void> _persistState() async {
    final preferences = _preferences ?? await SharedPreferences.getInstance();
    _preferences = preferences;

    await Future.wait([
      preferences.setString(
        _messagesKey,
        jsonEncode(
          _messages.map((message) => message.toJson()).toList(growable: false),
        ),
      ),
      preferences.setString(_bufferKey, jsonEncode(_buffer.toJsonList())),
      preferences.setString(_settingsKey, jsonEncode(_settings.toJson())),
      preferences.setString(
        _pendingKey,
        jsonEncode(
          _pendingRequests
              .map((request) => request.toJson())
              .toList(growable: false),
        ),
      ),
    ]);
  }

  void _flashEvent(MidiEvent event) {
    setState(() {
      _activeEvent = event;
    });

    final window = math.min(event.duration, 1500);
    Future<void>.delayed(Duration(milliseconds: window), () {
      if (!mounted || _activeEvent?.ts != event.ts) {
        return;
      }

      setState(() {
        _activeEvent = null;
      });
    });
  }

  Future<void> _sendCurrentText() async {
    final text = _inputController.text.trim();
    if (text.isEmpty) {
      return;
    }

    final messageId = DateTime.now().microsecondsSinceEpoch.toString();
    final userEvent = _buffer.push(text, 'user');
    final pendingRequest = PendingRequest(
      messageId: messageId,
      userText: text,
      context: _buffer.toContext(),
    );

    setState(() {
      _messages = [
        ..._messages,
        ChatMessage(
          id: messageId,
          role: 'user',
          text: text,
          compressed: userEvent.compressed,
          midiEvent: userEvent,
          status: ChatMessageStatus.pending,
        ),
      ];
      _pendingRequests = [..._pendingRequests, pendingRequest];
      _inputController.clear();
    });

    _flashEvent(userEvent);
    _scrollToEnd();
    await _persistState();
    await _flushQueue();
  }

  Future<void> _flushQueue() async {
    if (_flushing || _pendingRequests.isEmpty) {
      return;
    }

    _flushing = true;

    try {
      while (mounted && _pendingRequests.isNotEmpty) {
        final request = _pendingRequests.first;
        if (!request.retryOnReconnect) {
          break;
        }

        try {
          final reply = await _transport.chat(
            settings: _settings,
            context: request.context,
            userText: request.userText,
          );

          final assistantEvent = _buffer.push(reply.reply, 'assistant');

          if (!mounted) {
            return;
          }

          setState(() {
            _messages = _messages
                .map(
                  (message) => message.id == request.messageId
                      ? message.copyWith(status: ChatMessageStatus.sent)
                      : message,
                )
                .toList(growable: false);
            _messages = [
              ..._messages,
              ChatMessage(
                id: '${request.messageId}-reply',
                role: 'assistant',
                text: reply.reply,
                compressed: assistantEvent.compressed,
                midiEvent: assistantEvent,
                status: ChatMessageStatus.sent,
              ),
            ];
            _pendingRequests = _pendingRequests.sublist(1);
            _health = ConnectionHealth(
              ok: true,
              backend: reply.backend,
              model: reply.model,
              message: null,
            );
          });

          _flashEvent(assistantEvent);
          _scrollToEnd();
          await _persistState();
        } on InferenceException catch (error) {
          if (!mounted) {
            return;
          }

          if (error.isNetwork || error.isConfiguration) {
            setState(() {
              _health = const ConnectionHealth(
                ok: false,
                backend: null,
                model: 'qwen3:0.6b',
                message: 'OFFLINE — server not reachable',
              );
              _messages = _messages
                  .map(
                    (message) => message.id == request.messageId
                        ? message.copyWith(status: ChatMessageStatus.pending)
                        : message,
                  )
                  .toList(growable: false);
            });
            await _persistState();
            break;
          }

          setState(() {
            final updatedRequests = [..._pendingRequests];
            updatedRequests[0] = updatedRequests[0].copyWith(
              retryOnReconnect: false,
            );
            _pendingRequests = updatedRequests;
            _messages = _messages
                .map(
                  (message) => message.id == request.messageId
                      ? message.copyWith(status: ChatMessageStatus.failed)
                      : message,
                )
                .toList(growable: false);
            _health = ConnectionHealth(
              ok: false,
              backend: null,
              model: _health.model,
              message: error.message,
            );
          });
          await _persistState();
          break;
        }
      }
    } finally {
      _flushing = false;
    }
  }

  Future<void> _retryFailedMessage(String messageId) async {
    final requestIndex = _pendingRequests.indexWhere(
      (request) => request.messageId == messageId,
    );
    if (requestIndex == -1) {
      return;
    }

    setState(() {
      final updatedRequests = [..._pendingRequests];
      updatedRequests[requestIndex] = updatedRequests[requestIndex].copyWith(
        retryOnReconnect: true,
      );
      _pendingRequests = updatedRequests;
      _messages = _messages
          .map(
            (message) => message.id == messageId
                ? message.copyWith(status: ChatMessageStatus.pending)
                : message,
          )
          .toList(growable: false);
    });

    await _persistState();
    await _flushQueue();
  }

  Future<void> _openSettingsDialog() async {
    final hostController = TextEditingController(text: _settings.host);
    final portController = TextEditingController(
      text: _settings.port.toString(),
    );

    final saved = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF0B100B),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: const BorderSide(color: Color(0xFF1C261C)),
          ),
          title: const Text(
            'Server',
            style: TextStyle(color: Color(0xFFF4FFF0)),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: hostController,
                style: const TextStyle(color: Color(0xFFF4FFF0)),
                decoration: const InputDecoration(
                  labelText: 'IP address',
                  hintText: '192.168.0.24',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: portController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Color(0xFFF4FFF0)),
                decoration: const InputDecoration(labelText: 'Port'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Close'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF7EC832),
                foregroundColor: const Color(0xFF081008),
              ),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );

    if (saved != true) {
      return;
    }

    final parsedPort = int.tryParse(portController.text.trim()) ?? 8787;

    setState(() {
      _settings = AppSettings(
        host: hostController.text.trim().isEmpty
            ? '192.168.x.x'
            : hostController.text.trim(),
        port: parsedPort,
      );
    });

    await _persistState();
    await _refreshHealth(attemptFlush: true);
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) {
        return;
      }

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent + 120,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_restoring) {
      return const Scaffold(
        backgroundColor: Color(0xFF080D08),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF7EC832)),
        ),
      );
    }

    final bufferLog = _buffer.getLog();

    return Scaffold(
      backgroundColor: const Color(0xFF080D08),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Agent Kyra',
                              style: TextStyle(
                                color: Color(0xFFF4FFF0),
                                fontSize: 18,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  key: const Key('status-indicator'),
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: _health.ok
                                        ? const Color(0xFF7EC832)
                                        : const Color(0xFFB25E4A),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _health.ok
                                        ? 'Connected · ${_health.backend ?? _health.model}'
                                        : (_health.message ??
                                              'OFFLINE — server not reachable'),
                                    key: const Key('connection-text'),
                                    style: TextStyle(
                                      color: _health.ok
                                          ? const Color(0xFFB5D89C)
                                          : const Color(0xFFFFD8CF),
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: _openSettingsDialog,
                        icon: const Icon(Icons.tune),
                        color: const Color(0xFFB5D89C),
                        tooltip: 'Server',
                      ),
                    ],
                  ),
                ),
                if (!_health.ok)
                  Container(
                    key: const Key('offline-banner'),
                    width: double.infinity,
                    margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A100E),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF5A2D24)),
                    ),
                    child: const Text(
                      'OFFLINE — server not reachable',
                      style: TextStyle(color: Color(0xFFFFD8CF), fontSize: 12),
                    ),
                  ),
                MidiVisualizer(events: bufferLog, activeEvent: _activeEvent),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 150),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      return MessageBubble(
                        message: message,
                        onRetry: message.status == ChatMessageStatus.failed
                            ? () => _retryFailedMessage(message.id)
                            : null,
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
                  decoration: const BoxDecoration(
                    color: Color(0xFF080D08),
                    border: Border(top: BorderSide(color: Color(0xFF1C261C))),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          key: const Key('composer-field'),
                          controller: _inputController,
                          style: const TextStyle(color: Color(0xFFF4FFF0)),
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => unawaited(_sendCurrentText()),
                          decoration: InputDecoration(
                            hintText: 'Say it in your own words',
                            hintStyle: const TextStyle(
                              color: Color(0xFF6B826B),
                            ),
                            filled: true,
                            fillColor: const Color(0xFF101610),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF243024),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF243024),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF7EC832),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton(
                        key: const Key('send-button'),
                        onPressed: _sendCurrentText,
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF7EC832),
                          foregroundColor: const Color(0xFF081008),
                          minimumSize: const Size(52, 52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: const Icon(Icons.arrow_upward),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            MemoryPanel(
              events: bufferLog,
              maxEvents: _buffer.maxEvents,
              pendingCount: _pendingRequests.length,
            ),
          ],
        ),
      ),
    );
  }
}
