import express from 'express';
import { Request } from '../models/request.js';

const router = express.Router();

// Helper function to generate request number
const generateRequestNumber = async () => {
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
};

// POST handler for new requests
router.post('/', async (req, res) => {
    try {
        console.log('Received request data:', {
            title: req.body.title,
            description: req.body.description,
            requestType: req.body.requestType,
            priority: req.body.priority,
            files: req.files?.length || 0
        });

        if (!req.body.title || !req.body.description || !req.body.requestType || !req.body.priority) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Generate request number
        const requestNumber = await generateRequestNumber();

        // Create new request object
        const requestData = {
            title: req.body.title,
            description: req.body.description,
            requestType: req.body.requestType,
            priority: req.body.priority,
            status: 'Draft',
            
            // Add required fields
            requestNumber: requestNumber,
            requester: '6579f1234567890abcdef123', // Temporary hardcoded user ID for testing
            
            // Add attachments if files were uploaded
            attachments: req.files ? req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                path: file.path,
                metadata: new Map(),
                tags: []
            })) : [],

            // Metadata
            metadata: {
                createdFrom: 'web',
                version: 1,
                tags: [],
                customMetadata: new Map()
            }
        };

        console.log('Creating new request with data:', requestData);

        const request = new Request(requestData);
        const savedRequest = await request.save();
        console.log('Request saved to database:', {
            id: savedRequest._id,
            requestNumber: savedRequest.requestNumber,
            title: savedRequest.title
        });

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

        console.log('Retrieved requests:', requests.length);
        
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

// GET single request by ID
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

export default router;