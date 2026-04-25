import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'widgets/chat_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const KyraMobileApp());
}

class KyraMobileApp extends StatelessWidget {
  const KyraMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    final baseTheme = ThemeData.dark(useMaterial3: true);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Agent Kyra',
      theme: baseTheme.copyWith(
        scaffoldBackgroundColor: const Color(0xFF080D08),
        colorScheme: baseTheme.colorScheme.copyWith(
          primary: const Color(0xFF7EC832),
          secondary: const Color(0xFF5AB090),
          surface: const Color(0xFF0B100B),
        ),
        textTheme: GoogleFonts.shareTechMonoTextTheme(baseTheme.textTheme).apply(
          bodyColor: const Color(0xFFF4FFF0),
          displayColor: const Color(0xFFF4FFF0),
        ),
        inputDecorationTheme: const InputDecorationTheme(
          labelStyle: TextStyle(color: Color(0xFFB5D89C)),
        ),
      ),
      home: const ChatScreen(),
    );
  }
}
