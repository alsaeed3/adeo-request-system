import winston from 'winston';
import mongoose from 'mongoose';
import pkg from 'express-validator';
const { validationResult } = pkg;
import multer from 'multer';

// Configure logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'error-handler' },
  transports: [
    new winston.transports.File({ filename: 'logs/errors.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationFailedError extends AppError {
  constructor(errors) {
    super('Validation Failed', 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// Error type handlers
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_INPUT');
};

const handleDuplicateFieldsDB = err => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400, 'DUPLICATE_VALUE');
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationFailedError(errors);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError('File size too large. Maximum size is 5MB', 400, 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new AppError('Too many files. Maximum is 5 files', 400, 'TOO_MANY_FILES');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError('Unexpected field in file upload', 400, 'INVALID_FIELD');
  }
  return new AppError('File upload error', 400, 'FILE_UPLOAD_ERROR');
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error('Error occurred:', {
    error: err,
    requestId: req.id,
    path: req.path,
    method: req.method,
    query: req.query,
    body: process.env.NODE_ENV === 'development' ? req.body : '[REDACTED]',
    user: req.user ? req.user.id : 'anonymous'
  });

  // Handle specific error types
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error instanceof multer.MulterError) error = handleMulterError(error);
  if (error.type === 'express-validator') {
    error = new ValidationFailedError(error.array());
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    return sendDevError(error, req, res);
  }

  return sendProdError(error, req, res);
};

// Development error response
const sendDevError = (err, req, res) => {
  return res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    errorCode: err.errorCode,
    stack: err.stack,
    requestId: req.id
  });
};

// Production error response
const sendProdError = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorCode: err.errorCode,
      requestId: req.id,
      ...(err instanceof ValidationFailedError && { errors: err.errors })
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('ERROR 💥:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    errorCode: 'INTERNAL_ERROR',
    requestId: req.id
  });
};

// Rate limit error handler
export const handleRateLimitError = (req, res) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  res.status(429).json({
    status: 'error',
    errorCode: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    requestId: req.id
  });
};

// Export default error handler and utility functions
export default errorHandler;

// Export utility functions for use in other parts of the application
export const throwError = (message, statusCode, errorCode) => {
  throw new AppError(message, statusCode, errorCode);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Error monitoring and metrics
let errorMetrics = {
  totalErrors: 0,
  errorsByType: {},
  errorsByEndpoint: {}
};

// Reset metrics every hour
setInterval(() => {
  errorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByEndpoint: {}
  };
}, 3600000);

// Export metrics for monitoring
export const getErrorMetrics = () => ({ ...errorMetrics });