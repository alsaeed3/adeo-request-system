import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequests } from '../../hooks/useRequests';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';

interface APIResponse {
  status: string;
  count: number;
  data: Array<{
    _id: string;
    title: string;
    requestNumber: string;
    requestType: string;
    priority: string;
    status: string;
    createdAt: string;
    // Add other fields as needed
  }>;
}

const RequestsPage = () => {
  const navigate = useNavigate();
  const { data: response, isLoading, error } = useRequests<APIResponse>();

  const requests = response?.data;

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Requests</CardTitle>
          <Button onClick={() => navigate('/requests/new')}>
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading requests...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">
              {error instanceof Error ? error.message : 'Error loading requests'}
            </div>
          ) : !requests?.length ? (
            <div className="text-center py-4">No requests found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/requests/${request._id}`)}
                  >
                    <TableCell>{request.requestNumber}</TableCell>
                    <TableCell className="font-medium">
                      {request.title}
                    </TableCell>
                    <TableCell>{request.requestType}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions for styling
const getPriorityColor = (priority: string) => {
  const colors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };
  return colors[priority.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export default RequestsPage; 