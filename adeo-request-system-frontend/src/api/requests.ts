import api from './axiosConfig';
import { Request, RequestStatus } from '@/types';

interface RequestsParams {
  page?: number;
  limit?: number;
  department?: string;
  status?: RequestStatus;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export const requestsApi = {
  getRequests: async (params: RequestsParams) => {
    const { data } = await api.get('/api/requests', { params });
    return data;
  },

  getRequest: async (id: string) => {
    const { data } = await api.get(`/api/requests/${id}`);
    return data;
  },

  createRequest: async (requestData: FormData) => {
    try {
      console.log('FormData contents:');
      for (const pair of requestData.entries()) {
        console.log(pair[0], pair[1]);
      }

      const { data } = await api.post('/api/requests', requestData, {
        headers: {
        },
        timeout: 30000,
      });
      return data;
    } catch (error) {
      console.error('Create request error:', error);
      throw error;
    }
  },

  updateRequest: async (id: string, updateData: Partial<Request>) => {
    const { data } = await api.put(`/api/requests/${id}`, updateData);
    return data;
  },

  deleteRequest: async (id: string) => {
    const { data } = await api.delete(`/api/requests/${id}`);
    return data;
  }
};