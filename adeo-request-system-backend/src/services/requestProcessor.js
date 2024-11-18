import OpenAI from 'openai';
import dotenv from 'dotenv';
import { AppError } from '../middleware/errorHandler.js';
import winston from 'winston';
import NodeCache from 'node-cache';
import { promisify } from 'util';
import rateLimit from 'express-rate-limit';
import { setTimeout } from 'timers/promises';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'request-processor' },
    transports: [
        new winston.transports.File({ filename: 'logs/processor-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/processor.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Initialize OpenAI with configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000, // 30 seconds timeout
    maxRetries: 3
});

// Initialize cache
const cache = new NodeCache({
    stdTTL: 3600, // 1 hour default TTL
    checkperiod: 120, // Check for expired entries every 2 minutes
    useClones: false
});

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const MAX_TOKENS = 1000;
const CACHE_TTL = 3600; // 1 hour
const AI_MODELS = {
    DEFAULT: 'gpt-3.5-turbo',
    FALLBACK: 'gpt-3.5-turbo-instruct'
};

// Rate limiting configuration
const rateLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    keyGenerator: () => 'global' // Use global rate limiting for AI requests
};

// Initialize rate limiter
const limiter = rateLimit(rateLimiter);
const checkRateLimit = promisify(limiter);

// Main processing function
export async function processRequest(rawRequest) {
    const startTime = Date.now();
    let currentRetry = 0;
    let error = null;

    try {
        // Check rate limit
        await checkRateLimit();

        // Generate cache key
        const cacheKey = generateCacheKey(rawRequest);
        const cachedResult = cache.get(cacheKey);
        
        if (cachedResult) {
            logger.info('Cache hit for request', {
                title: rawRequest.title,
                department: rawRequest.department
            });
            return cachedResult;
        }

        // Process request with retries
        while (currentRetry < MAX_RETRIES) {
            try {
                const analysis = await generateAnalysis(rawRequest);
                const recommendations = await generateRecommendations(rawRequest, analysis);

                const result = {
                    ...rawRequest,
                    analysis,
                    recommendations,
                    metadata: {
                        processingVersion: '2.0',
                        processingDate: new Date(),
                        processingDuration: Date.now() - startTime,
                        aiModelUsed: AI_MODELS.DEFAULT
                    }
                };

                // Cache successful result
                cache.set(cacheKey, result, CACHE_TTL);

                // Log success
                logger.info('Request processed successfully', {
                    title: rawRequest.title,
                    department: rawRequest.department,
                    processingTime: Date.now() - startTime
                });

                return result;

            } catch (err) {
                error = err;
                currentRetry++;
                
                if (currentRetry < MAX_RETRIES) {
                    logger.warn('Retrying request processing', {
                        attempt: currentRetry,
                        error: err.message
                    });
                    await setTimeout(RETRY_DELAY * currentRetry);
                }
            }
        }

        // If all retries failed, throw the last error
        throw error;

    } catch (error) {
        logger.error('Request processing failed', {
            error: error.message,
            title: rawRequest.title,
            department: rawRequest.department,
            retryAttempts: currentRetry
        });
        
        throw new AppError('Failed to process request: ' + error.message, 500);
    }
}

// Generate analysis using OpenAI
async function generateAnalysis(request) {
    const prompt = generateAnalysisPrompt(request);
    
    try {
        const response = await openai.chat.completions.create({
            model: AI_MODELS.DEFAULT,
            messages: [
                {
                    role: "system",
                    content: "You are an expert policy analyst specializing in government requests. Provide detailed, objective analysis focusing on practical implications and policy alignment."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: MAX_TOKENS,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        const analysisText = response.choices[0].message.content;
        return parseAnalysisResponse(analysisText);

    } catch (error) {
        logger.error('Analysis generation failed', {
            error: error.message,
            title: request.title
        });
        
        // Try fallback model if main model fails
        return generateAnalysisWithFallbackModel(request, error);
    }
}

// Generate recommendations using OpenAI
async function generateRecommendations(request, analysis) {
    const prompt = generateRecommendationsPrompt(request, analysis);
    
    try {
        const response = await openai.chat.completions.create({
            model: AI_MODELS.DEFAULT,
            messages: [
                {
                    role: "system",
                    content: "You are an expert policy advisor specializing in government requests. Provide practical, actionable recommendations with clear implementation steps."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: MAX_TOKENS,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        const recommendationsText = response.choices[0].message.content;
        return parseRecommendationsResponse(recommendationsText);

    } catch (error) {
        logger.error('Recommendations generation failed', {
            error: error.message,
            title: request.title
        });
        
        // Try fallback model if main model fails
        return generateRecommendationsWithFallbackModel(request, analysis, error);
    }
}

// Prompt generation functions
function generateAnalysisPrompt(request) {
    return `
        Please analyze the following government request:

        Title: ${request.title}
        Department: ${request.department}
        Type: ${request.type}
        Content: ${request.content}

        Provide a comprehensive analysis including:
        1. Executive Summary (2-3 sentences)
        2. Key Trends (3-5 bullet points)
        3. Impact Assessment
           - Social Impact
           - Economic Impact
           - Environmental Impact
        4. Policy Alignment Analysis
           - Alignment with current policies
           - Potential policy gaps
           - Regulatory considerations

        Format the response in a clear, structured manner.
    `.trim();
}

function generateRecommendationsPrompt(request, analysis) {
    return `
        Based on the following request and analysis:

        Request:
        ${JSON.stringify(request, null, 2)}

        Analysis:
        ${JSON.stringify(analysis, null, 2)}

        Please provide:
        1. Strategic Recommendations (3-5 points)
        2. Operational Recommendations (3-5 points)
        3. Implementation Timeline
        4. Potential Risks and Mitigation Strategies
        5. Resource Requirements
        6. Success Metrics

        Format each recommendation with:
        - Clear action items
        - Expected outcomes
        - Priority level
        - Resource implications
    `.trim();
}

// Response parsing functions
function parseAnalysisResponse(text) {
    const sections = extractSections(text);
    
    return {
        summary: sections.summary?.slice(0, 2000) || '',
        trends: extractListItems(text, 'Key Trends').map(trend => 
            trend.slice(0, 500)
        ),
        impactAssessment: sections.impactAssessment?.slice(0, 5000) || '',
        policyAlignment: sections.policyAlignment?.slice(0, 5000) || '',
        riskLevel: determineRiskLevel(text)
    };
}

function parseRecommendationsResponse(text) {
    const sections = extractSections(text);
    
    return {
        strategic: extractListItems(text, 'Strategic Recommendations').map(rec => 
            rec.slice(0, 1000)
        ),
        operational: extractListItems(text, 'Operational Recommendations').map(rec => 
            rec.slice(0, 1000)
        ),
        timeline: sections.timeline?.slice(0, 1000) || '',
        risks: extractListItems(text, 'Potential Risks').map(risk => 
            risk.slice(0, 500)
        ),
        budgetImplications: sections.budgetImplications?.slice(0, 1000) || ''
    };
}

// Utility functions
function generateCacheKey(request) {
    return `${request.title}-${request.department}-${request.type}`.toLowerCase().replace(/\s+/g, '-');
}

function extractSections(text) {
    const sections = {};
    const sectionRegex = /^([A-Za-z\s]+):\s*(.+?)(?=\n[A-Za-z\s]+:|$)/gms;
    
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
        const [, title, content] = match;
        sections[title.toLowerCase().replace(/\s+/g, '')] = content.trim();
    }
    
    return sections;
}

function extractListItems(text, sectionName) {
    const sectionRegex = new RegExp(`${sectionName}:([^#]*?)(?=#|$)`, 'i');
    const section = text.match(sectionRegex)?.[1] || '';
    
    return section
        .split('\n')
        .map(line => line.replace(/^[-*\d.]\s*/, '').trim())
        .filter(line => line.length > 0);
}

function determineRiskLevel(text) {
    const riskIndicators = {
        high: ['high risk', 'severe', 'critical', 'urgent', 'immediate attention'],
        medium: ['moderate', 'potential risk', 'consideration needed'],
        low: ['low risk', 'minimal', 'negligible']
    };

    const textLower = text.toLowerCase();
    
    for (const [level, indicators] of Object.entries(riskIndicators)) {
        if (indicators.some(indicator => textLower.includes(indicator))) {
            return level;
        }
    }
    
    return 'medium'; // Default risk level
}

// Fallback processing functions
async function generateAnalysisWithFallbackModel(request, originalError) {
    try {
        logger.warn('Using fallback model for analysis', {
            title: request.title,
            originalError: originalError.message
        });

        const response = await openai.completions.create({
            model: AI_MODELS.FALLBACK,
            prompt: generateAnalysisPrompt(request),
            max_tokens: MAX_TOKENS,
            temperature: 0.7
        });

        return parseAnalysisResponse(response.choices[0].text);

    } catch (error) {
        throw new AppError('Both primary and fallback analysis generation failed', 500);
    }
}

async function generateRecommendationsWithFallbackModel(request, analysis, originalError) {
    try {
        logger.warn('Using fallback model for recommendations', {
            title: request.title,
            originalError: originalError.message
        });

        const response = await openai.completions.create({
            model: AI_MODELS.FALLBACK,
            prompt: generateRecommendationsPrompt(request, analysis),
            max_tokens: MAX_TOKENS,
            temperature: 0.7
        });

        return parseRecommendationsResponse(response.choices[0].text);

    } catch (error) {
        throw new AppError('Both primary and fallback recommendations generation failed', 500);
    }
}

// Export utility functions for testing
export const utils = {
    generateAnalysisPrompt,
    generateRecommendationsPrompt,
    parseAnalysisResponse,
    parseRecommendationsResponse,
    extractSections,
    extractListItems,
    determineRiskLevel
};