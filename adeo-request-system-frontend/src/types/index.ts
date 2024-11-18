export interface Request {
    _id: string;
    title: string;
    department: Department;
    type: RequestType;
    content: string;
    status: RequestStatus;
    priority: Priority;
    referenceNumber: string;
    submissionDate: string;
    lastUpdated: string;
    files?: File[];
    analysis?: RequestAnalysis;
    recommendations?: RequestRecommendations;
    metadata: RequestMetadata;
    workflow: RequestWorkflow;
}

export type Department =
    | 'Urban Planning'
    | 'Transportation'
    | 'Healthcare'
    | 'Education'
    | 'Environment'
    | 'Economic Development'
    | 'Public Safety'
    | 'Housing'
    | 'Culture and Tourism'
    | 'Social Services';

export type RequestType =
    | 'Policy Proposal'
    | 'Budget Request'
    | 'Project Implementation'
    | 'Emergency Request'
    | 'Research Study'
    | 'Infrastructure Development'
    | 'Program Initiative'
    | 'Regulatory Change'
    | 'Service Enhancement'
    | 'Strategic Planning';

export type RequestStatus =
    | 'draft'
    | 'pending'
    | 'processing'
    | 'processed'
    | 'approved'
    | 'rejected'
    | 'on-hold';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Additional interfaces will be added as needed