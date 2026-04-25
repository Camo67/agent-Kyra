import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { scrapeBusinesses } from './scraper/scrape-businesses.js';
import { checkWebsiteQuality } from './utils/website-checker.js';
import { generateOutreachMessage } from './utils/outreach-generator.js';
import { db } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Global Business Lead Scanner Platform',
    version: '1.0.0',
    endpoints: {
      scrape: '/api/scrape',
      qualityCheck: '/api/check-website',
      outreach: '/api/generate-outreach',
      leads: '/api/leads'
    }
  });
});

// Scrape businesses endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { industry, city, country, radius = 10 } = req.body;
    
    if (!industry || !city || !country) {
      return res.status(400).json({
        error: 'Missing required fields: industry, city, country'
      });
    }
    
    const businesses = await scrapeBusinesses(industry, city, country, radius);
    
    res.json({
      success: true,
      count: businesses.length,
      businesses
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
app.post('/api/check-website', async (req, res) => {
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
app.post('/api/generate-outreach', async (req, res) => {
  try {
    const { business, industry, messageTemplate } = req.body;
    
    if (!business || !industry) {
      return res.status(400).json({
        error: 'Missing required fields: business, industry'
      });
    }
    
    const message = await generateOutreachMessage(business, industry, messageTemplate);
    
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
app.get('/api/leads', async (req, res) => {
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

app.post('/api/leads', async (req, res) => {
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

app.put('/api/leads/:id', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Global Business Lead Scanner Platform running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}`);
});

export default app;