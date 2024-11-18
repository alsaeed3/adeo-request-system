import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Request } from '../models/request.js';
import { processRequest } from '../services/requestProcessor.js';
import { checkForDuplicates } from '../utils/similarity.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import multer from 'multer';
import path from 'path';

// Create router instance FIRST
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Sanitize filename
        const fileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${Date.now()}-${fileName}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5 // Maximum 5 files
    }
});

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'request-routes' },
    transports: [
        new winston.transports.File({ filename: 'logs/routes.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Rate limiting configuration
const createRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per window
    message: 'Too many requests created from this IP, please try again after 15 minutes'
});

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array(),
            message: 'Validation failed'
        });
    }
    next();
};

// Validation schemas
const createRequestValidation = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .isLength({ min: 10, max: 10000 })
        .withMessage('Description must be between 10 and 10000 characters'),
    body('requestType')
        .isIn(['Feature Request', 'Bug Report', 'Access Request', 'Other'])
        .withMessage('Invalid request type'),
    body('priority')
        .isIn(['Low', 'Medium', 'High', 'Urgent'])
        .withMessage('Invalid priority level')
];

const updateRequestValidation = [
    param('id').isMongoId().withMessage('Invalid request ID'),
    body('status')
        .optional()
        .isIn(['Draft', 'Pending', 'In Review', 'Approved', 'Rejected', 'Cancelled', 'Completed'])
        .withMessage('Invalid status'),
    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High', 'Urgent'])
        .withMessage('Invalid priority level'),
    body('assignedTo')
        .optional()
        .isMongoId()
        .withMessage('Valid assignedTo user ID is required')
];

const queryValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('department')
        .optional()
        .isIn(['Urban Planning', 'Transportation', 'Healthcare', 'Education', 
               'Environment', 'Economic Development', 'Public Safety', 'Housing', 
               'Culture and Tourism', 'Social Services']),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid start date format'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('Invalid end date format')
];

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            status: 'error',
            message: err.message
        });
    }
    next(err);
};

// Update your POST route to handle file uploads
router.post('/',
    createRequestLimiter,
    upload.array('files', 5),
    handleMulterError,
    createRequestValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        try {
            console.log('Request body:', req.body);
            console.log('Files:', req.files);

            // Create request object
            const requestData = {
                title: req.body.title,
                description: req.body.description || req.body.content,
                requestType: req.body.requestType || req.body.type,
                priority: req.body.priority,
                department: req.body.department,
                attachments: req.files ? req.files.map(file => ({
                    filename: file.filename,
                    originalName: file.originalname,
                    path: file.path,
                    mimetype: file.mimetype
                })) : []
            };

            // Save to database
            const newRequest = await Request.create(requestData);

            res.status(201).json({
                status: 'success',
                data: newRequest
            });
        } catch (error) {
            console.error('Error creating request:', error);
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    })
);


// Routes with enhanced error handling and validation

// POST - Create new request
router.post('/', 
    createRequestLimiter,
    createRequestValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        const startTime = Date.now();
        const {
            title,
            description,
            requestType,
            category,
            priority,
            requester,
            customFields,
            dueDate
        } = req.body;

        // Create new request
        const newRequest = new Request({
            title,
            description,
            requestType,
            category,
            priority,
            requester,
            status: 'Draft',
            customFields: customFields || {},
            dueDate: dueDate ? new Date(dueDate) : undefined,
            metadata: {
                createdFrom: 'web',
                version: 1
            }
        });

        await newRequest.save();

        logger.info('Request created', {
            requestId: newRequest._id,
            processingTime: Date.now() - startTime
        });

        res.status(201).json({
            status: 'success',
            message: 'Request created successfully',
            data: newRequest
        });
    })
);

// GET - Retrieve requests with advanced filtering and pagination
router.get('/',
    queryValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        const {
            page = 1,
            limit = 10,
            status,
            priority,
            requestType,
            category,
            startDate,
            endDate,
            sort = '-createdAt'
        } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (requestType) filter.requestType = requestType;
        if (category) filter.category = category;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [requests, total] = await Promise.all([
            Request.find(filter)
                .populate('requester', 'name email')
                .populate('assignedTo', 'name email')
                .populate('requestType', 'name')
                .populate('category', 'name')
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Request.countDocuments(filter)
        ]);

        res.json({
            status: 'success',
            data: requests,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalRequests: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                limit: parseInt(limit)
            }
        });
    })
);

// GET - Retrieve request by ID
router.get('/:id',
    param('id').isMongoId(),
    validateRequest,
    asyncHandler(async (req, res) => {
        const request = await Request.findById(req.params.id)
            .select('-files.data')
            .populate('relatedRequests', 'title department status')
            .lean();

        if (!request) {
            throw new AppError('Request not found', 404);
        }

        res.json({
            status: 'success',
            data: request
        });
    })
);

// PUT - Update request
router.put('/:id',
    updateRequestValidation,
    validateRequest,
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        const request = await Request.findById(id);
        if (!request) {
            throw new AppError('Request not found', 404);
        }

        if (updates.status && !isValidStatusTransition(request.status, updates.status)) {
            throw new AppError(`Invalid status transition from ${request.status} to ${updates.status}`, 400);
        }

        // Add to history
        if (updates.status || updates.assignedTo) {
            request.history.push({
                user: req.user?._id, // Assuming you have user info in req
                action: updates.status ? 'statusChange' : 'assignmentChange',
                field: updates.status ? 'status' : 'assignedTo',
                previousValue: updates.status ? request.status : request.assignedTo,
                newValue: updates.status || updates.assignedTo,
                comment: updates.comment
            });
        }

        Object.assign(request, updates);
        await request.save();

        res.json({
            status: 'success',
            message: 'Request updated successfully',
            data: request
        });
    })
);

// DELETE - Remove request
router.delete('/:id',
    param('id').isMongoId(),
    validateRequest,
    asyncHandler(async (req, res) => {
        const request = await Request.findById(req.params.id);
        
        if (!request) {
            throw new AppError('Request not found', 404);
        }

        // Check if request can be deleted
        if (request.status === 'approved') {
            throw new AppError('Cannot delete approved requests', 400);
        }

        // Delete associated files
        if (request.files?.length > 0) {
            const fs = await import('fs/promises');
            for (const file of request.files) {
                try {
                    await fs.unlink(file.path);
                } catch (error) {
                    logger.error('Error deleting file', {
                        requestId: req.params.id,
                        filePath: file.path,
                        error: error.message
                    });
                }
            }
        }

        await request.remove();

        logger.info('Request deleted', {
            requestId: req.params.id,
            status: request.status
        });

        res.json({
            status: 'success',
            message: 'Request deleted successfully'
        });
    })
);

// Additional utility endpoints

// GET - Request statistics
router.get('/stats/summary',
    asyncHandler(async (req, res) => {
        const stats = await Request.aggregate([
            {
                $group: {
                    _id: {
                        department: '$department',
                        status: '$status'
                    },
                    count: { $sum: 1 },
                    avgProcessingTime: {
                        $avg: {
                            $subtract: ['$lastUpdated', '$submissionDate']
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$_id.department',
                    statusBreakdown: {
                        $push: {
                            status: '$_id.status',
                            count: '$count',
                            avgProcessingTime: '$avgProcessingTime'
                        }
                    },
                    totalRequests: { $sum: '$count' }
                }
            }
        ]);

        res.json({
            status: 'success',
            data: stats
        });
    })
);

// GET - Find similar requests
router.get('/:id/similar',
    param('id').isMongoId(),
    validateRequest,
    asyncHandler(async (req, res) => {
        const similarRequests = await Request.findSimilar(req.params.id);
        
        res.json({
            status: 'success',
            data: similarRequests
        });
    })
);

// Utility function to validate status transitions
function isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
        'Draft': ['Pending', 'Cancelled'],
        'Pending': ['In Review', 'Rejected', 'Cancelled'],
        'In Review': ['Approved', 'Rejected', 'Cancelled'],
        'Approved': ['Completed', 'Cancelled'],
        'Rejected': ['Draft', 'Cancelled'],
        'Cancelled': [],
        'Completed': []
    };

    return validTransitions[currentStatus]?.includes(newStatus);
}


export default router;