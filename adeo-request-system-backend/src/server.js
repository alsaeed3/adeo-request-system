// server.js - Part 1: Initial Setup and Imports

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import requestRoutes from './routes/requestRoutes.js';
import { connectDB } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import fs from 'fs';

// Get current directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Define allowed origins BEFORE cors configuration
const allowedOrigins = [
    'http://localhost:5173',  // Vite's default port
    'http://localhost:5174',  // Alternative Vite port
    process.env.FRONTEND_URL
].filter(Boolean);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Origin not allowed by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    optionsSuccessStatus: 200
};

// Apply CORS first
app.use(cors(corsOptions));

// Basic middleware setup - MOVE THESE BEFORE ROUTES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());

// Logging middleware
app.use((req, res, next) => {
    console.log(`Received ${req.method} request for ${req.url}`);
    console.log('Request headers:', req.headers);  // Add this to debug
    console.log('Request body:', req.body);
    next();
});

// Enhanced rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// server.js - Part 2: File Upload Configuration

// File upload configuration
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(',');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5') * 1024 * 1024;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
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
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5 // maximum 5 files
    }
}).array('files', 5);

// Logging configuration
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
const morganOptions = {
    skip: (req, res) => process.env.NODE_ENV === 'production' && res.statusCode < 400,
    stream: process.env.LOG_TO_FILE ? 
        require('fs').createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' }) 
        : process.stdout
};
app.use(morgan(morganFormat, morganOptions));

// server.js - Part 3: Middleware and Routes

// Enhanced CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    methods: process.env.ALLOWED_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400')
}));

// Static file serving with security headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Security-Policy', process.env.CSP_POLICY || "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    };
    res.status(200).json(healthCheck);
});

// Add this debugging middleware
app.use((req, res, next) => {
    console.log('\n=== Request Debug ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body:', req.body);
    console.log('===================\n');
    next();
});

// File upload middleware for /api/requests endpoint
app.use('/api/requests', (req, res, next) => {
    if (req.method !== 'POST') {
        return next();
    }

    console.log('Starting file upload process...');
    
    upload(req, res, function(err) {
        console.log('Upload middleware processing complete');
        console.log('Files received:', req.files);
        console.log('Form data received:', req.body);
        
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).json({
                status: 'error',
                message: 'File upload error',
                error: err.message
            });
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).json({
                status: 'error',
                message: 'Unknown error occurred',
                error: err.message
            });
        }
        next();
    });
}, requestRoutes);

// Routes
app.use('/api/requests', requestRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl
    });
});

// Error handler
app.use(errorHandler);

// server.js - Part 4: Server Startup and Shutdown

// Graceful shutdown handler
async function gracefulShutdown(signal) {
    console.log(`Received ${signal} signal`);
    
    const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000');
    const shutdownTimer = setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, shutdownTimeout);

    try {
        await new Promise((resolve) => {
            server.close(resolve);
            console.log('Express server closed');
        });

        await mongoose.connection.close();
        console.log('Database connection closed');

        clearTimeout(shutdownTimer);
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

// Start server with automatic port finding
const startServer = async (retries = 5) => {
    const basePort = parseInt(process.env.PORT || '3000');
    
    for (let i = 0; i < retries; i++) {
        const port = basePort + i;
        try {
            const server = app.listen(port, () => {
                console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
                if (i > 0) {
                    console.log(`Original port ${basePort} was in use, successfully bound to port ${port}`);
                }
            });
            
            return server;
        } catch (err) {
            if (i === retries - 1) {
                console.error(`Could not find an available port after ${retries} attempts`);
                process.exit(1);
            }
        }
    }
};

// Connect to database and start server
try {
    await connectDB();
    console.log('Connected to database');
    const server = await startServer();

    // Signal handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (err) => {
        console.error('Unhandled Promise Rejection:', err);
        if (process.env.NODE_ENV === 'production') {
            gracefulShutdown('UNHANDLED_REJECTION');
        }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (err) => {
        console.error('Uncaught Exception:', err);
        if (process.env.NODE_ENV === 'production') {
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        }
    });

} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}

export default app;