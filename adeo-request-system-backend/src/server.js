// src/server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer'; // Add this
import path from 'path'; // Add this
import { fileURLToPath } from 'url'; // Add this
import { dirname } from 'path'; // Add this
import requestRoutes from './routes/requestRoutes.js';
import { connectDB } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Get current directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '..', 'uploads');
        // Ensure the uploads directory exists
        import('fs').then(fs => {
            if (!fs.existsSync(uploadDir)){
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Connect to Database
connectDB();

// Modify routes to handle file uploads
app.use('/api/requests', (req, res, next) => {
    if (req.method === 'POST') {
        upload.array('files')(req, res, next);
    } else {
        next();
    }
});

// Routes
app.use('/api/requests', requestRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});