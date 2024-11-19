import mongoose from 'mongoose';
const { Schema } = mongoose;

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
        customMetadata: Object
    }
}, { 
    timestamps: true 
});

export const Request = mongoose.model('Request', RequestSchema);