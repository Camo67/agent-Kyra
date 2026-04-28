# Language Quick Reference

## JavaScript/Node.js

### Project Setup
```bash
npm init -y
npm install express cors dotenv
```

### Basic Server
```javascript
import express from 'express';
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Kyra API' });
});

app.listen(3000, () => console.log('Server running'));
```

### Key Libraries
- **express**: Web framework
- **socket.io**: Real-time communication
- **playwright**: Browser automation
- **axios**: HTTP client

## Python

### Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install fastapi uvicorn chromadb
```

### FastAPI Server
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Kyra Python API"}

@app.post("/process")
async def process_data(data: dict):
    # Process data with Kyra logic
    return {"result": "processed"}
```

### Key Libraries
- **chromadb**: Vector database
- **fastapi**: Web framework
- **ollama**: Local LLM integration
- **pyyaml**: Configuration

## Flutter/Dart

### Project Setup
```bash
flutter create kyra_mobile_app
cd kyra_mobile_app
flutter pub add http shared_preferences provider
```

### Basic App
```dart
import 'package:flutter/material.dart';

void main() {
  runApp(KyraApp());
}

class KyraApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: Text('Kyra Mobile')),
        body: Center(child: Text('MIDI x MXit AI')),
      ),
    );
  }
}
```

### Key Packages
- **http**: Network requests
- **shared_preferences**: Local storage
- **provider**: State management

## Go

### Module Setup
```bash
go mod init github.com/camo67/kyra-go-tool
go get github.com/gorilla/mux
```

### HTTP Server
```go
package main

import (
    "fmt"
    "net/http"
    "github.com/gorilla/mux"
)

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Kyra Go API")
    })

    http.ListenAndServe(":8080", r)
}
```

### Key Libraries
- **gorilla/mux**: HTTP router
- **net/http**: Standard HTTP
- **encoding/json**: JSON handling

## Rust

### Project Setup
```bash
cargo new kyra-rust-tool
cd kyra-rust-tool
cargo add tokio serde
```

### Async Application
```rust
use tokio::net::TcpListener;
use std::io;

#[tokio::main]
async fn main() -> io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    loop {
        let (socket, _) = listener.accept().await?;
        tokio::spawn(async move {
            // Handle connection
        });
    }
}
```

### Key Crates
- **tokio**: Async runtime
- **serde**: Serialization
- **reqwest**: HTTP client

## TypeScript

### Project Setup
```bash
npm install -D typescript @types/node ts-node
npx tsc --init
```

### Typed Server
```typescript
import express, { Request, Response } from 'express';

interface KyraRequest {
  action: string;
  data: any;
}

const app = express();
app.use(express.json());

app.post('/kyra', (req: Request<{}, {}, KyraRequest>, res: Response) => {
  const { action, data } = req.body;
  // Process with type safety
  res.json({ result: 'processed' });
});

app.listen(3000);
```

### Key Libraries
- **@types/node**: Node.js types
- **express**: Web framework
- **typescript**: Compiler

## C#

### Project Setup
```bash
dotnet new console -n KyraTool
cd KyraTool
dotnet add package Microsoft.Extensions.Hosting
```

### Console Application
```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        using var client = new HttpClient();
        var response = await client.GetStringAsync("https://api.example.com");
        Console.WriteLine($"Kyra C# Tool: {response}");
    }
}
```

### Key Packages
- **Microsoft.Extensions.Hosting**: Hosting
- **System.Net.Http**: HTTP client
- **Newtonsoft.Json**: JSON handling

## Java

### Maven Setup
```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.camo67</groupId>
  <artifactId>kyra-java-tool</artifactId>
  <version>1.0.0</version>

  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>
```

### Spring Boot Application
```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class KyraApplication {

    @GetMapping("/")
    public String home() {
        return "Kyra Java API";
    }

    public static void main(String[] args) {
        SpringApplication.run(KyraApplication.class, args);
    }
}
```

### Key Frameworks
- **Spring Boot**: Application framework
- **Maven**: Build tool
- **JUnit**: Testing

## PHP

### Composer Setup
```json
{
  "name": "camo67/kyra-php-tool",
  "require": {
    "slim/slim": "^4.0",
    "guzzlehttp/guzzle": "^7.0"
  }
}
```

### Slim Framework App
```php
<?php
require 'vendor/autoload.php';

use Slim\Factory\AppFactory;

$app = AppFactory::create();

$app->get('/', function ($request, $response) {
    $response->getBody()->write('Kyra PHP API');
    return $response;
});

$app->run();
```

### Key Frameworks
- **Laravel**: Full-stack framework
- **Slim**: Micro-framework
- **Composer**: Package manager

## Ruby

### Gem Setup
```ruby
# Gemfile
source 'https://rubygems.org'

gem 'sinatra'
gem 'httparty'
```

### Sinatra App
```ruby
require 'sinatra'

get '/' do
  'Kyra Ruby API'
end

post '/process' do
  # Process request
  { result: 'processed' }.to_json
end
```

### Key Gems
- **rails**: Full-stack framework
- **sinatra**: Micro-framework
- **httparty**: HTTP client

## Swift

### Package Setup
```swift
// Package.swift
import PackageDescription

let package = Package(
    name: "KyraTool",
    platforms: [.macOS(.v12)],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.0.0"),
    ],
    targets: [
        .executableTarget(name: "KyraTool")
    ]
)
```

### Command Line Tool
```swift
import Foundation

@main
struct KyraTool {
    static func main() {
        print("Kyra Swift Tool")
        // Tool logic here
    }
}
```

### Key Frameworks
- **SwiftUI**: UI framework
- **Foundation**: Core services
- **ArgumentParser**: CLI tools

## Kotlin

### Gradle Setup
```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.0"
    application
}

dependencies {
    implementation("io.ktor:ktor-server-netty:2.3.0")
}
```

### Ktor Server
```kotlin
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun main() {
    embeddedServer(Netty, port = 8080) {
        routing {
            get("/") {
                call.respondText("Kyra Kotlin API")
            }
        }
    }.start(wait = true)
}
```

### Key Libraries
- **Ktor**: Web framework
- **Exposed**: ORM
- **kotlinx.coroutines**: Async programming

## Bash

### Script Template
```bash
#!/bin/bash

set -euo pipefail

# Configuration
KYRA_API_URL="${KYRA_API_URL:-http://localhost:8790}"

# Functions
kyra_request() {
    local endpoint="$1"
    curl -s "${KYRA_API_URL}${endpoint}"
}

# Main logic
main() {
    echo "Kyra Bash Tool"
    kyra_request "/health"
}

main "$@"
```

### Key Tools
- **curl**: HTTP requests
- **jq**: JSON processing
- **sed/awk**: Text processing

## PowerShell

### Script Template
```powershell
param(
    [string]$KyraApiUrl = "http://localhost:8790"
)

function Invoke-KyraRequest {
    param([string]$Endpoint)
    Invoke-RestMethod -Uri "$KyraApiUrl$Endpoint"
}

# Main logic
Write-Host "Kyra PowerShell Tool"
Invoke-KyraRequest "/health"
```

### Key Modules
- **Invoke-RestMethod**: HTTP requests
- **ConvertTo-Json**: JSON handling
- **Get-Content**: File operations