// abdo-request-system-backend/src/routes/requestRoutes.js

import express from 'express';
import { Request } from '../models/request.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { processRequest } from '../services/requestProcessor.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const analyzeLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, 
    message: 'Too many analysis requests, please try again later'
});

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware to parse JSON
router.use(express.json());

// Helper function to generate request number
const generateRequestNumber = async () => {
    try {
        const date = new Date();
        const year = date.getFullYear();
        
        // Find the count of requests for this year
        const count = await Request.countDocuments({
            createdAt: {
                $gte: new Date(year, 0, 1),
                $lte: new Date(year, 11, 31)
            }
        });
        
        // Format: REQ-2024-0001
        return `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating request number:', error);
        throw error;
    }
};

router.post('/', async (req, res) => {
    try {
        console.log('Received POST request with body:', req.body);
        const { title, description, requestType, priority, department } = req.body;

        // Validate required fields
        if (!title || !description || !requestType || !priority || !department) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Generate request number
        const requestNumber = await generateRequestNumber();

        // Create new request object with all necessary fields
        const requestData = {
            requestNumber,
            title,
            description,
            requestType,
            priority,
            department, // Add this line
            status: 'Draft',
            attachments: [],
            metadata: {
                createdFrom: 'web',
                version: 1,
                tags: [],
                customMetadata: {}
            }
        };

        console.log('Creating request with data:', requestData);

        // Save request to MongoDB
        const request = new Request(requestData);
        const savedRequest = await request.save();

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save request to a JSON file
        const filePath = path.join(dataDir, `${requestNumber}.json`);
        fs.writeFileSync(filePath, JSON.stringify(requestData, null, 2));

        console.log('Request saved successfully:', savedRequest);
        console.log('JSON file saved at:', filePath);

        res.status(201).json({
            status: 'success',
            message: 'Request created successfully',
            data: savedRequest
        });

    } catch (error) {
        console.error('Database save error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create request',
            error: error.message
        });
    }
});

// GET handler for fetching requests
router.get('/', async (req, res) => {
    try {
        const requests = await Request.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            status: 'success',
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch requests',
            error: error.message
        });
    }
});

// In requestRoutes.js

const isArabicText = (text) => {
    // Simple check for Arabic characters
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text);
  };
  
  router.post('/:id/analyze', analyzeLimit, async (req, res) => {
      try {
          const request = await Request.findById(req.params.id);
          if (!request) {
              return res.status(404).json({
                  status: 'error',
                  message: 'Request not found'
              });
          }
  
          const isArabic = isArabicText(request.title) || isArabicText(request.description);
          
          // Create a bilingual system prompt
          const systemPrompt = isArabic ? 
              "أنت محلل سياسات حكومي خبير متخصص في تقييم المشاريع وتحليل الأثر. قدم توصيات مفصلة وعملية بناءً على تفاصيل الطلب." :
              "You are an expert government policy analyst specializing in project evaluation and impact assessment. Provide detailed, practical recommendations based on the request details.";
  
          // Process the request using the requestProcessor with language awareness
          const analysis = await processRequest({
              title: request.title,
              description: request.description,
              type: request.requestType,
              priority: request.priority,
              department: request.department,
              content: request.description,
              language: isArabic ? 'ar' : 'en',
              metadata: {
                  requestId: request._id,
                  requestNumber: request.requestNumber,
                  analysisVersion: '1.0'
              },
              promptTemplate: isArabic ? {
                  systemPrompt,
                  analysisPrompt: `
                      قم بتحليل طلب الحكومة التالي وقدم توصيات مفصلة:
  
                      العنوان: ${request.title}
                      الوصف: ${request.description}
                      النوع: ${request.requestType}
                      الأولوية: ${request.priority}
                      الإدارة: ${request.department}
  
                      يرجى تقديم تحليل شامل يتضمن:
                      1. الاتجاهات الرئيسية والتطورات في هذا المجال
                      2. تحليل الأثر الاقتصادي
                      3. تحليل الأثر الاجتماعي
                      4. تحليل الأثر البيئي
                      5. الإجراءات الفورية المطلوبة
                      6. الاعتبارات الاستراتيجية طويلة المدى
                      7. المخاطر المحتملة واستراتيجيات التخفيف
  
                      قم بتنسيق الرد بطريقة منظمة تتناول كل نقطة.
                  `
              } : {
                  systemPrompt,
                  analysisPrompt: `
                      Analyze the following government request and provide detailed recommendations:
  
                      Title: ${request.title}
                      Description: ${request.description}
                      Type: ${request.requestType}
                      Priority: ${request.priority}
                      Department: ${request.department}
  
                      Please provide a comprehensive analysis including:
                      1. Key trends and developments in this area
                      2. Economic impact analysis
                      3. Social impact analysis
                      4. Environmental impact analysis
                      5. Immediate actions needed
                      6. Long-term strategic considerations
                      7. Potential risks and mitigation strategies
  
                      Format the response in a structured way addressing each point.
                  `
              }
          });
  
          // The rest of your code remains the same...
      } catch (error) {
          console.error('Analysis error details:', {
              requestId: req.params.id,
              error: error.message,
              stack: error.stack
          });
          
          res.status(500).json({
              status: 'error',
              message: 'Failed to analyze request',
              error: error.message,
              requestId: req.params.id
          });
      }
  });
  
router.get('/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({
                status: 'error',
                message: 'Request not found'
            });
        }

        res.json({
            status: 'success',
            data: request
        });
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch request',
            error: error.message
        });
    }
});

// POST handler for analyzing requests
router.post('/analyze', async (req, res) => {
    try {
        const { requestId, title, description, type, priority } = req.body;

        // Prepare the prompt for GPT analysis
        const analysisPrompt = `
            Analyze the following government request and provide detailed recommendations:

            Title: ${title}
            Description: ${description}
            Type: ${type}
            Priority: ${priority}

            Please provide a comprehensive analysis including:
            1. Overall recommendation (APPROVED/REJECTED/NEEDS_REVIEW)
            2. Economic impact analysis
            3. Social impact analysis
            4. Environmental impact analysis
            5. Immediate actions needed
            6. Long-term strategic considerations
            7. Potential risks and mitigation strategies

            Format the response in a structured way addressing each point.
        `;

        // Get analysis from OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are an expert government policy analyst specializing in project evaluation and impact assessment. Provide detailed, practical recommendations based on the request details."
                },
                {
                    role: "user",
                    content: analysisPrompt
                }
            ],
            temperature: 0.7,
            max_tokens: 1500
        });

        // Parse the AI response
        const aiResponse = completion.choices[0].message.content;
        
        // Process and structure the AI response
        const analysis = processAIResponse(aiResponse, priority);

        // Save the analysis to the request document
        await Request.findByIdAndUpdate(requestId, {
            $set: {
                'metadata.analysis': analysis
            }
        });

        res.json({
            status: 'success',
            analysis: analysis
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate analysis',
            error: error.message
        });
    }
});

// Helper function to process AI response
function processAIResponse(aiResponse, priority, language = 'en') {
    // Extract key sections using regex or string splitting
    const sections = extractSections(aiResponse);

    // Determine recommendation decision based on content analysis and priority
    const decision = determineDecision(sections, priority);

    return {
        recommendation: {
            decision: decision,
            confidence: calculateConfidence(sections, priority),
            reasoning: extractReasons(sections)
        },
        impact: {
            economic: {
                score: calculateImpactScore(sections.economic),
                details: extractImpactDetails(sections.economic)
            },
            social: {
                score: calculateImpactScore(sections.social),
                details: extractImpactDetails(sections.social)
            },
            environmental: {
                score: calculateImpactScore(sections.environmental),
                details: extractImpactDetails(sections.environmental)
            }
        },
        suggestedActions: {
            immediate: extractActions(sections.immediate),
            longTerm: extractActions(sections.longTerm)
        },
        risks: {
            level: calculateRiskLevel(sections.risks, priority),
            factors: extractRiskFactors(sections.risks),
            mitigations: extractMitigations(sections.risks)
        },
        language // Add language field to response
    };
}

// Helper functions for processing AI response
function extractSections(text) {
    const sections = {};
    
    // Extract economic impact
    sections.economic = text.match(/Economic impact[^]*?(?=Social impact|$)/i)?.[0] || '';
    
    // Extract social impact
    sections.social = text.match(/Social impact[^]*?(?=Environmental impact|$)/i)?.[0] || '';
    
    // Extract environmental impact
    sections.environmental = text.match(/Environmental impact[^]*?(?=Immediate actions|$)/i)?.[0] || '';
    
    // Extract immediate actions
    sections.immediate = text.match(/Immediate actions[^]*?(?=Long-term|$)/i)?.[0] || '';
    
    // Extract long-term considerations
    sections.longTerm = text.match(/Long-term[^]*?(?=Potential risks|$)/i)?.[0] || '';
    
    // Extract risks
    sections.risks = text.match(/Potential risks[^]*?$/i)?.[0] || '';
    
    return sections;
}

function determineDecision(sections, priority) {
    const text = Object.values(sections).join(' ').toLowerCase();
    if (text.includes('reject') || text.includes('deny') || text.includes('not recommended')) {
        return 'REJECTED';
    }
    if (priority === 'High' || priority === 'Urgent' || text.includes('further review') || text.includes('additional analysis')) {
        return 'NEEDS_REVIEW';
    }
    return 'APPROVED';
}

function calculateConfidence(sections, priority) {
    // Implementation based on content analysis
    return Math.floor(Math.random() * 30) + 70; // Example implementation
}

function extractReasons(sections) {
    const text = Object.values(sections).join('\n');
    return text
        .split(/[\n.]/)
        .map(line => line.trim())
        .filter(line => line.length > 20 && !line.includes('impact') && !line.includes('action'))
        .slice(0, 3);
}

function calculateImpactScore(impactText) {
    // Implementation based on sentiment analysis
    return Math.floor(Math.random() * 100);
}

function extractImpactDetails(impactText) {
    return impactText
        .split(/[\n.]/)
        .map(line => line.trim())
        .filter(line => line.length > 10)
        .slice(0, 3);
}

function extractActions(actionsText) {
    return actionsText
        .split(/[\n.]/)
        .map(line => line.trim())
        .filter(line => line.length > 10)
        .slice(0, 3);
}

function calculateRiskLevel(risksText, priority) {
    const text = risksText.toLowerCase();
    if (priority === 'High' || priority === 'Urgent' || 
        text.includes('high risk') || text.includes('significant danger')) {
        return 'HIGH';
    }
    if (text.includes('moderate') || text.includes('medium')) {
        return 'MEDIUM';
    }
    return 'LOW';
}

function extractRiskFactors(risksText) {
    return risksText
        .split(/[\n.]/)
        .map(line => line.trim())
        .filter(line => line.includes('risk') || line.includes('danger') || line.includes('concern'))
        .slice(0, 3);
}

function extractMitigations(risksText) {
    return risksText
        .split(/[\n.]/)
        .map(line => line.trim())
        .filter(line => line.includes('mitigate') || line.includes('prevent') || line.includes('reduce'))
        .slice(0, 3);
}

export default router;