import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';

export function useRequests<T>() {
  return useQuery<T, Error>({
    queryKey: ['requests'],
    queryFn: async () => {
      const { data } = await axios.get('/api/requests');
      return data;
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ['request', id],
    queryFn: () => requestsApi.getRequest(id),
    enabled: !!id
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestsApi.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({
        title: 'Success',
        description: 'Request created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create request',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Request> }) =>
      requestsApi.updateRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({
        title: 'Success',
        description: 'Request updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update request',
        variant: 'destructive',
      });
    },
  });
}