// services/requestProcessor.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to process the incoming request
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
        processingVersion: '1.1',
        processingDate: new Date(),
        aiModelUsed: "gpt-3.5-turbo"
      }
    };
  } catch (error) {
    console.error('Error in request processing:', error);
    throw error;
  }
}

// Helper function to generate analysis
async function generateAnalysis(request) {
  const prompt = `
    Please analyze the following government request:

    Title: ${request.title}
    Department: ${request.department}
    Type: ${request.type}
    Content: ${request.content}

    Provide a structured analysis including:
    - Summary
    - Key trends
    - Impact assessment (as a single concise paragraph)
    - Policy alignment (as a single concise paragraph)
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert policy analyst specializing in government requests."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const analysisText = response.choices[0].message.content;

  // Process and truncate sections as needed
  const trends = extractListItems(analysisText, 'Key trends').map(trend => 
    trend.length > 500 ? trend.slice(0, 497) + '...' : trend
  );

  return {
    summary: extractSection(analysisText, 'Summary'),
    trends,
    impactAssessment: extractSingleLineSection(analysisText, 'Impact assessment'),
    policyAlignment: extractSingleLineSection(analysisText, 'Policy alignment')
  };
}

// Helper function to generate recommendations
async function generateRecommendations(request, analysis) {
  const prompt = `
    Based on the following analysis of a government request:

    ${JSON.stringify(analysis)}

    Please provide:
    - Strategic recommendations
    - Operational recommendations
    - Implementation timeline (as a concise paragraph)
    - Potential risks
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert policy advisor specializing in government requests."
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
    strategic: extractListItems(recommendationsText, 'Strategic recommendations').map(rec => 
      rec.length > 1000 ? rec.slice(0, 997) + '...' : rec
    ),
    operational: extractListItems(recommendationsText, 'Operational recommendations').map(rec => 
      rec.length > 1000 ? rec.slice(0, 997) + '...' : rec
    ),
    timeline: extractSingleLineSection(recommendationsText, 'Implementation timeline').slice(0, 1000),
    risks: extractListItems(recommendationsText, 'Potential risks').map(risk => 
      risk.length > 500 ? risk.slice(0, 497) + '...' : risk
    )
  };
}

// Helper functions for extracting sections from OpenAI response
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

function extractSingleLineSection(text, sectionName) {
  const section = extractSection(text, sectionName);
  return section.split('\n')[0].trim(); // Return the first line only
}
