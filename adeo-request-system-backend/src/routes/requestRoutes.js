// routes/requestRoutes.js
import express from 'express';
import { Request } from '../models/request.js';
import { processRequest } from '../services/requestProcessor.js';
import { checkForDuplicates } from '../utils/similarity.js';

const router = express.Router();

// POST - Create new request
router.post('/', async (req, res) => {
    try {
        const { title, department, type, content } = req.body;
        
        // Handle uploaded files
        const files = req.files ? req.files.map(file => ({
            filename: file.filename,
            path: file.path,
            mimetype: file.mimetype
        })) : [];

        // Validate required fields
        if (!title || !department || !type || !content) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'Title, department, type, and content are required'
            });
        }

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

        // Save to database
        const newRequest = new Request({
            ...processedRequest,
            status: 'processed',
            submissionDate: new Date()
        });
        
        await newRequest.save();

        res.status(201).json({
            message: 'Request processed successfully',
            request: processedRequest
        });

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// GET - Retrieve specific request by ID
router.get('/:id', async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);

    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ error: 'Error fetching request' });
    }
});

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

// GET - Retrieve department statistics
router.get('/stats/department', async (req, res) => {
    try {
        const stats = await Request.aggregate([
            {
                $group: {
                    _id: '$department',
                    totalRequests: { $sum: 1 },
                    approved: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json(stats);

    } catch (error) {
        console.error('Error fetching department statistics:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
});

// DELETE - Remove a request
router.delete('/:id', async (req, res) => {
    try {
        const request = await Request.findByIdAndDelete(req.params.id);
        
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // If there are files associated with the request, you might want to delete them
        if (request.files && request.files.length > 0) {
            // Import fs promises API
            const fs = await import('fs/promises');
            
            // Delete each file
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