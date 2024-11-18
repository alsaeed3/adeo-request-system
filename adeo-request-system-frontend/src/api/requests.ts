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
    const { data } = await api.get('/requests', { params });
    return data;
  },

  getRequest: async (id: string) => {
    const { data } = await api.get(`/requests/${id}`);
    return data;
  },

  createRequest: async (requestData: FormData) => {
    const { data } = await api.post('/requests', requestData);
    return data;
  },

  updateRequest: async (id: string, updateData: Partial<Request>) => {
    const { data } = await api.put(`/requests/${id}`, updateData);
    return data;
  },

  deleteRequest: async (id: string) => {
    const { data } = await api.delete(`/requests/${id}`);
    return data;
  }
};