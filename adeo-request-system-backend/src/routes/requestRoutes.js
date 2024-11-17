// routes/requestRoutes.js
import express from 'express';
import { Request } from '../models/request.js';
import { processRequest } from '../services/requestProcessor.js';
import { checkForDuplicates } from '../utils/similarity.js';

const router = express.Router();

// Utility function to validate incoming data
function validateRequestData(data) {
    if (!data.title || data.title.trim().length === 0) {
        throw new Error('Title is required');
    }
    if (!data.department || data.department.trim().length === 0) {
        throw new Error('Department is required');
    }
    if (!data.type || data.type.trim().length === 0) {
        throw new Error('Type is required');
    }
    if (!data.content || data.content.trim().length < 50) {
        throw new Error('Content must be at least 50 characters long');
    }
}

// POST - Create new request
router.post('/', async (req, res) => {
    try {
        const { title, department, type, content } = req.body;

        // Validate incoming data
        validateRequestData({ title, department, type, content });

        // Handle uploaded files
        const files = req.files ? req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype
        })) : [];

        // Check for duplicates
        const duplicateCheck = await checkForDuplicates(title, department, content);
        if (duplicateCheck.isDuplicate) {
            return res.json({
                isDuplicate: true,
                originalRequest: duplicateCheck.originalRequest,
                similarity: duplicateCheck.similarity
            });
        }

        // Process the request
        const processedRequest = await processRequest({
            title,
            department,
            type,
            content,
            files
        });

        // Ensure analysis fields are flattened to strings
        if (processedRequest.analysis) {
            processedRequest.analysis.impactAssessment = processedRequest.analysis.impactAssessment?.replace(/\n/g, ' ');
            processedRequest.analysis.policyAlignment = processedRequest.analysis.policyAlignment?.replace(/\n/g, ' ');
        }

        // Save to database
        const newRequest = new Request({
            ...processedRequest,
            status: 'processed',
            submissionDate: new Date()
        });

        await newRequest.save();

        res.status(201).json({
            message: 'Request processed successfully',
            request: newRequest
        });

    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(400).json({
            error: 'Request validation failed',
            details: error.message
        });
    }
});

// GET - Retrieve all requests with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const department = req.query.department;
        const type = req.query.type;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        // Build filter object
        const filter = {};
        if (department) filter.department = department;
        if (type) filter.type = type;
        if (startDate || endDate) {
            filter.submissionDate = {};
            if (startDate) filter.submissionDate.$gte = new Date(startDate);
            if (endDate) filter.submissionDate.$lte = new Date(endDate);
        }

        // Get total count for pagination
        const total = await Request.countDocuments(filter);

        // Get paginated results
        const requests = await Request.find(filter)
            .sort({ submissionDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select('-files.data'); // Exclude file data from results

        res.json({
            requests,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalRequests: total,
                hasMore: page * limit < total
            }
        });

    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Error fetching requests' });
    }
});

// Other endpoints remain the same, except ensure similar validation for PUT, DELETE operations

// PUT - Update request status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'processed', 'approved', 'rejected'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const request = await Request.findByIdAndUpdate(
            req.params.id,
            {
                status,
                lastUpdated: new Date()
            },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);

    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ error: 'Error updating request status' });
    }
});

// DELETE - Remove a request
router.delete('/:id', async (req, res) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // If there are files associated with the request, delete them
        if (request.files && request.files.length > 0) {
            const fs = await import('fs/promises');
            for (const file of request.files) {
                try {
                    await fs.unlink(file.path);
                } catch (error) {
                    console.error(`Error deleting file ${file.path}:`, error);
                }
            }
        }

        res.json({ message: 'Request deleted successfully' });

    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ error: 'Error deleting request' });
    }
});

export default router;
