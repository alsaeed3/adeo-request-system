import { useState } from 'react';
import { requestService } from '../services/api';

export const useRequest = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const submitRequest = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await requestService.submitRequest(formData);
      setData(response);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitRequest,
    loading,
    error,
    data
  };
};