import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Progress } from '@/components/ui/progress'; // Import Progress component if you have it

const NewRequestPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requestType: '',
    priority: '',
    attachments: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.requestType) {
      setError('Request type is required');
      return false;
    }
    if (!formData.priority) {
      setError('Priority is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setUploadProgress(0);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('requestType', formData.requestType);
      formDataToSend.append('priority', formData.priority);

      if (formData.attachments) {
        // Validate file size
        if (formData.attachments.size > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File size must be less than 10MB');
        }
        formDataToSend.append('attachment', formData.attachments);
      }

      const response = await fetch('http://localhost:3000/api/requests', {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include', // Include cookies if needed
        headers: {
          // Let the browser set the content-type with boundary
          'Accept': 'application/json',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      navigate('/requests');
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload an image, PDF, or Word document.');
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        e.target.value = ''; // Reset input
        return;
      }
    }
    setFormData(prev => ({ ...prev, attachments: file }));
    setError(''); // Clear any previous errors
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Submit New Request</CardTitle>
          <CardDescription>
            Fill out the form below to submit a new request to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Request Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, title: e.target.value }));
                    setError('');
                  }}
                  placeholder="Enter request title"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="requestType">Request Type</Label>
                <Select 
                  value={formData.requestType}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, requestType: value }));
                    setError('');
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feature Request">Feature Request</SelectItem>
                    <SelectItem value="Bug Report">Bug Report</SelectItem>
                    <SelectItem value="Access Request">Access Request</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, priority: value }));
                    setError('');
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setError('');
                  }}
                  placeholder="Provide detailed description of your request"
                  className="h-32"
                  required
                  maxLength={2000}
                />
              </div>

              <div>
                <Label htmlFor="attachment">Attachment (Max 10MB - PDF, Word, or Images)</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-gray-500 mt-1">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewRequestPage;