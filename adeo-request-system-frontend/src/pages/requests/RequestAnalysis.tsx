import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatText = (text) => {
  if (!text) return '';
  
  // Remove asterisks and clean up formatting artifacts
  return text
    .replace(/\*/g, '')  // Remove asterisks
    .replace(/^\s*\.\s*/gm, '')  // Remove dots at start of lines
    .replace(/^-\s+/gm, '') // Remove dash bullet points
    .trim();
};

const AnalysisSection = ({ title, content }) => {
  // Handle array content (like trends, recommendations)
  if (Array.isArray(content)) {
    return (
      <div className="space-y-2">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        )}
        <ul className="space-y-2">
          {content.map((item, index) => {
            const formattedItem = formatText(item);
            if (!formattedItem) return null;
            
            return (
              <li 
                key={index}
                className="pl-4 border-l-2 border-blue-500 bg-blue-50/50 p-2 rounded-r-lg"
              >
                {formattedItem}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Handle string content
  const formattedContent = formatText(content);
  if (!formattedContent) return null;

  return (
    <div className="space-y-2">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      <p className="text-gray-700 leading-relaxed">{formattedContent}</p>
    </div>
  );
};

const RequestAnalysis = ({ analysis }) => {
  if (!analysis?.analysis || !analysis?.recommendations) return null;

  return (
    <div className="space-y-8">
      {/* Executive Summary with Trends */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Executive Summary</h2>
        {analysis.analysis.summary && (
          <AnalysisSection content={analysis.analysis.summary} />
        )}
        <AnalysisSection 
          title="Key Trends" 
          content={analysis.analysis.trends} 
        />
      </div>

      {/* Strategic Recommendations */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Strategic Recommendations</h2>
        <AnalysisSection content={analysis.recommendations.strategic} />
      </div>

      {/* Implementation Steps */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Implementation Steps</h2>
        <AnalysisSection content={analysis.recommendations.operational} />
      </div>

      {/* Risk Assessment */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Risk Level:</span>
              <Badge variant={
                analysis.analysis.riskLevel === 'high' ? 'destructive' :
                analysis.analysis.riskLevel === 'medium' ? 'warning' :
                'success'
              }>
                {analysis.analysis.riskLevel.toUpperCase()}
              </Badge>
            </div>
            {analysis.recommendations.risks.length > 0 && (
              <AnalysisSection 
                title="Identified Risks" 
                content={analysis.recommendations.risks} 
              />
            )}
            {analysis.recommendations.budgetImplications && (
              <AnalysisSection 
                title="Budget Implications" 
                content={analysis.recommendations.budgetImplications} 
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestAnalysis;