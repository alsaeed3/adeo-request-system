import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import RequestAnalysis from './RequestAnalysis';

interface RequestDetails {
  _id: string;
  title: string;
  requestNumber: string;
  description: string;
  requestType: string;
  priority: string;
  status: string;
  metadata: {
    analysis?: {
      analysis: {
        summary: string;
        trends: string[];
        impactAssessment: string;
        policyAlignment: string;
        riskLevel: string;
      };
      recommendations: {
        strategic: string[];
        operational: string[];
        timeline: string;
        risks: string[];
        budgetImplications: string;
      };
    };
  };
  createdAt: string;
}

const RequestDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch request details
  const { data: request, isLoading, error, refetch } = useQuery<RequestDetails>({
    queryKey: ['request', id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3000/api/requests/${id}`);
      if (!response.ok) throw new Error('Failed to fetch request');
      const data = await response.json();
      return data.data;
    },
  });

  // Analyze request mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`http://localhost:3000/api/requests/${id}/analyze`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to analyze request');
      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load request details</AlertDescription>
        </Alert>
      </div>
    );
  }

  const analysis = request.metadata.analysis;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Request Details */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{request.title}</CardTitle>
              <CardDescription>{request.requestNumber}</CardDescription>
            </div>
            {!analysis && (
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Request
                  </>
                ) : (
                  'Analyze Request'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="font-semibold">Type:</span>
              <Badge variant="outline" className="ml-2">
                {request.requestType}
              </Badge>
            </div>
            <div>
              <span className="font-semibold">Priority:</span>
              <Badge variant="outline" className="ml-2">
                {request.priority}
              </Badge>
            </div>
            <div>
              <span className="font-semibold">Status:</span>
              <Badge variant="outline" className="ml-2">
                {request.status}
              </Badge>
            </div>
          </div>
          <div>
            <span className="font-semibold">Description:</span>
            <p className="mt-2 text-gray-700">{request.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Section */}
      {analysis && (
        <Card>
          <CardContent className="p-6">
            <RequestAnalysis analysis={analysis} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RequestDetailsPage;