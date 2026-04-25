import axios from 'axios';
import { chromium } from 'playwright';

/**
 * Checks the quality of a website and generates a score
 * @param {string} url - The URL to check
 * @returns {Object} Website quality assessment
 */
export async function checkWebsiteQuality(url) {
  if (!url || url === 'N/A') {
    return {
      url: 'N/A',
      accessible: false,
      score: 0,
      issues: ['No website provided'],
      recommendations: ['This business needs a website']
    };
  }
  
  // Normalize URL if needed
  let normalizedUrl = url;
  if (!url.startsWith('http')) {
    normalizedUrl = url.startsWith('//') ? `https:${url}` : `https://${url}`;
  }
  
  try {
    // Check if site is accessible
    let accessible = false;
    let loadTime = 0;
    let content = '';
    let headers = {};
    
    try {
      const startTime = Date.now();
      const response = await axios.get(normalizedUrl, { 
        timeout: 15000,
        validateStatus: (status) => status < 500
      });
      loadTime = Date.now() - startTime;
      content = response.data;
      headers = response.headers;
      accessible = response.status < 400;
    } catch (error) {
      console.log(`Site inaccessible: ${normalizedUrl} - ${error.message}`);
    }
    
    if (!accessible) {
      return {
        url: normalizedUrl,
        accessible: false,
        score: 0,
        loadTime: 0,
        issues: ['Site is not accessible'],
        recommendations: ['Contact business to inform about website issues']
      };
    }
    
    // Use Playwright to check mobile responsiveness and other metrics
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto(normalizedUrl, { waitUntil: 'networkidle', timeout: 30000 });
    const pageLoadTime = Date.now() - startTime;
    
    // Evaluate mobile friendliness
    const mobileMetrics = await page.evaluate(() => {
      return {
        hasViewportTag: !!document.querySelector('meta[name="viewport"]'),
        hasResponsiveImages: document.querySelectorAll('img[loading="lazy"], img[srcset]').length > 0,
        fontSize: window.getComputedStyle(document.body).fontSize,
        hasTouchTargets: Array.from(document.querySelectorAll('a, button')).some(el => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        })
      };
    });
    
    // Calculate quality score
    let score = 50; // Base score
    const issues = [];
    const recommendations = [];
    
    // Check for common issues
    if (!mobileMetrics.hasViewportTag) {
      issues.push('No viewport meta tag for mobile optimization');
      recommendations.push('Add viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1">');
      score -= 15;
    }
    
    if (!mobileMetrics.hasResponsiveImages) {
      issues.push('No responsive images detected');
      recommendations.push('Implement responsive images with srcset attribute');
      score -= 10;
    }
    
    if (!mobileMetrics.hasTouchTargets) {
      issues.push('Touch targets too small for mobile users');
      recommendations.push('Ensure buttons and links are at least 44x44 pixels');
      score -= 10;
    }
    
    // Check for contact information
    const hasContact = content.toLowerCase().includes('contact') || 
                      content.toLowerCase().includes('email') || 
                      content.toLowerCase().includes('phone') ||
                      content.toLowerCase().includes('address');
    
    if (!hasContact) {
      issues.push('No clear contact information found');
      recommendations.push('Add clear contact information to the website');
      score -= 15;
    }
    
    // Check for basic SEO elements
    const pageTitle = await page.evaluate(() => document.title);
    const hasDescription = await page.evaluate(() => !!document.querySelector('meta[name="description"]'));
    const hasH1 = await page.evaluate(() => !!document.querySelector('h1'));
    
    if (!pageTitle || pageTitle.length < 5) {
      issues.push('Missing or inadequate page title');
      recommendations.push('Add descriptive page title under 60 characters');
      score -= 10;
    }
    
    if (!hasDescription) {
      issues.push('Missing meta description');
      recommendations.push('Add meta description under 160 characters');
      score -= 10;
    }
    
    if (!hasH1) {
      issues.push('Missing H1 heading');
      recommendations.push('Add H1 heading that describes the page content');
      score -= 5;
    }
    
    // Check loading time
    if (loadTime > 5000) {
      issues.push(`Slow loading time: ${loadTime}ms`);
      recommendations.push('Optimize images, minify CSS/JS, and improve hosting for faster loading');
      score -= Math.min(20, Math.floor((loadTime - 5000) / 1000) * 2); // Deduct 2 points per second over 5s
    }
    
    // Check for SSL certificate
    const isSecure = normalizedUrl.startsWith('https://');
    if (!isSecure) {
      issues.push('Site is not served over HTTPS');
      recommendations.push('Implement HTTPS with SSL certificate');
      score -= 15;
    }
    
    // Adjust score based on positive factors
    if (mobileMetrics.hasViewportTag && mobileMetrics.hasResponsiveImages) {
      score += 5; // Bonus for responsive design
    }
    
    if (hasContact) {
      score += 5; // Bonus for having contact info
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    
    await browser.close();
    
    return {
      url: normalizedUrl,
      accessible,
      loadTime: pageLoadTime,
      score: Math.round(score),
      issues,
      recommendations,
      mobileMetrics,
      hasContact,
      isSecure
    };
  } catch (error) {
    console.error(`Error checking website quality for ${normalizedUrl}:`, error);
    
    return {
      url: normalizedUrl,
      accessible: false,
      score: 0,
      issues: [`Error checking site: ${error.message}`],
      recommendations: ['Unable to assess this site due to technical issues']
    };
  }
}

/**
 * Batch check multiple websites
 * @param {Array<string>} urls - Array of URLs to check
 * @returns {Array<Object>} Array of quality assessments
 */
export async function checkMultipleWebsites(urls) {
  const results = [];
  
  for (const url of urls) {
    const result = await checkWebsiteQuality(url);
    results.push(result);
  }
  
  return results;
}

export default checkWebsiteQuality;