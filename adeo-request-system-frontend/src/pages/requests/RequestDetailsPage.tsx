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

      {/* AI Analysis */}
      {analysis && (
        <>
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{analysis.analysis.summary}</p>
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Key Trends:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.analysis.trends.map((trend, index) => (
                    <li key={index} className="text-gray-700">{trend}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {analysis.recommendations.strategic.map((rec, index) => (
                  <li key={index} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Operational Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Implementation Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2">
                {analysis.recommendations.operational.map((op, index) => (
                  <li key={index} className="text-gray-700">{op}</li>
                ))}
              </ul>
              <div className="mt-4">
                <h4 className="font-semibold">Timeline:</h4>
                <p className="mt-2 text-gray-700">{analysis.recommendations.timeline}</p>
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="font-semibold">Risk Level: </span>
                  <Badge variant={
                    analysis.analysis.riskLevel === 'high' ? 'destructive' :
                    analysis.analysis.riskLevel === 'medium' ? 'warning' :
                    'success'
                  }>
                    {analysis.analysis.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Identified Risks:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.recommendations.risks.map((risk, index) => (
                      <li key={index} className="text-gray-700">{risk}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Budget Implications:</h4>
                  <p className="text-gray-700">{analysis.recommendations.budgetImplications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RequestDetailsPage;