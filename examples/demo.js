/**
 * Example script demonstrating how to use the Global Business Lead Scanner Platform
 */

import { scrapeBusinesses } from '../scraper/scrape-businesses.js';
import { checkWebsiteQuality } from '../utils/website-checker.js';
import { generateOutreachMessage } from '../utils/outreach-generator.js';
import { db } from '../config/database.js';

async function runDemo() {
  console.log('🚀 Starting Global Business Lead Scanner Demo...\n');
  
  try {
    // Step 1: Scrape businesses
    console.log('1. Scraping businesses...');
    const businesses = await scrapeBusinesses('restaurant', 'Cape Town', 'South Africa', 5);
    console.log(`   Found ${businesses.length} businesses\n`);
    
    if (businesses.length === 0) {
      console.log('   No businesses found. This might be due to:');
      console.log('   - Google Maps anti-bot measures');
      console.log('   - Network connectivity issues');
      console.log('   - Invalid search parameters\n');
      return;
    }
    
    // Step 2: Check website quality for businesses that have websites
    console.log('2. Checking website quality...');
    const businessesWithWebsites = businesses.filter(biz => biz.website && biz.website !== 'N/A');
    
    if (businessesWithWebsites.length > 0) {
      console.log(`   Checking ${businessesWithWebsites.length} businesses with websites...`);
      
      for (const business of businessesWithWebsites) {
        try {
          const qualityResult = await checkWebsiteQuality(business.website);
          console.log(`   ${business.name}: Score ${qualityResult.score}/100`);
          
          // Update the business object with quality score
          business.websiteQualityScore = qualityResult.score;
          
          // In a real scenario, you would update the lead in the database
          // await db.updateLead(business.id, { website_quality_score: qualityResult.score });
        } catch (error) {
          console.log(`   Error checking ${business.name}: ${error.message}`);
        }
      }
    } else {
      console.log('   No businesses with websites found to check');
    }
    console.log('');
    
    // Step 3: Generate outreach messages for a sample business
    console.log('3. Generating outreach messages...');
    const sampleBusiness = businesses[0]; // Use the first business as a sample
    
    if (sampleBusiness) {
      try {
        const outreachMessage = await generateOutreachMessage(
          sampleBusiness, 
          'restaurant',
          'Generate a friendly message about improving online presence'
        );
        
        console.log(`   Generated message for ${sampleBusiness.name}:`);
        console.log(`   "${outreachMessage.substring(0, 100)}..."\n`);
      } catch (error) {
        console.log(`   Error generating outreach message: ${error.message}\n`);
      }
    }
    
    // Step 4: Show how to save leads to the database
    console.log('4. Saving leads to database...');
    const leadsData = businesses.map(business => ({
      name: business.name,
      phone: business.phone,
      address: business.address,
      website: business.website,
      industry: 'restaurant',
      city: 'Cape Town',
      country: 'South Africa',
      website_quality_score: business.websiteQualityScore || 0,
      outreach_status: 'pending',
      status: 'new',
      notes: 'Added via demo script'
    }));
    
    try {
      const savedLeads = await db.createLeads(leadsData);
      console.log(`   Saved ${savedLeads.length} leads to database\n`);
    } catch (error) {
      console.log(`   Error saving leads: ${error.message}\n`);
    }
    
    // Step 5: Show recent leads
    console.log('5. Retrieving recent leads...');
    try {
      const recentLeads = await db.getLeads({ limit: 5 });
      console.log(`   Retrieved ${recentLeads.length} recent leads:`);
      
      for (const lead of recentLeads) {
        console.log(`   - ${lead.name} (${lead.city}, ${lead.country}) - Score: ${lead.website_quality_score}/100`);
      }
    } catch (error) {
      console.log(`   Error retrieving leads: ${error.message}`);
    }
    
    console.log('\n✅ Demo completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

export default runDemo;