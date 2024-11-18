import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import winston from 'winston';
import { performance } from 'perf_hooks';
import { AppError } from '../middleware/errorHandler.js';

// Configure enhanced logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'error', // Change default to error
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'similarity-service' },
    transports: [
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({ 
            filename: 'logs/similarity.log',
            level: process.env.LOG_LEVEL || 'error', // Change default to error
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Initialize cache
const cache = new NodeCache({
    stdTTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour default
    checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD) || 600, // 10 minutes default
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000,
    deleteOnExpire: true,
    errorOnMissing: false,
    useClones: false // Optimize memory usage
});

// Constants
const SIMILARITY_THRESHOLDS = Object.freeze({
    TITLE: parseFloat(process.env.SIMILARITY_THRESHOLD_TITLE) || 0.8,
    CONTENT: parseFloat(process.env.SIMILARITY_THRESHOLD_CONTENT) || 0.7,
    COMBINED: parseFloat(process.env.SIMILARITY_THRESHOLD_COMBINED) || 0.75
});

const CONFIG = Object.freeze({
    SEARCH_WINDOW_DAYS: parseInt(process.env.SEARCH_WINDOW_DAYS) || 180,
    MIN_WORD_LENGTH: parseInt(process.env.MIN_WORD_LENGTH) || 3,
    MAX_CACHE_AGE: parseInt(process.env.MAX_CACHE_AGE) || 24 * 60 * 60 * 1000,
    BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 100,
    RETRIES: parseInt(process.env.SIMILARITY_CHECK_RETRIES) || 3,
    RETRY_DELAY: parseInt(process.env.SIMILARITY_CHECK_RETRY_DELAY) || 1000
});

// Enhanced stop words set
const STOP_WORDS = new Set([
    'a', 'an', 'the',
    'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
    'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    // Add more stop words as needed
]);

/**
 * Enhanced similarity calculation with weighted algorithms and optimization
 */
function calculateSimilarity(str1, str2, options = {}) {
    // Default weights that can be overridden
    const weights = {
        levenshtein: options.levenshteinWeight || 0.4,
        jaccard: options.jaccardWeight || 0.3,
        cosine: options.cosineWeight || 0.3
    };

    // Validate weights sum to 1
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1) > 0.001) {
        throw new AppError('Similarity weights must sum to 1', 400);
    }

    try {
        // Calculate individual scores with memoization
        const levenshteinScore = memoizedLevenshtein(str1, str2);
        const jaccardScore = memoizedJaccard(str1, str2);
        const cosineScore = memoizedCosine(str1, str2);

        // Weighted combination
        return (
            levenshteinScore * weights.levenshtein +
            jaccardScore * weights.jaccard +
            cosineScore * weights.cosine
        );
    } catch (error) {
        logger.error('Error calculating similarity', {
            error: error.message,
            str1Length: str1.length,
            str2Length: str2.length
        });
        throw new AppError('Failed to calculate similarity', 500, { originalError: error });
    }
}

/**
 * Enhanced Levenshtein distance calculation with optimization for long strings
 */
function calculateLevenshteinSimilarity(str1, str2) {
    // Early return for identical strings
    if (str1 === str2) return 1;
    if (!str1.length) return 0;
    if (!str2.length) return 0;

    // Use dynamic programming with space optimization
    const len1 = str1.length;
    const len2 = str2.length;
    
    let prevRow = Array(len2 + 1).fill(0);
    let currRow = Array(len2 + 1).fill(0);

    // Initialize first row
    for (let j = 0; j <= len2; j++) prevRow[j] = j;

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
        currRow[0] = i;
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                currRow[j - 1] + 1,              // insertion
                prevRow[j] + 1,                  // deletion
                prevRow[j - 1] + cost           // substitution
            );
        }
        [prevRow, currRow] = [currRow, prevRow]; // Swap rows
    }

    const maxLen = Math.max(len1, len2);
    return 1 - (prevRow[len2] / maxLen);
}

/**
 * Enhanced Jaccard similarity with better tokenization
 */
function calculateJaccardSimilarity(str1, str2) {
    // Early optimization
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // Enhanced tokenization
    const tokens1 = new Set(
        str1.split(/\s+/)
            .filter(token => token.length >= CONFIG.MIN_WORD_LENGTH)
            .map(token => token.toLowerCase())
    );
    const tokens2 = new Set(
        str2.split(/\s+/)
            .filter(token => token.length >= CONFIG.MIN_WORD_LENGTH)
            .map(token => token.toLowerCase())
    );
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
}

/**
 * Enhanced Cosine similarity with TF-IDF weighting
 */
function calculateCosineSimilarity(str1, str2) {
    // Early optimization
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // Enhanced tokenization with TF-IDF
    const tokens1 = str1.split(/\s+/).map(token => token.toLowerCase());
    const tokens2 = str2.split(/\s+/).map(token => token.toLowerCase());
    
    // Calculate term frequencies
    const tf1 = calculateTermFrequency(tokens1);
    const tf2 = calculateTermFrequency(tokens2);
    
    // Calculate document frequencies
    const df = calculateDocumentFrequency([tokens1, tokens2]);
    
    // Calculate TF-IDF vectors
    const vector1 = calculateTfIdfVector(tf1, df, 2);
    const vector2 = calculateTfIdfVector(tf2, df, 2);
    
    // Calculate cosine similarity
    return calculateVectorSimilarity(vector1, vector2);
}

// Vector calculation helper functions
function calculateTermFrequency(tokens) {
    const tf = new Map();
    for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
    }
    return tf;
}

function calculateDocumentFrequency(documents) {
    const df = new Map();
    for (const doc of documents) {
        const uniqueTokens = new Set(doc);
        for (const token of uniqueTokens) {
            df.set(token, (df.get(token) || 0) + 1);
        }
    }
    return df;
}

function calculateTfIdfVector(tf, df, totalDocs) {
    const tfidf = new Map();
    for (const [term, freq] of tf.entries()) {
        const idf = Math.log(totalDocs / (df.get(term) || 1));
        tfidf.set(term, freq * idf);
    }
    return tfidf;
}

function calculateVectorSimilarity(vector1, vector2) {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const [term, value1] of vector1.entries()) {
        const value2 = vector2.get(term) || 0;
        dotProduct += value1 * value2;
        magnitude1 += value1 * value1;
    }

    for (const [, value2] of vector2.entries()) {
        magnitude2 += value2 * value2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    return dotProduct / (magnitude1 * magnitude2);
}

// Memoization setup
const memoize = (fn) => {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

const memoizedLevenshtein = memoize(calculateLevenshteinSimilarity);
const memoizedJaccard = memoize(calculateJaccardSimilarity);
const memoizedCosine = memoize(calculateCosineSimilarity);

/**
 * Enhanced text normalization with additional cleaning steps
 */
function normalizeText(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        // Replace smart quotes and dashes
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        // Remove URLs
        .replace(/https?:\/\/\S+/g, '')
        // Remove email addresses
        .replace(/[\w\.-]+@[\w\.-]+/g, '')
        // Remove special characters while preserving spaces
        .replace(/[^\w\s-]/g, ' ')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Enhanced keyword extraction with improved filtering
 */
function extractKeywords(text) {
    if (!text) return new Set();

    return new Set(
        text.split(/\s+/)
            .filter(word => word.length >= CONFIG.MIN_WORD_LENGTH)
            .filter(word => !STOP_WORDS.has(word))
            .filter(word => !isNumeric(word))
            .map(word => word.toLowerCase())
    );
}

/**
 * Enhanced keyword overlap calculation with weighted positional importance
 */
function calculateKeywordOverlap(set1, set2) {
    if (!set1.size || !set2.size) return 0;

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    // Calculate positional importance
    const positionWeight = Math.min(
        calculatePositionalImportance([...intersection]),
        1
    );

    return (intersection.size / union.size) * (0.8 + 0.2 * positionWeight);
}

/**
 * Calculate importance based on word positions
 */
function calculatePositionalImportance(words) {
    if (!words.length) return 0;
    
    // Words appearing earlier are considered more important
    const positions = words.map((_, index) => 1 / (index + 1));
    return positions.reduce((sum, pos) => sum + pos, 0) / words.length;
}

/**
 * Check if string is numeric
 */
function isNumeric(str) {
    return /^\d+$/.test(str);
}

/**
 * Enhanced semantic similarity calculation (placeholder for future implementation)
 */
async function calculateSemanticSimilarity(text1, text2) {
    // Placeholder for future implementation
    // Could integrate with NLP service or embedding model
    return 0;
}

/**
 * Improved cache key generation with department normalization
 */
function generateCacheKey(title, department) {
    const normalizedDepartment = department.toLowerCase().replace(/\s+/g, '-');
    const normalizedTitle = normalizeText(title);
    return `similarity:${normalizedDepartment}:${normalizedTitle}`;
}

/**
 * Check if cached result is stale with grace period
 */
function isCacheStale(timestamp) {
    const age = Date.now() - timestamp;
    const gracePeriod = CONFIG.MAX_CACHE_AGE * 0.1; // 10% grace period
    return age > (CONFIG.MAX_CACHE_AGE + gracePeriod);
}

/**
 * Get recent requests with improved query optimization
 */
async function getRecentRequests(department) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.SEARCH_WINDOW_DAYS);

    try {
        return await Request.find({
            department,
            submissionDate: { $gte: cutoffDate },
            status: { $nin: ['draft', 'rejected'] }
        })
        .select('title content submissionDate status')
        .sort('-submissionDate')
        .lean()
        .hint({ department: 1, submissionDate: -1 });
    } catch (error) {
        logger.error('Failed to fetch recent requests', {
            department,
            error: error.message
        });
        throw new AppError('Failed to fetch comparison data', 500, { originalError: error });
    }
}

/**
 * Calculate weighted similarity score with configurable weights
 */
function weightedSimilarityScore({
    titleSimilarity,
    contentSimilarity,
    titleOverlap,
    contentOverlap,
    semanticScore
}) {
    const weights = {
        titleSimilarity: 0.3,
        contentSimilarity: 0.25,
        titleOverlap: 0.2,
        contentOverlap: 0.15,
        semanticScore: 0.1
    };

    return (
        titleSimilarity * weights.titleSimilarity +
        contentSimilarity * weights.contentSimilarity +
        titleOverlap * weights.titleOverlap +
        contentOverlap * weights.contentOverlap +
        semanticScore * weights.semanticScore
    );
}

/**
 * Performance monitoring metrics
 */
const metrics = {
    totalChecks: 0,
    cacheHits: 0,
    avgProcessingTime: 0,
    errors: 0,
    lastReset: Date.now(),

    recordCheck(duration, cacheHit = false, error = false) {
        this.totalChecks++;
        if (cacheHit) this.cacheHits++;
        if (error) this.errors++;
        this.avgProcessingTime = (
            (this.avgProcessingTime * (this.totalChecks - 1) + duration) /
            this.totalChecks
        );
    },

    getMetrics() {
        return {
            totalChecks: this.totalChecks,
            cacheHits: this.cacheHits,
            cacheHitRate: this.totalChecks ? (this.cacheHits / this.totalChecks) : 0,
            avgProcessingTime: this.avgProcessingTime,
            errorRate: this.totalChecks ? (this.errors / this.totalChecks) : 0,
            uptime: Date.now() - this.lastReset
        };
    },

    reset() {
        this.totalChecks = 0;
        this.cacheHits = 0;
        this.avgProcessingTime = 0;
        this.errors = 0;
        this.lastReset = Date.now();
    }
};

/**
 * Enhanced duplicate check with retry mechanism and improved error handling
 */
async function checkForDuplicates(title, department, content) {
    const startTime = performance.now();
    let attempt = 1;
    let lastError = null;

    while (attempt <= CONFIG.RETRIES) {
        try {
            // Input validation
            if (!title || !department || !content) {
                throw new AppError('Missing required parameters', 400);
            }

            // Generate cache key and check cache
            const cacheKey = generateCacheKey(title, department);
            const cachedResult = cache.get(cacheKey);

            if (cachedResult && !isCacheStale(cachedResult.timestamp)) {
                logger.debug('Cache hit for similarity check', {
                    title,
                    department,
                    cacheKey
                });
                return {
                    ...cachedResult.result,
                    fromCache: true
                };
            }

            // Text preparation
            const normalizedTitle = normalizeText(title);
            const normalizedContent = normalizeText(content);
            const titleWords = extractKeywords(normalizedTitle);
            const contentWords = extractKeywords(normalizedContent);

            // Get and process recent requests
            const recentRequests = await getRecentRequests(department);
            const similarRequests = [];

            // Batch processing for better performance
            for (let i = 0; i < recentRequests.length; i += CONFIG.BATCH_SIZE) {
                const batch = recentRequests.slice(i, i + CONFIG.BATCH_SIZE);
                const batchResults = await processBatch(
                    batch,
                    normalizedTitle,
                    normalizedContent,
                    titleWords,
                    contentWords
                );
                similarRequests.push(...batchResults);
            }

            // Sort and analyze results
            similarRequests.sort((a, b) => b.similarity - a.similarity);
            const mostSimilar = similarRequests[0];

            const result = mostSimilar && mostSimilar.similarity >= SIMILARITY_THRESHOLDS.COMBINED
                ? {
                    isDuplicate: true,
                    originalRequest: mostSimilar.request,
                    similarity: mostSimilar.similarity,
                    details: {
                        titleSimilarity: mostSimilar.titleSimilarity,
                        contentSimilarity: mostSimilar.contentSimilarity,
                        keywordOverlap: mostSimilar.keywordOverlap
                    }
                }
                : { 
                    isDuplicate: false,
                    details: {
                        highestSimilarity: mostSimilar?.similarity || 0
                    }
                };

            // Cache the result
            cache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });

            logger.info('Similarity check completed', {
                duration: performance.now() - startTime,
                isDuplicate: result.isDuplicate,
                attempt
            });

            metrics.recordCheck(performance.now() - startTime, false, false);
            return result;

        } catch (error) {
            lastError = error;
            logger.warn(`Attempt ${attempt} failed`, {
                error: error.message,
                title,
                department
            });

            if (attempt < CONFIG.RETRIES) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
                attempt++;
            } else {
                break;
            }
        }
    }

    metrics.recordCheck(performance.now() - startTime, false, true);
    throw new AppError(
        'Failed to perform similarity check after multiple attempts',
        500,
        { originalError: lastError, attempts: CONFIG.RETRIES }
    );
}

/**
 * Enhanced batch processing with parallel execution and progress tracking
 */
async function processBatch(batch, normalizedTitle, normalizedContent, titleWords, contentWords) {
    try {
        const batchStartTime = performance.now();
        let processedCount = 0;

        const results = await Promise.all(batch.map(async (request) => {
            try {
                const requestTitleNorm = normalizeText(request.title);
                const requestContentNorm = normalizeText(request.content);

                const titleSimilarity = calculateSimilarity(normalizedTitle, requestTitleNorm, {
                    levenshteinWeight: 0.5,
                    jaccardWeight: 0.3,
                    cosineWeight: 0.2
                });

                const contentSimilarity = calculateSimilarity(normalizedContent, requestContentNorm, {
                    levenshteinWeight: 0.3,
                    jaccardWeight: 0.3,
                    cosineWeight: 0.4
                });

                const requestTitleWords = extractKeywords(requestTitleNorm);
                const requestContentWords = extractKeywords(requestContentNorm);

                const titleOverlap = calculateKeywordOverlap(titleWords, requestTitleWords);
                const contentOverlap = calculateKeywordOverlap(contentWords, requestContentWords);

                const semanticScore = await calculateSemanticSimilarity(
                    normalizedContent,
                    requestContentNorm
                ).catch(() => 0);

                const combinedSimilarity = weightedSimilarityScore({
                    titleSimilarity,
                    contentSimilarity,
                    titleOverlap,
                    contentOverlap,
                    semanticScore
                });

                processedCount++;

                if (batch.length > 50 && processedCount % 10 === 0) {
                    logger.debug(`Batch processing progress: ${processedCount}/${batch.length}`);
                }

                return {
                    request,
                    similarity: combinedSimilarity,
                    details: {
                        titleSimilarity,
                        contentSimilarity,
                        titleOverlap,
                        contentOverlap,
                        semanticScore
                    }
                };
            } catch (error) {
                logger.error('Error processing request in batch', {
                    requestId: request._id,
                    error: error.message
                });
                return null;
            }
        }));

        return results.filter(Boolean);
    } catch (error) {
        logger.error('Batch processing failed', { error: error.message });
        throw new AppError('Failed to process comparison batch', 500, { originalError: error });
    }
}

// Initialize cache maintenance if not in test environment
if (process.env.NODE_ENV !== 'test') {
    const maintenanceInterval = parseInt(process.env.CACHE_MAINTENANCE_INTERVAL) || 300000; // 5 minutes default
    const logLevel = process.env.CACHE_LOG_LEVEL || 'error'; // Only log errors by default

    setInterval(() => {
        try {
            const stats = cache.getStats();
            // Only log if there are significant changes or issues
            if (
                stats.hits > 0 || 
                stats.misses > 0 || 
                cache.keys().length > 100 || 
                logLevel === 'debug'
            ) {
                logger.log(logLevel, 'Cache maintenance stats', {
                    hits: stats.hits,
                    misses: stats.misses,
                    keys: cache.keys().length,
                    memory: {
                        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
                    }
                });
            }
        } catch (error) {
            logger.error('Cache maintenance error', { error: error.message });
        }
    }, maintenanceInterval);
}

// Utility functions bundle for testing and internal use
const utils = {
    calculateLevenshteinSimilarity,
    calculateJaccardSimilarity,
    calculateCosineSimilarity,
    normalizeText,
    extractKeywords,
    calculateKeywordOverlap,
    calculatePositionalImportance,
    generateCacheKey,
    isCacheStale,
    metrics
};

// Constants bundle
const constants = {
    SIMILARITY_THRESHOLDS,
    CONFIG,
    STOP_WORDS
};

// Main exports
export {
    checkForDuplicates,
    calculateSimilarity,
    utils,
    constants
};

// Additional exports for specific use cases
export const similarity = {
    // Core functionality
    check: checkForDuplicates,
    calculate: calculateSimilarity,
    
    // Utility functions
    utils,
    
    // Configuration and constants
    config: CONFIG,
    thresholds: SIMILARITY_THRESHOLDS,
    
    // Metrics and monitoring
    metrics,
    
    // Cache management
    clearCache: () => cache.flushAll(),
    getCacheStats: () => cache.getStats(),
    
    // Custom configurations
    setConfig: (newConfig) => {
        Object.assign(CONFIG, newConfig);
        logger.info('Similarity configuration updated', { newConfig });
    },
    
    setThresholds: (newThresholds) => {
        Object.assign(SIMILARITY_THRESHOLDS, newThresholds);
        logger.info('Similarity thresholds updated', { newThresholds });
    }
};

// Type definitions (for TypeScript users)
/**
 * @typedef {Object} SimilarityResult
 * @property {boolean} isDuplicate
 * @property {Object} [originalRequest]
 * @property {number} [similarity]
 * @property {Object} [details]
 */

/**
 * @typedef {Object} SimilarityConfig
 * @property {number} SEARCH_WINDOW_DAYS
 * @property {number} MIN_WORD_LENGTH
 * @property {number} MAX_CACHE_AGE
 * @property {number} BATCH_SIZE
 * @property {number} RETRIES
 * @property {number} RETRY_DELAY
 */

/**
 * @typedef {Object} SimilarityThresholds
 * @property {number} TITLE
 * @property {number} CONTENT
 * @property {number} COMBINED
 */