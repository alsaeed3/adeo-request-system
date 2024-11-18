import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
  } from '@/components/ui/table';
  import { Badge } from '@/components/ui/badge';
  import { useRequests } from '@/hooks/useRequests';
  import { formatDistanceToNow } from 'date-fns';
  import { useNavigate } from 'react-router-dom';
  
  export function RequestList() {
	const navigate = useNavigate();
	const { data, isLoading } = useRequests();
  
	if (isLoading) {
	  return <div>Loading...</div>;
	}
  
	const getStatusColor = (status: string) => {
	  const colors = {
		pending: 'bg-yellow-500',
		processing: 'bg-blue-500',
		approved: 'bg-green-500',
		rejected: 'bg-red-500',
		'on-hold': 'bg-gray-500',
	  };
	  return colors[status] || 'bg-gray-500';
	};
  
	return (
	  <Table>
		<TableHeader>
		  <TableRow>
			<TableHead>Reference</TableHead>
			<TableHead>Title</TableHead>
			<TableHead>Department</TableHead>
			<TableHead>Status</TableHead>
			<TableHead>Submitted</TableHead>
		  </TableRow>
		</TableHeader>
		<TableBody>
		  {data?.requests.map((request) => (
			<TableRow
			  key={request._id}
			  className="cursor-pointer hover:bg-muted/50"
			  onClick={() => navigate(`/requests/${request._id}`)}
			>
			  <TableCell className="font-medium">
				{request.referenceNumber}
			  </TableCell>
			  <TableCell>{request.title}</TableCell>
			  <TableCell>{request.department}</TableCell>
			  <TableCell>
				<Badge
				  variant="secondary"
				  className={getStatusColor(request.status)}
				>
				  {request.status}
				</Badge>
			  </TableCell>
			  <TableCell>
				{formatDistanceToNow(new Date(request.submissionDate), {
				  addSuffix: true,
				})}
			  </TableCell>
			</TableRow>
		  ))}
		</TableBody>
	  </Table>
	);
  }