import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi } from '@/api/requests';
import { toast } from '@/components/ui/use-toast';

export function useRequests(params: RequestsParams = {}) {
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => requestsApi.getRequests(params)
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