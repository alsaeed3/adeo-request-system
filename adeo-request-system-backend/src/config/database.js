import mongoose from 'mongoose';
import winston from 'winston'; // Added for logging

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/database-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/database.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Database connection options
const dbOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
};

// Mongoose debug mode in development
if (process.env.NODE_ENV !== 'production') {
  mongoose.set('debug', true);
}

// Connection health monitoring
let isConnected = false;
const monitorConnection = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  const newIsConnected = state === 1;
  if (newIsConnected !== isConnected) {
    isConnected = newIsConnected;
    logger.info(`MongoDB connection state changed to: ${states[state]}`);
  }
};

// Connection event handlers
const setupConnectionHandlers = () => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  // Monitor for slow queries
  mongoose.connection.on('query', (query) => {
    const slowQueryThreshold = 1000; // 1 second
    if (query.executionTime >= slowQueryThreshold) {
      logger.warn('Slow Query Detected:', {
        query: query.query,
        executionTime: query.executionTime,
        collection: query.collection
      });
    }
  });

  // Check connection health periodically
  setInterval(monitorConnection, 10000);
};

// Retry strategy for initial connection
const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, dbOptions);
      logger.info('MongoDB connected successfully after retries');
      return;
    } catch (error) {
      if (i === retries - 1) {
        logger.error('Failed to connect to MongoDB after multiple retries:', error);
        throw error;
      }
      logger.warn(`Failed to connect to MongoDB. Retrying in ${interval/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

// Main connection function
export const connectDB = async () => {
  try {
    // Validate MongoDB URI
    if (!process.env.MONGODB_URI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Setup connection event handlers
    setupConnectionHandlers();

    // Attempt to connect with retry strategy
    await connectWithRetry();

    // Setup automatic reconnection if the connection is lost
    mongoose.connection.on('disconnected', async () => {
      logger.warn('Lost MongoDB connection. Attempting to reconnect...');
      try {
        await connectWithRetry(3, 3000); // Reduced retries and interval for reconnection
      } catch (error) {
        logger.error('Failed to reconnect to MongoDB:', error);
        // In production, you might want to exit the process here
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      }
    });

    // Return the mongoose connection for use elsewhere if needed
    return mongoose.connection;

  } catch (error) {
    logger.error('Database connection error:', error);
    // In production, we might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

// Export additional utility functions
export const getConnectionStatus = () => ({
  state: mongoose.connection.readyState,
  host: mongoose.connection.host,
  name: mongoose.connection.name,
  collections: mongoose.connection.collections,
});

export const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Performance monitoring
if (process.env.NODE_ENV === 'production') {
  mongoose.plugin(schema => {
    schema.pre('save', function(next) {
      const startTime = Date.now();
      next();
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      if (executionTime > 1000) { // Log operations taking more than 1 second
        logger.warn('Slow Operation Detected:', {
          operation: 'save',
          model: this.constructor.modelName,
          executionTime,
          documentId: this._id
        });
      }
    });
  });
}