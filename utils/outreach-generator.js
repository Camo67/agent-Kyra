import { generateOutreachPrompt } from './prompt-engineering.js';

/**
 * Generates personalized outreach messages using Kyra AI
 * @param {Object} business - Business object containing name, website, etc.
 * @param {string} industry - The industry of the business
 * @param {string} messageTemplate - Optional template to customize the message
 * @returns {string} Generated outreach message
 */
export async function generateOutreachMessage(business, industry, messageTemplate = null) {
  // Construct the prompt for Kyra
  const prompt = generateOutreachPrompt(business, industry, messageTemplate);
  
  try {
    // Call Kyra's API endpoint
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "qwen3:0.6b",
        messages: [
          { 
            role: "system", 
            content: `You are an expert business development consultant specializing in helping small and medium businesses improve their online presence. Generate professional, friendly, and personalized outreach messages that highlight the value of having a modern, mobile-friendly website. Focus on benefits like increased visibility, more customers, and improved credibility.` 
          },
          { 
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`Kyra API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Kyra API');
    }
    
    const message = data.choices[0].message.content.trim();
    return message;
  } catch (error) {
    console.error('Error generating outreach message:', error);
    throw new Error(`Failed to generate outreach message: ${error.message}`);
  }
}

/**
 * Generates follow-up messages for businesses that didn't respond
 * @param {Object} business - Business object containing name, website, etc.
 * @param {string} initialMessage - The initial message that was sent
 * @returns {string} Generated follow-up message
 */
export async function generateFollowUpMessage(business, initialMessage) {
  const prompt = `
    Generate a follow-up outreach message for ${business.name}.
    Initial message sent: "${initialMessage}"
    
    The business hasn't responded yet. Create a concise, friendly follow-up that:
    1. References the previous message
    2. Adds a sense of urgency or value
    3. Keeps the tone professional but more direct
    4. Focuses on the specific benefits for their business type
    
    Industry: ${business.industry || 'Unknown'}
    Location: ${business.city}, ${business.country}
    Website quality score: ${business.websiteQualityScore || 'Not assessed'}
    
    Keep the message under 150 words.
  `;
  
  try {
    const response = await fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "qwen3:0.6b",
        messages: [
          { 
            role: "system", 
            content: `You are an expert at crafting effective follow-up messages. Create concise, compelling follow-ups that increase response rates. Maintain professionalism while adding appropriate urgency or value proposition.` 
          },
          { 
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 300
      })
    });
    
    if (!response.ok) {
      throw new Error(`Kyra API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Kyra API');
    }
    
    const message = data.choices[0].message.content.trim();
    return message;
  } catch (error) {
    console.error('Error generating follow-up message:', error);
    throw new Error(`Failed to generate follow-up message: ${error.message}`);
  }
}

/**
 * Generates multiple variations of an outreach message
 * @param {Object} business - Business object containing name, website, etc.
 * @param {string} industry - The industry of the business
 * @param {number} count - Number of variations to generate (default 3)
 * @returns {Array<string>} Array of different outreach message variations
 */
export async function generateMessageVariations(business, industry, count = 3) {
  const variations = [];
  
  for (let i = 0; i < count; i++) {
    try {
      // Slightly vary the prompt for each iteration
      const variationPrompt = generateOutreachPrompt(business, industry) + 
        ` (Variation ${i+1}: Please adjust the tone to be slightly different from other variations while keeping the core message.)`;
      
      const response = await fetch('http://localhost:3000/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "qwen3:0.6b",
          messages: [
            { 
              role: "system", 
              content: `You are an expert business development consultant. Generate varied but equally effective outreach messages. Each should have a different approach while conveying the same core value proposition.` 
            },
            { 
              role: "user", 
              content: variationPrompt
            }
          ],
          temperature: 0.7 + (i * 0.1), // Slightly increase randomness with each variation
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`Kyra API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from Kyra API');
      }
      
      variations.push(data.choices[0].message.content.trim());
    } catch (error) {
      console.error(`Error generating variation ${i+1}:`, error);
      // Add a default message if generation fails
      variations.push(`Hi, I noticed ${business.name} doesn't have a website or has a basic one. Would you be interested in discussing how a professional website could help grow your business in ${business.city}?`);
    }
  }
  
  return variations;
}

export default generateOutreachMessage;