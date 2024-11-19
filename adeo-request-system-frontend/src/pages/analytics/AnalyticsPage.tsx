import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RequestAnalysis {
  summary: string;
  trends: string[];
  impactAssessment: string;
  policyAlignment: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface RequestRecommendations {
  strategic: string[];
  operational: string[];
  timeline: string;
  risks: string[];
  budgetImplications: string;
}

interface ProcessedRequest {
  title: string;
  department: string;
  type: string;
  analysis: RequestAnalysis;
  recommendations: RequestRecommendations;
  metadata: {
    processingVersion: string;
    processingDate: string;
    processingDuration: number;
    aiModelUsed: string;
  };
}

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<ProcessedRequest[]>([]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Updated URL to match your backend endpoint
      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies if needed
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Log the raw response for debugging
      const rawData = await response.text();
      console.log('Raw API Response:', rawData);

      // Try to parse the JSON data
      let data;
      try {
        data = JSON.parse(rawData);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse response data');
      }

      // Validate the data structure
      if (!Array.isArray(data)) {
        console.warn('Data is not an array:', data);
        // If it's a single object, wrap it in an array
        data = Array.isArray(data.requests) ? data.requests : [data];
      }

      setRequests(data);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center">Loading analytics data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <button 
              onClick={fetchAnalytics}
              className="ml-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If no data is available, show empty state
  if (!requests.length) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics from processed requests
  const programStats = {
    totalRequests: requests.length,
    averageProcessingTime: requests.reduce((acc, req) => 
      acc + (req.metadata?.processingDuration || 0), 0) / requests.length || 0,
    highRiskCount: requests.filter(req => 
      req.analysis?.riskLevel === 'high').length || 0,
    completionRate: "100%"
  };

  // Extract unique departments and their request counts
  const departmentStats = requests.reduce((acc, req) => {
    if (req.department) {
      acc[req.department] = (acc[req.department] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Aggregate risks across all requests
  const aggregateRisks = requests.flatMap(req => 
    (req.recommendations?.risks || []).map(risk => ({
      risk,
      impact: req.analysis?.riskLevel || 'unknown',
      department: req.department || 'unknown'
    }))
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">
        Request Processing Analytics Dashboard
      </h1>

      {/* Program Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.totalRequests}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {(programStats.averageProcessingTime / 1000).toFixed(2)}s
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>High Risk Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.highRiskCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Success</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{programStats.completionRate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Department Distribution</CardTitle>
          <CardDescription>Request distribution across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(departmentStats).map(([dept, count]) => (
              <div key={dept} className="text-center p-4 bg-muted rounded-lg">
                <h3 className="font-medium text-sm">{dept}</h3>
                <p className="text-2xl font-bold mt-2">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Analysis</CardTitle>
          <CardDescription>Aggregate risks across all requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk Factor</TableHead>
                <TableHead>Impact Level</TableHead>
                <TableHead>Department</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregateRisks.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.risk}</TableCell>
                  <TableCell className="capitalize">{item.impact}</TableCell>
                  <TableCell>{item.department}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;