import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeBusinesses } from './scraper/scrape-businesses.js';
import { checkWebsiteQuality } from './utils/website-checker.js';
import { generateOutreachMessage } from './utils/outreach-generator.js';
import { db } from './config/database.js';

// For proper __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GlobalLeadScanner {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  setupMiddleware() {
    // Serve static files from web directory
    this.app.use(express.static(path.join(__dirname, 'web')));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // Main dashboard endpoint
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web', 'kyra-dashboard.html'));
    });

    // Dashboard endpoint
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, 'web', 'kyra-dashboard.html'));
    });

    // API routes remain the same as before
    this.app.post('/api/scrape', async (req, res) => {
      try {
        const { industry, city, country, radius = 10 } = req.body;
        
        if (!industry || !city || !country) {
          return res.status(400).json({
            error: 'Missing required fields: industry, city, country'
          });
        }
        
        const businesses = await scrapeBusinesses(industry, city, country, radius);
        
        // Create leads in the database
        const leadsData = businesses.map(business => ({
          name: business.name,
          phone: business.phone,
          address: business.address,
          website: business.website,
          industry: business.industry,
          city: business.city,
          country: business.country,
          status: 'new',
          outreach_status: 'pending'
        }));
        
        const leads = await db.createLeads(leadsData);
        
        // Emit event to all connected clients
        this.io.emit('new-leads', {
          count: businesses.length,
          businesses,
          leadsCreated: leads.length
        });
        
        res.json({
          success: true,
          count: businesses.length,
          businesses,
          leadsCreated: leads.length
        });
      } catch (error) {
        console.error('Scrape error:', error);
        res.status(500).json({
          error: 'Failed to scrape businesses',
          details: error.message
        });
      }
    });

    // Check website quality endpoint
    this.app.post('/api/check-website', async (req, res) => {
      try {
        const { urls } = req.body;
        
        if (!urls || !Array.isArray(urls)) {
          return res.status(400).json({
            error: 'Missing or invalid urls array'
          });
        }
        
        const results = await Promise.all(
          urls.map(url => checkWebsiteQuality(url))
        );
        
        // Update leads with quality scores
        for (const result of results) {
          // Find the lead by website URL and update its quality score
          const leads = await db.getLeads({ website: result.url });
          if (leads.length > 0) {
            await db.updateLead(leads[0].id, {
              website_quality_score: result.score,
              notes: `Website quality score: ${result.score}/100. Issues: ${result.issues.join(', ')}.`
            });
          }
        }
        
        // Emit event to all connected clients
        this.io.emit('website-quality-checked', {
          results
        });
        
        res.json({
          success: true,
          results
        });
      } catch (error) {
        console.error('Website check error:', error);
        res.status(500).json({
          error: 'Failed to check website quality',
          details: error.message
        });
      }
    });

    // Generate outreach message endpoint
    this.app.post('/api/generate-outreach', async (req, res) => {
      try {
        const { business, industry, messageTemplate } = req.body;
        
        if (!business || !industry) {
          return res.status(400).json({
            error: 'Missing required fields: business, industry'
          });
        }
        
        const message = await generateOutreachMessage(business, industry, messageTemplate);
        
        // Emit event to all connected clients
        this.io.emit('outreach-generated', {
          business: business.name,
          messagePreview: message.substring(0, 100) + '...'
        });
        
        res.json({
          success: true,
          message
        });
      } catch (error) {
        console.error('Outreach generation error:', error);
        res.status(500).json({
          error: 'Failed to generate outreach message',
          details: error.message
        });
      }
    });

    // Leads management endpoints
    this.app.get('/api/leads', async (req, res) => {
      try {
        const leads = await db.getLeads(req.query);
        res.json({
          success: true,
          leads
        });
      } catch (error) {
        console.error('Get leads error:', error);
        res.status(500).json({
          error: 'Failed to retrieve leads',
          details: error.message
        });
      }
    });

    this.app.post('/api/leads', async (req, res) => {
      try {
        const lead = await db.createLead(req.body);
        res.json({
          success: true,
          lead
        });
      } catch (error) {
        console.error('Create lead error:', error);
        res.status(500).json({
          error: 'Failed to create lead',
          details: error.message
        });
      }
    });

    this.app.put('/api/leads/:id', async (req, res) => {
      try {
        const lead = await db.updateLead(req.params.id, req.body);
        res.json({
          success: true,
          lead
        });
      } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({
          error: 'Failed to update lead',
          details: error.message
        });
      }
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Dashboard client connected:', socket.id);
      
      // Send initial system status
      socket.emit('system-status', {
        kyraOnline: true,
        systemHealthy: true,
        terminalActive: true,
        timestamp: new Date().toISOString()
      });
      
      // Handle chat messages
      socket.on('chat-message', async (data) => {
        try {
          // In a real implementation, this would process the message with Kyra
          // For now, we'll just echo back a simulated response
          const response = await this.processChatMessage(data.message, socket.id);
          
          // Broadcast the response to all connected clients
          this.io.emit('chat-response', {
            message: response,
            sender: 'kyra',
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Chat message processing error:', error);
          socket.emit('chat-error', { error: 'Failed to process message' });
        }
      });
      
      // Handle terminal commands
      socket.on('terminal-command', async (data) => {
        try {
          const result = await this.executeTerminalCommand(data.command, socket.id);
          
          // Send the result back to the requesting client
          socket.emit('terminal-response', {
            command: data.command,
            output: result,
            timestamp: new Date().toISOString()
          });
          
          // Broadcast to all other clients that a command was executed
          this.io.emit('terminal-activity', {
            command: data.command,
            executedBy: socket.id.substring(0, 6),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Terminal command error:', error);
          socket.emit('terminal-error', { error: error.message });
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Dashboard client disconnected:', socket.id);
      });
    });
  }

  async processChatMessage(message, userId) {
    // In a real implementation, this would call Kyra's API
    // For now, we'll simulate a response
    const responses = [
      `I've received your message: "${message}". Processing with Kyra AI...`,
      `Analyzing your request about "${message}". Connecting to automation tools...`,
      `Understood. I'll handle that for you using the Kyra automation platform.`,
      `Processing your request: ${message}. This may involve scraping, analysis, or outreach.`,
      `Thanks for your input. I'm working on your request about "${message}".`
    ];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async executeTerminalCommand(command, userId) {
    // Simulate command execution
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Define available commands
    const commands = {
      'status': () => {
        return `System Status: Operational
Kyra Core: Running
Ollama: Connected
Database: Supabase OK
Memory: ${(Math.random() * 10 + 1).toFixed(1)}GB available
CPU: ${(Math.random() * 30 + 10).toFixed(1)}% utilization
Active Connections: ${this.io.engine.clientsCount}`;
      },
      'tasks': () => {
        return `Active Tasks:
1. Data collection (Running) - 45% complete
2. Report generation (Pending) - Scheduled for 2pm
3. Backup process (Completed) - Last run: 2 hours ago
4. Lead processing (Running) - 12 new leads processed`;
      },
      'logs': () => {
        const logLines = [
          `[INFO] ${(new Date()).toLocaleTimeString()} - System initialized`,
          `[DEBUG] ${(new Date()).toLocaleTimeString()} - Ollama connection established`,
          `[INFO] ${(new Date()).toLocaleTimeString()} - Kyra ready for commands`,
          `[WARN] ${(new Date()).toLocaleTimeString()} - High memory usage detected`,
          `[INFO] ${(new Date()).toLocaleTimeString()} - New lead processed: Acme Inc.`,
          `[ERROR] ${(new Date()).toLocaleTimeString()} - Network timeout (recovered)`
        ];
        return logLines.join('\n');
      },
      'stats': () => {
        // Get stats from the database
        return `Statistics:
Total Leads: ${Math.floor(Math.random() * 100)}
New Today: ${Math.floor(Math.random() * 10)}
Conversions: ${Math.floor(Math.random() * 5)}
Success Rate: ${(Math.random() * 100).toFixed(1)}%`;
      },
      'help': () => {
        return `Available commands:
- status: System status
- tasks: Active tasks
- logs: Recent logs
- stats: Platform statistics
- help: Show this help
- clear: Clear terminal`;
      },
      'clear': () => {
        // This command is handled specially in the frontend
        return '';
      },
      'restart': () => {
        // Simulate restart process
        setTimeout(() => {
          this.io.emit('system-status', {
            kyraOnline: true,
            systemHealthy: true,
            terminalActive: true,
            restarted: true,
            timestamp: new Date().toISOString()
          });
        }, 2000);
        
        return 'Restarting Kyra services... This will take approximately 2 seconds.';
      }
    };
    
    // Check if command exists
    if (commands[command]) {
      return typeof commands[command] === 'function' ? commands[command]() : commands[command];
    }
    
    // If it's not a recognized command, return an error
    return `Command not found: ${command}. Type 'help' for available commands.`;
  }

  start(port = 3001) {
    this.server.listen(port, () => {
      console.log(`Global Business Lead Scanner Platform running on port ${port}`);
      console.log(`Dashboard available at http://localhost:${port}`);
      console.log(`API endpoints available at http://localhost:${port}/api/*`);
    });
  }
}

// Check if this module is run directly
import { pathToFileURL } from 'url';
const modulePath = pathToFileURL(import.meta.url).href;
const mainModulePath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';

if (mainModulePath === modulePath) {
  const scanner = new GlobalLeadScanner();
  const port = process.env.PORT || 3001;
  scanner.start(port);
}

export default GlobalLeadScanner;