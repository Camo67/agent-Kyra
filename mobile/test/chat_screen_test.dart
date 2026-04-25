import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kyra_mobile/app_models.dart';
import 'package:kyra_mobile/inference_client.dart';
import 'package:kyra_mobile/widgets/chat_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeTransport implements InferenceTransport {
  FakeTransport({
    required this.replyText,
    this.networkAvailable = true,
    this.serverError = false,
  });

  bool networkAvailable;
  bool serverError;
  final String replyText;
  final List<Map<String, String>> requests = [];

  @override
  Future<ConnectionHealth> health(AppSettings settings) async {
    return ConnectionHealth(
      ok: networkAvailable,
      backend: networkAvailable ? 'ollama' : null,
      model: 'qwen3:0.6b',
      message: networkAvailable ? null : 'OFFLINE — server not reachable',
    );
  }

  @override
  Future<ChatReply> chat({
    required AppSettings settings,
    required String context,
    required String userText,
    String? systemPrompt,
  }) async {
    requests.add({
      'context': context,
      'userText': userText,
    });

    if (!networkAvailable) {
      throw InferenceException.network();
    }
    if (serverError) {
      throw InferenceException.server('Bridge request failed', statusCode: 502);
    }

    return ChatReply(
      reply: replyText,
      backend: 'ollama',
      model: 'qwen3:0.6b',
      ts: DateTime.now().millisecondsSinceEpoch,
    );
  }
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('chat screen fits a small phone layout', (tester) async {
    final transport = FakeTransport(replyText: 'Ready.');

    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;

    await tester.pumpWidget(
      MaterialApp(
        home: ChatScreen(
          transport: transport,
          healthPollInterval: const Duration(days: 1),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('visualizer')), findsOneWidget);
    expect(find.byKey(const Key('memory-panel')), findsOneWidget);
    expect(find.byKey(const Key('composer-field')), findsOneWidget);
    expect(find.byKey(const Key('send-button')), findsOneWidget);
  });

  testWidgets('successful send shows reply and MIDI metadata', (tester) async {
    final transport = FakeTransport(replyText: 'I can help with that.');

    await tester.pumpWidget(
      MaterialApp(
        home: ChatScreen(
          transport: transport,
          healthPollInterval: const Duration(days: 1),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
        find.byKey(const Key('composer-field')), 'build the system');
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('build the system'), findsOneWidget);
    expect(find.text('I can help with that.'), findsOneWidget);
    expect(find.textContaining('1280ms'), findsOneWidget);
    expect(transport.requests, hasLength(1));
  });

  testWidgets('offline queue retries after reconnect', (tester) async {
    final transport = FakeTransport(
      replyText: 'Back online.',
      networkAvailable: false,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ChatScreen(
          transport: transport,
          healthPollInterval: const Duration(milliseconds: 200),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
        find.byKey(const Key('composer-field')), 'hello there');
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('pending'), findsOneWidget);
    expect(find.text('Back online.'), findsNothing);

    transport.networkAvailable = true;

    await tester.pump(const Duration(milliseconds: 250));
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Back online.'), findsOneWidget);
  });

  testWidgets('server errors mark the queued message as failed',
      (tester) async {
    final transport = FakeTransport(
      replyText: 'No-op',
      serverError: true,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ChatScreen(
          transport: transport,
          healthPollInterval: const Duration(days: 1),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
        find.byKey(const Key('composer-field')), 'need a response');
    await tester.tap(find.byKey(const Key('send-button')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('failed'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
