import mongoose from 'mongoose';
const { Schema } = mongoose;

// Define custom types
const CustomDataSchema = new Schema({
    label: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: { type: String, required: true },
    options: [{ type: Schema.Types.Mixed }],
    validation: {
        required: { type: Boolean, default: false },
        min: Number,
        max: Number,
        pattern: String,
        customValidation: String
    }
}, { _id: false });

// Define history entry schema
const HistoryEntrySchema = new Schema({
    timestamp: { type: Date, default: Date.now },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: { type: String, required: true },
    field: String,
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    comment: String
}, { _id: false });

// Start of the main RequestSchema
const RequestSchema = new Schema({
    requestNumber: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Draft', 'Pending', 'In Review', 'Approved', 'Rejected', 'Cancelled', 'Completed'],
        default: 'Draft'
    }
}, { timestamps: true });

// Continuing from previous RequestSchema definition...

RequestSchema.add({
    // Requester Information
    requester: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    requesterDepartment: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },
    
    // Assignee Information
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedDepartment: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    },

    // Teams and Groups
    responsibleTeam: {
        type: Schema.Types.ObjectId,
        ref: 'Team'
    },
    stakeholders: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['Reviewer', 'Observer', 'Contributor']
        },
        notifications: {
            email: { type: Boolean, default: true },
            inApp: { type: Boolean, default: true }
        }
    }],

    // Request Type and Category
    requestType: {
        type: Schema.Types.ObjectId,
        ref: 'RequestType',
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategory: {
        type: Schema.Types.ObjectId,
        ref: 'Category'
    },

    // Priority and Due Dates
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    dueDate: Date,
    targetCompletionDate: Date,
    actualCompletionDate: Date,

    // Time Tracking
    timeEstimate: {
        value: Number,
        unit: {
            type: String,
            enum: ['minutes', 'hours', 'days'],
            default: 'hours'
        }
    },
    timeSpent: {
        value: Number,
        unit: {
            type: String,
            enum: ['minutes', 'hours', 'days'],
            default: 'hours'
        }
    }
});

// Continuing RequestSchema additions...

RequestSchema.add({
    // Custom Fields
    customFields: {
        type: Map,
        of: CustomDataSchema
    },
    
    // Dynamic Form Data
    formData: {
        type: Map,
        of: Schema.Types.Mixed,
        default: new Map()
    },

    // Attachments
    attachments: [{
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        path: { type: String, required: true },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        metadata: {
            type: Map,
            of: String
        },
        tags: [String]
    }],

    // Comments and Discussions
    comments: [{
        content: {
            type: String,
            required: true
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        edited: {
            isEdited: { type: Boolean, default: false },
            editedAt: Date,
            originalContent: String
        },
        attachments: [{
            filename: String,
            path: String,
            mimeType: String
        }],
        mentions: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            notified: { type: Boolean, default: false }
        }],
        parentComment: {
            type: Schema.Types.ObjectId
        },
        reactions: [{
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            type: {
                type: String,
                enum: ['like', 'heart', 'smile', 'thumbsup', 'thumbsdown']
            }
        }]
    }],

    // Tracking History
    history: [HistoryEntrySchema],

    // Internal Notes
    internalNotes: [{
        content: { type: String, required: true },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        visibility: {
            type: String,
            enum: ['department', 'team', 'admin', 'all'],
            default: 'department'
        }
    }]
});

// Continuing RequestSchema additions...

RequestSchema.add({
    // Workflow Configuration
    workflow: {
        currentStage: {
            type: String,
            required: true,
            default: 'initial'
        },
        stages: [{
            name: { type: String, required: true },
            order: { type: Number, required: true },
            type: {
                type: String,
                enum: ['approval', 'review', 'implementation', 'validation', 'custom'],
                required: true
            },
            status: {
                type: String,
                enum: ['pending', 'in-progress', 'completed', 'skipped', 'failed'],
                default: 'pending'
            },
            assignedTo: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            dueDate: Date,
            completedAt: Date,
            notes: String
        }],
        isLocked: { type: Boolean, default: false }
    },

    // Approval Chain
    approvals: [{
        stage: { type: String, required: true },
        approver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'delegated'],
            default: 'pending'
        },
        decision: {
            timestamp: Date,
            comment: String,
            attachments: [{
                filename: String,
                path: String
            }]
        },
        delegatedTo: {
            user: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            reason: String,
            timestamp: Date
        },
        requiredLevel: {
            type: String,
            enum: ['department', 'division', 'executive', 'board'],
            required: true
        }
    }],

    // SLA Tracking
    sla: {
        targetResolutionTime: {
            value: Number,
            unit: {
                type: String,
                enum: ['hours', 'days', 'weeks'],
                required: true
            }
        },
        actualResolutionTime: Number,
        breached: { type: Boolean, default: false },
        pauseHistory: [{
            startTime: Date,
            endTime: Date,
            reason: String,
            initiatedBy: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }],
        notifications: [{
            type: {
                type: String,
                enum: ['warning', 'breach', 'update'],
                required: true
            },
            timestamp: Date,
            sentTo: [{
                type: Schema.Types.ObjectId,
                ref: 'User'
            }]
        }]
    },

    // Metrics and Tracking
    metrics: {
        responseTime: Number,
        processingTime: Number,
        totalPauseTime: Number,
        reopenCount: { type: Number, default: 0 },
        escalationCount: { type: Number, default: 0 },
        lastActivity: Date,
        customMetrics: {
            type: Map,
            of: Schema.Types.Mixed
        }
    }
});

// Continuing RequestSchema additions...

RequestSchema.add({
    // Integration Settings
    integrations: {
        externalSystems: [{
            systemName: { type: String, required: true },
            externalId: String,
            status: {
                type: String,
                enum: ['active', 'pending', 'failed', 'archived']
            },
            lastSync: Date,
            syncData: {
                type: Map,
                of: Schema.Types.Mixed
            },
            mappings: {
                type: Map,
                of: String
            }
        }],
        webhooks: [{
            url: String,
            events: [String],
            active: Boolean,
            secret: String,
            lastTrigger: Date
        }]
    },

    // Flags and Settings
    flags: {
        isArchived: { type: Boolean, default: false },
        isConfidential: { type: Boolean, default: false },
        requiresFollowUp: { type: Boolean, default: false },
        isTemplate: { type: Boolean, default: false },
        customFlags: {
            type: Map,
            of: Boolean
        }
    },

    // Metadata
    metadata: {
        createdFrom: {
            type: String,
            enum: ['web', 'mobile', 'email', 'api', 'import'],
            required: true
        },
        lastModifiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        version: { type: Number, default: 1 },
        tags: [String],
        customMetadata: {
            type: Map,
            of: Schema.Types.Mixed
        }
    }
});

// Methods
RequestSchema.methods = {
    async updateStatus(newStatus, userId, comment) {
        const oldStatus = this.status;
        this.status = newStatus;
        
        this.history.push({
            user: userId,
            action: 'statusChange',
            field: 'status',
            previousValue: oldStatus,
            newValue: newStatus,
            comment: comment
        });

        await this.save();
        return this;
    },

    async addComment(content, userId, attachments = []) {
        this.comments.push({
            content,
            author: userId,
            attachments
        });
        
        await this.save();
        return this.comments[this.comments.length - 1];
    },

    async processApproval(approverId, decision, comment) {
        const approval = this.approvals.find(a => 
            a.approver.toString() === approverId.toString() && 
            a.status === 'pending'
        );
        
        if (approval) {
            approval.status = decision;
            approval.decision = {
                timestamp: new Date(),
                comment
            };
            await this.save();
        }
        return approval;
    }
};

// Static methods
RequestSchema.statics = {
    async findByRequestNumber(requestNumber) {
        return this.findOne({ requestNumber })
            .populate('requester')
            .populate('assignedTo')
            .populate('stakeholders.user');
    },

    async getMetrics(startDate, endDate) {
        return this.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: startDate, 
                        $lte: endDate 
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgProcessingTime: { $avg: '$metrics.processingTime' }
                }
            }
        ]);
    }
};

// Middleware
RequestSchema.pre('save', async function(next) {
    if (this.isNew) {
        const lastRequest = await this.constructor.findOne({})
            .sort('-requestNumber')
            .select('requestNumber');
            
        const nextNumber = lastRequest 
            ? String(Number(lastRequest.requestNumber) + 1).padStart(6, '0')
            : '000001';
            
        this.requestNumber = nextNumber;
    }

    if (this.isModified()) {
        this.metadata.version += 1;
    }

    next();
});

// Indexes
RequestSchema.index({ requestNumber: 1 }, { unique: true });
RequestSchema.index({ status: 1 });
RequestSchema.index({ createdAt: 1 });
RequestSchema.index({ 'requester': 1 });
RequestSchema.index({ 'assignedTo': 1 });
RequestSchema.index({ 'requestType': 1 });
RequestSchema.index({ 'category': 1 });
RequestSchema.index({ 'workflow.currentStage': 1 });
RequestSchema.index({ 'metadata.tags': 1 });

// Virtual fields
RequestSchema.virtual('isOverdue').get(function() {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate;
});

// Export the model
export const Request = mongoose.model('Request', RequestSchema);