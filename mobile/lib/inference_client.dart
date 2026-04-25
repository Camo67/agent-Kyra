import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'app_models.dart';

class ConnectionHealth {
  const ConnectionHealth({
    required this.ok,
    required this.backend,
    required this.model,
    this.message,
  });

  final bool ok;
  final String? backend;
  final String model;
  final String? message;

  const ConnectionHealth.initial()
      : ok = false,
        backend = null,
        model = 'qwen3:0.6b',
        message = 'OFFLINE — server not reachable';

  ConnectionHealth copyWith({
    bool? ok,
    String? backend,
    String? model,
    String? message,
  }) {
    return ConnectionHealth(
      ok: ok ?? this.ok,
      backend: backend ?? this.backend,
      model: model ?? this.model,
      message: message ?? this.message,
    );
  }
}

class ChatReply {
  const ChatReply({
    required this.reply,
    required this.backend,
    required this.model,
    required this.ts,
  });

  final String reply;
  final String backend;
  final String model;
  final int ts;
}

class InferenceException implements Exception {
  const InferenceException({
    required this.message,
    this.statusCode,
    this.isNetwork = false,
    this.isConfiguration = false,
  });

  final String message;
  final int? statusCode;
  final bool isNetwork;
  final bool isConfiguration;

  factory InferenceException.network([String message = 'OFFLINE — server not reachable']) {
    return InferenceException(
      message: message,
      isNetwork: true,
    );
  }

  factory InferenceException.configuration([String message = 'OFFLINE — server not reachable']) {
    return InferenceException(
      message: message,
      isConfiguration: true,
    );
  }

  factory InferenceException.server(String message, {int? statusCode}) {
    return InferenceException(
      message: message,
      statusCode: statusCode,
    );
  }

  @override
  String toString() => message;
}

abstract class InferenceTransport {
  Future<ConnectionHealth> health(AppSettings settings);

  Future<ChatReply> chat({
    required AppSettings settings,
    required String context,
    required String userText,
    String? systemPrompt,
  });
}

class InferenceClient implements InferenceTransport {
  InferenceClient({
    http.Client? client,
    this.timeout = const Duration(seconds: 4),
    this.defaultModel = 'qwen3:0.6b',
  }) : _client = client ?? http.Client();

  final http.Client _client;
  final Duration timeout;
  final String defaultModel;

  @override
  Future<ConnectionHealth> health(AppSettings settings) async {
    final baseUri = settings.baseUri;
    if (baseUri == null) {
      return const ConnectionHealth(
        ok: false,
        backend: null,
        model: 'qwen3:0.6b',
        message: 'OFFLINE — server not reachable',
      );
    }

    try {
      final response = await _client
          .get(baseUri.replace(path: '/health'))
          .timeout(timeout);
      final payload = _decodeBody(response.body);
      final model = payload['model']?.toString() ?? defaultModel;
      final backend = payload['backend']?.toString();
      final message = payload['message']?.toString() ?? payload['error']?.toString();

      return ConnectionHealth(
        ok: response.statusCode == 200 && payload['ok'] == true,
        backend: backend,
        model: model,
        message: message,
      );
    } on TimeoutException {
      return const ConnectionHealth(
        ok: false,
        backend: null,
        model: 'qwen3:0.6b',
        message: 'OFFLINE — server not reachable',
      );
    } on SocketException {
      return const ConnectionHealth(
        ok: false,
        backend: null,
        model: 'qwen3:0.6b',
        message: 'OFFLINE — server not reachable',
      );
    } on http.ClientException {
      return const ConnectionHealth(
        ok: false,
        backend: null,
        model: 'qwen3:0.6b',
        message: 'OFFLINE — server not reachable',
      );
    }
  }

  @override
  Future<ChatReply> chat({
    required AppSettings settings,
    required String context,
    required String userText,
    String? systemPrompt,
  }) async {
    final baseUri = settings.baseUri;
    if (baseUri == null) {
      throw InferenceException.configuration();
    }

    try {
      final response = await _client
          .post(
            baseUri.replace(path: '/chat'),
            headers: const {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'context': context,
              'userText': userText,
              if (systemPrompt != null && systemPrompt.trim().isNotEmpty)
                'systemPrompt': systemPrompt.trim(),
            }),
          )
          .timeout(timeout);

      final payload = _decodeBody(response.body);
      if (response.statusCode >= 400) {
        throw InferenceException.server(
          payload['error']?.toString() ?? 'Bridge request failed',
          statusCode: response.statusCode,
        );
      }

      return ChatReply(
        reply: payload['reply']?.toString() ?? '',
        backend: payload['backend']?.toString() ?? 'unknown',
        model: payload['model']?.toString() ?? defaultModel,
        ts: (payload['ts'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
      );
    } on TimeoutException {
      throw InferenceException.network();
    } on SocketException {
      throw InferenceException.network();
    } on http.ClientException {
      throw InferenceException.network();
    }
  }

  Map<String, dynamic> _decodeBody(String body) {
    if (body.trim().isEmpty) {
      return <String, dynamic>{};
    }

    return Map<String, dynamic>.from(jsonDecode(body) as Map);
  }

  void close() {
    _client.close();
  }
}
