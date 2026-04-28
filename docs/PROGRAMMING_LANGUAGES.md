# Programming Languages Supported by Kyra

Kyra is a polyglot AI agent capable of working with multiple programming languages across web, mobile, desktop, and systems development. This document outlines the languages Kyra supports, their use cases, and implementation guidelines.

## Core Languages

### JavaScript/Node.js
**Primary Runtime**: Node.js on HP ProDesk (Ubuntu)
**Package Manager**: npm
**Key Frameworks**: Express.js, Socket.IO, Playwright
**Use Cases**: Web servers, automation, API development, browser automation

**Setup**:
```bash
# Initialize project
npm init -y

# Install dependencies
npm install express socket.io playwright

# Development
npm run dev
```

**Kyra Integration**: Primary language for Kyra's core server (`kyra-server.js`), inference bridge, and automation tools.

### Python
**Version Support**: 3.9+
**Package Managers**: pip, uv
**Key Libraries**: ChromaDB, PyYAML, Ollama
**Use Cases**: AI/ML, data processing, automation scripts, system tools

**Setup**:
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install chromadb pyyaml ollama
```

**Kyra Integration**: Memory systems (MemPalace), swarm coordination, IP rotation scripts.

### Flutter/Dart
**Target Platforms**: Android (primary), iOS
**Architecture**: Mobile-first local inference
**Key Features**: MIDI processing, MXit AI integration
**Use Cases**: Mobile apps, cross-platform development

**Setup**:
```bash
# Install Flutter
# Add to pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.1
  shared_preferences: ^2.2.3

# Run app
flutter run
```

**Kyra Integration**: Mobile client for MIDI x MXit AI interactions.

## Web Development Languages

### TypeScript
**Superset of**: JavaScript
**Benefits**: Type safety, better IDE support, maintainability
**Use Cases**: Large-scale applications, API development, tooling

**Setup**:
```bash
# Initialize TypeScript project
npm install -D typescript @types/node
npx tsc --init

# Build
npx tsc
```

**Kyra Integration**: Enhanced type safety for complex workflows.

### React Native
**Target Platforms**: iOS, Android
**Benefits**: Code sharing, native performance
**Use Cases**: Cross-platform mobile apps

**Setup**:
```bash
# Initialize React Native project
npx react-native init KyraApp
cd KyraApp

# Install dependencies
npm install @react-navigation/native
```

**Kyra Integration**: Alternative mobile development option.

### Next.js
**Framework**: React-based full-stack framework
**Features**: SSR, SSG, API routes, file-based routing
**Use Cases**: Web applications, dashboards, landing pages

**Setup**:
```bash
# Create Next.js app
npx create-next-app@latest kyra-web --typescript
cd kyra-web

# Development
npm run dev
```

**Kyra Integration**: Web interfaces and dashboards.

## Systems Programming Languages

### Go
**Benefits**: Performance, concurrency, simplicity
**Use Cases**: System tools, network services, CLI applications
**Package Manager**: Go modules

**Setup**:
```bash
# Initialize Go module
go mod init github.com/camo67/kyra-tool

# Add dependencies
go get github.com/gorilla/mux

# Build
go build
```

**Kyra Integration**: High-performance system utilities and network tools.

### Rust
**Benefits**: Memory safety, performance, zero-cost abstractions
**Use Cases**: System programming, performance-critical code, WebAssembly
**Package Manager**: Cargo

**Setup**:
```bash
# Create new Rust project
cargo new kyra-rust-tool
cd kyra-rust-tool

# Add dependencies to Cargo.toml
[dependencies]
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }

# Build
cargo build
```

**Kyra Integration**: Performance-critical components and system-level tools.

### C/C++
**Benefits**: Maximum performance, hardware access, legacy integration
**Use Cases**: System programming, embedded systems, high-performance computing
**Build Systems**: Make, CMake

**Setup**:
```bash
# Create Makefile
CC=gcc
CFLAGS=-Wall -Wextra -O2

kyra-tool: kyra-tool.c
    $(CC) $(CFLAGS) -o kyra-tool kyra-tool.c

# Or use CMake
cmake_minimum_required(VERSION 3.10)
project(KyraTool)
add_executable(kyra-tool kyra-tool.c)
```

**Kyra Integration**: Hardware interfaces and performance-critical operations.

## Enterprise Languages

### Java
**JVM Language**: Object-oriented, enterprise-grade
**Frameworks**: Spring Boot, Maven/Gradle
**Use Cases**: Enterprise applications, Android development, large systems

**Setup**:
```bash
# Create Maven project
mvn archetype:generate -DgroupId=com.camo67 -DartifactId=kyra-java -DarchetypeArtifactId=maven-archetype-quickstart

# Add Spring Boot
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

**Kyra Integration**: Enterprise-grade services and integrations.

### C#
**Framework**: .NET
**Benefits**: Cross-platform, strong typing, extensive libraries
**Use Cases**: Desktop apps, web services, game development

**Setup**:
```bash
# Create .NET project
dotnet new console -n KyraTool
cd KyraTool

# Add packages
dotnet add package Microsoft.Extensions.Hosting
```

**Kyra Integration**: Cross-platform tools and Windows-specific automation.

### PHP
**Web Language**: Server-side scripting
**Frameworks**: Laravel, Symfony
**Use Cases**: Web applications, APIs, content management

**Setup**:
```bash
# Install Composer
curl -sS https://getcomposer.org/installer | php

# Create Laravel project
composer create-project laravel/laravel kyra-php-app
cd kyra-php-app

# Serve
php artisan serve
```

**Kyra Integration**: Web services and content management systems.

## Modern Languages

### Ruby
**Benefits**: Developer happiness, DSL capabilities, Rails framework
**Package Manager**: Bundler/Gem
**Use Cases**: Web development, automation, scripting

**Setup**:
```bash
# Create Ruby project
bundle init

# Add to Gemfile
gem 'rails'
gem 'sinatra'

# Install
bundle install
```

**Kyra Integration**: Rapid prototyping and developer tools.

### Swift
**Platform**: Apple ecosystem (iOS, macOS, watchOS, tvOS)
**Benefits**: Safety, performance, modern syntax
**Use Cases**: iOS/macOS applications, system utilities

**Setup**:
```swift
// Package.swift
import PackageDescription

let package = Package(
    name: "KyraTool",
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.0.0"),
    ]
)
```

**Kyra Integration**: macOS and iOS automation tools.

### Kotlin
**Platforms**: JVM, Android, JavaScript, Native
**Benefits**: Concise, safe, interoperable with Java
**Use Cases**: Android apps, backend services, cross-platform development

**Setup**:
```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.0"
    application
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib")
}
```

**Kyra Integration**: Android development and JVM-based services.

## Functional Languages

### Elixir
**Platform**: Erlang VM (BEAM)
**Benefits**: Concurrency, fault-tolerance, functional programming
**Use Cases**: Distributed systems, real-time applications

**Setup**:
```bash
# Create Elixir project
mix new kyra_elixir_app
cd kyra_elixir_app

# Add dependencies to mix.exs
defp deps do
  [
    {:phoenix, "~> 1.7"},
    {:cowboy, "~> 2.10"}
  ]
end

# Run
mix run
```

**Kyra Integration**: Real-time systems and distributed processing.

### Haskell
**Benefits**: Pure functional programming, strong typing, mathematical precision
**Use Cases**: Compilers, formal verification, complex algorithms

**Setup**:
```bash
# Create Haskell project
cabal init

# Add to kyra-tool.cabal
executable kyra-tool
  main-is:             Main.hs
  build-depends:       base ^>=4.16.4.0
  default-language:    Haskell2010
```

**Kyra Integration**: Algorithm implementation and formal verification.

## Scripting Languages

### Bash/Shell
**Benefits**: System automation, cross-platform scripting
**Use Cases**: System administration, automation scripts, CI/CD

**Setup**:
```bash
#!/bin/bash
# kyra-script.sh

set -e  # Exit on error

echo "Kyra automation script"
# Add script logic here
```

**Kyra Integration**: System automation, deployment scripts, and workflow orchestration.

### PowerShell
**Platform**: Windows ecosystem
**Benefits**: Object-oriented scripting, .NET integration
**Use Cases**: Windows automation, system administration

**Setup**:
```powershell
# kyra-script.ps1

param(
    [string]$Action = "default"
)

Write-Host "Kyra PowerShell script"
# Add script logic here
```

**Kyra Integration**: Windows-specific automation and system management.

## Language Selection Guidelines

### Choose Based on Use Case:
- **Web APIs/Services**: Node.js, Python, Go, Java
- **Mobile Apps**: Flutter/Dart, React Native, Swift, Kotlin
- **System Tools**: Go, Rust, C/C++, Python
- **Data Processing**: Python, Java, Go
- **Web Frontends**: TypeScript, JavaScript
- **Enterprise**: Java, C#, Python
- **Rapid Prototyping**: Python, Ruby, JavaScript
- **Performance Critical**: Rust, C/C++, Go
- **Cross-platform**: Flutter, React Native, .NET

### Kyra's Preferred Stack:
1. **Primary**: JavaScript/Node.js, Python, Flutter/Dart
2. **Secondary**: TypeScript, Go, Rust
3. **Tertiary**: C#, Java, Swift, Kotlin
4. **Specialized**: As needed for specific requirements

## Development Environment Setup

Kyra operates within a containerized environment with:
- **OS**: Ubuntu Linux
- **Container**: Dev container with Node.js, Python, Flutter
- **Version Control**: Git with GitHub integration
- **CI/CD**: GitHub Actions for automated testing

## Testing Frameworks

### JavaScript: Jest, Mocha
### Python: pytest, unittest
### Flutter: flutter_test
### Go: testing package
### Rust: cargo test
### Java: JUnit
### C#: NUnit/xUnit

## Package Management

- **npm**: JavaScript/Node.js
- **pip/uv**: Python
- **pub**: Flutter/Dart
- **go mod**: Go
- **cargo**: Rust
- **maven/gradle**: Java
- **nuget**: .NET/C#
- **composer**: PHP
- **bundler**: Ruby

## Deployment Targets

Kyra supports deployment to:
- **Local**: HP ProDesk Ubuntu system
- **Cloud**: Cloudflare Workers/Pages, Supabase
- **Mobile**: Android (primary), iOS
- **Edge**: Huawei 5G CPE
- **Container**: Docker for service isolation

This comprehensive language support enables Kyra to tackle diverse development challenges across the full technology stack while maintaining consistency and best practices.