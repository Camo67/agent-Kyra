enum ChatMessageStatus {
  pending,
  sent,
  failed,
}

ChatMessageStatus chatMessageStatusFromJson(String? value) {
  return ChatMessageStatus.values.firstWhere(
    (status) => status.name == value,
    orElse: () => ChatMessageStatus.pending,
  );
}

class MidiEvent {
  const MidiEvent({
    required this.channel,
    required this.pitch,
    required this.velocity,
    required this.duration,
    required this.noteName,
    required this.domain,
    required this.role,
    required this.raw,
    required this.compressed,
    required this.ts,
  });

  final int channel;
  final int pitch;
  final int velocity;
  final int duration;
  final String noteName;
  final String domain;
  final String role;
  final String raw;
  final String compressed;
  final int ts;

  MidiEvent copyWith({
    int? channel,
    int? pitch,
    int? velocity,
    int? duration,
    String? noteName,
    String? domain,
    String? role,
    String? raw,
    String? compressed,
    int? ts,
  }) {
    return MidiEvent(
      channel: channel ?? this.channel,
      pitch: pitch ?? this.pitch,
      velocity: velocity ?? this.velocity,
      duration: duration ?? this.duration,
      noteName: noteName ?? this.noteName,
      domain: domain ?? this.domain,
      role: role ?? this.role,
      raw: raw ?? this.raw,
      compressed: compressed ?? this.compressed,
      ts: ts ?? this.ts,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'channel': channel,
      'pitch': pitch,
      'velocity': velocity,
      'duration': duration,
      'noteName': noteName,
      'domain': domain,
      'role': role,
      'raw': raw,
      'compressed': compressed,
      'ts': ts,
    };
  }

  factory MidiEvent.fromJson(Map<String, dynamic> json) {
    return MidiEvent(
      channel: (json['channel'] as num?)?.toInt() ?? 0,
      pitch: (json['pitch'] as num?)?.toInt() ?? 0,
      velocity: (json['velocity'] as num?)?.toInt() ?? 0,
      duration: (json['duration'] as num?)?.toInt() ?? 0,
      noteName: json['noteName']?.toString() ?? '',
      domain: json['domain']?.toString() ?? 'UNKNOWN',
      role: json['role']?.toString() ?? 'user',
      raw: json['raw']?.toString() ?? '',
      compressed: json['compressed']?.toString() ?? '',
      ts: (json['ts'] as num?)?.toInt() ?? DateTime.now().millisecondsSinceEpoch,
    );
  }
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    required this.compressed,
    required this.midiEvent,
    required this.status,
  });

  final String id;
  final String role;
  final String text;
  final String compressed;
  final MidiEvent midiEvent;
  final ChatMessageStatus status;

  ChatMessage copyWith({
    String? id,
    String? role,
    String? text,
    String? compressed,
    MidiEvent? midiEvent,
    ChatMessageStatus? status,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      text: text ?? this.text,
      compressed: compressed ?? this.compressed,
      midiEvent: midiEvent ?? this.midiEvent,
      status: status ?? this.status,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'text': text,
      'compressed': compressed,
      'midiEvent': midiEvent.toJson(),
      'status': status.name,
    };
  }

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id']?.toString() ?? '',
      role: json['role']?.toString() ?? 'user',
      text: json['text']?.toString() ?? '',
      compressed: json['compressed']?.toString() ?? '',
      midiEvent: MidiEvent.fromJson(
        Map<String, dynamic>.from(json['midiEvent'] as Map? ?? const {}),
      ),
      status: chatMessageStatusFromJson(json['status']?.toString()),
    );
  }
}

class AppSettings {
  const AppSettings({
    required this.host,
    required this.port,
  });

  final String host;
  final int port;

  factory AppSettings.defaults() {
    return const AppSettings(
      host: '192.168.x.x',
      port: 8787,
    );
  }

  bool get isConfigured {
    return host.isNotEmpty && !host.contains('x');
  }

  Uri? get baseUri {
    if (!isConfigured) {
      return null;
    }

    return Uri(
      scheme: 'http',
      host: host,
      port: port,
    );
  }

  AppSettings copyWith({
    String? host,
    int? port,
  }) {
    return AppSettings(
      host: host ?? this.host,
      port: port ?? this.port,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'host': host,
      'port': port,
    };
  }

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      host: json['host']?.toString() ?? '192.168.x.x',
      port: (json['port'] as num?)?.toInt() ?? 8787,
    );
  }
}

class PendingRequest {
  const PendingRequest({
    required this.messageId,
    required this.userText,
    required this.context,
    this.retryOnReconnect = true,
  });

  final String messageId;
  final String userText;
  final String context;
  final bool retryOnReconnect;

  PendingRequest copyWith({
    String? messageId,
    String? userText,
    String? context,
    bool? retryOnReconnect,
  }) {
    return PendingRequest(
      messageId: messageId ?? this.messageId,
      userText: userText ?? this.userText,
      context: context ?? this.context,
      retryOnReconnect: retryOnReconnect ?? this.retryOnReconnect,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messageId': messageId,
      'userText': userText,
      'context': context,
      'retryOnReconnect': retryOnReconnect,
    };
  }

  factory PendingRequest.fromJson(Map<String, dynamic> json) {
    return PendingRequest(
      messageId: json['messageId']?.toString() ?? '',
      userText: json['userText']?.toString() ?? '',
      context: json['context']?.toString() ?? '',
      retryOnReconnect: json['retryOnReconnect'] as bool? ?? true,
    );
  }
}
