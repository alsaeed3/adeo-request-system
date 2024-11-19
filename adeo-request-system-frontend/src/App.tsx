import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewRequestPage from './pages/requests/NewRequestPage';
import RequestsPage from './pages/requests/RequestsPage';
import RequestDetailsPage from './pages/requests/RequestDetailsPage';
import { Toaster } from './components/ui/toaster';
import AnalyticsPage from './pages/analytics/AnalyticsPage';

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
            
            {/* Analytics routes */}
            <Route path="analytics">
              <Route index element={<AnalyticsPage />} />
            </Route>

            {/* Requests routes */}
            <Route path="requests">
              <Route path="new" element={<NewRequestPage />} />
              <Route path=":id" element={<RequestDetailsPage />} />
              <Route index element={<RequestsPage />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<div>Page Not Found</div>} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;