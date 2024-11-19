import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchWithConfig } from '@/api/config';
import { Loader2 } from "lucide-react";

// import { Progress } from '@/components/ui/progress'; // Import Progress component if you have it

const NewRequestPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requestType: '',
    priority: '',
    attachments: null as File | null,
    department: ''
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
    if (!formData.department) {
      setError('Department is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    if (!validateForm()) {
      return;
    }
  
    setIsLoading(true);
    setError('');
    
    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('requestType', formData.requestType);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('department', formData.department);
  
      // Add file if exists
      if (formData.attachments) {
        formDataToSend.append('file', formData.attachments);
      }
  
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Use fetch with upload progress
      const xhr = new XMLHttpRequest();
      
      // Create promise to handle the XMLHttpRequest
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
  
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
  
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
  
        xhr.open('POST', `${API_URL}/api/requests`);
        xhr.withCredentials = true;
        xhr.send(formDataToSend);
      });
  
      await uploadPromise;
  
      // Navigate to requests page after successful submission
      navigate('/requests');
  
    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit request');
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload a PDF, Word document, or text file.');
        e.target.value = ''; // Reset input
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        e.target.value = ''; // Reset input
        return;
      }
  
      setFormData(prev => ({ ...prev, attachments: file }));
      setError(''); // Clear any previous errors
    }
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
                    <SelectItem value="Policy Development">Policy Development Request</SelectItem>
                    <SelectItem value="Strategic Initiative">Strategic Initiative Proposal</SelectItem>
                    <SelectItem value="Program Approval">Program Approval Request</SelectItem>
                    <SelectItem value="Budget Allocation">Budget Allocation Request</SelectItem>
                    <SelectItem value="Inter-Department Collaboration">Inter-Department Collaboration</SelectItem>
                    <SelectItem value="Executive Decision">Executive Decision Request</SelectItem>
                    <SelectItem value="Regulatory Amendment">Regulatory Amendment Request</SelectItem>
                    <SelectItem value="Resource Support">Resource Support Request</SelectItem>
                    <SelectItem value="Technical Assistance">Technical Assistance Request</SelectItem>
                    <SelectItem value="Other">Other Administrative Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, department: value }));
                    setError('');
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DCD">Department of Community Development</SelectItem>
                    <SelectItem value="DCT">Department of Culture and Tourism</SelectItem>
                    <SelectItem value="DED">Department of Economic Development</SelectItem>
                    <SelectItem value="ADEK">Department of Education and Knowledge</SelectItem>
                    <SelectItem value="DOE">Department of Energy</SelectItem>
                    <SelectItem value="DOF">Department of Finance</SelectItem>
                    <SelectItem value="DGE">Department of Government Enablement</SelectItem>
                    <SelectItem value="DOH">Department of Health</SelectItem>
                    <SelectItem value="DMT">Department of Municipalities and Transport</SelectItem>
                    <SelectItem value="ADJD">Abu Dhabi Judicial Department</SelectItem>
                    <SelectItem value="ITC">Integrated Transport Center</SelectItem>
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
                <Label htmlFor="attachment">Attachment (PDF, Word, or Text file - Max 10MB)</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  accept=".pdf,.doc,.docx,.txt"
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full mt-2">
                    <div className="h-2 bg-gray-200 rounded">
                      <div 
                        className="h-2 bg-blue-600 rounded transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewRequestPage;