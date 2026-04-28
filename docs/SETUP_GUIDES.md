# Language Setup Guides

## Quick Project Initialization

### JavaScript/Node.js
```bash
# Create project
mkdir kyra-js-project && cd kyra-js-project
npm init -y

# Install core dependencies
npm install express cors helmet dotenv
npm install -D nodemon jest

# Create basic structure
mkdir src routes middleware utils
touch src/app.js src/server.js
touch routes/api.js middleware/auth.js

# Add scripts to package.json
# "start": "node src/server.js"
# "dev": "nodemon src/server.js"
# "test": "jest"
```

### Python
```bash
# Create project
mkdir kyra-python-project && cd kyra-python-project
python -m venv venv
source venv/bin/activate  # Linux/Mac

# Install core dependencies
pip install fastapi uvicorn pydantic chromadb python-dotenv

# Create basic structure
mkdir app tests
touch app/__init__.py app/main.py app/config.py
touch tests/__init__.py tests/test_main.py
touch requirements.txt pyproject.toml

# Add to requirements.txt
# fastapi==0.104.1
# uvicorn[standard]==0.24.0
# pydantic==2.5.0
```

### Flutter/Dart
```bash
# Install Flutter (if not installed)
# Download from flutter.dev

# Create project
flutter create kyra_mobile_app
cd kyra_mobile_app

# Add core dependencies
flutter pub add http shared_preferences provider flutter_riverpod
flutter pub add dev: flutter_lints

# Create basic structure
mkdir lib/models lib/services lib/widgets lib/screens
touch lib/models/user.dart lib/services/api_service.dart
touch lib/widgets/kyra_button.dart lib/screens/home_screen.dart

# Update pubspec.yaml with assets
# flutter:
#   assets:
#     - assets/images/
#     - assets/config/
```

### TypeScript
```bash
# Create project
mkdir kyra-ts-project && cd kyra-ts-project
npm init -y
npm install -D typescript @types/node ts-node nodemon

# Initialize TypeScript
npx tsc --init --target ES2020 --module commonjs --outDir dist

# Install runtime dependencies
npm install express cors helmet dotenv
npm install -D @types/express @types/cors jest ts-jest

# Create structure
mkdir src dist routes middleware types
touch src/app.ts src/server.ts
touch types/index.ts routes/api.ts

# Update tsconfig.json
# "rootDir": "./src"
# "outDir": "./dist"
```

### Go
```bash
# Create project
mkdir kyra-go-project && cd kyra-go-project
go mod init github.com/camo67/kyra-go-project

# Install core dependencies
go get github.com/gorilla/mux
go get github.com/joho/godotenv
go get github.com/stretchr/testify

# Create structure
mkdir cmd internal pkg api
touch cmd/main.go internal/config/config.go
touch api/handlers.go api/routes.go
touch go.mod go.sum

# Initialize go.mod (already done with go mod init)
```

### Rust
```bash
# Create project
cargo new kyra-rust-project
cd kyra-rust-project

# Add core dependencies
cargo add tokio serde serde_json
cargo add --dev tokio-test

# Create structure
mkdir src/models src/handlers src/utils
touch src/models.rs src/handlers.rs src/utils.rs
touch Cargo.toml

# Update Cargo.toml
# [dependencies]
# tokio = { version = "1", features = ["full"] }
# serde = { version = "1.0", features = ["derive"] }
# serde_json = "1.0"
```

### Java (Spring Boot)
```bash
# Create project with Spring Initializr or Maven
mvn archetype:generate \
  -DgroupId=com.camo67 \
  -DartifactId=kyra-java-project \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DinteractiveMode=false

cd kyra-java-project

# Add Spring Boot to pom.xml
# <parent>
#   <groupId>org.springframework.boot</groupId>
#   <artifactId>spring-boot-starter-parent</artifactId>
#   <version>3.1.5</version>
# </parent>

# <dependencies>
#   <dependency>
#     <groupId>org.springframework.boot</groupId>
#     <artifactId>spring-boot-starter-web</artifactId>
#   </dependency>
# </dependencies>
```

### C#
```bash
# Create project
dotnet new webapi -n KyraWebApi
cd KyraWebApi

# Add packages
dotnet add package Microsoft.EntityFrameworkCore.InMemory
dotnet add package Swashbuckle.AspNetCore

# Create structure
mkdir Models Controllers Services
touch Models/KyraModel.cs Controllers/KyraController.cs
touch Services/KyraService.cs Program.cs

# Update Program.cs for minimal API
```

### PHP (Laravel)
```bash
# Install Composer (if not installed)
# curl -sS https://getcomposer.org/installer | php

# Create Laravel project
composer create-project laravel/laravel kyra-php-project
cd kyra-php-project

# Install additional packages
composer require laravel/sanctum
composer require barryvdh/laravel-debugbar --dev

# Create structure (Laravel creates this automatically)
# app/Models/ app/Http/Controllers/ app/Services/
```

### Ruby (Rails)
```bash
# Install Ruby (if not installed)
# Use rbenv or rvm

# Create Rails project
gem install rails
rails new kyra-rails-project
cd kyra-rails-project

# Add gems to Gemfile
# gem 'devise'
# gem 'pundit'

# Create structure (Rails creates this automatically)
# app/models/ app/controllers/ app/services/
```

### Swift (macOS/iOS)
```bash
# Create Swift package
mkdir KyraSwiftProject && cd KyraSwiftProject
swift package init --type executable

# Add dependencies to Package.swift
// .package(url: "https://github.com/apple/swift-argument-parser", from: "1.0.0"),

# Create structure
mkdir Sources/KyraCore Sources/KyraCLI
touch Sources/KyraCore/KyraCore.swift
touch Sources/KyraCLI/main.swift
```

### Kotlin (JVM)
```bash
# Create Gradle project
mkdir kyra-kotlin-project && cd kyra-kotlin-project
gradle init --type kotlin-application

# Update build.gradle.kts
# dependencies {
#     implementation("io.ktor:ktor-server-netty:2.3.0")
#     implementation("ch.qos.logback:logback-classic:1.4.11")
# }

# Create structure
mkdir src/main/kotlin/com/camo67/kyra
touch src/main/kotlin/com/camo67/kyra/Application.kt
```

## Development Environment Setup

### Container Setup (Dev Container)
```json
// .devcontainer/devcontainer.json
{
  "name": "Kyra Development",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {},
    "ghcr.io/devcontainers/features/python:1": {},
    "ghcr.io/devcontainers/features/go:1": {},
    "ghcr.io/devcontainers/features/rust:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-vscode.vscode-typescript-next",
        "golang.go",
        "rust-lang.rust-analyzer"
      ]
    }
  }
}
```

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "python.formatting.provider": "black",
  "go.formatTool": "goimports",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

## Testing Setup

### JavaScript/TypeScript
```bash
npm install -D jest @types/jest ts-jest
# Add to package.json: "test": "jest"
```

### Python
```bash
pip install pytest pytest-cov
# Create pytest.ini, add to requirements-dev.txt
```

### Go
```bash
# Testing is built-in
go test ./...
```

### Rust
```bash
# Testing is built-in
cargo test
```

### Flutter
```bash
flutter test
```

## CI/CD Setup

### GitHub Actions (JavaScript)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

### GitHub Actions (Python)
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest
```

## Deployment Templates

### Docker (Multi-language)
```dockerfile
# Dockerfile
FROM node:18-alpine AS base
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build if needed
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose (Full Stack)
```yaml
# docker-compose.yml
version: '3.8'
services:
  kyra-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - database

  database:
    image: postgres:15
    environment:
      POSTGRES_DB: kyra
      POSTGRES_USER: kyra
      POSTGRES_PASSWORD: password
```

## Language-Specific Best Practices

### JavaScript/Node.js
- Use ES6+ features
- Implement proper error handling
- Use environment variables for configuration
- Implement health checks

### Python
- Use type hints
- Follow PEP 8 style guide
- Use virtual environments
- Implement proper logging

### Go
- Follow standard Go formatting
- Use interfaces for testability
- Implement proper error handling
- Use goroutines for concurrency

### Rust
- Leverage ownership system
- Use Result/Option types
- Write comprehensive tests
- Use cargo clippy for linting

### Flutter
- Use provider for state management
- Implement proper widget lifecycle
- Use const constructors when possible
- Follow material design guidelines

This setup guide provides quick-start templates for all supported languages, ensuring consistent development practices across Kyra's polyglot architecture.