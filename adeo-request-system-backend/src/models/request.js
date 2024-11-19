import mongoose from 'mongoose';
const { Schema } = mongoose;

const AnalysisSchema = new Schema({
    analysis: {
        summary: String,
        trends: [String],
        impactAssessment: String,
        policyAlignment: String,
        riskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH']
        }
    },
    recommendations: {
        strategic: [String],
        operational: [String],
        timeline: String,
        risks: [String],
        budgetImplications: String
    },
    metadata: {
        processingVersion: String,
        processingDate: Date,
        processingDuration: Number,
        aiModelUsed: String,
        confidence: Number
    }
});

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
    requestType: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Draft', 'Pending', 'In Review', 'Approved', 'Rejected', 'Cancelled', 'Completed'],
        default: 'Draft'
    },
    department: {
        type: String,
        required: true,
        enum: [
            'DCD', 'DCT', 'DED', 'ADEK', 'DOE', 
            'DOF', 'DGE', 'DOH', 'DMT', 'ADJD', 'ITC'
        ]
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        metadata: Object,
        tags: [String]
    }],
    metadata: {
        createdFrom: String,
        version: Number,
        tags: [String],
        customMetadata: Object,
        lastAnalyzed: Date,
        analysis: AnalysisSchema
    }
}, {
    timestamps: true
});

RequestSchema.index({ requestNumber: 1 }, { unique: true });
RequestSchema.index({ createdAt: -1 });
RequestSchema.index({ status: 1 });
RequestSchema.index({ department: 1 });

RequestSchema.methods.hasAnalysis = function() {
    return !!this.metadata?.analysis?.analysis?.summary;
};

RequestSchema.methods.updateAnalysis = async function(analysisData) {
    this.metadata = {
        ...this.metadata,
        lastAnalyzed: new Date(),
        analysis: analysisData
    };
    return this.save();
};

RequestSchema.statics.findNeedingAnalysis = function() {
    return this.find({
        'metadata.analysis': { $exists: false },
        status: { $nin: ['Draft', 'Cancelled'] }
    });
};

export const Request = mongoose.model('Request', RequestSchema);

RequestSchema.pre('save', function(next) {
    if (this.department) {
        this.department = this.department.toUpperCase();
    }
    next();
});

RequestSchema.path('attachments').validate(function(attachments) {
    const maxSize = 10 * 1024 * 1024;
    return attachments.every(attachment => attachment.size <= maxSize);
}, 'File size cannot exceed 10MB');