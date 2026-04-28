# Kyra AI Stack

**Personal AI Agent for Cameron De Vries** — A comprehensive AI system built with multiple programming languages, supporting web, mobile, automation, and AI integration.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python)](https://python.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.0+-02569B?style=flat&logo=flutter)](https://flutter.dev/)
[![Go](https://img.shields.io/badge/Go-1.19+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-000000?style=flat&logo=rust)](https://rust-lang.org/)

## Overview

Kyra is a polyglot AI agent designed for continuous operation across multiple platforms and use cases. Built with CamodevOps principles, Kyra operates 24/7 on local infrastructure while maintaining zero vendor lock-in and resilience under resource constraints.

### Core Capabilities

- **Multi-Channel Communication**: Telegram, WhatsApp, Discord, Web UI
- **Memory Systems**: Weaver memory with Obsidian vault integration
- **Automation**: n8n workflows, Playwright browser automation, swarm coordination
- **AI Integration**: Local LLM failover chain (Ollama → Groq → Google AI Studio → OpenRouter)
- **Mobile Interface**: Flutter-based Android-first client
- **Voice Processing**: Minimax voice cloning with reference audio
- **Business Tools**: Lead generation, website analysis, outreach automation

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  Mobile Client  │    │  Messaging APIs │
│   (TypeScript)  │    │   (Flutter)     │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Kyra Core    │
                    │   (Node.js)    │
                    │                 │
                    │ • Memory System │
                    │ • AI Bridge     │
                    │ • Workflow Engine│
                    │ • Voice Adapter │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │   Automation    │
                    │   Layer         │
                    │                 │
                    │ • n8n Workflows │
                    │ • Playwright    │
                    │ • Swarm Watcher │
                    │ • System Scripts│
                    └─────────────────┘
```

## Supported Programming Languages

Kyra is built with a polyglot architecture supporting **15+ programming languages**:

### Primary Languages
- **JavaScript/Node.js**: Core server, real-time features, API development
- **Python**: AI/ML integration, automation scripts, data processing
- **Flutter/Dart**: Mobile applications, cross-platform UI

### Secondary Languages
- **TypeScript**: Type-safe web applications, large-scale development
- **Go**: High-performance services, system tools, networking
- **Rust**: Performance-critical components, memory safety

### Additional Languages
- **React Native**: Alternative mobile development
- **Next.js**: Full-stack web applications
- **C/C++**: Hardware interfaces, performance optimization
- **Java**: Enterprise services, Android development
- **C#**: Cross-platform applications, Windows integration
- **PHP**: Web services, content management
- **Ruby**: Rapid prototyping, developer tools
- **Swift**: iOS/macOS native applications
- **Kotlin**: Modern JVM development, Android
- **Elixir**: Real-time systems, distributed processing
- **Haskell**: Algorithm implementation, formal verification
- **Bash/PowerShell**: System automation, scripting

📖 **[Complete Language Documentation](docs/PROGRAMMING_LANGUAGES.md)**

## Quick Start

### Prerequisites
- Ubuntu Linux (primary) or macOS/Windows
- Node.js 18+, Python 3.9+, Flutter SDK
- Chrome/Chromium for Playwright automation
- Ollama for local AI (optional)

### Installation

1. **Clone and setup**:
```bash
git clone https://github.com/Camo67/agent-Kyra.git
cd agent-Kyra
npm install
```

2. **Configure environment**:
```bash
cp local.env .env
# Edit .env with your API keys and settings
```

3. **Start Kyra**:
```bash
# Start the main server
npm run kyra

# Or use the startup script
./start-platform.sh
```

### Mobile Development
```bash
cd mobile
flutter pub get
flutter run  # Android device/emulator
```

### n8n Workflows
```bash
./start-n8n.sh
# Open http://localhost:9090
# Import workflows from n8n/ directory
```

## Key Components

### Core Server (`kyra-server.js`)
- Express.js web server with Socket.IO
- RESTful API endpoints
- Health monitoring and status reporting
- MXit buffer memory management

### Memory System (`weaver-memory.js`, `obsidian-memory.js`)
- Weaver: Local memory indexing and retrieval
- Obsidian Integration: Note storage and linking
- MXit Buffer: Event-based memory streaming

### AI Integration (`inference-bridge.js`)
- Multi-provider LLM failover chain
- Local model support via Ollama
- Context-aware prompt engineering

### Automation Tools
- **Playwright** (`playwright-tool.js`): Browser automation
- **n8n Workflows**: Visual workflow automation
- **Swarm Watcher** (`scripts/swarm_watcher.py`): Multi-machine coordination
- **Voice Adapter** (`voice-adapter.js`): Audio processing and TTS

### Mobile App (`mobile/`)
- Flutter-based Android-first interface
- MIDI x MXit AI visualization
- Real-time communication with core server

## API Endpoints

### Core Server (Port 8790)
```
GET  /health              # System health status
POST /kyra/memory/link    # Link memory to Obsidian
POST /kyra/tools/playwright # Run browser automation
```

### Web Console (Port 3000)
- Real-time dashboard
- Memory visualization
- Workflow monitoring
- Voice interface

## Configuration

### Environment Variables
```bash
# Core Settings
PORT=8790
NODE_ENV=development

# AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=your_key_here
GOOGLE_AI_STUDIO_KEY=your_key_here

# Voice Settings
MINIMAX_API_KEY=your_key_here
VOICE_REFERENCE_AUDIO=/path/to/audio.wav

# Database
SUPABASE_URL=your_url
SUPABASE_KEY=your_key

# Mobile
FLUTTER_APP_ID=com.camo67.kyra
```

### Obsidian Integration
```bash
# Vault configuration
OBSIDIAN_VAULT_PATH=/path/to/vault
MEMORY_VAULT=Kyra/Memory
CONVERSATIONS_VAULT=Kyra/Conversations
```

## Development

### Project Structure
```
kyra-ai-stack/
├── app.js                 # Lead scanner application
├── kyra-server.js         # Core Kyra server
├── inference-bridge.js    # AI model integration
├── weaver-memory.js       # Memory indexing system
├── obsidian-memory.js     # Obsidian vault integration
├── voice-adapter.js       # Voice processing
├── playwright-tool.js     # Browser automation
├── mobile/                # Flutter mobile app
├── n8n/                   # Workflow definitions
├── scripts/               # Automation scripts
├── docs/                  # Documentation
└── obsidian-vault/        # Memory storage
```

### Testing
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Mobile tests
cd mobile && flutter test
```

### Deployment
```bash
# Local deployment
./start-platform.sh

# Production setup
./files/kyra-autostart-setup.sh

# Health monitoring
./files/kyra-healthcheck.sh
```

## Documentation

- **[Programming Languages](docs/PROGRAMMING_LANGUAGES.md)**: Complete language support guide
- **[Language Reference](docs/LANGUAGE_REFERENCE.md)**: Quick-start code examples
- **[Setup Guides](docs/SETUP_GUIDES.md)**: Project initialization templates
- **[Language Comparison](docs/LANGUAGE_COMPARISON.md)**: Choosing the right language
- **[n8n Workflows](n8n/README.md)**: Automation workflow documentation
- **[API Documentation](docs/API.md)**: RESTful API reference

## Contributing

Kyra follows the **Implementation Mantra**: Do the whole thing. Do it right. Do it with tests. Do it with documentation. Do it so well that it's genuinely impressive.

### Development Setup
1. Follow language-specific setup guides
2. Use the provided dev container configuration
3. Run tests before committing
4. Update documentation for new features

### Code Standards
- **JavaScript**: ESLint, Prettier, ES6+
- **Python**: Black, Ruff, type hints
- **Flutter**: Flutter analyze, effective Dart
- **Go**: gofmt, golint
- **Rust**: cargo clippy, rustfmt

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Camo67/agent-Kyra/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Camo67/agent-Kyra/discussions)
- **Documentation**: [docs/](docs/) directory

---

**Built by Cameron "Camo" de Vries** — CamodevOps, Bonteheuwel, Cape Town