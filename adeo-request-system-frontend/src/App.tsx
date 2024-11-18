import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewRequestPage from './pages/requests/NewRequestPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Dashboard route */}
            <Route index element={<div>Dashboard</div>} />
            
            {/* Requests routes */}
            <Route path="requests">
              <Route path="new" element={<NewRequestPage />} />
              <Route path=":id" element={<div>Request Details</div>} />
              <Route index element={<div>Requests List</div>} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<div>Page Not Found</div>} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;