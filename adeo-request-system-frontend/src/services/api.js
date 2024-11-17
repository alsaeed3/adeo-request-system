import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const requestService = {
  submitRequest: async (formData) => {
    try {
      // Create a FormData object if files are present
      const requestData = new FormData();
      
      // Append text fields
      requestData.append('title', formData.title);
      requestData.append('department', formData.department);
      requestData.append('type', formData.type);
      requestData.append('content', formData.content);
      
      // Append files if they exist
      if (formData.files && formData.files.length > 0) {
        formData.files.forEach((file, index) => {
          requestData.append('files', file);
        });
      }

      // Update headers for multipart/form-data if files are present
      const headers = formData.files?.length > 0 
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' };

      const response = await api.post('/requests', 
        formData.files?.length > 0 ? requestData : formData,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error submitting request');
    }
  },

  getRequests: async () => {
    try {
      const response = await api.get('/requests');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error fetching requests');
    }
  },

  getRequestById: async (id) => {
    try {
      const response = await api.get(`/requests/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error fetching request');
    }
  },
};

export default api;