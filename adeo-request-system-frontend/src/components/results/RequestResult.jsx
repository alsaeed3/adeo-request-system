import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert } from '../ui/Alert';

export const RequestResult = ({ result }) => {
  if (!result) return null;

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      {result.isDuplicate ? (
        <Alert type="warning" title="Duplicate Request Detected">
          <p>This request appears to be similar to an existing request from {new Date(result.originalRequest.createdAt).toLocaleDateString()}</p>
          <div className="mt-4">
            <h4 className="font-medium">Original Request:</h4>
            <p className="mt-2">{result.originalRequest.title}</p>
          </div>
        </Alert>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900">Request Processed Successfully</h3>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700">Analysis</h4>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <p className="text-gray-600">{result.analysis.summary}</p>
                {result.analysis.trends && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-700">Key Trends:</h5>
                    <ul className="list-disc list-inside mt-2">
                      {result.analysis.trends.map((trend, index) => (
                        <li key={index} className="text-gray-600">{trend}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700">Recommendations</h4>
              <div className="mt-2 p-4 bg-gray-50 rounded-md">
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-700">Strategic:</h5>
                    <ul className="list-disc list-inside mt-2">
                      {result.recommendations.strategic.map((rec, index) => (
                        <li key={index} className="text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700">Timeline:</h5>
                    <p className="mt-2 text-gray-600">{result.recommendations.timeline}</p>
                  </div>

                  {result.recommendations.risks && (
                    <div>
                      <h5 className="font-medium text-gray-700">Potential Risks:</h5>
                      <ul className="list-disc list-inside mt-2">
                        {result.recommendations.risks.map((risk, index) => (
                          <li key={index} className="text-gray-600">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};