/**
 * Generates an outreach prompt for Kyra AI
 * @param {Object} business - Business object containing name, website, etc.
 * @param {string} industry - The industry of the business
 * @param {string} messageTemplate - Optional template to customize the message
 * @returns {string} Formatted prompt for Kyra
 */
export function generateOutreachPrompt(business, industry, messageTemplate = null) {
  // Default template if none provided
  const template = messageTemplate || `
    Generate a personalized outreach message for {businessName} in {industry} located in {city}, {country}.
    
    Business details:
    - Name: {businessName}
    - Industry: {industry}
    - City: {city}
    - Country: {country}
    - Website: {website}
    - Website quality score: {websiteQualityScore}
    - Phone: {phone}
    
    The message should:
    1. Be friendly and professional
    2. Reference their specific business/location
    3. Highlight benefits of having a modern, mobile-friendly website
    4. Mention increased visibility and more customers
    5. Be concise (under 200 words)
    6. Include a soft call-to-action for a free consultation
  `;
  
  // Replace placeholders with actual values
  let prompt = template
    .replace(/{businessName}/g, business.name || 'the business')
    .replace(/{industry}/g, industry)
    .replace(/{city}/g, business.city || 'their city')
    .replace(/{country}/g, business.country || 'their location')
    .replace(/{website}/g, business.website || 'no website')
    .replace(/{websiteQualityScore}/g, business.websiteQualityScore || 'not assessed')
    .replace(/{phone}/g, business.phone || 'not available');
  
  return prompt;
}

/**
 * Generates a template for follow-up messages
 * @param {Object} business - Business object containing name, website, etc.
 * @param {string} previousMessage - The message that was previously sent
 * @returns {string} Formatted prompt for a follow-up message
 */
export function generateFollowUpPrompt(business, previousMessage) {
  const template = `
    Generate a follow-up outreach message for {businessName}.
    
    Previous message sent:
    "{previousMessage}"
    
    The business hasn't responded. Create a follow-up that:
    1. References the previous message
    2. Adds slight urgency or value
    3. Maintains professionalism
    4. Is under 150 words
    
    Business details:
    - Name: {businessName}
    - Industry: {industry}
    - Location: {city}, {country}
    - Website quality: {websiteQuality}
    
    Tone: Professional but more direct than the initial message.
  `;
  
  let prompt = template
    .replace(/{businessName}/g, business.name || 'the business')
    .replace(/{previousMessage}/g, previousMessage)
    .replace(/{industry}/g, business.industry || 'Unknown')
    .replace(/{city}/g, business.city || 'their city')
    .replace(/{country}/g, business.country || 'their location')
    .replace(/{websiteQuality}/g, business.websiteQualityScore ? 
             `scored ${business.websiteQualityScore}/100` : 
             'not assessed');
  
  return prompt;
}

/**
 * Generates a template for value proposition messages
 * @param {Object} business - Business object containing name, website, etc.
 * @returns {string} Formatted prompt for a value proposition message
 */
export function generateValuePropositionPrompt(business) {
  const template = `
    Generate a value proposition message for {businessName} in {industry}.
    
    Business details:
    - Name: {businessName}
    - Industry: {industry}
    - Location: {city}, {country}
    - Current web presence: {webPresence}
    
    Create a message that highlights:
    1. Specific benefits for their industry
    2. Local market advantages
    3. Competitive advantages of a professional website
    4. ROI examples relevant to their business type
    5. A clear, compelling reason to act now
    
    Keep the message under 180 words.
  `;
  
  let prompt = template
    .replace(/{businessName}/g, business.name || 'the business')
    .replace(/{industry}/g, business.industry || 'Unknown')
    .replace(/{city}/g, business.city || 'their city')
    .replace(/{country}/g, business.country || 'their location')
    .replace(/{webPresence}/g, business.website && business.website !== 'N/A' ?
             `currently has a ${business.hasWebsite ? 'basic' : 'non-existent'} website` :
             'does not have a website');
  
  return prompt;
}

/**
 * Generates templates for different types of outreach messages
 * @param {string} messageType - Type of message ('cold', 'warm', 'hot', 'followup')
 * @param {Object} business - Business object
 * @returns {string} Appropriate template for the message type
 */
export function generateMessageTypePrompt(messageType, business) {
  const templates = {
    cold: `
      Generate a cold outreach message for {businessName}.
      
      Business details:
      - Name: {businessName}
      - Industry: {industry}
      - Location: {city}, {country}
      - Website: {website}
      
      The message should be:
      1. Friendly and non-intrusive
      2. Focused on value rather than sales
      3. Under 150 words
      4. Include a soft introduction about who you are
      5. Gentle call-to-action for more information
    `,
    
    warm: `
      Generate a warm outreach message for {businessName}.
      
      Business details:
      - Name: {businessName}
      - Industry: {industry}
      - Location: {city}, {country}
      - Previous interaction: Shown interest in web services
      
      The message should be:
      1. More direct than cold outreach
      2. Reference their previous interest
      3. Offer specific value proposition
      4. Clear call-to-action
      5. Under 120 words
    `,
    
    hot: `
      Generate a hot outreach message for {businessName}.
      
      Business details:
      - Name: {businessName}
      - Industry: {industry}
      - Location: {city}, {country}
      - Status: Actively seeking web services
      
      The message should be:
      1. Very direct and to the point
      2. Focus on immediate benefits
      3. Strong call-to-action
      4. Offer time-sensitive value
      5. Under 100 words
    `,
    
    followup: `
      Generate a follow-up message for {businessName}.
      
      Business details:
      - Name: {businessName}
      - Industry: {industry}
      - Location: {city}, {country}
      - Previous contact: Made contact but no response
      
      The message should be:
      1. Reference the previous communication
      2. Add a sense of urgency or scarcity
      3. Reiterate the main value proposition
      4. Strong but respectful call-to-action
      5. Under 120 words
    `
  };
  
  const template = templates[messageType] || templates.cold;
  
  let prompt = template
    .replace(/{businessName}/g, business.name || 'the business')
    .replace(/{industry}/g, business.industry || 'Unknown')
    .replace(/{city}/g, business.city || 'their city')
    .replace(/{country}/g, business.country || 'their location')
    .replace(/{website}/g, business.website || 'no website');
  
  return prompt;
}

export default generateOutreachPrompt;