import React, { useState } from 'react';
import { Header } from './components/layout/Header';
import { RequestForm } from './components/forms/RequestForm';
import { RequestResult } from './components/results/RequestResult';

function App() {
  const [processedRequest, setProcessedRequest] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <RequestForm onRequestProcessed={setProcessedRequest} />
          <RequestResult result={processedRequest} />
        </div>
      </main>
    </div>
  );
}

export default App;