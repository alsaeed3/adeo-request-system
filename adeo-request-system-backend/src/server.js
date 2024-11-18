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

// Get current directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

app.use(cors());  // Enable CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit:process.env.URLENCODED_BODY_LIMIT || "10mb" }));

// Enhanced rate limiting with configurable options
const limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // Configurable window (default 15 minutes)
    max: process.env.RATE_LIMIT_MAX || 100, // Configurable max requests
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Configure multer with environment variables
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(',');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5') * 1024 * 1024; // Configurable size in MB

// Enhanced storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  

const fileFilter = (req, file, cb) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(new Error('Invalid file type'), false);
        return;
    }
    cb(null, true);
};


const upload = multer({ storage: storage });

// Enhanced logging configuration
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
const morganOptions = {
    skip: (req, res) => process.env.NODE_ENV === 'production' && res.statusCode < 400,
    stream: process.env.LOG_TO_FILE ? 
        require('fs').createWriteStream(path.join(__dirname, '..', 'logs', 'access.log'), { flags: 'a' }) 
        : process.stdout
};
app.use(morgan(morganFormat, morganOptions));

// Enhanced CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174', // Updated default port
    methods: process.env.ALLOWED_METHODS || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: process.env.ALLOWED_HEADERS || ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400')
}));

// Body parser with configurable limits
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ 
    extended: true, 
    limit: process.env.URLENCODED_BODY_LIMIT || '1mb' 
}));

// Enhanced static file serving
app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Security-Policy', process.env.CSP_POLICY || "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Enhanced health check
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

// Enhanced file upload middleware
app.use('/api/requests', (req, res, next) => {
    if (req.method === 'POST') {
        upload.array('files')(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({
                    error: 'File upload error',
                    message: err.message,
                    code: err.code
                });
            } else if (err) {
                return res.status(400).json({
                    error: 'Invalid file',
                    message: err.message
                });
            }
            next();
        });
    } else {
        next();
    }
});

// Routes
app.use('/api/requests', requestRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

// Enhanced 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl
    });
});

// Error Handler
app.use(errorHandler);

// Enhanced graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`Received ${signal} signal`);
    
    const shutdownTimeout = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000');
    const shutdownTimer = setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, shutdownTimeout);

    try {
        // Close the Express server
        await new Promise((resolve) => {
            server.close(resolve);
            console.log('Express server closed');
        });

        // Close database connection
        await mongoose.connection.close();
        console.log('Database connection closed');

        clearTimeout(shutdownTimer);
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
    }
}

// Enhanced signal handling
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Port configuration with fallback and automatic port finding
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
            
            server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is in use, trying next port...`);
                    server.close();
                } else {
                    console.error('Server error:', error);
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

// Start the server
const server = await startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    }
});


