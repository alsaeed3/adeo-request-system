// services/requestProcessor.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function processRequest(rawRequest) {
  try {
    // Generate analysis using OpenAI
    const analysis = await generateAnalysis(rawRequest);
    
    // Generate recommendations
    const recommendations = await generateRecommendations(rawRequest, analysis);

    return {
      ...rawRequest,
      analysis,
      recommendations,
      metadata: {
        processingVersion: '1.0',
        processingDate: new Date()
      }
    };
  } catch (error) {
    console.error('Error in request processing:', error);
    throw error;
  }
}

async function generateAnalysis(request) {
  const prompt = `
    Please analyze the following government request:
    
    Title: ${request.title}
    Department: ${request.department}
    Type: ${request.type}
    Content: ${request.content}
    
    Provide a comprehensive analysis including:
    1. Summary
    2. Key trends
    3. Impact assessment
    4. Policy alignment
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert policy analyst for the Abu Dhabi Executive Office."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  // Parse and structure the response
  const analysisText = response.choices[0].message.content;
  
  return {
    summary: extractSection(analysisText, "Summary"),
    trends: extractListItems(analysisText, "Key trends"),
    impactAssessment: extractSection(analysisText, "Impact assessment"),
    policyAlignment: extractSection(analysisText, "Policy alignment")
  };
}

async function generateRecommendations(request, analysis) {
  const prompt = `
    Based on the following analysis of a government request:
    
    ${JSON.stringify(analysis)}
    
    Please provide:
    1. Strategic recommendations
    2. Operational recommendations
    3. Implementation timeline
    4. Potential risks
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert policy advisor for the Abu Dhabi Executive Office."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const recommendationsText = response.choices[0].message.content;
  
  return {
    strategic: extractListItems(recommendationsText, "Strategic recommendations"),
    operational: extractListItems(recommendationsText, "Operational recommendations"),
    timeline: extractSection(recommendationsText, "Implementation timeline"),
    risks: extractListItems(recommendationsText, "Potential risks")
  };
}

// Helper functions to extract sections and list items from OpenAI response
function extractSection(text, sectionName) {
  const regex = new RegExp(`${sectionName}:?([^#]*?)(?=#|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractListItems(text, sectionName) {
  const section = extractSection(text, sectionName);
  if (!section) return [];
  
  return section
    .split('\n')
    .map(line => line.replace(/^[-*\d.]\s*/, '').trim())
    .filter(line => line.length > 0);
}
