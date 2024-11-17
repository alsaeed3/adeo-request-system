import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxLength: [200, 'Title cannot exceed 200 characters']
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: {
            values: [
                'Urban Planning',
                'Transportation',
                'Healthcare',
                'Education',
                'Environment',
                'Economic Development',
                'Public Safety',
                'Housing',
                'Culture and Tourism',
                'Social Services'
            ],
            message: '{VALUE} is not a valid department'
        }
    },
    type: {
        type: String,
        required: [true, 'Request type is required'],
        enum: {
            values: [
                'Policy Proposal',
                'Budget Request',
                'Project Implementation',
                'Emergency Request',
                'Research Study',
                'Infrastructure Development',
                'Program Initiative',
                'Regulatory Change',
                'Service Enhancement',
                'Strategic Planning'
            ],
            message: '{VALUE} is not a valid request type'
        }
    },
    content: {
        type: String,
        required: [true, 'Content is required'],
        minLength: [10, 'Content must be at least 10 characters long'], // Adjusted from 50 to 10
        maxLength: [10000, 'Content cannot exceed 10000 characters']
    },

    // Status and Tracking
    status: {
        type: String,
        enum: {
            values: ['draft', 'pending', 'processing', 'processed', 'approved', 'rejected', 'on-hold'],
            message: '{VALUE} is not a valid status'
        },
        default: 'pending'
    },
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high', 'urgent'],
            message: '{VALUE} is not a valid priority level'
        },
        default: 'medium'
    },
    referenceNumber: {
        type: String,
        unique: true,
        default: function() {
            return 'REQ-' + Date.now().toString(36).toUpperCase() +
                   Math.random().toString(36).substring(2, 5).toUpperCase();
        }
    },

    // Dates
    submissionDate: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    targetCompletionDate: {
        type: Date
    },

    // Files and Attachments
    files: [{
        filename: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true
        },
        mimetype: {
            type: String,
            required: true
        },
        size: {
            type: Number
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],

    // Analysis and Recommendations
    analysis: {
        summary: {
            type: String,
            maxLength: [2000, 'Analysis summary cannot exceed 2000 characters']
        },
        trends: [{
            type: String,
            maxLength: [500, 'Individual trend cannot exceed 500 characters']
        }],
        impactAssessment: {
            type: String, // Changed from Map to String
            maxLength: [5000, 'Impact assessment cannot exceed 5000 characters']
        },
        policyAlignment: {
            type: String, // Changed from Map to String
            maxLength: [5000, 'Policy alignment cannot exceed 5000 characters']
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        }
    },

    recommendations: {
        strategic: [{
            type: String,
            maxLength: [1000, 'Strategic recommendation cannot exceed 1000 characters']
        }],
        operational: [{
            type: String,
            maxLength: [1000, 'Operational recommendation cannot exceed 1000 characters']
        }],
        timeline: {
            type: String,
            maxLength: [1000, 'Timeline cannot exceed 1000 characters']
        },
        risks: [{
            type: String,
            maxLength: [500, 'Risk description cannot exceed 500 characters']
        }],
        budgetImplications: {
            type: String,
            maxLength: [1000, 'Budget implications cannot exceed 1000 characters']
        }
    },

    // Metadata
    metadata: {
        processingVersion: {
            type: String
        },
        processingDuration: {
            type: Number // in milliseconds
        },
        aiModelUsed: {
            type: String
        },
        confidentialityLevel: {
            type: String,
            enum: ['public', 'internal', 'confidential', 'restricted'],
            default: 'internal'
        }
    },

    // Workflow and Approval
    workflow: {
        currentStage: {
            type: String,
            enum: ['initial-review', 'analysis', 'recommendation', 'final-approval', 'implementation'],
            default: 'initial-review'
        },
        approvers: [{
            name: String,
            role: String,
            decision: {
                type: String,
                enum: ['pending', 'approved', 'rejected']
            },
            comments: String,
            date: Date
        }],
        history: [{
            action: String,
            performedBy: String,
            date: {
                type: Date,
                default: Date.now
            },
            comments: String
        }]
    },

    // Relationships
    relatedRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }],
    parentRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Request'
    }
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
    strict: true, // Only allow fields defined in the schema
    strictQuery: false // Allow flexible querying
});

// Indexes for improved query performance
requestSchema.index({ department: 1, status: 1 });
requestSchema.index({ submissionDate: -1 });
requestSchema.index({ referenceNumber: 1 }, { unique: true });
requestSchema.index({ 'workflow.currentStage': 1 });
requestSchema.index({ title: 'text', content: 'text' }); // Text search index

// Pre-save middleware
requestSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Virtual for time since submission
requestSchema.virtual('timeSinceSubmission').get(function() {
    return Date.now() - this.submissionDate;
});

// Methods
requestSchema.methods = {
    // Check if request is overdue
    isOverdue() {
        if (this.targetCompletionDate) {
            return Date.now() > this.targetCompletionDate;
        }
        return false;
    },

    // Add workflow history entry
    addToHistory(action, performedBy, comments) {
        this.workflow.history.push({
            action,
            performedBy,
            comments,
            date: new Date()
        });
        return this.save();
    },

    // Update request status with history tracking
    async updateStatus(newStatus, performedBy, comments) {
        this.status = newStatus;
        this.lastUpdated = new Date();
        await this.addToHistory(`Status updated to ${newStatus}`, performedBy, comments);
    }
};

// Statics
requestSchema.statics = {
    // Find requests by department with status summary
    async getDepartmentSummary(department) {
        return this.aggregate([
            { $match: { department } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
    },

    // Find similar requests
    async findSimilar(requestId) {
        const request = await this.findById(requestId);
        if (!request) return [];

        return this.find({
            $text: { 
                $search: request.title + ' ' + request.content 
            },
            _id: { $ne: requestId },
            department: request.department
        }).limit(5);
    }
};

// Export both model and schema
export const Request = mongoose.model('Request', requestSchema);
export const RequestSchema = requestSchema;
