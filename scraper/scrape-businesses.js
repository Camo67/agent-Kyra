import { chromium } from 'playwright';
import axios from 'axios';

/**
 * Scrapes Google Maps for businesses in a specific industry, city, and country
 * @param {string} industry - The industry to search for (e.g., "plumber", "restaurant")
 * @param {string} city - The city to search in
 * @param {string} country - The country to search in
 * @param {number} radius - Search radius in kilometers (default 10)
 * @returns {Array} Array of business objects with name, phone, address, and website
 */
export async function scrapeBusinesses(industry, city, country, radius = 10) {
  console.log(`Scraping businesses: ${industry} in ${city}, ${country}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Format the search query
    const searchQuery = `${industry} ${city} ${country}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.google.com/maps/search/?q=${encodedQuery}`;
    
    console.log(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for results to load
    await page.waitForSelector('[data-result-index]', { timeout: 10000 });
    
    // Scroll to load more results
    await autoScroll(page);
    
    // Extract business data
    const businesses = await page.evaluate(() => {
      const results = [];
      const businessElements = document.querySelectorAll('[data-result-index]');
      
      for (const element of businessElements) {
        try {
          // Get business name
          const nameElement = element.querySelector('.fontHeadlineSmall, [data-value], h3, .qBF1Pd, .NrDZNb');
          const name = nameElement ? nameElement.textContent.trim() : 'N/A';
          
          // Get rating and review count
          const ratingElement = element.querySelector('.MW4etd, .ZkPfBf, .AZGoo');
          const rating = ratingElement ? ratingElement.textContent.trim() : 'N/A';
          
          // Click to expand details for this business
          element.click();
          
          // Wait briefly for details to load
          new Promise(resolve => setTimeout(resolve, 1000));
          
          // Extract details from sidebar
          const detailsContainer = document.querySelector('[role="main"]');
          
          // Phone number
          let phone = 'N/A';
          const phoneSelectors = [
            '[data-tooltip="Copy phone number"]',
            'button[data-item-id="phone"]',
            '.rogA2c .Io6YTe.fontBodyMedium',
            '.ZDve9b'
          ];
          
          for (const selector of phoneSelectors) {
            const phoneEl = detailsContainer?.querySelector(selector);
            if (phoneEl) {
              phone = phoneEl.textContent.trim();
              break;
            }
          }
          
          // Address
          let address = 'N/A';
          const addressSelectors = [
            '[data-tooltip="Copy address"]',
            'button[data-item-id="address"]',
            '.rogA2c .Io6YTe.fontBodyMedium',
            '.rogA2c .fontBodyMedium'
          ];
          
          for (const selector of addressSelectors) {
            const addrEl = detailsContainer?.querySelector(selector);
            if (addrEl) {
              address = addrEl.textContent.trim();
              break;
            }
          }
          
          // Website
          let website = 'N/A';
          const websiteSelectors = [
            '[data-tooltip="Copy website"]',
            'a[data-item-id="authority"]',
            'button[data-item-id="website"]',
            'a[data-tooltip="Open website"]'
          ];
          
          for (const selector of websiteSelectors) {
            const websiteEl = detailsContainer?.querySelector(selector);
            if (websiteEl) {
              website = websiteEl.href || websiteEl.textContent.trim();
              break;
            }
          }
          
          // Close the details panel to move to next
          const closeBtn = document.querySelector('.pz7nf .g8cCsb, .ozvZbf, .Umvnqc');
          if (closeBtn) closeBtn.click();
          
          results.push({
            name,
            phone,
            address,
            website,
            rating,
            industry,
            city,
            country,
            scrapedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error extracting business data:', error.message);
          continue;
        }
      }
      
      return results;
    });
    
    console.log(`Found ${businesses.length} businesses`);
    return businesses;
  } catch (error) {
    console.error('Error during scraping:', error);
    throw new Error(`Failed to scrape businesses: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Scrolls the page automatically to load more results
 * @param {Object} page - Playwright page object
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Validates if a website exists and is accessible
 * @param {string} url - The URL to check
 * @returns {boolean} Whether the website is accessible
 */
export async function validateWebsite(url) {
  if (!url || url === 'N/A') {
    return false;
  }
  
  try {
    // Normalize the URL if needed
    let normalizedUrl = url;
    if (!url.startsWith('http')) {
      normalizedUrl = url.startsWith('//') ? `https:${url}` : `https://${url}`;
    }
    
    const response = await axios.get(normalizedUrl, { 
      timeout: 10000,
      validateStatus: (status) => status < 500
    });
    
    return response.status < 400;
  } catch (error) {
    console.log(`Website validation failed for ${url}: ${error.message}`);
    return false;
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const businesses = await scrapeBusinesses('restaurant', 'Cape Town', 'South Africa');
      console.log(`Scraped ${businesses.length} businesses:`);
      businesses.forEach(biz => {
        console.log(`- ${biz.name}: ${biz.website || 'No website'}`);
      });
    } catch (error) {
      console.error('Error running scraper:', error);
    }
  })();
}

export default scrapeBusinesses;