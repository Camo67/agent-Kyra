# Global Business Lead Scanner Platform

A worldwide lead generation system that identifies businesses lacking websites or having poor website quality by scraping Google Maps. The platform uses Kyra AI to generate personalized outreach messages and can be used both for your own client acquisition and as a white-label solution for other agencies.

## Build Capabilities (Currently Implemented)

### Core System
- **Global Business Scraping**: Uses Playwright to scrape Google Maps for businesses by industry, city, and country
- **Website Quality Assessment**: Evaluates websites for mobile-friendliness, loading speed, and SEO with scoring (0-100)
- **AI-Powered Outreach Generation**: Uses Kyra AI to generate personalized outreach messages
- **Lead Management System**: Complete CRUD operations for managing leads with status tracking
- **RESTful API**: Express.js server with endpoints for all functionality
- **Database Integration**: Supabase PostgreSQL integration with fallback to mock database
- **Dashboard Endpoint**: API endpoint for statistics and recent activity
- **Prompt Engineering**: Specialized prompts for different outreach scenarios
- **Multi-Format Outreach**: Generates variations of outreach messages

### API Endpoints
- `GET /` - API information and available endpoints
- `GET /dashboard` - Lead statistics and recent activity
- `POST /api/scrape` - Scrape businesses from Google Maps
- `POST /api/check-website` - Assess website quality
- `POST /api/generate-outreach` - Generate personalized outreach messages
- `GET /api/leads` - Retrieve leads with optional filtering
- `POST /api/leads` - Create a new lead
- `PUT /api/leads/:id` - Update an existing lead

### Technical Components
- Modern ES modules architecture
- Security middleware (Helmet, CORS, rate limiting)
- Environment configuration support
- Error handling and logging
- Responsive design for mobile compatibility

## What Still Needs to be Built

### Phase 2-3 Functionality (Not Yet Implemented)
- **Payment Integration**: Complete Paystack/Stripe integration for subscription tiers
- **WhatsApp Business API**: Direct integration for automated messaging
- **Email/SMS Automation**: Campaign management and scheduling
- **Advanced Analytics Dashboard**: Visual charts and performance metrics
- **Multi-User SaaS**: Authentication and tenant isolation for white-label usage
- **Campaign Management**: Automated outreach sequences and tracking
- **CRM Integration**: Connect with popular CRM systems
- **Reporting Engine**: Detailed reports and export functionality
- **Advanced Filters**: Geographic targeting, business size, revenue estimates
- **Lead Enrichment**: Social media profiles, employee count, registration details

### Infrastructure Components
- **Docker Containerization**: Production-ready Docker configuration
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring & Logging**: Production-grade observability
- **Backup & Recovery**: Automated backup solutions
- **SSL/TLS Configuration**: Production security certificates
- **Load Balancer**: Horizontal scaling configuration

### UI/UX Enhancement
- **Admin Dashboard**: Full-featured web interface with React/Vue
- **Lead Management UI**: Interactive tables with filtering and bulk operations
- **Campaign Builder**: Drag-and-drop interface for creating outreach sequences
- **Analytics Dashboard**: Charts and graphs for performance tracking
- **Mobile App**: React Native app for field agents

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm/yarn
- Docker (for database, optional)

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install --with-deps
   ```

4. Start the server:
   ```bash
   npm start
   # or use the startup script
   ./start-platform.sh
   ```

### API Usage Example

Scrape businesses:
```bash
curl -X POST http://localhost:3001/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "restaurant",
    "city": "Cape Town",
    "country": "South Africa",
    "radius": 10
  }'
```

## Repository Structure

```
├── app.js                 # Main application entry point
├── server.js             # Core server functionality
├── scraper/              # Business scraping module
│   └── scrape-businesses.js
├── utils/                # Utility modules
│   ├── outreach-generator.js
│   ├── prompt-engineering.js
│   └── website-checker.js
├── config/               # Configuration files
│   ├── database.js       # Database integration
│   └── schema.sql        # Database schema
├── examples/             # Example implementations
│   └── demo.js           # Demo script
├── start-platform.sh     # Startup script
└── README.md             # This file
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Global Lead Scanner API                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Scraping  │  │  Quality    │  │   Outreach  │            │
│  │   Module    │  │  Checker    │  │  Generator  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                 │                 │                  │
│         ▼                 ▼                 ▼                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Kyra AI Core                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │   Local     │ │   Groq API  │ │   Tooling   │     │  │
│  │  │   Models    │ │ (fast brain)│ │   (APIs)    │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│                   Obsidian (memory + state)                   │
└─────────────────────────────────────────────────────────────────┘
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT