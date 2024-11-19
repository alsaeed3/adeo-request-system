import express from 'express';
import { Request } from '../models/request.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = express.Router();

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

// POST handler for new requests
router.post('/', async (req, res) => {
    try {
        console.log('Received POST request with body:', req.body);
        const { title, description, requestType, priority } = req.body;

        // Validate required fields
        if (!title || !description || !requestType || !priority) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Generate request number
        const requestNumber = await generateRequestNumber();

        // Create new request object with only the necessary fields
        const requestData = {
            requestNumber,
            title,
            description,
            requestType,
            priority,
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

export default router;